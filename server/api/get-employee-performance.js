import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

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
        WHERE ref = $1 AND sid = $2 AND jsonb_array_length(js->'data'->'rights') > 0 LIMIT 100
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
async function getEmployeePerformance(filters) {

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

async function getWorkCategoriesByDayStats(filters) {

    const db = getDbConnection();
    let dailyStats = [];

    try {
        await db.connect();

        let query = `
                SELECT
                DATE(js->'data'->>'date') AS date,
                COUNT(*) AS count,
                SUM(CAST(js->'data'->>'qty' AS INTEGER)) AS total_qty
                FROM data
                WHERE ref = $1 AND sid = $2
            `;

        let params = ['worklog', sid];

        // query filters
        if (filters.user_id) {
            query += ` AND (js->'data'->>'user_id' = $${params.length + 1})`;
            params.push(filters.user_id);
        }

        if (filters.type) {
            query += ` AND (js->'data'->>'type' = $${params.length + 1})`;
            params.push(filters.type);
        }

        if (filters.dateFrom) {
            query += ` AND (js->'data'->>'date' >= $${params.length + 1})`;
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += ` AND (js->'data'->>'date' <= $${params.length + 1})`;
            params.push(filters.dateTo);
        }

        query += ` GROUP BY DATE(js->'data'->>'date') ORDER BY date DESC`;

        const result = await db.query(query, params);
        if (result.rows.length > 0) {
            dailyStats = result.rows;
        }

    } finally {
        await db.end();
    }

    return dailyStats;
}

async function getWorkCategoriesStats(filters, reportType) {

    const db = getDbConnection();
    let categories = [];

    try {
        await db.connect();

        // work log js structure example
        //   {
        //     "_id": "ym0hq437dvt8m9vio6up6pv8xr6n1c4a0xty92rv",
        //     "title": "Apakškore 25mm",
        //     "qty": 40,
        //     "product_id": "",
        //     "product_name": "Apakškore 25mm",
        //     "color": "2H3",
        //     "coating": "Polyester",
        //     "origin": "o",
        //     "user_id": "001ff236dfc8c086c7083e98b9e947bfaf8caf51",
        //     "type": "bending",
        //     "date": "2025-12-04T09:56:52.547Z",
        //     "time": 0
        // },

        let query = `
                SELECT
                js->'data'->>'type' AS type,
                ${reportType === 'employee_performance' ? "js->'data'->>'user_id' AS user_id," : ""}
                COUNT(*) AS count,
                SUM(CAST(js->'data'->>'qty' AS INTEGER)) AS total_qty
                FROM data
                WHERE ref = $1 AND sid = $2
            `;

        let params = ['worklog', sid];

        // query filters
        if (filters.user_id) {
            query += ` AND (js->'data'->>'user_id' = $${params.length + 1})`;
            params.push(filters.user_id);
        }

        if (filters.type) {
            query += ` AND (js->'data'->>'type' = $${params.length + 1})`;
            params.push(filters.type);
        }

        if (filters.dateFrom) {
            query += ` AND (js->'data'->>'date' >= $${params.length + 1})`;
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += ` AND (js->'data'->>'date' <= $${params.length + 1})`;
            params.push(filters.dateTo);
        }

        query += ` GROUP BY js->'data'->>'type'`;

        if (reportType === 'employee_performance') {
            query += `,js->'data'->>'user_id'`;
        }

        const result = await db.query(query, params);
        if (result.rows.length > 0) {
            categories = result.rows;
        }
    } finally {
        await db.end();
    }

    return categories;
}

// API route for product export
function getEmployeePerformanceApi(app) {

    app.post('/api/get-employee-performance/', authenticateToken, async (req, res) => {
        try {

            const users = await getUsers();
            const employee_performance = await getWorkCategoriesStats(req.body.filters, 'employee_performance');
            const work_categories_stats = await getWorkCategoriesStats(req.body.filters);
            const work_categories_by_day_stats = await getWorkCategoriesByDayStats(req.body.filters);
            const locale = await getLocale(req.headers);
            const locales = await getLocales();
            const settings = await getSettings(["work_categories", "currency", "currency_symb", "currency_symb_loc", "price"]);

            res.send({ success: true, user: req?.user, settings, locale, locales, work_categories_stats, work_categories_by_day_stats, employee_performance, users: users });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting employee performance report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getEmployeePerformanceApi;