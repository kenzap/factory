import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { getNextOrderId } from '../_/helpers/order.js';

/**
 * Save order
 *
 * List orders
 *
 * @version 1.0
 * @param {JSON} data - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function saveOrder(logger, data, user) {

    const db = getDbConnection();

    let response = null, meta = {}, data_new = {};

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        const currentTime = Math.floor(Date.now() / 1000);
        const currentDate = new Date().toISOString();

        if (!data._id) {

            // Creating new order
            const [orderId] = await Promise.all([
                getNextOrderId(db)
            ]);

            data_new = {
                ...data,
                id: orderId,
                _id: makeId(),
                date: data.date || currentDate,
                created: currentTime,
                updated: currentTime,
                operator: data.operator || user.fname || ''
            };

            meta = {
                created: currentTime,
                updated: currentTime
            };
        } else {

            // Updating existing order
            const select = `
                SELECT js->'data' as data
                FROM data
                WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
                LIMIT 1
            `;

            const res = await db.query(select, ['order', sid, data.id]);
            const existingData = res.rows?.[0]?.data || {};

            // Preserve original inventory data for existing items
            const mergedData = { ...existingData, ...data };
            if (existingData.items && data.items) {
                mergedData.items = data.items.map((item, index) => {
                    const existingItem = existingData.items[index];
                    return {
                        ...item,
                        inventory: existingItem?.inventory || item.inventory
                    };
                });
            }

            data_new = {
                ...mergedData,
                date: existingData.date || currentDate,
                updated: currentTime
            };

            if (!data_new.operator) {
                data_new.operator = existingData.operator || user.fname || '';
            }

            // logger.info(`Updating order:`, data_new);

            meta.updated = currentTime;
        }

        // Get orders
        let query_update = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id, js->'data'->>'id' as "id"`;

        const result = await db.query(query_update, [data_new._id, 0, 'order', sid, JSON.stringify({ data: data_new, meta: meta })]);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function saveOrderApi(app, logger) {

    app.post('/api/save-order/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveOrder(logger, data, _req.user);

        res.json({ success: true, order: response, message: 'client saved' });
    });
}

export default saveOrderApi;