import { getDbConnection, log, sid } from '../_/helpers/index.js';


async function test() {

    const db = getDbConnection();

    let response = { records: [], total: 0 };

    // Get orders
    let query = `
        SELECT _id
        FROM data 
        WHERE ref = $1 AND sid = $2 LIMIT 1`;

    const params = ['entity', sid];

    try {

        await db.connect();

        const result = await db.query(query, params);

        response.records = result.rows;
        response.total = result.rows.length;

    } finally {
        await db.end();
    }

    return response;
}

// API route
function getClientsApi(app) {

    app.get('/api/test/', async (req, res) => {
        // app.get('/api/test/', authenticateToken, async (req, res) => {
        try {

            // const locale = await getLocale(req.headers?.locale);
            const response = await test();

            res.send({ success: true, user: req.user, response, mode: process.env.NODE_ENV, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records', message: err.message });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getClientsApi;