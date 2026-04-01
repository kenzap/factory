import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData } from '../_/helpers/document/index.js';
import { getPaginatedPdfOptions } from '../_/helpers/document/pdf.js';
import { getSketchListItems } from '../_/helpers/document/render.js';
import { markOrderEmailSent, send_email } from '../_/helpers/email.js';
import { __html, getDbConnection, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';
import { getSettings } from '../_/helpers/settings.js';

const getDefaultTemplate = (locale) => `<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${__html(locale, 'Sketch List')} #{{order_number}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        body { font-family: 'Poppins', sans-serif; font-size: 12px; color: #000; background: #fff; padding: 16px; padding-top: 28px; }
        .document-header { position: fixed; top: 6px; left: 16px; right: 16px; font-size: 10px; color: #666; text-align: right; }
        .sketch-sheet { width: 100%; break-inside: avoid; page-break-inside: avoid; margin-bottom: 10px; }
        .sheet-title { font-size: 13px; font-weight: 600; margin: 0 0 3px 0; line-height: 1.15; }
        .sheet-grid { display: flex; gap: 10px; align-items: flex-start; }
        .sheet-image-wrap { position: relative; width: 250px; height: 250px; flex: 0 0 250px; margin-top: -3px; }
        .sheet-image { width: 250px; height: 250px; object-fit: contain; display: block; }
        .overlay { position: absolute; inset: 0; width: 250px; height: 250px; }
        .overlay polyline, .overlay path { fill: none; stroke: #111; stroke-width: 2.3; }
        .overlay polygon { fill: #111; stroke: #111; stroke-width: 1; }
        .overlay rect { fill: #fff; stroke: #111; stroke-width: 1.8; }
        .overlay .annotation-label { font-size: 28px; font-weight: 700; fill: #111; stroke: #fff; stroke-width: 0.6; paint-order: stroke; }
        .sheet-values { flex: 1; padding-top: 2px; }
        .sheet-values table { width: 100%; border-collapse: collapse; }
        .sheet-values td { border-bottom: 1px solid #e6e6e6; padding: 2px 3px; font-size: 11px; vertical-align: top; line-height: 1.1; }
        .sheet-values td:first-child { width: 44px; font-weight: 700; }
        .empty-state { font-size: 14px; color: #666; border: 1px dashed #ccc; border-radius: 8px; padding: 18px; }
    </style>
</head>
<body>
    <div class="document-header">${__html(locale, 'Order')} #{{order_number}}</div>
    {{sketch_list_items}}
</body>
</html>`;

const getRequestOrigin = (req) => {
    const host = req.get('host') || '';
    const forwarded = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '')).split(',')[0].trim()
        || req.protocol
        || 'http';

    return host ? `${proto}://${host}` : '';
};

async function viewSketchList(_id, user, locale, lang, origin, requestHeaders = {}) {
    const db = getDbConnection();
    await db.connect();

    try {
        const data = await getDocumentData(db, 'sketch_list', _id, user, locale);
        data.lang = lang;
        data.user = user;

        const sketchItems = (data?.order?.items || []).filter(item => item?.sketch_attached && item?._id);
        const productIds = Array.from(new Set(sketchItems.map(item => item._id)));

        let productMap = {};
        if (productIds.length > 0) {
            const productQuery = `
                SELECT
                    _id,
                    js->'data'->'img' AS img,
                    js->'data'->'cad_files' AS cad_files,
                    js->'data'->'sketch'->'img' AS sketch_img,
                    js->'data'->'updated' AS updated
                FROM data
                WHERE ref = $1 AND sid = $2 AND _id = ANY($3)
            `;
            const productResult = await db.query(productQuery, ['product', sid, productIds]);
            productMap = Object.fromEntries(productResult.rows.map((row) => [row._id, row]));
        }

        const template = data.settings?.document_template || getDefaultTemplate(locale);
        const sketchListItemsHtml = await getSketchListItems(data.order, locale, productMap, origin, requestHeaders);
        const html = template
            .replaceAll('{{order_number}}', String(data?.order?.id || ''))
            .replaceAll('{{sketch_list_items}}', sketchListItemsHtml);

        return html;
    } finally {
        await db.end();
    }
}

// authenticateToken, 
function viewSketchListApi(app, logger) {
    app.get('/document/sketch-list/', authenticateToken, async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            const format = req.query.format || 'pdf';

            if (!id) {
                return res.status(400).json({ error: 'Order ID is required' });
            }

            const locale = await getLocale({ locale: req.headers.locale, 'locale-checksum': 0 });
            const origin = getRequestOrigin(req);
            const html = await viewSketchList(id, req.user, locale, lang, origin, {
                cookie: req.headers.cookie || '',
                authorization: req.headers.authorization || ''
            });
            const settings = await getSettings();

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(html);
            }

            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                ignoreHTTPSErrors: true,
                extraHTTPHeaders: {
                    ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
                    ...(req.headers.authorization ? { authorization: req.headers.authorization } : {})
                }
            });
            const page = await context.newPage();
            await page.setContent(html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(250);

            const docPath = `/app/server/document/pdf/sketch-list-${id}.pdf`;
            const pdfBuffer = await page.pdf(getPaginatedPdfOptions(docPath, __html(locale, 'Page')));
            await context.close();
            await browser.close();

            if (req.query.email) {
                const mailFrom = settings?.documents_email_from || '';
                const replyTo = settings?.documents_email_reply_to || '';
                await send_email(
                    req.query.email,
                    mailFrom,
                    '',
                    `${__html(locale, 'Sketch List')} #${id}`,
                    `<h1>${__html(locale, 'Sketch List')} #${id}</h1>`,
                    [docPath],
                    { replyTo }
                );

                const fs = await import('fs');
                try {
                    await fs.promises.unlink(docPath);
                } catch (unlinkErr) {
                    logger.error('Failed to delete PDF file:', unlinkErr.message);
                }

                await markOrderEmailSent(id, 'sketch_list', req.query.email, req?.user, logger);
                return res.json({ success: true, message: 'Email sent' });
            }

            res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
            res.setHeader('Content-Disposition', `filename="sketch-list-${id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        } catch (err) {
            logger.error(`Failed to generate sketch list: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
            return res.status(500).json({
                error: 'Failed to generate sketch list',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    });
}

export default viewSketchListApi;
