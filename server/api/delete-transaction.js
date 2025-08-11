import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete transaction
 *
 * @version 1.0
 * @param {String} data - Array of IDs
 * @returns {Object} - Query response
*/
async function deleteTransaction(data) {

    const db = getDbConnection();

    let response = null;

    // Handle array of IDs
    if (!Array.isArray(data) || data.length === 0) {
        return { success: false, error: 'data must be a non-empty array of objects' };
    }

    try {
        await db.connect();

        const deletedIds = [];

        for (const order of data) {

            if (!order._id) {
                continue; // Skip if no ID is provided
            }

            let query = `
                DELETE FROM data 
                WHERE ref = $1 AND sid = $2 AND _id = $3
                RETURNING _id`;

            const params = ['ecommerce-order', sid, order._id];
            const result = await db.query(query, params);

            if (result.rows.length > 0) {
                deletedIds.push(result.rows[0]._id);
            }
        }

        response = deletedIds;

    } finally {
        await db.end();
    }

    return response;
}

// API route
function deleteTransactionApi(app) {

    app.post('/api/delete-transaction/', authenticateToken, async (_req, res) => {

        console.log('delete ', _req.body);

        const response = await deleteTransaction(_req.body);

        res.json({ success: true, response });
    });
}

export default deleteTransactionApi;