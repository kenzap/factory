import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete post by id
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Response
*/
async function deletePost(id) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['blog-post', sid, id];

    try {

        await db.connect();

        const result = await db.query(query, params);

        response = result.rows;

    } finally {
        await db.end();
    }

    return response;
}

// API route
function deletePostApi(app) {

    app.post('/api/delete-post/', authenticateToken, async (_req, res) => {

        console.log('delete ', _req.body);

        const response = await deletePost(_req.body.id);

        res.json({ success: true, response });
    });
}

export default deletePostApi;