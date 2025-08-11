import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create or save client data
 *
 * List orders
 *
 * @version 1.0
 * @param {JSON} data - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function createUser(data) {

    const client = getDbConnection();

    if (!data) return { success: false, error: 'no data provided' };

    // fac3f1a7e335d4fd27b0c20910e37157a234f3ed
    if (!data._id) data._id = makeId();

    let response = null;

    // Get orders
    let query = `
        INSERT INTO data (_id, pid, ref, sid, js)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (_id)
        DO UPDATE SET
            js = EXCLUDED.js
        RETURNING _id`;

    const params = [data._id, 0, 'user', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

    try {

        await client.connect();

        const result = await client.query(query, params);

        response = result.rows;

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function createUserApi(app) {

    app.post('/api/create-user/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await createUser(data);

        res.json({ success: true, response });
    });
}

export default createUserApi;