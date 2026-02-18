import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';
import { sseManager } from '../_/helpers/sse.js';

/**
 * Create worklog record
 *
 * @version 1.0
 * @param {JSON} data - Worklog record data
 * @returns {JSON<Object>} - Response
*/
async function createWorkLog(logger, data, user) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        if (!data._id) {

            data._id = makeId();
        }

        data.created = Math.floor(Date.now() / 1000);
        data.updated = Math.floor(Date.now() / 1000);
        data.date = new Date().toISOString();

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id, js->'data'->>'id' as "id"`;

        const params = [data._id, 0, 'worklog', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

        // if origin set to w = warehouse, update inventory stock accordingly
        if (data.type && data.type === 'stock-replenishment') {

            logger.info('Creating stock replenishment action for worklog record:', data);

            await updateProductStock(db, {
                _id: data.product_id,
                coating: data.coating,
                color: data.color,
                amount: data.qty
            }, user);
        }

        if (data.type && data.type === 'stock-write-off') {

            logger.info('Creating stock write-off action for worklog record:', data);

            await updateProductStock(db, {
                _id: data.product_id,
                coating: data.coating,
                color: data.color,
                amount: data.qty * -1
            }, user);
        }

        // if data.item_id is set, update worklog_id in order item
        if (data.item_id && data.item_id !== '') {

            query = `SELECT _id, js FROM data WHERE ref = $1 AND sid = $2 AND _id = $3 LIMIT 1`;

            const itemParams = ['order', sid, data.order_id];

            const itemResult = await db.query(query, itemParams);

            const orderRecord = itemResult.rows[0];

            if (orderRecord) {

                const orderData = orderRecord.js;

                let items = orderData.data.items || [];

                items = items.map(item => {
                    if (item.id === data.item_id) {

                        if (!item.worklog) item.worklog = {};

                        item.worklog[data.type] = { qty: data.qty, time: data.time, worklog_id: data._id };
                    }
                    return item;
                });

                orderData.data.items = items;

                const updateQuery = `
                    UPDATE data 
                    SET js = $1
                    WHERE _id = $2
                `;

                const updateParams = [JSON.stringify(orderData), orderRecord._id];

                await db.query(updateQuery, updateParams);

                logger.info('Updated order item with worklog_id:', data.item_id, data._id);

                // Notify frontend about items update via SSE
                sseManager.broadcast({
                    type: 'items-update',
                    message: 'Worklog updated for order item',
                    items: items,
                    item_id: data.item_id,
                    order_id: data.order_id,
                    updated_by: { user_id: user?.id, name: user?.fname },
                    timestamp: new Date().toISOString()
                });
            }
        }

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function createWorkLogApi(app, logger) {

    app.post('/api/create-worklog-record/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await createWorkLog(logger, data, _req.user);

        res.json({ success: true, response });
    });
}

export default createWorkLogApi;