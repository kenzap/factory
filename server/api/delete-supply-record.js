import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';

/**
 * Delete supply by id
 *
 * List orders
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteSupplyRecord(id, user) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get supply data before deletion to update stock
    const supplyQuery = `
        SELECT js->'data'->>'color' as color, js->'data'->>'coating' as coating, js->'data'->>'qty' as qty, js->'data'->>'product_id' as product_id 
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3`;

    // Get orders
    const deleteQuery = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['supplylog', sid, id];

    try {

        await db.connect();

        const supplyResult = await db.query(supplyQuery, params);
        const deleteResult = await db.query(deleteQuery, params);

        response = deleteResult.rows;

        // console.log('supplyResult', supplyResult.rows);

        if (supplyResult.rows.length > 0) {
            const supplyData = supplyResult.rows[0];
            let data = {
                coating: supplyData.coating,
                color: supplyData.color,
                amount: -1 * supplyData.qty,
                _id: supplyData.product_id
            };
            await updateProductStock(db, data, user);
        }

    } finally {
        await db.end();
    }

    return response;
}

// API route
function deleteSupplyRecordApi(app) {

    app.post('/api/delete-supply-record/', authenticateToken, async (_req, res) => {

        const response = await deleteSupplyRecord(_req.body.id, _req.user);

        res.json({ success: true, response });
    });
}

export default deleteSupplyRecordApi;