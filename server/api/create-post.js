import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create post
 *
 * @version 1.0
 * @param {JSON} data - Product post
 * @returns {Array<Object>} - Response
*/
async function createPost(data) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        if (!data._id) {

            data._id = makeId();
            data.created = Date.now();
            data.updated = Date.now();
        }

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id`;

        const params = [data._id, 0, 'blog-post', sid, JSON.stringify({ data: data, meta: { created: Date.now(), updated: Date.now() } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function createPostApi(app) {

    app.post('/api/create-post/', authenticateToken, async (_req, res) => {

        // console.log('/api/create-product/ _req.body', _req.body);

        const data = _req.body;
        const response = await createPost(data);

        res.json({ success: true, response });
    });
}

export default createPostApi;