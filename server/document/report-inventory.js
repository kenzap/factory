import { chromium } from 'playwright';
import { authenticateToken } from '../_/helpers/auth.js';
import { __html, getDbConnection, priceFormat, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';
import { execCostFormula } from '../_/helpers/product.js';
import { getSettings } from '../_/helpers/settings.js';

/**
 * execInventoryReport 
 * Generate a report of inventory with client details and amounts.
 * 
 * @version 1.0
 * @returns {Array<Object>} - Response
*/
async function execInventoryReport() {

    const db = getDbConnection();

    let response = [];

    try {

        await db.connect();

        // Query to get inventory with client info and amounts - added group field
        let query = `
            SELECT
                _id,
                js->'data'->'locales'->$3->>'title' AS title,
                js->'data'->'locales'->$3->>'sdesc' AS sdesc,
                js->'data'->'stock' AS stock,
                js->'data'->'calc_price' AS calc_price,
                js->'data'->'formula_cost' AS formula_cost,
                js->'data'->'title' AS title_default,
                js->'data'->'var_price' AS var_price,
                js->'data'->>'group' AS group
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->'locales'->$3->>'title' != '' AND js->'data'->'status' != '0'
        `;

        const queryParams = ['product', sid, process.env.LOCALE || 'en'];

        query += ` ORDER BY js->'data'->>'group', js->'data'->'locales'->$3->>'title'`;

        const result = await db.query(query, queryParams);
        if (result.rows) response = result.rows || [];

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function execInventoryReportApi(app) {

    app.get('/report/inventory/', authenticateToken, async (_req, res) => {

        const locale = await getLocale({ locale: _req.headers.locale, 'locale-checksum': 0 });
        const products = await execInventoryReport();
        const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "price", "groups"]);

        // Generate HTML report
        const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/Riga' });

        // Group products by group
        const groupedProducts = {};
        const groupTotals = {};

        // Process products and group them
        for (const product of products) {
            const group = product.group || 'Other';

            if (!groupedProducts[group]) {
                groupedProducts[group] = [];
                groupTotals[group] = { stock: 0, cost: 0, total_cost: 0, total_price: 0, count: 0 };
            }

            const varPrices = product.var_price ? product.var_price : [];
            if (varPrices.length > 0) {
                // Show product with variations
                for (const variation of varPrices) {
                    const stock_amount = parseFloat(variation.stock) || 0;
                    if ((!stock_amount || stock_amount <= 0) && _req.query.stock !== 'all') {
                        continue; // skip zero stock variations
                    }

                    const productData = {
                        formula_cost: product.formula_cost,
                        variation: variation,
                        parent: variation.parent,
                        title: variation.title
                    };

                    const cost = await execCostFormula(settings, productData);
                    const price = parseFloat(variation.price) || 0;
                    const total_cost = cost * stock_amount;
                    const total_price = price * stock_amount;

                    groupedProducts[group].push({
                        title: `${product.title} ${variation.parent} ${variation.title}`,
                        sdesc: product.sdesc,
                        stock: stock_amount,
                        cost: cost,
                        price: price,
                        total_cost: total_cost,
                        total_price: total_price
                    });

                    groupTotals[group].stock += stock_amount;
                    groupTotals[group].total_cost += total_cost;
                    groupTotals[group].total_price += total_price;
                    groupTotals[group].count += 1;
                }
            }
        }

        // Calculate grand totals
        let grandTotals = { stock: 0, total_cost: 0, total_price: 0, count: 0 };
        Object.values(groupTotals).forEach(total => {
            grandTotals.stock += total.stock;
            grandTotals.total_cost += total.total_cost;
            grandTotals.total_price += total.total_price;
            grandTotals.count += total.count;
        });

        // Generate HTML report
        let htmlReport = `
            <html>
            <head>
                <title>Inventory Report</title>
                <style>
                    @page { size: A4; margin: 0.24in; }
                    body { font-family: Arial, sans-serif; margin: 0; max-width: 210mm; padding: 20px; box-sizing: border-box; }
                    h3{ margin-bottom: 8px; }
                    table { border-collapse: collapse; width: 100%; font-size:0.8rem; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .amount { text-align: right; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .report-title { text-align: left; }
                    .report-date { text-align: right; }
                    .group-header { background-color: #e6f3ff; font-weight: bold; }
                    .group-total { background-color: #f0f8ff; font-weight: bold; }
                    .grand-total { background-color: #e9e9e9; font-weight: bold; }
                </style>
            </head>
            <body>
            <div class="header">
                <div class="report-title">${__html(locale, 'Report')}</div>
                <div class="report-date">${today}</div>
            </div>
        `;

        // Generate tables for each group
        Object.keys(groupedProducts).sort().forEach(groupName => {
            const groupItems = groupedProducts[groupName];
            const groupTotal = groupTotals[groupName];

            if (groupItems.length === 0) return;

            let displayGroupName = groupName;
            if (settings.groups && Array.isArray(settings.groups)) {
                const foundGroup = settings.groups.find(g => g.id === groupName);
                if (foundGroup && foundGroup.name) {
                    displayGroupName = foundGroup.name;
                }
            }

            htmlReport += `
                <h3>${__html(locale, displayGroupName)}</h3>
                <table>
                    <thead>
                    <tr>
                        <th>Nr</th>
                        <th>${__html(locale, 'Product')}</th>
                        <th>${__html(locale, 'MC')}</th>
                        <th>${__html(locale, 'Price')}</th>
                        <th>${__html(locale, 'Stock')}</th>
                        <th>${__html(locale, 'Total MC')}</th>
                        <th>${__html(locale, 'Total Price')}</th>
                    </tr>
                    </thead>
                    <tbody>
            `;

            groupItems.forEach((item, index) => {
                htmlReport += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            ${item.title}
                            ${item.sdesc ? `<div style="font-size: 0.8em; color: #555;">${item.sdesc}</div>` : ''}
                        </td>
                        <td class="amount">${priceFormat(settings, item.cost)}</td>
                        <td class="amount">${priceFormat(settings, item.price)}</td>
                        <td class="amount">${item.stock}</td>
                        <td class="amount">${priceFormat(settings, item.total_cost)}</td>
                        <td class="amount">${priceFormat(settings, item.total_price)}</td>
                    </tr>
                `;
            });

            htmlReport += `
                    </tbody>
                    <tfoot>
                        <tr class="group-total">
                            <td colspan="4">${__html(locale, 'Total')} (${__html(locale, `%1$ items`, groupTotal.count)})</td>
                            <td class="amount">${groupTotal.stock}</td>
                            <td class="amount">${priceFormat(settings, groupTotal.total_cost)}</td>
                            <td class="amount">${priceFormat(settings, groupTotal.total_price)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        });

        // Add grand total summary
        htmlReport += `
            <table>
                <tfoot>
                    <tr class="grand-total">
                        <td colspan="4">${__html(locale, 'Grand Total')} (${__html(locale, `%1$ items`, grandTotals.count)})</td>
                        <td class="amount">${grandTotals.stock}</td>
                        <td class="amount">${priceFormat(settings, grandTotals.total_cost)}</td>
                        <td class="amount">${priceFormat(settings, grandTotals.total_price)}</td>
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

            // CRITICAL: Use print media emulation for PDF
            await page.emulateMedia({ media: 'print' });

            const doc_path = '/app/server/document/pdf/report-stock.pdf';
            const pdfBuffer = await page.pdf({
                path: doc_path,
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '15mm', right: '15mm' }
            });

            await browser.close();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'filename="report-stock.pdf"');
            res.send(pdfBuffer);

        } else {

            res.setHeader('Content-Type', 'text/html');
            res.send(htmlReport);
        }
    });
}

export default execInventoryReportApi;
