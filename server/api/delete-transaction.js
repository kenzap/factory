import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete transaction
 *
 * @version 1.0
 * @param {String} data - Array of IDs
 * @returns {Object} - Query response
*/
async function deleteTransaction(data, logger) {

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

            logger.info(`Deleting order id: ${order._id} by user id: ${data.user_id}`);

            if (order.soft) {

                const deleted = {
                    date: new Date().toISOString(),
                    user: data.user_id
                };

                // Soft delete: mark as deleted
                let query = `
                    UPDATE data 
                    SET js = jsonb_set(js, '{data,deleted}', $4::jsonb)
                    WHERE ref = $1 AND sid = $2 AND _id = $3
                    RETURNING _id`;

                const params = ['order', sid, order._id, JSON.stringify(deleted)];
                const result = await db.query(query, params);

                if (result.rows.length > 0) {
                    deletedIds.push(result.rows[0]._id);
                }

                continue; // Move to next order
            }

            // Hard delete: remove from database
            let query = `
                DELETE FROM data 
                WHERE ref = $1 AND sid = $2 AND _id = $3
                RETURNING _id`;

            const params = ['order', sid, order._id];
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
function deleteTransactionApi(app, logger) {

    app.post('/api/delete-transaction/', authenticateToken, async (_req, res) => {

        let data = _req.body.data;
        data.user_id = _req.user.id;

        const response = await deleteTransaction(data, logger);

        res.json({ success: true, response });
    });
}

export default deleteTransactionApi;