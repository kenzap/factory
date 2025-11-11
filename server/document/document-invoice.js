import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, getInvoiceNextNumber, getWaybillItemsTable, getWaybillTotals, parseDocument } from '../_/helpers/document.js';
import { send_email } from '../_/helpers/email.js';
import { __html, getDbConnection, getLocale, log } from '../_/helpers/index.js';

/**
 * Waybill PDF Document Generator
 * 
 * @version 1.0
 * @date 2025-08-06
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<string>} - XML string of products
*/
async function viewInvoice(_id, user, lang) {

    const db = getDbConnection();
    await db.connect();

    try {
        const locale = await getLocale(lang);

        let data = await getDocumentData(db, "invoice", _id, user, locale);

        data.lang = lang;

        data.user = user;

        let invoice = data.settings?.document_template || "";

        data.order.invoice = await getInvoiceNextNumber(db, data.order, data.settings, user);

        data.invoice_items_table = getWaybillItemsTable(data.settings, data.order, locale);

        data.invoice_totals = getWaybillTotals(data.settings, data.order);

        console.log(`Invoice next number:`, data.order.invoice);

        return parseDocument(invoice, data);

    } finally {
        await db.end();
    }
}

// API route for product export 
function viewInvoiceApi(app) {

    app.get('/document/invoice/', authenticateToken, async (req, res) => {
        // app.get('/document/invoice/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ error: 'Order ID is required' });
            }

            console.log('/document/invoice/', req.user);

            // Generate HTML for invoice
            const html = await viewInvoice(id, req.user, lang);

            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(500); // Ensure content is rendered

            // Take screenshot
            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                type: 'png'
            });

            // Save screenshot to file
            if (process.env.NODE_ENV === 'development') {
                const fs = await import('fs');
                const path = await import('path');
                const screenshotPath = path.join(process.cwd(), '/public/invoice-screenshot.png');
                await fs.promises.writeFile(screenshotPath, screenshotBuffer);
            }

            const doc_path = '/app/server/document/pdf/invoice-' + req.query.id + '.pdf';

            await page.emulateMedia({ media: 'screen' });
            const pdfBuffer = await page.pdf({
                path: doc_path,
                width: '100px',
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '15mm', right: '15mm' }
            });

            await browser.close();

            // send email with waybill
            if (req.query.email) {

                const body = `
                    <h1>Invoice for order #${req.query.id}</h1>
                    <p>Attached is the invoice document for your order.</p>
                `;

                // req.query.email = "pavel";

                await send_email(req.query.email, "invoice@skarda.design", "Skārda Nams SIA", __html("Invoice for order #%1$", req.query.id), body, [doc_path]);
                res.send({ success: true, message: 'email sent' });

                // Clean up the PDF file after sending email
                const fs = await import('fs');
                try {
                    await fs.promises.unlink(doc_path);
                } catch (unlinkErr) {
                    console.warn('Failed to delete PDF file:', unlinkErr.message);
                }
                return;
            }

            // Check if user wants HTML output
            const format = req.query.format || 'pdf';

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            } else {
                res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
                res.setHeader('Content-Disposition', 'filename="invoice.pdf"');
                res.setHeader('Content-Length', pdfBuffer.length);
                res.send(pdfBuffer);
            }

        } catch (err) {
            res.status(500).json({ error: 'Failed to generate document' });
            log(`Failed to generate document: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default viewInvoiceApi;