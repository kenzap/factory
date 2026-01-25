import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

async function getOrderItemsCountByColorCoating(filters = { cm: false }) {

    const db = getDbConnection();
    let results = [];

    let query = `
        SELECT 
            item->>'color' as color,
            item->>'coating' as coating,
            COUNT(*) as count
        FROM data,
        jsonb_array_elements(js->'data'->'items') AS item
        WHERE ref = $1 AND sid = $2 AND js->'data'->'deleted' IS NULL
        AND (js->'data'->'draft')::boolean = false 
        AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)
        AND jsonb_array_length(js->'data'->'items') > 0
    `;

    const params = ['order', sid];

    // Filter by client material flag
    if (filters.cm === true) {
        query += ` AND (item->>'cm' = 'true')`;
    } else if (filters.cm === false) {
        query += ` AND (item->>'cm' IS NULL OR item->>'cm' = 'false')`;
    }

    // Exclude items that have been issued or written off
    query += ` AND (
        (item->'inventory'->>'isu_date' IS NULL OR item->'inventory'->>'isu_date' = '') AND
        (item->'inventory'->>'wrt_date' IS NULL)
    )`;

    query += ` GROUP BY item->>'color', item->>'coating'
               ORDER BY count DESC, color, coating`;

    try {
        await db.connect();
        const result = await db.query(query, params);
        results = result.rows;
    } finally {
        await db.end();
    }

    return results;
}

// API route 
function getOrdersForCuttingApi(app, logger) {

    app.post('/api/get-orders-cutting-summary/', authenticateToken, async (req, res) => {
        try {

            logger.info('/api/get-orders-cutting-summary/', req.body.filters);

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const summary = await getOrderItemsCountByColorCoating(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "system_of_units"]);

            res.send({ success: true, settings, summary, locale, user: req?.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersForCuttingApi;