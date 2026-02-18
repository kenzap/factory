import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, parseDocument } from '../_/helpers/document/index.js';
import { getInvoiceItemsTable, getInvoiceTotals } from '../_/helpers/document/render.js';
import { markOrderEmailSent, send_email } from '../_/helpers/email.js';
import { __html, getDbConnection } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';
import { InvoiceCalculator } from '../_/helpers/tax/calculator.js';
import { extractCountryFromVAT } from '../_/helpers/tax/index.js';

/**
 * Quotation Document Generator
 * 
 * @version 1.0
 * @date 2025-08-06
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<string>} - XML string of products
*/
async function viewQuotation(_id, user, locale, lang, options = {}, logger) {

    const db = getDbConnection();
    await db.connect();

    try {

        // Get document data
        let data = await getDocumentData(db, "quotation", _id, user, locale);

        data.lang = lang;
        data.user = user;
        data.detailed = true; // for detailed item descriptions

        // Get invoice template
        let invoice = data.settings?.document_template || "";

        // Generate or retrieve invoice number
        // data.order.invoice = await getInvoiceNextNumber(db, data.order, data.settings, user);

        // Determine countries for tax calculation
        const sellerCountry = options.sellerCountry ||
            data.settings?.tax_region ||
            'LV'; // Default to Latvia

        logger.info(`Generating invoice for Order ID: ${_id}, Seller Country: ${sellerCountry}`);

        const buyerCountry = options.buyerCountry ||
            data.entity?.country_code ||
            extractCountryFromVAT(data.entity?.vat_number) ||
            sellerCountry;

        // Initialize invoice calculator
        const calculator = new InvoiceCalculator(
            data.settings,
            data.order,
            sellerCountry,
            buyerCountry,
            data.entity
        );

        // Calculate totals with tax breakdown
        const totals = calculator.calculateTotals();

        // Generate items table
        data.invoice_items_table = getInvoiceItemsTable(
            data.detailed,
            data.settings,
            data.order,
            locale,
            calculator
        );

        // Generate totals section
        data.invoice_totals = getInvoiceTotals(
            data.settings,
            data.order,
            locale,
            totals
        );

        // Parse document template with data
        const parsedDocument = parseDocument(invoice, data);

        return {
            html: parsedDocument,
            totals: totals
        };

    } finally {
        await db.end();
    }
}

// API route for product export 
function viewQuotationApi(app, logger) {

    app.get('/document/quotation/', authenticateToken, async (req, res) => {
        // app.get('/document/quotation/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            const format = req.query.format || 'pdf'; // pdf, html, peppol

            logger.info(`Generating quotation ID: ${id} in format: ${format} for user: ${req.user.username}`);

            if (!id) {
                return res.status(400).json({ error: 'Order ID is required' });
            }

            const locale = await getLocale({ locale: req.headers.locale, 'locale-checksum': 0 });

            // Additional options
            const options = {
                format: format,
                sellerCountry: req.query.seller_country,
                buyerCountry: req.query.buyer_country
            };

            // Generate quotation
            const quotationData = await viewQuotation(id, req.user, locale, lang, options, logger);

            // Handle HTML format
            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(quotationData.html);
            }

            // Handle PDF format
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(quotationData.html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(500);

            // Generate PDF
            const doc_path = `/app/server/document/pdf/quotation-${id}.pdf`;

            await page.emulateMedia({ media: 'screen' });
            const pdfBuffer = await page.pdf({
                path: doc_path,
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '15mm', right: '15mm' }
            });

            // Save screenshot in development
            if (process.env.NODE_ENV === 'development') {
                const screenshotBuffer = await page.screenshot({
                    fullPage: true,
                    type: 'png'
                });

                const fs = await import('fs');
                const path = await import('path');
                const screenshotPath = path.join(process.cwd(), '/public/quotation-screenshot.png');
                await fs.promises.writeFile(screenshotPath, screenshotBuffer);
            }

            await browser.close();

            // Send email if requested
            if (req.query.email) {
                const body = `
                    <h1>${__html(locale, "Quotation")} #${id}</h1>
                    <p>${__html(locale, "Total")}: ${quotationData.totals.totalInvoiceAmount} ${quotationData.totals.currency}</p>
                `;

                await send_email(
                    req.query.email,
                    "invoice@skarda.design",
                    "Skārda Nams SIA",
                    `${__html(locale, "Quotation")} #${id}`,
                    body,
                    [doc_path]
                );

                // Clean up PDF after sending
                const fs = await import('fs');
                try {
                    await fs.promises.unlink(doc_path);
                } catch (unlinkErr) {
                    logger.error('Failed to delete PDF file:', unlinkErr.message);
                }

                // Mark email as sent in database
                logger.info(`Marking quotation email as sent for ID: ${id} to ${req.query.email}`);
                await markOrderEmailSent(id, 'quotation', req.query.email, req.user, logger);

                // Response
                return res.send({
                    success: true,
                    message: 'Email sent'
                });
            }

            // Return PDF
            res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
            res.setHeader('Content-Disposition', `filename="quotation-${id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

        } catch (err) {

            logger.error(`Failed to generate quotation: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);

            res.status(500).json({
                error: 'Failed to generate quotation',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    });
}

export default viewQuotationApi;