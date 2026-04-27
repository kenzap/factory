import { authenticateToken } from '../_/helpers/auth.js';
import { eventBus } from '../_/helpers/extensions/events.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { diffOrderItems } from '../_/helpers/order-item-changes.js';
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
    let orderItemsChangeEvent = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        const currentTime = Math.floor(Date.now() / 1000);
        const currentDate = new Date().toISOString();
        const toBoolean = (value) => value === true || value === 1 || value === '1' || value === 'true';

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
                created_y: new Date(currentTime * 1000).getFullYear(),
                created_ym: `${new Date(currentTime * 1000).getFullYear()}-${String(new Date(currentTime * 1000).getMonth() + 1).padStart(2, '0')}`,
                updated: currentTime,
                operator: data.operator || user.fname || ''
            };

            meta = {
                created: currentTime,
                updated: currentTime
            };

            const itemsDiff = diffOrderItems([], data_new.items || []);
            if (itemsDiff.hasChanges) {
                orderItemsChangeEvent = {
                    event: 'order.items.changed',
                    sid,
                    order_record_id: data_new._id,
                    order_id: data_new.id,
                    timestamp: currentDate,
                    summary: itemsDiff.summary,
                    changed_items: itemsDiff.changes,
                    order_items: Array.isArray(data_new.items) ? data_new.items : [],
                    trigger: 'created',
                };
            }
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
                const existingItemsById = new Map(
                    existingData.items
                        .filter(existingItem => existingItem?.id !== undefined && existingItem?.id !== null)
                        .map(existingItem => [String(existingItem.id), existingItem])
                );

                mergedData.items = data.items.map((item) => {
                    const existingItem = existingItemsById.get(String(item.id));
                    return {
                        ...item,
                        inventory: existingItem?.inventory || item.inventory
                    };
                });
            }

            data_new = {
                ...mergedData,
                date: existingData.date || new Date(existingData.created * 1000).toISOString(),
                created_y: existingData.created_y || new Date(existingData.created * 1000).getFullYear(),
                created_ym: existingData.created_ym || `${new Date(existingData.created * 1000).getFullYear()}-${String(new Date(existingData.created * 1000).getMonth() + 1).padStart(2, '0')}`,
                updated: currentTime
            };

            // Stamp release-to-production date once when draft transitions true -> false.
            // Never override existing rtp_date on later save operations.
            const wasDraft = toBoolean(existingData?.draft);
            const isDraftNow = toBoolean(data_new?.draft);
            if (existingData?.rtp_date) {
                data_new.rtp_date = existingData.rtp_date;
            } else if (existingData?.str_date) {
                // Backward compatibility for previously stored field name.
                data_new.rtp_date = existingData.str_date;
            } else if (wasDraft && !isDraftNow) {
                data_new.rtp_date = currentDate;
            }

            if (!data_new.operator) {
                data_new.operator = existingData.operator || user.fname || '';
            }

            // logger.info(`Updating order:`, data_new);

            meta.updated = currentTime;

            const itemsDiff = diffOrderItems(existingData.items || [], data_new.items || []);
            if (itemsDiff.hasChanges) {
                orderItemsChangeEvent = {
                    event: 'order.items.changed',
                    sid,
                    order_record_id: data_new._id,
                    order_id: data_new.id,
                    timestamp: currentDate,
                    summary: itemsDiff.summary,
                    changed_items: itemsDiff.changes,
                    order_items: Array.isArray(data_new.items) ? data_new.items : [],
                    trigger: 'updated',
                };
            }
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

        if (orderItemsChangeEvent) {
            eventBus.emit('order.items.changed', orderItemsChangeEvent);
        }

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
