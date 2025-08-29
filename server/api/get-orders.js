import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Kenzap Factory Get Products
 *
 * List orders
 *
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getOrders(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '', items: false }) {

    const db = getDbConnection();

    let orders = {};

    // Get orders
    let query = `
        SELECT _id, 
                COALESCE(js->'data'->>'id', '') as id, 
                COALESCE(js->'data'->>'from', '') as from, 
                COALESCE(js->'data'->>'name', '') as name, 
                COALESCE(js->'data'->>'notes', '') as notes,
                COALESCE(js->'data'->'price'->>'total', '') as total,
                COALESCE(js->'data'->>'operator', '') as operator,
                COALESCE(js->'data'->>'due_date', '') as due_date,
                CASE WHEN js->'data'->'draft' IS NOT NULL THEN (js->'data'->'draft')::boolean ELSE false END as draft,
                js->'data'->'inventory' as inventory,
                js->'data'->'invoice' as invoice,
                js->'data'->'payment' as payment,
                js->'data'->'waybill' as waybill,
                COALESCE(js->'meta'->>'created', '') as created,
                COALESCE(js->'data'->>'created', '') as created2
                ${filters.items === true ? `, js->'data'->'items' as items` : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    const params = ['ecommerce-order', sid];

    if (filters.client?.name && filters.db.name.trim() !== '') {
        query += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
        params.push(`%${filters.client.name.trim()}%`);
    }

    if (filters.dateFrom && filters.dateFrom.trim() !== '') {
        query += ` AND js->'data'->>'created' >= $${params.length + 1}`;
        params.push(new Date(filters.dateFrom.trim()).getTime());
    }

    if (filters.dateTo && filters.dateTo.trim() !== '') {
        query += ` AND js->'data'->>'created' <= $${params.length + 1}`;
        params.push(new Date(filters.dateTo.trim()).getTime());
    }

    if (filters.type == 'draft') {
        query += ` AND (js->'data'->'draft')::boolean = true`;
    }

    if (filters.for && filters.for === 'orders') {
        query += ` AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)`;
    }

    if (filters.for && filters.for === 'manufacturing') {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        query += ` AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) AND js->'data'->'due_date' IS NOT NULL AND js->'meta'->>'created' >= $${params.length + 1} `;
        params.push(parseInt(twoMonthsAgo.getTime()));
    }

    if (filters.type == 'issued') {
        query += ` AND js->'data'->'inventory'->>'isu_date' IS NOT NULL AND js->'data'->'inventory'->>'isu_date' != ''`;
    }

    if (filters.type == 'manufactured') {
        query += ` AND js->'data'->'inventory'->>'mnf_date' IS NOT NULL AND js->'data'->'inventory'->>'mnf_date' != ''`;
    }

    query += ` ORDER BY js->'data'->>'id' DESC LIMIT 1000`;

    try {

        await db.connect();

        const result = await db.query(query, params);

        orders = result.rows;

    } finally {
        await db.end();
    }

    return orders;
}

// API route
function getOrdersApi(app) {

    app.post('/api/get-orders/', authenticateToken, async (req, res) => {
        try {

            console.log('/api/get-orders/', req.body.filters);

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const orders = await getOrders(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc"]);

            res.send({ success: true, settings, user: req.user, orders, locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersApi;