import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Get Product List
 *
 * @version 1.0
 * @param {Object} filter - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getPost(id) {

    const db = getDbConnection();
    let post = [], meta = {};

    // Build base query
    let query = `
        SELECT
            _id,
            js->'data'->'title' AS title,
            js->'data'->'id' AS id,
            js->'data'->'img' AS img,
            js->'data'->'tags' AS tags,
            js->'data'->'slug' AS slug,
            js->'data'->'text' AS text,
            js->'data'->'author' AS author,
            js->'data'->'status' AS status,
            js->'data'->'updated' AS updated,
            js->'data'->'created' AS created,
            js->'data'->'language' AS language
        FROM data
        WHERE ref = $1 AND sid = $2 AND _id = $3
    `;

    let params = ['blog-post', sid, id];

    try {

        await db.connect();

        // get products
        const result = await db.query(query, params);
        post = result.rows[0];

    } finally {
        await db.end();
    }

    return post;
}

// API route for product export
function getPostApi(app) {

    app.post('/api/get-post/', authenticateToken, async (req, res) => {
        try {
            const id = req.body.id || null;
            const post = await getPost(id);
            const settings = await getSettings(['domain_name']);

            res.send({ success: true, post, settings });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getPostApi;