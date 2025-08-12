import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getLocales, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Get Supply Log
 *
 * @version 1.0
 * @param {Object} filters - Filters for the supply log
 * @returns {Array<Object>} - Orders
*/
async function getSupplyLog(filters) {

    const db = getDbConnection();
    let log = [];

    let query = `
        SELECT
            _id,
            js->'data'->'supplier' AS supplier,
            js->'data'->'qty' AS qty,
            js->'data'->'product_id' AS product_id,
            js->'data'->'product_name' AS product_name,
            js->'data'->'color' AS color,
            js->'data'->'coating' AS coating,
            js->'data'->'origin' AS origin,
            js->'data'->'document' AS document,
            js->'data'->'date' AS date,
            js->'data'->'notes' AS notes,
            js->'data'->'price' AS price
        FROM data
        WHERE ref = $1 AND sid = $2 
    `;

    let params = ['supplylog', sid];

    // query filters
    if (filters) {
        if (filters.product) {
            query += ` AND js->'data'->>'product_name' ILIKE $${params.length + 1}`;
            params.push(`%${filters.product}%`);
        }
        if (filters.product_id) {
            query += ` AND js->'data'->>'product_id' ILIKE $${params.length + 1}`;
            params.push(`%${filters.product_id}%`);
        }
        if (filters.color) {
            query += ` AND js->'data'->>'color' = $${params.length + 1}`;
            params.push(filters.color);
        }
        if (filters.coating) {
            query += ` AND js->'data'->>'coating' = $${params.length + 1}`;
            params.push(filters.coating);
        }
        if (filters.dateFrom) {
            query += ` AND js->'data'->>'date' >= $${params.length + 1}`;
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += ` AND js->'data'->>'date' <= $${params.length + 1}`;
            params.push(filters.dateTo);
        }
    }

    query += ` ORDER BY js->'data'->>'date' DESC LIMIT 100`;

    console.log(filters);

    // execute query
    try {

        await db.connect();

        // get products
        const result = await db.query(query, params);
        if (result.rows.length > 0) {
            log = result.rows;
        }

    } finally {
        await db.end();
    }

    return log;
}

// API route for product export
function getSupplyLogApi(app) {

    app.post('/api/get-supply-log/', authenticateToken, async (req, res) => {
        try {

            const records = await getSupplyLog(req.body.filters);
            const locale = await getLocale();
            const locales = await getLocales();
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "price"]);

            res.send({ success: true, settings, locale, locales, records: records, user: req.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get records' });
            log(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getSupplyLogApi;