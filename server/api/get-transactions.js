import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Get Transactions
 *
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getTransactions(filters = { client: { name: "", eid: "" }, dateFrom: '', dateTo: '', type: '', offset: 0, limit: 250, items: false, draft: false, sort_by: 'id', sort_dir: 'desc' }) {

    const db = getDbConnection();

    let orders = { records: [], total: 0 };

    // Get orders
    let query = `
        SELECT _id, 
                COALESCE(js->'data'->>'id', '') as id, 
                COALESCE(js->'data'->>'from', '') as from, 
                COALESCE(js->'data'->>'name', '') as name, 
                COALESCE(js->'data'->>'notes', '') as notes,
                COALESCE(js->'data'->>'operator', '') as operator,
                COALESCE(js->'data'->'price'->>'grand_total', '') as total,
                COALESCE(js->'meta'->>'created', '') as created,
                COALESCE(js->'data'->>'created', '') as created2,
                js->'data'->'invoice' as invoice,
                js->'data'->'payment' as payment,
                js->'data'->'waybill' as waybill
                ${filters.items === true ? `, js->'data'->'items' as items` : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    const params = ['ecommerce-order', sid];

    // if (filters.client?.name && filters.client.name.trim() !== '') {
    //     query += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
    //     params.push(`%${filters.client.name.trim()}%`);
    // }

    if (filters.client?.eid) {
        query += ` AND js->'data'->>'eid' = $${params.length + 1}`;
        params.push(`${filters.client.eid.trim()}`);
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

        // Get total count for pagination
        const countQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN js->'data'->'payment'->>'amount' IS NOT NULL AND js->'data'->'payment'->>'amount' != '' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END) as total_paid,
                SUM(CASE WHEN js->'data'->>'total' IS NOT NULL AND js->'data'->>'total' != '' THEN (js->'data'->>'total')::numeric ELSE 0 END) as total_amount,
                SUM(CASE WHEN js->'data'->'waybill'->>'date' IS NOT NULL AND js->'data'->'waybill'->>'date' != '' THEN (js->'data'->>'total')::numeric ELSE 0 END) as total_waybill
            FROM data 
            WHERE ref = $1 AND sid = $2 ` +
            (filters.client?.eid ? ` AND js->'data'->>'eid' = $3` : '') +
            (filters.dateFrom && filters.dateFrom.trim() !== '' ? ` AND js->'data'->>'created' >= $${filters.client?.eid ? 4 : 3}` : '') +
            (filters.dateTo && filters.dateTo.trim() !== '' ? ` AND js->'data'->>'created' <= $${filters.client?.eid ? (filters.dateFrom && filters.dateFrom.trim() !== '' ? 5 : 4) : (filters.dateFrom && filters.dateFrom.trim() !== '' ? 4 : 3)}` : '') +
            (filters.type == 'draft' ? ` AND (js->'data'->'draft')::boolean = true` : '');

        const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
        const countResult = await db.query(countQuery, countParams);

        console.log(countResult.rows)

        orders.records = result.rows;
        orders.total = parseInt(countResult.rows[0].total);
        orders.summary = {
            total: parseFloat(countResult.rows[0].total_amount),
            paid: parseFloat(countResult.rows[0].total_paid),
            waybill: parseFloat(countResult.rows[0].total_waybill)
        };

    } finally {
        await db.end();
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