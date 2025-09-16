import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete supply by id
 *
 * List orders
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteProductBundle(id) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['product-bundle', sid, id];

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
function deleteProductBundleApi(app) {

    app.post('/api/delete-product-bundle/', authenticateToken, async (_req, res) => {

        const response = await deleteProductBundle(_req.body.id);

        // console.log('delete response', response);

        res.json({ success: true, response });
    });
}

export default deleteProductBundleApi;