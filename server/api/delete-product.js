import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete product by id
 *
 * List orders
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteProduct(id) {

    const client = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['product', sid, id];

    try {

        await client.connect();

        const result = await client.query(query, params);

        response = result.rows;

    } finally {
        await client.end();
    }

    return response;
}

// API route
function deleteProductApi(app) {

    app.post('/api/delete-product/', authenticateToken, async (_req, res) => {

        console.log('delete ', _req.body);

        const response = await deleteProduct(_req.body.id);

        console.log('delete response', response);

        res.json({ success: true, response, message: 'product removed' });
    });
}

export default deleteProductApi;