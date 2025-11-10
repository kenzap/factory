import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

async function getMetalStock(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '', items: false }) {

    const db = getDbConnection();

    let log = [];

    let query = `
        SELECT
            _id,
            js->'data'->'supplier' AS supplier,
            js->'data'->'qty' AS qty,
            js->'data'->'type' AS type,
            js->'data'->'status' AS status,
            js->'data'->'product_id' AS product_id,
            js->'data'->'product_name' AS product_name,
            js->'data'->'parent_coil_id' AS parent_coil_id,
            js->'data'->'color' AS color,
            js->'data'->'coating' AS coating,
            js->'data'->'width' AS width,
            js->'data'->'length' AS length,
            js->'data'->'thickness' AS thickness,
            js->'data'->'parameters' AS parameters,
            js->'data'->'origin' AS origin,
            js->'data'->'date' AS date,
            js->'data'->'notes' AS notes,
            js->'data'->'price' AS price
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'type' = 'metal' AND js->'data'->>'status' = 'available' AND (js->'data'->>'length')::numeric > 0
    `;

    let params = ['supplylog', sid];

    // query filters
    if (filters) {
        // if (filters.product) {
        //     query += ` AND js->'data'->>'product_name' ILIKE $${params.length + 1}`;
        //     params.push(`%${filters.product}%`);
        // }
        // if (filters.product_id) {
        //     query += ` AND js->'data'->>'product_id' ILIKE $${params.length + 1}`;
        //     params.push(`%${filters.product_id}%`);
        // }
        if (filters.color) {
            query += ` AND js->'data'->>'color' = $${params.length + 1}`;
            params.push(filters.color);
        }
        if (filters.coating) {
            query += ` AND js->'data'->>'coating' = $${params.length + 1}`;
            params.push(filters.coating);
        }
        // if (filters.dateFrom) {
        //     query += ` AND js->'data'->>'date' >= $${params.length + 1}`;
        //     params.push(filters.dateFrom);
        // }
        // if (filters.dateTo) {
        //     query += ` AND js->'data'->>'date' <= $${params.length + 1}`;
        //     params.push(filters.dateTo);
        // }
    }

    query += ` ORDER BY js->'data'->>'date' DESC LIMIT 100`;

    try {

        await db.connect();

        const result = await db.query(query, params);

        log = result.rows;

    } finally {
        await db.end();
    }

    return log;
}

/**
 * Get orders for cutting
 * 
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getOrdersForCutting(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '', items: false }) {

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

    // if (filters.type == 'draft') {
    //     query += ` AND (js->'data'->'draft')::boolean = true`;
    // }

    // if (filters.for && filters.for === 'orders') {
    //     query += ` AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)`;
    // }

    // if (filters.for && filters.for === 'manufacturing') {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    query += ` AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) AND js->'data'->'due_date' IS NOT NULL AND js->'meta'->>'created' >= $${params.length + 1} `;
    params.push(parseInt(twoMonthsAgo.getTime()));
    // }

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
function getOrdersForCuttingApi(app) {

    app.post('/api/get-orders-for-cutting/', authenticateToken, async (req, res) => {
        try {

            console.log('/api/get-orders/', req.body.filters);

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const orders = await getOrdersForCutting(filters);
            const stock = await getMetalStock(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "system_of_units"]);

            res.send({ success: true, settings, orders, stock, locale, user: req?.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersForCuttingApi;