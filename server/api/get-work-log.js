import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getLocales, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Retrieves a list of users from the database.
 * 
 * @async
 * @function getUsers
 */
async function getUsers() {

    const db = getDbConnection();
    let users = [];

    try {
        await db.connect();

        let query = `
        SELECT
            _id,
            js->'data'->'fname' AS fname,
            js->'data'->'lname' AS lname
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->'rights' ? 'manage_stock'
        LIMIT 100
        `;

        const result = await db.query(query, ['user', sid]);
        if (result.rows.length > 0) {
            users = result.rows;
        }
    } finally {
        await db.end();
    }

    return users;
}

/**
 * Get WorkLog
 *
 * @version 1.0
 * @param {String} id - Product ID
 * @returns {Array<Object>} - Orders
*/
async function getWorkLog(filters) {

    const db = getDbConnection();
    let log = [];

    let query = `
        SELECT
            _id,
            js->'data'->'title' AS title,
            js->'data'->'qty' AS qty,
            js->'data'->'product_id' AS product_id,
            js->'data'->'product_name' AS product_name,
            js->'data'->'color' AS color,
            js->'data'->'coating' AS coating,
            js->'data'->'origin' AS origin,
            js->'data'->'user_id' AS user_id,
            js->'data'->'type' AS type,
            js->'data'->'date' AS date,
            js->'data'->'time' AS time,
            js->'data'->'type' AS type
        FROM data
        WHERE ref = $1 AND sid = $2 
    `;

    let params = ['worklog', sid];

    // query filters
    if (filters) {
        if (filters.product) {
            query += ` AND js->'data'->>'product_name' ILIKE $${params.length + 1}`;
            params.push(`%${filters.product}%`);
        }
        if (filters.user_id) {
            query += ` AND js->'data'->>'user_id' = $${params.length + 1}`;
            params.push(filters.user_id);
        }
        if (filters.type) {
            query += ` AND js->'data'->>'type' = $${params.length + 1}`;
            params.push(filters.type);
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

    // console.log(filters);

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
function getWorkLogApi(app) {

    app.post('/api/get-work-log/', authenticateToken, async (req, res) => {
        try {

            const users = await getUsers();
            const records = await getWorkLog(req.body.filters);
            const locale = await getLocale(req.headers?.locale);
            const locales = await getLocales();
            const settings = await getSettings(["work_categories", "currency", "currency_symb", "currency_symb_loc", "price"]);

            res.send({ success: true, settings, locale, locales, records: records, users: users, user: req.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getWorkLogApi;