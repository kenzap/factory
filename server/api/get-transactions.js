import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

/**
 * Get Transactions
 *
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getTransactions(filters = { client: { name: "", eid: "" }, dateFrom: '', dateTo: '', type: '', offset: 0, limit: 250, items: false, sort_by: 'id', sort_dir: 'desc' }) {

    const db = getDbConnection();

    let orders = { records: [], total: 0 };

    // transactions query
    let query = `
        SELECT _id, 
                COALESCE(js->'data'->>'id', '') as id, 
                COALESCE(js->'data'->>'from', '') as from, 
                COALESCE(js->'data'->>'name', '') as name, 
                COALESCE((js->'data'->'draft')::boolean, false) as draft,
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
        WHERE ref = $1 AND sid = $2 AND js->'data'->'deleted' IS NULL `;

    // transactions summary query
    let query_summary = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN js->'data'->'price'->>'grand_total' IS NOT NULL AND js->'data'->'price'->>'grand_total' != '' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END) as total_amount,
                SUM(CASE WHEN js->'data'->'payment'->>'amount' IS NOT NULL AND js->'data'->'payment'->>'amount' != '' THEN (js->'data'->'payment'->>'amount')::numeric ELSE 0 END) as total_paid,
                SUM(CASE WHEN js->'data'->'waybill'->>'date' IS NOT NULL AND js->'data'->'waybill'->>'date' != '' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END) as total_waybill
            FROM data
            WHERE ref = $1 AND sid = $2 `;

    const params = ['order', sid];

    // if (filters.client?.name && filters.client.name.trim() !== '') {
    //     query += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
    //     query_summary += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
    //     params.push(`%${filters.client.name.trim()}%`);
    // }

    let chunk = null;

    if (filters.client?.eid) {
        chunk = ` AND (js->'data'->>'eid' = $${params.length + 1} OR unaccent(js->'data'->>'name') ILIKE unaccent($${params.length + 2}))`;
        query += chunk;
        query_summary += chunk
        params.push(`${filters.client.eid.trim()}`);
        params.push(`${filters.client.name.trim()}`);
    }

    // filter by payment date
    if (filters.dateFrom.trim() !== '' && filters.for === 'transactions' && filters.type === 'paid') {
        chunk = ` AND (js->'data'->'payment'->>'date' >= $${params.length + 1})`;
        query += chunk;
        query_summary += chunk
        params.push(filters.dateFrom.trim());
    }

    if (filters.dateTo.trim() !== '' && filters.for === 'transactions' && filters.type === 'paid') {
        chunk = ` AND (js->'data'->'payment'->>'date' <= $${params.length + 1})`;
        query += chunk;
        query_summary += chunk
        params.push(filters.dateTo.trim());
    }

    // filter by payment date or waybill date
    if (filters.dateFrom.trim() !== '' && filters.for === 'transactions' && filters.type !== 'paid') {
        chunk = ` AND (js->'data'->'waybill'->>'date' >= $${params.length + 1} OR js->'data'->'payment'->>'date' >= $${params.length + 1})`;
        query += chunk;
        query_summary += chunk
        params.push(filters.dateFrom.trim());
    }

    if (filters.dateTo.trim() !== '' && filters.for === 'transactions' && filters.type !== 'paid') {
        chunk = ` AND (js->'data'->'waybill'->>'date' <= $${params.length + 1} OR js->'data'->'payment'->>'date' <= $${params.length + 1})`;
        query += chunk;
        query_summary += chunk
        params.push(filters.dateTo.trim());
    }

    if (typeof filters.draft === 'boolean') {
        chunk = ` AND js->'data'->'draft' = $${params.length + 1}`;
        query += chunk;
        query_summary += chunk
        params.push(filters.draft);
    }

    if (filters.type && filters.type == 'paid') {
        chunk = ` AND COALESCE(NULLIF(js->'data'->'payment'->>'amount', ''), '0')::numeric != 0`;
        query += chunk;
        query_summary += chunk
    }

    if (filters.type && filters.type == 'unpaid') {
        chunk = ` AND COALESCE(NULLIF(js->'data'->'payment'->>'amount', ''), '0')::numeric = 0`;
        query += chunk;
        query_summary += chunk
    }

    if (filters.type && filters.type == 'transaction') {
        chunk = ` AND (js->'data'->'transaction')::boolean = true`;
        query += chunk;
        query_summary += chunk
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
        const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
        const countResult = await db.query(query_summary, countParams);

        // console.log(countResult.rows)

        orders.records = result.rows;
        orders.total = parseInt(countResult.rows[0].total);
        orders.summary = {
            total: parseFloat(countResult.rows[0].total_amount) || 0,
            paid: parseFloat(countResult.rows[0].total_paid) || 0,
            waybill: parseFloat(countResult.rows[0].total_waybill) || 0
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

            const locale = await getLocale(req.headers);
            const filters = req.body.filters || {};
            const orders = await getTransactions(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc"]);

            res.send({ success: true, user: req.user, settings, orders, locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getTransactionsApi;