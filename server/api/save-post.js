import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Save post
 *
 * @version 1.0
 * @param {JSON} data - Post data
 * @returns {Array<Object>} - Response
*/
async function savePost(data) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        data.updated = new Date().toISOString();

        // Prepare update for only provided keys in data
        const updateKeys = Object.keys(data);

        // Chain jsonb_set calls to update multiple keys in one assignment
        const setClause = `js = ${updateKeys.reduce(
            (acc, key, idx) => `jsonb_set(${acc}, '{data,${key}}', $${idx + 4}::jsonb, true)`,
            'js'
        )}`;

        // Build dynamic query
        const query = `
            UPDATE data
            SET
            ${setClause}
            WHERE _id = $1 AND ref = $2 AND sid = $3
            RETURNING _id
        `;

        // Prepare params: first 3 are as before, then each value for update
        const params = [
            data._id,
            'blog-post',
            sid,
            ...updateKeys.map(key => JSON.stringify(data[key]))
        ];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// API route
function savePostApi(app) {

    app.post('/api/save-post/', authenticateToken, async (_req, res) => {

        // console.log('/api/save-product/', _req.body);

        const data = _req.body;
        const response = await savePost(data);

        res.json({ success: true, response });
    });
}

export default savePostApi;