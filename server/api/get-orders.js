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
            COALESCE(js->'data'->'price'->>'grand_total', '') as total,
            COALESCE(js->'data'->>'operator', '') as operator,
            COALESCE(js->'data'->>'due_date', '') as due_date,
            CASE WHEN js->'data'->'draft' IS NOT NULL THEN (js->'data'->'draft')::boolean ELSE false END as draft,
            js->'data'->'inventory' as inventory,
            js->'data'->'invoice' as invoice,
            js->'data'->'payment' as payment,
            js->'data'->'waybill' as waybill,
            js->'data'->'date' as date,
            COALESCE(js->'meta'->>'created', '') as created,
            COALESCE(js->'data'->>'created', '') as created2
            ${filters.items === true ? `, js->'data'->'items' as items` : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    let query_summary = `
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN js->'data'->'payment'->>'amount' IS NOT NULL AND js->'data'->'payment'->>'amount' != '' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END) as total_paid,
            SUM(CASE WHEN js->'data'->'price'->>'grand_total' IS NOT NULL AND js->'data'->'price'->>'grand_total' != '' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END) as total_amount,
            SUM(CASE WHEN js->'data'->'waybill'->>'date' IS NOT NULL AND js->'data'->'waybill'->>'date' != '' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END) as total_waybill
        FROM data 
        WHERE ref = $1 AND sid = $2`;

    const params = ['ecommerce-order', sid];

    let chunk = null;

    if (filters.client?.eid) {
        chunk = ` AND (js->'data'->>'eid' = $${params.length + 1} OR unaccent(js->'data'->>'name') ILIKE unaccent($${params.length + 2}))`;
        query += chunk;
        query_summary += chunk
        params.push(`${filters.client.eid.trim()}`);
        params.push(`${filters.client.name.trim()}`);
    }

    if (filters.dateFrom && filters.dateFrom.trim() !== '') {
        chunk = ` AND (js->'data'->>'date' >= $${params.length + 1})`;
        query += chunk;
        query_summary += chunk
        params.push(filters.dateFrom.trim());
    }

    // Handle dateTo by adding one day to include the entire day, ex, from 20 Nov to 20 Nov
    if (filters.dateTo && filters.dateTo.trim() !== '') {
        chunk = ` AND (js->'data'->>'date' <= $${params.length + 1})`;
        query += chunk;
        query_summary += chunk
        params.push(filters.dateTo.trim());
    }

    if (filters.type == 'draft') {
        chunk = ` AND (js->'data'->'draft')::boolean = true`;
        query += chunk;
        query_summary += chunk
    }

    if (filters.for === 'orders') {
        chunk = ` AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)`;
        query += chunk;
        query_summary += chunk
    }

    if (filters.for && filters.for === 'manufacturing') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 1);
        chunk = ` AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) AND js->'data'->'due_date' IS NOT NULL
        AND EXISTS (    
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE (item->'inventory'->>'isu_date' IS NULL 
               OR item->'inventory'->>'isu_date' = ''
               OR item->'inventory'->>'isu_date' >= $${params.length + 1})
        ) `;
        query += chunk;
        query_summary += chunk
        // params.push(twoMonthsAgo);
        params.push(oneWeekAgo);
    }

    if (filters.type == 'manufacturing') {
        chunk = ` AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) AND NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'isu_date' IS NOT NULL 
               AND item->'inventory'->>'isu_date' != ''
        )`;
        query += chunk;
        query_summary += chunk
    }

    if (filters.type == 'ready') {
        chunk = ` AND NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'rdy_date' IS NULL 
               OR item->'inventory'->>'rdy_date' = ''
        ) AND NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'isu_date' IS NOT NULL 
               AND item->'inventory'->>'isu_date' != ''
        ) AND jsonb_array_length(js->'data'->'items') > 0`;
        query += chunk;
        query_summary += chunk
    }

    if (filters.type == 'issued') {
        chunk = ` AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'isu_date' IS NOT NULL 
               AND item->'inventory'->>'isu_date' != ''
        ) AND jsonb_array_length(js->'data'->'items') > 0`;
        query += chunk;
        query_summary += chunk;
    }

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

        const result = await db.query(query, params);

        orders.records = result.rows;

        if (filters.for === 'orders' || filters.for === 'transactions') {

            const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
            const countResult = await db.query(query_summary, countParams);

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