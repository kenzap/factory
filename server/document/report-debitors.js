import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { __html, getDbConnection, getLocale, getSettings, priceFormat, sid } from '../_/helpers/index.js';

/**
 * execDebitorReport
 * Generate a report of debitors with outstanding balances.
 * 
 * @version 1.0
 * @param {JSON} actions - Object containing actions to perform on the order item.
 * @returns {Array<Object>} - Response
*/
async function execDebitorReport(data) {

    const db = getDbConnection();

    let response = [];

    try {

        await db.connect();

        // Query to get all debitors grouped by eid where payment amount < grand_total
        let query = `
            SELECT
                js->'data'->>'eid' as eid,
                js->'data'->>'name' as name,
            ROUND(SUM(CASE WHEN js->'data'->'price'->>'grand_total' ~ '^-?[0-9]+\.?[0-9]*$' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END), 2) as total_amount_due,
            ROUND(SUM(CASE WHEN js->'data'->'payment'->>'amount' ~ '^-?[0-9]+\.?[0-9]*$' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END), 2) as total_amount_paid,
            ROUND(SUM(CASE WHEN js->'data'->'payment'->>'amount' ~ '^-?[0-9]+\.?[0-9]*$' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END) - SUM(CASE WHEN js->'data'->'price'->>'grand_total' ~ '^-?[0-9]+\.?[0-9]*$' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END), 2) as outstanding_balance,
            COUNT(*) as order_count
            FROM data
            WHERE ref = $1 AND sid = $2 AND (js->'data' ? 'payment' OR js->'data' ? 'waybill') 
            AND js->'data'->'deleted' IS NULL
            `;

        const queryParams = ['order', sid];
        let paramIndex = 3;

        // Filter by client eid if provided
        if (data.eid) {
            // query += ` AND js->'data'->>'eid' = $${paramIndex}`;
            query += ` AND (js->'data'->>'eid' = $${paramIndex} OR LOWER(js->'data'->>'name') = LOWER($${paramIndex + 1})) `;
            queryParams.push(data.eid);
            queryParams.push(data.name || '');
            paramIndex += 2;
        }

        // Filter by date if provided
        if (data.from || data.to) {
            if (data.from && data.from.trim() !== '') {
                // query += ` AND js->'data'->'waybill'->>'date' >= $${paramIndex}`;
                query += ` AND (js->'data'->'waybill'->>'date' >= $${paramIndex} OR js->'data'->'payment'->>'date' >= $${paramIndex})`;
                queryParams.push(data.from); // Extract date part only
                paramIndex++;
            }
            if (data.to && data.to.trim() !== '') {
                // query += ` AND js->'data'->'waybill'->>'date' <= $${paramIndex}`;
                query += ` AND (js->'data'->'waybill'->>'date' <= $${paramIndex} OR js->'data'->'payment'->>'date' <= $${paramIndex})`;
                queryParams.push(data.to); // Extract date part only
                paramIndex++;
            }
        }

        // HAVING ROUND(SUM(CASE WHEN js->'data'->'payment'->>'amount' ~ '^[0-9]+\.?[0-9]*$' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END), 2) != ROUND(SUM(CASE WHEN js->'data'->'price'->>'grand_total' ~ '^[0-9]+\.?[0-9]*$' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END), 2)
        query += ` 
                GROUP BY js->'data'->>'eid', js->'data'->>'name'
                ORDER BY js->'data'->>'name'`;

        const result = await db.query(query, queryParams);
        if (result.rows) response = result.rows || [];

        // database js column structure example
        // {
        //     "data": {
        //         "id": "42484",
        //         "_id": "a099c001ab2c922cec80eb0768b76f01ffc3bf07",
        //         "eid": "3b85e2bea7499a8f4fce6cf35b9e522951eadb59",
        //         "name": "Company SIA",
        //         "draft": false,
        //         "notes": "",
        //         "phone": "+371000000",
        //         "price": {
        //             "total": 9.28,
        //             "tax_calc": "",
        //             "tax_total": 0,
        //             "grand_total": 9.28,
        //             "tax_percent": 21
        //         },
        //         "entity": "company",
        //         "person": "",
        //         "address": "",
        //         "payment": {
        //             "date": "2025-10-29T17:42:32.000Z",
        //             "amount": "9.28"
        //         },
        //         "waybill": {
        //             "date": "2025-10-30T17:21:52.226Z",
        //             "number": "SKA-224268",
        //             "user_id": "001ff236dfc8c086c7083e98b9e947bfaf8caf51"
        //         },
        //         "due_date": "2025-10-30T10:00:00.000Z",
        //         "vat_status": "1"
        //     },
        //     "meta": {
        //         "created": 1761844908,
        //         "updated": 1761844908
        //     }
        // }

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function execDebitorReportApi(app) {

    app.get('/report/debitors/', authenticateToken, async (_req, res) => {

        const data = _req.query;

        const locale = await getLocale(_req.headers.locale);
        const report = await execDebitorReport(data);
        const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "price", "groups"]);

        // Generate HTML report
        const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/Riga' });

        let reportDate = today;
        if (data.from || data.to) {
            const fromStr = data.from ? new Date(data.from).toLocaleDateString('en-GB', { timeZone: 'Europe/Riga' }) : null;
            const toStr = data.to ? new Date(data.to).toLocaleDateString('en-GB', { timeZone: 'Europe/Riga' }) : null;

            reportDate = data.from && data.to
                ? fromStr === toStr ? fromStr : `${fromStr} - ${toStr}`
                : data.from ? `${__html(locale, 'From')} ${fromStr}` : `${__html(locale, 'To')} ${toStr}`;
        }

        // Generate HTML report
        let htmlReport = `
            <html>
            <head>
                <title>Debitor Report</title>
                <style> 
                    @page { size: A4; margin: 0.24in; }
                    body { font-family: Arial, sans-serif; margin: 0; max-width: 210mm; padding: 20px; box-sizing: border-box; }
                    table { border-collapse: collapse; width: 100%; font-size:0.8rem; }
                    th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .amount { text-align: right; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .report-title { text-align: left; }
                    .report-date { text-align: right; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="report-title">${__html(locale, 'Report')}</div>
                    <div class="report-date">${reportDate}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                        <th>Nr</th>
                        <th>${__html(locale, 'Client')}</th>
                        <th>${__html(locale, 'Amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                `;

        report.forEach((debitor, index) => {

            debitor.outstanding_balance != 0 ? htmlReport += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${debitor.name}</td>
                                <td class="amount">${priceFormat(settings, debitor.outstanding_balance)}</td>
                            </tr>
                `
                :
                '';
        });

        // Calculate totals separately
        const positiveTotal = report
            .filter(debitor => parseFloat(debitor.outstanding_balance) > 0)
            .reduce((sum, debitor) => sum + parseFloat(debitor.outstanding_balance), 0);

        const negativeTotal = report
            .filter(debitor => parseFloat(debitor.outstanding_balance) < 0)
            .reduce((sum, debitor) => sum + parseFloat(debitor.outstanding_balance), 0);

        htmlReport += `
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; font-size:0.8rem; background-color: #f9f9f9;">
                            <td colspan="2" class="form-text">${__html(locale, 'Debit')}</td>
                            <td class="amount">${priceFormat(settings, positiveTotal)}</td>
                        </tr>
                        <tr style="font-weight: bold; font-size:0.8rem; background-color: #f9f9f9;">
                            <td colspan="2" class="form-text">${__html(locale, 'Credit')}</td>
                            <td class="amount">${priceFormat(settings, negativeTotal)}</td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #e9e9e9;">
                            <td colspan="2" class="form-text">${__html(locale, 'Total')}</td>
                            <td class="amount">${priceFormat(settings, (positiveTotal + negativeTotal))}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        // Check if user wants HTML output
        const format = _req.query.format || 'html';

        if (format === 'pdf') {

            // Generate PDF using Playwright
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            await page.setContent(htmlReport, { waitUntil: 'networkidle' });
            await page.waitForSelector('table', { timeout: 5000 });
            await page.waitForTimeout(200);

            // DEBUG: Take a screenshot to see what's actually rendered
            await page.screenshot({ path: '/app/server/document/pdf/debug-screenshot.png', fullPage: true });

            // CRITICAL: Use print media emulation for PDF
            await page.emulateMedia({ media: 'print' });

            const doc_path = '/app/server/document/pdf/report-debitors.pdf';
            const pdfBuffer = await page.pdf({
                path: doc_path,
                // width: '100px',
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '15mm', right: '15mm' }
            });

            await browser.close();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'filename="report-debitors.pdf"');
            res.send(pdfBuffer);

        } else {

            res.setHeader('Content-Type', 'text/html');
            res.send(htmlReport);
        }
    });
}

export default execDebitorReportApi;