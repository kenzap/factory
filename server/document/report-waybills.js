import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { __html, getDbConnection, getLocale, sid } from '../_/helpers/index.js';

/**
 * execWaybillsReport 
 * Generate a report of waybills with client details and amounts.
 * 
 * @version 1.0
 * @param {JSON} data - Object containing actions to perform on the order item.
 * @returns {Array<Object>} - Response
*/
async function execWaybillsReport(data) {

    const db = getDbConnection();

    let response = [];

    try {

        await db.connect();

        // Query to get waybills with client info and amounts
        let query = `
            SELECT
                js->'data'->>'name' as client_name,
                js->'data'->'waybill'->>'number' as waybill_number,
            ROUND((js->'data'->'price'->>'total')::numeric, 2) as amount_without_tax,
            ROUND((js->'data'->'price'->>'tax_total')::numeric, 2) as tax_amount,
            ROUND((js->'data'->'price'->>'grand_total')::numeric, 2) as grand_total
            FROM data
            WHERE ref = $1 AND sid = $2
            AND js->'data'->'waybill'->>'number' IS NOT NULL
            AND js->'data'->'price'->'total' IS NOT NULL
            AND js->'data'->'price'->'tax_total' IS NOT NULL
            AND js->'data'->'price'->'grand_total' IS NOT NULL
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
        // Filter by date if provided
        if (data.from || data.to) {
            if (data.from && data.from.trim() !== '') {
                query += ` AND js->'data'->'waybill'->>'date' >= $${paramIndex}`;
                queryParams.push(data.from); // Extract date part only
                paramIndex++;
            }
            if (data.to && data.to.trim() !== '') {
                query += ` AND js->'data'->'waybill'->>'date' <= $${paramIndex}`;
                queryParams.push(data.to); // Extract date part only
                paramIndex++;
            }
        }

        query += ` ORDER BY js->'data'->>'name', js->'data'->'waybill'->>'number'`;

        const result = await db.query(query, queryParams);
        if (result.rows) response = result.rows || [];

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function execWaybillsReportApi(app) {

    app.get('/report/waybills/', authenticateToken, async (_req, res) => { //  authenticateToken,

        const data = _req.query;

        const locale = await getLocale(_req.headers.locale);
        const report = await execWaybillsReport(data);

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
                <title>Waybills Report</title>
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
                    <th>${__html(locale, 'Waybill #')}</th>
                    <th>${__html(locale, 'Total')}</th>
                    <th>${__html(locale, 'Tax Amount')}</th>
                    <th>${__html(locale, 'Grand Total')}</th>
                    </tr>
                </thead>
                <tbody>
                `;

        report.forEach((waybill, index) => {
            htmlReport += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${waybill.client_name}</td>
                                <td>${waybill.waybill_number}</td>
                                <td class="amount">€${waybill.amount_without_tax}</td>
                                <td class="amount">€${waybill.tax_amount}</td>
                                <td class="amount">€${waybill.grand_total}</td>
                            </tr>
                `;
        });

        // Calculate totals
        const totalWithoutTax = report.reduce((sum, waybill) => sum + parseFloat(waybill.amount_without_tax), 0);
        const totalTax = report.reduce((sum, waybill) => sum + parseFloat(waybill.tax_amount), 0);
        const grandTotal = report.reduce((sum, waybill) => sum + parseFloat(waybill.grand_total), 0);

        htmlReport += `
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background-color: #e9e9e9;">
                            <td colspan="3" class="form-text">${__html(locale, 'Total')}</td>
                            <td class="amount">€${totalWithoutTax.toFixed(2)}</td>
                            <td class="amount">€${totalTax.toFixed(2)}</td>
                            <td class="amount">€${grandTotal.toFixed(2)}</td>
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

export default execWaybillsReportApi;
