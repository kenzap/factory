import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocales, getSettings, log, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

async function getUsers() {
    const db = getDbConnection();
    let users = [];

    try {
        await db.connect();

        const query = `
            SELECT
                _id,
                js->'data'->'fname' AS fname,
                js->'data'->'lname' AS lname
            FROM data
            WHERE ref = $1 AND sid = $2 AND jsonb_array_length(js->'data'->'rights') > 0
            LIMIT 100
        `;

        const result = await db.query(query, ['user', sid]);
        if (result.rows.length > 0) users = result.rows;
    } finally {
        await db.end();
    }

    return users;
}

async function getProductManufacturingReport(filters = {}) {
    const db = getDbConnection();
    let report = [];

    try {
        await db.connect();

        let query = `
            SELECT
                COALESCE(NULLIF(js->'data'->>'product_name', ''), js->'data'->>'title', '-') AS product_name,
                js->'data'->>'product_id' AS product_id,
                SUM(COALESCE((js->'data'->>'qty')::numeric, 0)) AS total_qty,
                SUM(COALESCE((js->'data'->>'time')::numeric, 0)) AS total_time
            FROM data
            WHERE ref = $1 AND sid = $2
        `;

        const params = ['worklog', sid];

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

        query += `
            GROUP BY product_name, product_id
            ORDER BY LOWER(COALESCE(NULLIF(js->'data'->>'product_name', ''), js->'data'->>'title', '-')) ASC
        `;

        const result = await db.query(query, params);
        if (result.rows.length > 0) report = result.rows;
    } finally {
        await db.end();
    }

    return report;
}

function getProductManufacturingReportApi(app) {
    app.post('/api/get-product-manufacturing-report/', authenticateToken, async (req, res) => {
        try {
            const users = await getUsers();
            const product_report = await getProductManufacturingReport(req.body.filters || {});
            const locale = await getLocale(req.headers);
            const locales = await getLocales();
            const settings = await getSettings(['work_categories']);

            res.send({
                success: true,
                user: req?.user,
                settings,
                locale,
                locales,
                users,
                product_report
            });
        } catch (err) {
            res.status(500).json({ error: 'failed to get product manufacturing report' });
            log(`Error getting product manufacturing report: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductManufacturingReportApi;
