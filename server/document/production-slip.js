import { chromium } from 'playwright';
// import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, getProductionItemsTable, parseDocument } from '../_/helpers/document.js';
import { send_email } from '../_/helpers/email.js';
import { __html, getDbConnection, getLocale, log, sid } from '../_/helpers/index.js';

/**
 * Production slip PDF Document Generator
 * 
 * @version 1.0
 * @date 2025-08-06
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<string>} - XML string of products
*/
async function viewProductionSlip(_id, user, lang) {

    const db = getDbConnection();
    await db.connect();

    try {
        const locale = await getLocale(db, sid, lang);

        let data = await getDocumentData(db, "production_slip", _id, user, locale);

        data.lang = lang;

        let invoice = data.settings?.document_template || "";

        data.production_items_table = getProductionItemsTable(data.settings, data.order);

        return parseDocument(invoice, data);

    } finally {
        await db.end();
    }
}

// API route for product export
function viewProductionSlipApi(app) {

    // app.get('/document/waybill/', authenticateToken, async (req, res) => {
    app.get('/document/production-slip/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ error: 'Order ID is required' });
            }

            console.log('/document/production-slip/', req.user);

            // Generate HTML for waybill
            const html = await viewProductionSlip(id, req.user, lang);

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
                const screenshotPath = path.join(process.cwd(), '/public/production-slip-screenshot.png');
                await fs.promises.writeFile(screenshotPath, screenshotBuffer);
            }

            const doc_path = '/app/server/document/pdf/production-slip-' + req.query.id + '.pdf';

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
                    <h1>Production slip for order #${req.query.id}</h1>
                    <p>Attached is the production slip document.</p>
                `;

                // req.query.email = "pavel";

                await send_email(req.query.email, "invoice@skarda.design", "Skārda Nams SIA", __html("Production slip for order #%1$", req.query.id), body, [doc_path]);
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
                res.setHeader('Content-Disposition', 'filename="waybill.pdf"');
                res.setHeader('Content-Length', pdfBuffer.length);
                res.send(pdfBuffer);
            }

        } catch (err) {
            res.status(500).json({ error: 'Failed to generate document' });
            log(`Failed to generate document: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default viewProductionSlipApi;