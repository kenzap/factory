// import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

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
        const query = `
            SELECT
                js->'data'->>'eid' as eid,
                js->'data'->>'name' as name,
                ROUND(SUM((js->'data'->'price'->>'grand_total')::numeric), 2) as total_amount_due,
                ROUND(SUM((js->'data'->'payment'->>'amount')::numeric), 2) as total_amount_paid,
                ROUND(SUM((js->'data'->'price'->>'grand_total')::numeric) - SUM((js->'data'->'payment'->>'amount')::numeric), 2) as outstanding_balance,
                COUNT(*) as order_count
            FROM data
            WHERE ref = $1 AND sid = $2
                AND js->'data'->'price'->'grand_total' IS NOT NULL
                AND js->'data'->'payment'->'amount' IS NOT NULL
                AND js->'data'->'payment'->>'amount' != ''
                AND js->'data'->'price'->>'grand_total' != ''
            GROUP BY js->'data'->>'eid', js->'data'->>'name'
            HAVING ROUND(SUM((js->'data'->'payment'->>'amount')::numeric), 2) != ROUND(SUM((js->'data'->'price'->>'grand_total')::numeric), 2)
            ORDER BY outstanding_balance DESC
        `;

        // AND js->'data'->'waybill'->>'date' IS NOT NULL

        const result = await db.query(query, ['ecommerce-order', sid]);
        if (result.rows) response = result.rows || [];

        // database js column structure example
        // {
        //     "data": {
        //         "id": "42484",
        //         "_id": "a099c001ab2c922cec80eb0768b76f01ffc3bf07",
        //         "eid": "3b85e2bea7499a8f4fce6cf35b9e522951eadb59",
        //         "name": "Verum SIA",
        //         "draft": false,
        //         "notes": "",
        //         "phone": "+37129463346",
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

    app.get('/debitor-report/', async (_req, res) => { //  authenticateToken,

        const data = _req.body;
        // data.user_id = _req.user.id;

        const report = await execDebitorReport(data);

        // Generate HTML report
        const today = new Date().toLocaleDateString();
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
                    .date { text-align: left; margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <div class="date">Bank debitor report for ${today}</div>
                <table>
                    <thead>
                        <tr>
                        <th>Nr</th>
                        <th>Name</th>
                        <th>Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                `;

        report.forEach((debitor, index) => {
            htmlReport += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${debitor.name}</td>
                                <td class="amount">€${debitor.outstanding_balance}</td>
                            </tr>
                `;
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
                            <td colspan="2" class="form-text">Total Positive Balances</td>
                            <td class="amount">€${positiveTotal.toFixed(2)}</td>
                        </tr>
                        <tr style="font-weight: bold; font-size:0.8rem; background-color: #f9f9f9;">
                            <td colspan="2" class="form-text">Total Negative Balances</td>
                            <td class="amount">€${negativeTotal.toFixed(2)}</td>
                        </tr>
                        <tr style="font-weight: bold; background-color: #e9e9e9;">
                            <td colspan="2" class="form-text">Net Total</td>
                            <td class="amount">€${(positiveTotal + negativeTotal).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        console.log('execDebitorReport', report);

        res.setHeader('Content-Type', 'text/html');
        res.send(htmlReport);
    });
}

export default execDebitorReportApi;