import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * List orders
 *
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getOrders(filters = { for: "", client: { name: "", eid: "" }, dateFrom: '', dateTo: '', type: '', offset: 0, limit: 250, items: false }) {

    const db = getDbConnection();

    let orders = { records: [], total: 0 };

    // Get orders
    let query = `
        SELECT _id, 
                COALESCE(js->'data'->>'id', '') as id, 
                COALESCE(js->'data'->>'from', '') as from, 
                COALESCE(js->'data'->>'name', '') as name, 
                COALESCE(js->'data'->>'eid', '') as eid, 
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

    // if (filters.client?.name && filters.db.name.trim() !== '') {
    //     query += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
    //     params.push(`%${filters.client.name.trim()}%`);
    // }

    if (filters.client?.eid) {
        query += ` AND (js->'data'->>'eid' = $${params.length + 1} OR unaccent(js->'data'->>'name') ILIKE unaccent($${params.length + 2}))`;
        params.push(`${filters.client.eid.trim()}`);
        params.push(`${filters.client.name.trim()}`);
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

    if (filters.for === 'orders') {
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

    // detect mnf_date dated based on items.inventory.rdy_date
    // if (filters.type == 'manufactured') {
    //     query += ` AND js->'data'->'inventory'->>'mnf_date' IS NOT NULL AND js->'data'->'inventory'->>'mnf_date' != ''`;
    // }

    // Apply pagination
    const limit = filters.limit || 250;
    const offset = filters.offset || 0;

    // Apply sorting
    const sortBy = filters.sort_by || 'created';
    const sortDir = filters.sort_dir || 'desc';

    let orderByClause = `js->'data'->>'created'`;
    switch (sortBy) {
        case 'name':
            orderByClause = `js->'data'->>'name'`;
            break;
        case 'id':
            orderByClause = `js->'data'->>'id'`;
            break;
        case 'entity':
            orderByClause = `js->'data'->>'entity'`;
            break;
        case 'created':
        default:
            orderByClause = `js->'data'->>'created'`;
            break;
    }

    query += ` ORDER BY ${orderByClause} ${sortDir.toUpperCase()} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit);
    params.push(offset);

    try {

        await db.connect();

        // console.log('getOrders query', query);
        // console.log('getOrders params', params);

        const result = await db.query(query, params);

        orders.records = result.rows;

        if (filters.for === 'orders' || filters.for === 'transactions') {

            // Get total count for pagination
            const countQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN js->'data'->'payment'->>'amount' IS NOT NULL AND js->'data'->'payment'->>'amount' != '' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END) as total_paid,
                SUM(CASE WHEN js->'data'->>'total' IS NOT NULL AND js->'data'->>'total' != '' THEN (js->'data'->>'total')::numeric ELSE 0 END) as total_amount,
                SUM(CASE WHEN js->'data'->'waybill'->>'date' IS NOT NULL AND js->'data'->'waybill'->>'date' != '' THEN (js->'data'->>'total')::numeric ELSE 0 END) as total_waybill
            FROM data 
            WHERE ref = $1 AND sid = $2 ` +
                (filters.client?.eid ? ` AND (js->'data'->>'eid' = $3 OR unaccent(js->'data'->>'name') ILIKE unaccent($4))` : '') +
                (filters.dateFrom && filters.dateFrom.trim() !== '' ? ` AND js->'data'->>'created' >= $${filters.client?.eid ? 5 : 3}` : '') +
                (filters.dateTo && filters.dateTo.trim() !== '' ? ` AND js->'data'->>'created' <= $${filters.client?.eid ? (filters.dateFrom && filters.dateFrom.trim() !== '' ? 6 : 5) : (filters.dateFrom && filters.dateFrom.trim() !== '' ? 4 : 3)}` : '') +
                (filters.type == 'draft' ? ` AND (js->'data'->'draft')::boolean = true` : '');

            const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
            const countResult = await db.query(countQuery, countParams);

            // console.log(countResult.rows)

            orders.total = parseInt(countResult.rows[0].total);
            orders.summary = {
                total: parseFloat(countResult.rows[0].total_amount),
                paid: parseFloat(countResult.rows[0].total_paid),
                waybill: parseFloat(countResult.rows[0].total_waybill)
            };
        }

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
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "price", "groups"]);

            res.send({ success: true, settings, user: req.user, orders, locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersApi;