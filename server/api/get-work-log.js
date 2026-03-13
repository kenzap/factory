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
        WHERE ref = $1 AND sid = $2 AND (js->'data'->>'portal' IS NOT NULL AND js->'data'->>'portal' <> '')
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
 * Build activity score map for worklog users based on recent records.
 * Score formula:
 * - today entries * 2
 * - last 7 days entries * 3
 * - last 30 days entries * 1
 */
async function getWorkLogActivityScores() {

    const db = getDbConnection();
    const scores = {};

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - (7 * dayMs));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * dayMs));

    try {
        await db.connect();

        const query = `
        SELECT
            js->'data'->>'user_id' AS user_id,
            js->'data'->>'date' AS date
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'date' >= $3
        ORDER BY js->'data'->>'date' DESC
        LIMIT 3000
        `;

        const result = await db.query(query, ['worklog', sid, thirtyDaysAgo.toISOString()]);

        for (const row of result.rows || []) {
            const userId = row.user_id;
            const entryDate = row.date ? new Date(row.date) : null;
            if (!userId || !entryDate || Number.isNaN(entryDate.getTime())) continue;

            if (!scores[userId]) {
                scores[userId] = {
                    score: 0,
                    today: 0,
                    week: 0,
                    month: 0,
                    last_activity: ''
                };
            }

            const bucket = scores[userId];

            if (entryDate >= startToday) bucket.today += 1;
            if (entryDate >= sevenDaysAgo) bucket.week += 1;
            if (entryDate >= thirtyDaysAgo) bucket.month += 1;
            if (!bucket.last_activity || entryDate.toISOString() > bucket.last_activity) {
                bucket.last_activity = entryDate.toISOString();
            }
        }

        for (const userId of Object.keys(scores)) {
            const bucket = scores[userId];
            bucket.score = (bucket.today * 2) + (bucket.week * 3) + bucket.month;
        }
    } finally {
        await db.end();
    }

    return scores;
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
            js->'data'->'order_ids' AS order_ids,
            js->'data'->'type' AS type,
            js->'data'->'date' AS date,
            js->'data'->'time' AS time,
            js->'data'->'tag' AS tag,
            js->'data'->'label' AS label
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
            const activityScores = await getWorkLogActivityScores();
            const locale = await getLocale(req.headers);
            const locales = await getLocales();
            const settings = await getSettings(["work_categories", "currency", "currency_symb", "currency_symb_loc", "price"]);

            res.send({ success: true, user: req.user, settings, locale, locales, records: records, users: users, activity_scores: activityScores });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getWorkLogApi;
