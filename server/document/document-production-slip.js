import { InvoiceCalculator } from '@factory/tax-core/calculator';
import { extractCountryFromVAT } from '@factory/tax-core/index';
import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, parseDocument } from '../_/helpers/document/index.js';
import { getPaginatedPdfOptions } from '../_/helpers/document/pdf.js';
import { getProductionItemsTable } from '../_/helpers/document/render.js';
import { markOrderEmailSent, send_email } from '../_/helpers/email.js';
import { __html, getDbConnection } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const getRequestOrigin = (req) => {
    const host = req.get('host') || '';
    const forwarded = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '')).split(',')[0].trim()
        || req.protocol
        || 'http';

    return host ? `${proto}://${host}` : '';
};

const toQrApiUrl = (targetUrl, size = 108) => {
    const params = new URLSearchParams({
        size: `${size}x${size}`,
        margin: '0',
        data: targetUrl
    });
    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
};

const getQrDataUri = async (targetUrl) => {
    const qrUrl = toQrApiUrl(targetUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(qrUrl, { method: 'GET', redirect: 'follow', signal: controller.signal });
        if (!response.ok) return qrUrl;

        const contentType = response.headers.get('content-type') || 'image/png';
        const bytes = await response.arrayBuffer();
        if (!bytes || bytes.byteLength === 0) return qrUrl;

        return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch (_) {
        return qrUrl;
    } finally {
        clearTimeout(timeout);
    }
};

const injectProductionSlipQr = (html, qrSrc, targetUrl) => {
    if (!html || !qrSrc || !targetUrl) return html;

    const block = `
        <style>
            .production-slip-qr {
                position: fixed;
                top: 0;
                right: 0;
                width: 14mm;
                z-index: 9999;
            }
            .production-slip-qr img {
                width: 14mm;
                height: 14mm;
                display: block;
                margin: 0;
                background: #fff;
            }
        </style>
        <a class="production-slip-qr" href="${targetUrl}">
            <img src="${qrSrc}" alt="Manufacturing QR">
        </a>
    `;

    if (html.includes('</body>')) {
        return html.replace('</body>', `${block}</body>`);
    }

    return `${html}${block}`;
};

/**
 * Production slip PDF Document Generator
 * 
 * @version 1.0
 * @date 2025-08-06
 * @param {string} lang - Language code for product titles and categories
 * @returns {Promise<string>} - XML string of products
*/
async function viewProductionSlip(_id, user, locale, lang, options = {}, logger) {

    const db = getDbConnection();
    await db.connect();

    try {

        let data = await getDocumentData(db, "production_slip", _id, user, locale);

        data.user = user;
        data.lang = lang;
        data.document_type = "production_slip";

        let production_slip = data.settings?.document_template || "";

        // Determine countries for tax calculation
        const sellerCountry = options.sellerCountry ||
            data.settings?.tax_region ||
            'LV'; // Default to Latvia

        logger.info(`Generating production slip for Order ID: ${_id}, Seller Country: ${sellerCountry}`);

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
        data.production_items_table = getProductionItemsTable(data.settings, data.order, locale);

        // Generate totals section
        // data.invoice_totals = getInvoiceTotals(
        //     data.settings,
        //     data.order,
        //     locale,
        //     totals
        // );

        // Parse document template with data
        const parsedDocument = parseDocument(production_slip, data);

        return {
            html: parsedDocument,
            totals: totals,
            settings: data.settings || {}
        };

    } finally {
        await db.end();
    }
}

// API route for product export
function viewProductionSlipApi(app, logger) {

    app.get('/document/production-slip/', authenticateToken, async (req, res) => {
        // app.get('/document/production-slip/', async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            const format = req.query.format || 'pdf'; // pdf, html, peppol

            if (!id) {
                return res.status(400).json({ error: 'Order ID is required' });
            }

            // logger.info(`Generating production slip ID: ${id} in format: ${format} for user: ${req.user.username}`);

            const locale = await getLocale({ locale: req.headers.locale, 'locale-checksum': 0 });
            const origin = getRequestOrigin(req);
            const manufacturingUrl = `${origin}/manufacturing/?id=${encodeURIComponent(String(id))}`;
            const qrSrc = await getQrDataUri(manufacturingUrl);

            // Additional options
            const options = {
                format: format,
                sellerCountry: req.query.seller_country,
                buyerCountry: req.query.buyer_country
            };

            // Generate HTML for waybill
            const slipData = await viewProductionSlip(id, req.user, locale, lang, options, logger);
            slipData.html = injectProductionSlipQr(slipData.html, qrSrc, manufacturingUrl);

            // Handle HTML format
            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(slipData.html);
            }

            // Handle PDF format
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(slipData.html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(500);

            // Generate PDF
            const doc_path = `/app/server/document/pdf/production-slip-${id}.pdf`;

            await page.emulateMedia({ media: 'screen' });
            const pdfBuffer = await page.pdf(
                getPaginatedPdfOptions(doc_path, __html(locale, 'Page'))
            );

            // Save screenshot in development
            if (process.env.NODE_ENV === 'development') {
                const screenshotBuffer = await page.screenshot({
                    fullPage: true,
                    type: 'png'
                });

                const fs = await import('fs');
                const path = await import('path');
                const screenshotPath = path.join(process.cwd(), '/public/production-slip-screenshot.png');
                await fs.promises.writeFile(screenshotPath, screenshotBuffer);
            }

            await browser.close();

            // Send email if requested
            if (req.query.email) {
                const body = `
                    <h1>${__html(locale, "Production Slip")} #${id}</h1>
                `;
                const mailFrom = slipData.settings?.documents_email_from || "";
                const replyTo = slipData.settings?.documents_email_reply_to || "";

                await send_email(
                    req.query.email,
                    mailFrom,
                    "",
                    `${__html(locale, "Production Slip")} #${id}`,
                    body,
                    [doc_path],
                    { replyTo }
                );

                // Clean up PDF after sending
                const fs = await import('fs');
                try {
                    await fs.promises.unlink(doc_path);
                } catch (unlinkErr) {
                    logger.error('Failed to delete PDF file:', unlinkErr.message);
                }

                // Mark email as sent in database
                await markOrderEmailSent(id, 'production_slip', req.query.email, req?.user, logger);

                // Response
                return res.send({
                    success: true,
                    message: 'Email sent',
                    total: slipData.totals.totalInvoiceAmount
                });
            }

            // Return PDF
            res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
            res.setHeader('Content-Disposition', `filename="production-slip-${slipData.id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

        } catch (err) {

            logger.error(`Failed to generate production slip: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);

            res.status(500).json({
                error: 'Failed to generate production slip',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    });
}

export default viewProductionSlipApi;
