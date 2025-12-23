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

    // Get orders - optimized query
    let query = `
        SELECT _id, 
            js->'data'->>'id' as id, 
            js->'data'->>'from' as from, 
            js->'data'->>'name' as name, 
            js->'data'->>'eid' as eid, 
            js->'data'->>'notes' as notes,
            js->'data'->'price'->>'grand_total' as total,
            js->'data'->>'operator' as operator,
            js->'data'->>'due_date' as due_date,
            COALESCE((js->'data'->'draft')::boolean, false) as draft,
            js->'data'->'inventory' as inventory,
            js->'data'->'invoice' as invoice,
            js->'data'->'payment' as payment,
            js->'data'->'waybill' as waybill,
            js->'data'->'date' as date
            ${filters.items ? ', js->\'data\'->\'items\' as items' : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    let query_summary = `
        SELECT
            COUNT(*) as total,
            COALESCE(SUM((js->'data'->'payment'->>'amount')::numeric), 0) as total_paid,
            COALESCE(SUM((js->'data'->'price'->>'grand_total')::numeric), 0) as total_amount,
            COALESCE(SUM(CASE WHEN js->'data'->'waybill'->>'date' IS NOT NULL AND js->'data'->'waybill'->>'date' != '' THEN (js->'data'->'price'->>'grand_total')::numeric ELSE 0 END), 0) as total_waybill
        FROM data 
        WHERE ref = $1 AND sid = $2`;

    const params = ['order', sid];
    let whereConditions = [];

    // Build WHERE conditions dynamically
    if (filters.client?.eid) {
        whereConditions.push(`(js->'data'->>'eid' = $${params.length + 1} OR unaccent(js->'data'->>'name') ILIKE unaccent($${params.length + 2}))`);
        params.push(`${filters.client.eid.trim()}`);
        params.push(`${filters.client.name.trim()}`);
    }

    // Date filtering logic (consolidated)
    const dateField = filters.type === 'waybills' ? "js->'data'->'waybill'->>'date'" : "js->'data'->>'date'";

    if (filters.dateFrom?.trim()) {
        whereConditions.push(`(${dateField} >= $${params.length + 1})`);
        params.push(filters.dateFrom.trim());
    }

    if (filters.dateTo?.trim()) {
        whereConditions.push(`(${dateField} <= $${params.length + 1})`);
        params.push(filters.dateTo.trim());
    }

    // Type-specific filters
    if (filters.type === 'draft') {
        whereConditions.push(`(js->'data'->'draft')::boolean = true`);
    }

    if (filters.for === 'orders') {
        whereConditions.push(`((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)`);
    }

    if (filters.for === 'manufacturing') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 1);
        whereConditions.push(`((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) 
            AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) 
            AND js->'data'->'due_date' IS NOT NULL
            AND EXISTS (    
                SELECT 1 
                FROM jsonb_array_elements(js->'data'->'items') AS item 
                WHERE (item->'inventory'->>'isu_date' IS NULL 
                   OR item->'inventory'->>'isu_date' = ''
                   OR item->'inventory'->>'isu_date' >= $${params.length + 1})
            )`);
        params.push(oneWeekAgo);
    }

    if (filters.type === 'manufacturing') {
        whereConditions.push(`((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)`);
    }

    if (filters.type === 'ready') {
        whereConditions.push(`NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'rdy_date' IS NULL 
               OR item->'inventory'->>'rdy_date' = ''
        ) AND NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'isu_date' IS NOT NULL 
               AND item->'inventory'->>'isu_date' != ''
        ) AND jsonb_array_length(js->'data'->'items') > 0`);
    }

    if (filters.type === 'issued') {
        whereConditions.push(`EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->'inventory'->>'isu_date' IS NOT NULL 
               AND item->'inventory'->>'isu_date' != ''
        ) AND jsonb_array_length(js->'data'->'items') > 0`);
    }

    // Append all WHERE conditions
    if (whereConditions.length > 0) {
        const whereClause = ` AND ${whereConditions.join(' AND ')}`;
        query += whereClause;
        query_summary += whereClause;
    }

    // Apply sorting and pagination
    const limit = Math.min(filters.limit || 250, 1000); // Cap at 1000
    const offset = filters.offset || 0;

    const sortBy = filters.sort_by || 'date';
    const sortDir = filters.sort_dir || 'desc';

    const orderByMap = {
        'name': `js->'data'->>'name'`,
        'id': `(js->'data'->>'id')::integer`,
        'entity': `js->'data'->>'entity'`,
        'created': `js->'data'->>'created'`,
        'date': `js->'data'->>'date'`
    };

    const orderByClause = orderByMap[sortBy] || orderByMap['created'];
    query += ` ORDER BY ${orderByClause} ${sortDir.toUpperCase()} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit);
    params.push(offset);

    try {
        await db.connect();

        // Run queries in parallel when possible
        const [result, countResult] = await Promise.all([
            db.query(query, params),
            (filters.for === 'orders' || filters.for === 'transactions')
                ? db.query(query_summary, params.slice(0, -2))
                : Promise.resolve(null)
        ]);

        orders.records = result.rows;

        if (countResult) {
            orders.total = parseInt(countResult.rows[0].total);
            orders.summary = {
                total: parseFloat(countResult.rows[0].total_amount) || 0,
                paid: parseFloat(countResult.rows[0].total_paid) || 0,
                waybill: parseFloat(countResult.rows[0].total_waybill) || 0
            };

            // Optimize item filtering - only load items when needed
            if (filters.items && orders.records?.length > 0) {
                orders.records.forEach(order => {
                    if (order.items && Array.isArray(order.items)) {
                        order.items = order.items.map(item => ({
                            inventory: item.inventory
                        }));
                    }
                });
            }
        }

    } finally {
        await db.end();
    }

    return orders;
}

// API route
function getOrdersApi(app) {

    app.post('/api/get-orders/', authenticateToken, async (req, res) => {

        const startTime = Date.now();

        try {

            console.log('/api/get-orders/', req.body.filters);

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const orders = await getOrders(filters);

            const processingTime = (Date.now() - startTime);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "price", "groups"]);

            // const processingTime = (Date.now() - startTime);

            res.send({ success: true, settings, user: req.user, orders, locale, processingTime });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersApi;