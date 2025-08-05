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
async function getOrders(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '2' }) {

    const client = getDbConnection();

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
                COALESCE(js->'data'->>'mnf_date', '') as mnf_date,
                COALESCE(js->'data'->>'dsp_date', '') as dsp_date,
                COALESCE(js->'data'->>'isu_date', '') as isu_date,
                COALESCE(js->'data'->>'inv_date', '') as inv_date,
                COALESCE(js->'data'->>'invoice', '') as invoice,
                COALESCE(js->'data'->>'pay_date', '') as pay_date,
                COALESCE(js->'data'->>'wbl_date', '') as wbl_date,
                COALESCE(js->'data'->>'waybill', '') as waybill,
                COALESCE(js->'data'->>'created', '') as created
                ${filters.items === true ? `, js->'data'->'items' as items` : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    const params = ['ecommerce-order', sid];

    if (filters.client?.name && filters.client.name.trim() !== '') {
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

    if (typeof filters.draft === 'boolean') {
        query += ` AND js->'data'->'draft' = $${params.length + 1}`;
        params.push(filters.draft);
    }

    query += ` ORDER BY js->'data'->>'created' DESC LIMIT 1000`;

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
function getOrdersApi(app) {

    app.post('/api/get-orders/', authenticateToken, async (req, res) => {
        try {

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const orders = await getOrders(filters);
            const settings = await getSettings();

            res.send({ success: true, settings, orders, locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersApi;