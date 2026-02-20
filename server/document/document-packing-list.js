import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { getDocumentData, parseDocument } from '../_/helpers/document/index.js';
import { getPackingListItemsTable } from '../_/helpers/document/render.js';
import { markOrderEmailSent, send_email } from '../_/helpers/email.js';
import { __html, getDbConnection, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

const getDefaultPackingListTemplate = (locale) => `<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${__html(locale, 'Packing List')} #{{order_number}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Poppins');
        body { font-family: 'Poppins', sans-serif; font-size: 12px; color: #000; background: #fff; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 16px; }
        .header h1 { font-size: 18px; font-weight: 700; }
        .grid { display: flex; gap: 20px; margin-bottom: 12px; }
        .col { flex: 1; }
        .col h3 { font-size: 13px; margin-bottom: 2px; }
        .col p { font-size: 11px; margin-bottom: 2px; }
        .meta { margin-bottom: 10px; }
        .meta p { font-size: 11px; margin-bottom: 2px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .items-table th, .items-table td { border: 1px solid #000; padding: 4px; font-size: 11px; }
        .items-table th { background: #f0f0f0; text-align: center; }
        .items-table td:nth-child(4), .items-table td:nth-child(6) { text-align: right; white-space: nowrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${__html(locale, 'Packing List')}</h1>
            <p>{{today_date}}</p>
        </div>
        <div class="grid">
            <div class="col">
                <h3>${__html(locale, 'Sender')}</h3>
                <p>Skārda Nams SIA</p>
                <p>Mellužu iela 13-6, Rīga, LV-1067</p>
                <p>+371 26443313</p>
            </div>
            <div class="col">
                <h3>${__html(locale, 'Receiver')}</h3>
                <p id="client_name_formatted">{{client_name_formatted}}</p>
                <p id="delivery_address">{{delivery_address}}</p>
                <p id="client_contact_phone">{{client_contact_phone}}</p>
            </div>
        </div>
        <div class="meta">
            <p id="order_number"><strong>${__html(locale, 'Order')}:</strong> {{order_number}}</p>
            <p id="due_date"><strong>${__html(locale, 'Delivery date')}:</strong> {{due_date}}</p>
            <p id="order_notes"><strong>${__html(locale, 'Notes')}:</strong> {{order_notes}}</p>
        </div>
        {{packing_list_items_table}}
    </div>
</body>
</html>`;

async function viewPackingList(_id, user, locale, lang) {
    const db = getDbConnection();
    await db.connect();

    try {
        const data = await getDocumentData(db, 'packing_list', _id, user, locale);
        data.lang = lang;
        data.user = user;

        const productIds = Array.from(new Set(
            (data?.order?.items || [])
                .map(item => item?._id)
                .filter(Boolean)
        ));

        let productWeightById = {};
        if (productIds.length > 0) {
            const weightQuery = `
                SELECT _id, js->'data'->'stock'->>'weight' as stock_weight
                FROM data
                WHERE ref = $1 AND sid = $2 AND _id = ANY($3)
            `;
            const weightResult = await db.query(weightQuery, ['product', sid, productIds]);
            productWeightById = Object.fromEntries(
                weightResult.rows.map(row => [row._id, Number(row.stock_weight) || 0])
            );
        }

        const template = data.settings?.document_template || getDefaultPackingListTemplate(locale);
        data.packing_list_items_table = getPackingListItemsTable(data.order, locale, productWeightById);

        return parseDocument(template, data);
    } finally {
        await db.end();
    }
}

function viewPackingListApi(app, logger) {

    const handler = async (req, res) => {
        try {
            const lang = req.query.lang || process.env.LOCALE;
            const id = req.query.id;
            const format = req.query.format || 'pdf';

            if (!id) return res.status(400).json({ error: 'Order ID is required' });

            const locale = await getLocale({ locale: req.headers.locale, 'locale-checksum': 0 });
            const html = await viewPackingList(id, req.user, locale, lang);

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(html);
            }

            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle' });
            await page.waitForLoadState('load');
            await page.waitForTimeout(300);

            const docPath = `/app/server/document/pdf/packing-list-${id}.pdf`;

            const pdfBuffer = await page.pdf({
                path: docPath,
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '15mm', right: '15mm' }
            });

            await browser.close();

            if (req.query.email) {
                await send_email(
                    req.query.email,
                    'invoice@skarda.design',
                    'Skārda Nams SIA',
                    `${__html(locale, 'Packing List')} #${id}`,
                    `<h1>${__html(locale, 'Packing List')} #${id}</h1>`,
                    [docPath]
                );

                const fs = await import('fs');
                try {
                    await fs.promises.unlink(docPath);
                } catch (unlinkErr) {
                    logger.error('Failed to delete PDF file:', unlinkErr.message);
                }

                await markOrderEmailSent(id, 'packing_list', req.query.email, req?.user, logger);
                return res.json({ success: true, message: 'Email sent' });
            }

            res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
            res.setHeader('Content-Disposition', `filename="packing-list-${id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        } catch (err) {
            logger.error(`Failed to generate packing list: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
            return res.status(500).json({
                error: 'Failed to generate packing list',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    };

    app.get('/document/packing-list/', authenticateToken, handler);
    // Backward-compatible alias.
    app.get('/document/packing-slip/', authenticateToken, handler);
}

export default viewPackingListApi;
