import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, getInvoiceNextNumber, parseDocument } from '../_/helpers/document/index.js';
import { generatePeppolXML, getInvoiceItemsTable, getInvoiceTotals } from '../_/helpers/document/render.js';
import { send_email } from '../_/helpers/email.js';
import { __html, getDbConnection, getLocale } from '../_/helpers/index.js';
import { InvoiceCalculator } from '../_/helpers/tax/calculator.js';
import { extractCountryFromVAT } from '../_/helpers/tax/index.js';

/**
 * Generate invoice with universal EU tax support
 * 
 * @param {string} _id - Order ID
 * @param {object} user - User object
 * @param {object} locale - Locale object
 * @param {string} lang - Language code
 * @param {object} options - Additional options (sellerCountry, buyerCountry, format)
 */
async function viewInvoice(_id, user, locale, lang, options = {}, logger) {

    const db = getDbConnection();
    await db.connect();

    try {
        // Get document data
        let data = await getDocumentData(db, "invoice", _id, user, locale);

        data.lang = lang;
        data.user = user;

        // Get invoice template
        let invoice = data.settings?.document_template || "";

        // Generate or retrieve invoice number
        data.order.invoice = await getInvoiceNextNumber(db, data.order, data.settings, user);

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

        // Store totals for PEPPOL export if needed
        data.calculated_totals = totals;
        data.peppol_xml = options.format === 'peppol'
            ? generatePeppolXML(data.order, totals, data.settings)
            : null;

        // console.log(`Invoice ${data.order.invoice.number} - Total: ${totals.totalInvoiceAmount}`);
        // console.log('Tax breakdown:', totals.taxBreakdown);

        // Parse document template with data
        const parsedDocument = parseDocument(invoice, data);

        return {
            html: parsedDocument,
            totals: totals,
            peppolXml: data.peppol_xml,
            invoiceNumber: data.order.invoice.number
        };

    } finally {
        await db.end();
    }
}

/**
 * API route for invoice generation
 */
function viewInvoiceApi(app, logger) {
    app.get('/document/invoice/', authenticateToken, async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            const format = req.query.format || 'pdf'; // pdf, html, peppol

            // logger.info(`Generating invoice ID: ${id} in format: ${format} for user: ${req.user.username}`);

            if (!id) {
                return res.status(400).json({ error: 'Order ID is required' });
            }

            const locale = await getLocale(lang);

            // Additional options
            const options = {
                format: format,
                sellerCountry: req.query.seller_country,
                buyerCountry: req.query.buyer_country
            };

            // Generate invoice
            const invoiceData = await viewInvoice(id, req.user, locale, lang, options, logger);

            // Handle PEPPOL XML format
            if (format === 'peppol') {
                res.setHeader('Content-Type', 'application/xml; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.xml"`);
                return res.send(invoiceData.peppolXml);
            }

            // Handle HTML format
            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(invoiceData.html);
            }

            // Handle PDF format
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(invoiceData.html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(500);

            // Generate PDF
            const doc_path = `/app/server/document/pdf/invoice-${id}.pdf`;

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
                const screenshotPath = path.join(process.cwd(), '/public/invoice-screenshot.png');
                await fs.promises.writeFile(screenshotPath, screenshotBuffer);
            }

            await browser.close();

            // Send email if requested
            if (req.query.email) {
                const body = `
                    <h1>${__html(locale, "Invoice")} #${invoiceData.invoiceNumber}</h1>
                    <p>${__html(locale, "Total")}: ${invoiceData.totals.totalInvoiceAmount} ${invoiceData.totals.currency}</p>
                `;

                await send_email(
                    req.query.email,
                    "invoice@skarda.design",
                    "Skārda Nams SIA",
                    `${__html(locale, "Invoice")} #${invoiceData.invoiceNumber}`,
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

                return res.send({
                    success: true,
                    message: 'Email sent',
                    invoiceNumber: invoiceData.invoiceNumber,
                    total: invoiceData.totals.totalInvoiceAmount
                });
            }

            // Return PDF
            res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
            res.setHeader('Content-Disposition', `filename="invoice-${invoiceData.invoiceNumber}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

        } catch (err) {

            logger.error(`Failed to generate invoice: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);

            res.status(500).json({
                error: 'Failed to generate invoice',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    });
}

export default viewInvoiceApi;