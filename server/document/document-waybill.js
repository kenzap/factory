import { chromium } from 'playwright';
// import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, getIssuingDate, getManufacturingDate, getWaybillNextNumber, parseDocument } from '../_/helpers/document/index.js';
import { generatePeppolXML, getInvoiceItemsTable, getInvoiceTotals } from '../_/helpers/document/render.js';
import { send_email } from '../_/helpers/email.js';
import { __html, getDbConnection, getLocale } from '../_/helpers/index.js';
import { InvoiceCalculator } from '../_/helpers/tax/calculator.js';
import { extractCountryFromVAT } from '../_/helpers/tax/index.js';

/**   
 * Waybill PDF Document Generator
 * 
 * @version 2.0
 * @date 2025-01-21
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<object>} - Waybill data with HTML, totals, and metadata
*/
async function viewWaybill(_id, user, locale, lang, options = {}, logger) {

    const db = getDbConnection();
    await db.connect();

    try {
        // Get document data
        let data = await getDocumentData(db, "waybill", _id, user, locale);

        data.lang = lang;
        data.user = user;

        // Get waybill template
        let waybill = data.settings?.document_template || "";

        // Generate or retrieve waybill number
        data.order.waybill = await getWaybillNextNumber(db, data.order, data.settings, user);

        // Determine countries for tax calculation
        const sellerCountry = options.sellerCountry ||
            data.settings?.tax_region ||
            'LV';

        // logger.info(`Generating waybill for Order ID: ${_id}, Seller Country: ${sellerCountry}`);
        // logger.info(`Buyer Entity: ${JSON.stringify(data.entity)}`);

        const buyerCountry = options.buyerCountry ||
            data.entity?.country_code ||
            extractCountryFromVAT(data.entity?.vat_number) ||
            sellerCountry;

        // Initialize calculator with entity info
        const calculator = new InvoiceCalculator(
            data.settings,
            data.order,
            sellerCountry,
            buyerCountry,
            data.entity  // Entity contains type, vat_status, vat_number
        );

        // Calculate totals with tax breakdown
        const totals = calculator.calculateTotals(locale);

        // logger.info(`Calculated waybill totals: ${JSON.stringify(totals)}`);

        // Generate items table
        data.waybill_items_table = getInvoiceItemsTable(
            data.settings,
            data.order,
            locale,
            calculator
        );

        // Get manufacturing and issuing dates
        data.manufacturing_date = getManufacturingDate(data.order);
        data.issuing_date = getIssuingDate(data.order);

        // Generate totals section
        data.waybill_totals = getInvoiceTotals(
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

        logger.info(`Waybill ${data.order.waybill.number} - Total: ${totals.totalInvoiceAmount}`);
        // logger.info('Tax breakdown:', JSON.stringify(totals.taxBreakdown));

        // Parse document template with data
        const parsedDocument = parseDocument(waybill, data);

        return {
            html: parsedDocument,
            totals: totals,
            peppolXml: data.peppol_xml,
            waybillNumber: data.order.waybill.number,
            manufacturingDate: data.manufacturing_date,
            issuingDate: data.issuing_date
        };

    } finally {
        await db.end();
    }
}

// API route for waybill generation
function viewWaybillApi(app, logger) {
    // app.get('/document/waybill/', authenticateToken, async (req, res) => {
    app.get('/document/waybill/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            const format = req.query.format || 'pdf'; // pdf, html, peppol

            if (!id) {
                return res.status(400).json({ error: 'Waybill ID is required' });
            }

            const locale = await getLocale(lang);

            // Additional options
            const options = {
                format: format,
                sellerCountry: req.query.seller_country,
                buyerCountry: req.query.buyer_country
            };

            logger.info(`Generating waybill for ID: ${id}, User: ${req.user?.username || 'guest'}`);

            // Generate waybill
            const waybillData = await viewWaybill(id, req.user, locale, lang, options, logger);

            // Handle PEPPOL XML format
            if (format === 'peppol') {
                res.setHeader('Content-Type', 'application/xml; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="waybill-${waybillData.waybillNumber}.xml"`);
                return res.send(waybillData.peppolXml);
            }

            // Handle HTML format
            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(waybillData.html);
            }

            // Handle PDF format
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(waybillData.html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(500);

            const doc_path = '/app/server/document/pdf/waybill-' + id + '.pdf';

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
                const screenshotPath = path.join(process.cwd(), '/public/waybill-screenshot.png');
                await fs.promises.writeFile(screenshotPath, screenshotBuffer);
            }

            await browser.close();

            // Send email if requested
            if (req.query.email) {
                const body = `
                    <h1>${__html(locale, "Waybill")} #${waybillData.waybillNumber}</h1>
                    <p>${__html(locale, "Total")}: ${waybillData.totals.totalInvoiceAmount} ${waybillData.totals.currency}</p>
                `;

                await send_email(
                    req.query.email,
                    "invoice@skarda.design",
                    "Skārda Nams SIA",
                    `${__html(locale, "Waybill")} #${waybillData.waybillNumber}`,
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

                return res.json({
                    success: true,
                    message: 'Email sent',
                    waybillNumber: waybillData.waybillNumber,
                    total: waybillData.totals.totalInvoiceAmount
                });
            }

            // Return PDF
            res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
            res.setHeader('Content-Disposition', `filename="waybill-${waybillData.waybillNumber}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

        } catch (err) {
            logger.error(`Failed to generate waybill: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
            res.status(500).json({
                error: 'Failed to generate waybill',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    });
}

export default viewWaybillApi;