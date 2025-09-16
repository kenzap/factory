import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create supply record
 *
 * @version 1.0
 * @param {JSON} data - Supply record data
 * @returns {JSON<Object>} - Response
*/
async function createProductBundle(data) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        let _id = makeId();

        data.created = Math.floor(Date.now() / 1000);
        data.updated = Math.floor(Date.now() / 1000);
        data.date = new Date().toISOString();

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id`;

        const params = [_id, 0, 'product-bundle', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function createProductBundleApi(app) {

    app.post('/api/create-product-bundle/', authenticateToken, async (_req, res) => {

        console.log('/api/create-product-bundle/ _req.body', _req.body);

        const data = _req.body;
        const response = await createProductBundle(data);

        // console.log('/api/create-worklog-record/ response', response);

        res.json({ success: true, response });
    });
}

export default createProductBundleApi;