import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

/**
 * Retrieves the count of order items grouped by color and coating combination.
 * 
 * @async
 * @function getOrderItemsCountByColorCoating
 * @param {Object} [filters={ cm: false }] - Filter options for the query
 * @param {boolean} [filters.cm=false] - Client material flag filter. 
 *   - true: includes only items with client material
 *   - false: excludes items with client material
 *   - undefined: includes all items regardless of client material status
 * @returns {Promise<Array<Object>>} Promise that resolves to an array of objects containing:
 *   - color {string} - The color of the item
 *   - coating {string} - The coating of the item  
 *   - count {string} - The number of items with this color/coating combination
 * @description This function queries the database for order items that are:
 *   - Not deleted, not draft, and not transaction records
 *   - Not issued (no isu_date) and not written off (no wrt_date)
 *   - Groups results by color and coating, ordered by count (descending), then color and coating
 * @throws {Error} Database connection or query errors
 */
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