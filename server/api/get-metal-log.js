import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getLocales, getSettings, sid } from '../_/helpers/index.js';

/**
 * Get Metal Log
 *
 * @version 1.0
 * @param {Object} filters - Filters for the metal log
 * @returns {Array<Object>} - Orders
*/
async function getMetalLog(filters) {

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
            js->'data'->'parameters' AS parameters,
            js->'data'->'color' AS color,
            js->'data'->'coating' AS coating,
            js->'data'->'width' AS width,
            js->'data'->'length' AS length,
            js->'data'->'thickness' AS thickness,
            js->'data'->'origin' AS origin,
            js->'data'->'document' AS document,
            js->'data'->'date' AS date,
            js->'data'->'notes' AS notes,
            js->'data'->'price' AS price
        FROM data
        WHERE ref = $1 AND sid = $2 AND (js->'data'->>'length')::numeric > 0
    `;

    let params = ['supplylog', sid];

    // query filters
    if (filters) {
        if (filters.width && filters.width == 1250) {
            query += ` AND (js->'data'->>'width')::numeric BETWEEN $${params.length + 1} AND $${params.length + 2}`;
            params.push(parseFloat(filters.width) - 5);
            params.push(parseFloat(filters.width) + 5);
        }
        if (filters.width && filters.width < 1250) {
            query += ` AND (js->'data'->>'width')::numeric < $${params.length + 1}`;
            params.push(1250);
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
function getMetalLogApi(app, logger) {

    app.post('/api/get-metal-log/', authenticateToken, async (req, res) => {
        try {

            const records = await getMetalLog(req.body.filters);
            const locale = await getLocale(req.headers?.locale);
            const locales = await getLocales();
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "price", "system_of_units"]);

            res.send({ success: true, user: req.user, settings, locale, locales, records: records });
        } catch (err) {

            logger.error(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);

            res.status(500).json({ error: 'failed to get records' });
        }
    });
}

export default getMetalLogApi;