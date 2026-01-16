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
async function deleteProductBundle(all, product_id, bundle_id, id) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    console.log('Delete product bundle called with', { all, product_id, bundle_id, id });



    try {

        await db.connect();

        // Delete all similar product bundles
        if (all) {

            const result = await db.query(`
                DELETE FROM data 
                WHERE ref = $1 AND sid = $2 AND js->'data'->>'product_id' = $3 AND js->'data'->>'bundle_id' = $4
                RETURNING _id`, ['product-bundle', sid, product_id, bundle_id]);

            response = result.rows;
        }

        // Delete single product bundle
        if (!all) {

            const result = await db.query(`
                DELETE FROM data 
                WHERE ref = $1 AND sid = $2 AND _id = $3
                RETURNING _id`, ['product-bundle', sid, id]);

            response = result.rows;
        }

    } finally {
        await db.end();
    }

    return response;
}

// API route
function deleteProductBundleApi(app) {

    app.post('/api/delete-product-bundle/', authenticateToken, async (_req, res) => {

        const response = await deleteProductBundle(_req.body.all, _req.body.product_id, _req.body.bundle_id, _req.body.id);

        // console.log('delete response', response);

        res.json({ success: true, response });
    });
}

export default deleteProductBundleApi;