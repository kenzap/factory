import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';
import { broadcastSupplylogUpdate, getSupplylogSnapshot } from '../_/helpers/supplylog-live-update.js';

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

    // Get orders
    const deleteQuery = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['supplylog', sid, id];

    try {

        await db.connect();

        const snapshot = await getSupplylogSnapshot(db, id);
        const deleteResult = await db.query(deleteQuery, params);

        response = deleteResult.rows;

        if (snapshot) {
            let data = {
                coating: snapshot.coating,
                color: snapshot.color,
                amount: -1 * snapshot.qty,
                _id: snapshot.product_id
            };
            await updateProductStock(db, data, user);
            broadcastSupplylogUpdate({
                ...snapshot,
                action: 'deleted'
            }, user);
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
