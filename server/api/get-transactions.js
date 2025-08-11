import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Get Transactions
 *
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getTransactions(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '' }) {

    const client = getDbConnection();

    let orders = {};

    // Get orders
    let query = `
        SELECT _id, 
                COALESCE(js->'data'->>'id', '') as id, 
                COALESCE(js->'data'->>'from', '') as from, 
                COALESCE(js->'data'->>'name', '') as name, 
                COALESCE(js->'data'->>'notes', '') as notes,
                COALESCE(js->'data'->>'operator', '') as operator,
                COALESCE(js->'data'->'price'->>'total', '') as total,
                COALESCE(js->'data'->>'created', '') as created,
                js->'data'->'invoice' as invoice,
                js->'data'->'payment' as payment,
                js->'data'->'waybill' as waybill
                ${filters.items === true ? `, js->'data'->'items' as items` : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    // additional fields
    // COALESCE(js->'data'->>'due_date', '') as due_date,
    // COALESCE(js->'data'->>'mnf_date', '') as mnf_date,
    // COALESCE(js->'data'->>'dsp_date', '') as dsp_date,
    // COALESCE(js->'data'->>'isu_date', '') as isu_date,

    const params = ['ecommerce-order', sid];

    if (filters.client?.name && filters.client.name.trim() !== '') {
        query += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
        params.push(`%${filters.client.name.trim()}%`);
    }

    if (filters.dateFrom && filters.dateFrom.trim() !== '') {
        query += ` AND js->'data'->'payment'->>'date' >= $${params.length + 1}`;
        params.push(filters.dateFrom.trim());
    }

    if (filters.dateTo && filters.dateTo.trim() !== '') {
        query += ` AND js->'data'->'payment'->>'date' <= $${params.length + 1}`;
        params.push(filters.dateTo.trim());
    }

    if (typeof filters.draft === 'boolean') {
        query += ` AND js->'data'->'draft' = $${params.length + 1}`;
        params.push(filters.draft);
    }

    if (filters.type && filters.type == 'paid') {
        query += ` AND COALESCE(NULLIF(js->'data'->'payment'->>'amount', ''), '0')::numeric > 0`;
    }

    if (filters.type && filters.type == 'unpaid') {
        query += ` AND COALESCE(NULLIF(js->'data'->'payment'->>'amount', ''), '0')::numeric = 0`;
    }

    if (filters.type && filters.type == 'transaction') {
        query += ` AND (js->'data'->'transaction')::boolean = true`;
    }

    query += ` ORDER BY js->'data'->>'id' DESC LIMIT 1000`;

    try {

        await client.connect();

        const result = await client.query(query, params);

        orders = result.rows;

    } finally {
        await client.end();
    }

    return orders;
}

// API route
function getTransactionsApi(app) {

    app.post('/api/get-transactions/', authenticateToken, async (req, res) => {
        try {

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const orders = await getTransactions(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc"]);

            res.send({ success: true, settings, orders, locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getTransactionsApi;