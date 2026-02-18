import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';
import { sseManager } from '../_/helpers/sse.js';

/**
 * Reverts a cutting action by restoring the original coil length, removing stock sheets, 
 * and clearing order item statuses that were modified during the cutting operation.
 *  
 * @async
 * @function revertCuttingAction
 * @param {Object} db - Database connection object with query method
 * @param {Object} data - Cutting action data to revert
 * @param {string} data.coil_id - ID of the coil that was cut
 * @param {number} data.qty - Quantity/length to restore to the original coil
 * @param {Array<Object>} [data.sheets] - Array of sheet objects created during cutting
 * @param {string} data.sheets[].type - Type of sheet (only "stock" sheets are removed)
 * @param {number} data.sheets[].length - Length of the sheet to remove
 * @param {number} data.sheets[].width - Width of the sheet to remove
 * @param {Array<Object>} [data.items] - Array of order items affected by the cutting
 * @param {string} data.items[].order_id - ID of the order containing the item
 * @param {string} data.items[].id - ID of the order item
 * @returns {Promise<Array>} Array containing database operation results
 * @description
 * This function performs three main operations:
 * 1. Restores the original coil length by adding back the cut quantity
 * 2. Removes stock sheets that were added to inventory during cutting
 * 3. Clears writeoff data and inventory timestamps from affected order items
 * 
 * The function groups order items by order_id to optimize database operations
 * and only processes orders that actually exist in the database.
 */
const revertCuttingAction = async (db, data, user) => {

    let response = [], res;

    if (!data) return;

    // revert length to original coil
    if (data.coil_id && data.qty && data.length != "0") {

        let query = `
        UPDATE data
        SET js = jsonb_set(js, '{data,length}', to_jsonb((js->'data'->>'length')::int + $4::int))
        WHERE ref = $1 AND sid = $2 AND _id = $3 AND js->'data'->>'type' = 'metal'
        RETURNING _id`;

        let params = ['supplylog', sid, data.coil_id, data.qty];

        res = await db.query(query, params);
    }

    // console.log('Updating coil:', data.coil_id, 'by length:', data.qty);

    // remove stock sheets added during cutting
    if (data.coil_id && data.sheets) data.sheets.forEach(async (sheet) => {

        if (sheet.type != "stock") return;

        // Delete supply log record
        let query = `
            DELETE FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'parent_coil_id' = $3 AND js->'data'->>'length' = $4 AND js->'data'->>'width' = $5
            RETURNING _id`;

        const params = ['supplylog', sid, data.coil_id, sheet.length, sheet.width];

        const result = await db.query(query, params);

        console.log('Removing sheet from stock:', data.coil_id, sheet.length, sheet.width, result.rows[0] || {});
    });

    // clear order item statuses
    if (data.items) {

        // Group items by order_id to avoid multiple updates to same order
        const itemsByOrderId = data.items.reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
        }, {});

        // Process each order once
        for (const [orderId, orderItems] of Object.entries(itemsByOrderId)) {

            // Query 
            let query = `
                SELECT _id, js->'data'->'id' as "id", js->'data'->'items' as "items"
                FROM data
                WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
                LIMIT 1
            `;

            let params = ['order', sid, orderId];

            const result = await db.query(query, params);

            let order = result.rows[0] || null;

            console.log('Updating order items for order_id:', orderId, 'order found:', order?._id);

            // stop here if order not found
            if (!order) continue;

            let items_db = order.items || [];
            let updated = false, item_id = null;

            console.log('Comparing:', items_db, 'order to:', orderItems);

            // update items for this order
            items_db.forEach(itm => {
                const matchingItem = orderItems.find(item => item.id === itm.id && order.id === item.order_id);
                if (matchingItem) {
                    delete itm.inventory.wrt_date;
                    delete itm.inventory.wrt_user;
                    delete itm.inventory.writeoff_length;
                    delete itm.inventory.coil_id;
                    itm.length_writeoff = 0;
                    itm.width_writeoff = 0;
                    item_id = itm.id;
                    updated = true;
                }
            });

            if (updated) {
                // update order in DB
                let updateQuery = `
                    UPDATE data
                    SET js = jsonb_set(js, '{data,items}', $4::jsonb)
                    WHERE ref = $1 AND sid = $2 AND _id = $3
                    RETURNING _id
                `;

                let updateParams = ['order', sid, order._id, JSON.stringify(items_db)];

                const updateResult = await db.query(updateQuery, updateParams);

                // Notify frontend about items update via SSE
                sseManager.broadcast({
                    type: 'items-update',
                    message: 'Revert item status after cutting action 2',
                    items: items_db,
                    item_id: item_id,
                    order_id: order._id,
                    updated_by: { user_id: user?.id, name: user?.fname },
                    timestamp: new Date().toISOString()
                });

                console.log('Reverted order item statuses for order_id:', orderId, 'items:', orderItems.map(i => i.id));
            }
        }
    }

    if (res) response.push(res.rows[0] || {});
}

/**
 * Reverts a stock replenishment action by reducing the product stock by the replenished amount.
 * 
 * @async
 * @function revertStockReplenishmentAction
 * @param {Object} db - Database connection object
 * @param {Object} data - The worklog data containing replenishment information
 * @param {string} data.product_id - The ID of the product to revert stock for
 * @param {string} data.coating - The coating type of the product
 * @param {string} data.color - The color of the product
 * @param {number} data.qty - The quantity that was replenished (will be negated)
 * @param {string} data.user_id - The ID of the user performing the action
 * @returns {Promise} Promise that resolves when the stock update is complete
 */
const revertStockReplenishmentAction = async (db, data, user) => {

    console.log('Reverting stock replenishment action:', data, 'by user:', user?.id);

    // simply reduce stock by the replenished amount
    return updateProductStock(db, {
        _id: data.product_id,
        coating: data.coating,
        color: data.color,
        amount: -1 * data.qty
    }, user);
}

/**
 * Reverts a stock write-off action by increasing the product stock by the write-off amount
 * @async
 * @param {Object} db - The database instance
 * @param {Object} data - The write-off data
 * @param {string} data.product_id - The ID of the product
 * @param {string} data.coating - The coating type of the product
 * @param {string} data.color - The color of the product
 * @param {number} data.qty - The quantity that was written off
 * @param {Object} user - The user performing the revert action
 * @param {string} user.id - The ID of the user
 * @returns {Promise<*>} The result of updating the product stock
 */
const revertStockWriteOffAction = async (db, data, user) => {

    console.log('Reverting stock write-off action:', data, 'by user:', user?.id);

    // simply increase stock by the write-off amount   
    return updateProductStock(db, {
        _id: data.product_id,
        coating: data.coating,
        color: data.color,
        amount: 1 * data.qty
    }, user);
}

/**
 * Reverts a worklog entry from a specific item in an order record.
 * Removes the worklog entry of the specified type from the order item and updates the database.
 * If the worklog becomes empty after removal, the entire worklog property is deleted.
 *
 * @async
 * @function revertWorklogFromOrderItem
 * @param {Object} db - Database connection object with query method
 * @param {Object} data - Data object containing worklog reversion details
 * @param {string} data.order_id - The ID of the order containing the item
 * @param {string} data.item_id - The ID of the specific item to revert worklog from
 * @param {string} data.type - The type of worklog entry to remove
 * @returns {Promise<void>} Resolves when the worklog has been successfully reverted
 * @throws {Error} May throw database-related errors during query execution
 */
const revertWorklogFromOrderItem = async (db, data, user) => {

    // console.log('Reverting worklog from order item:', data);

    // Query to get the order record
    let query = `SELECT _id, js FROM data WHERE ref = $1 AND sid = $2 AND _id = $3 LIMIT 1`;

    const itemParams = ['order', sid, data.order_id];

    const itemResult = await db.query(query, itemParams);

    const orderRecord = itemResult.rows[0];

    if (orderRecord) {
        const orderData = orderRecord.js;

        let items = orderData.data.items || [];

        items = items.map(item => {
            if (item.id === data.item_id) {
                // Remove the worklog entry for this type
                if (item.worklog && item.worklog[data.type]) {
                    delete item.worklog[data.type];

                    // If worklog is empty, remove it entirely
                    if (Object.keys(item.worklog).length === 0) {
                        delete item.worklog;
                    }
                }
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

        // Notify frontend about items update via SSE
        sseManager.broadcast({
            type: 'items-update',
            message: 'Revert item status after cutting action 1',
            items: items,
            item_id: data.item_id,
            order_id: data.order_id,
            updated_by: { user_id: user?.id, name: user?.fname },
            timestamp: new Date().toISOString()
        });

        console.log('Reverted worklog from order item:', data.item_id, data.type);
    }

}

/**
 * Delete product by id
 *
 * List orders
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteWorklogRecord(id, user) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    try {
        await db.connect();

        // First, check if the worklog record exists
        let selectQuery = `
            SELECT _id, js FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3`;

        const checkParams = ['worklog', sid, id];

        const checkResult = await db.query(selectQuery, checkParams);

        if (checkResult.rows.length === 0) {
            return { success: false, error: 'worklog record not found' };
        }

        let worklogRecord = checkResult.rows[0];

        worklogRecord.js.data.user_id = user.id;

        if (worklogRecord.js.data.type === 'cutting') await revertCuttingAction(db, worklogRecord.js.data, user);
        if (worklogRecord.js.data.type === 'stock-replenishment') await revertStockReplenishmentAction(db, worklogRecord.js.data, user);
        if (worklogRecord.js.data.type === 'stock-write-off') await revertStockWriteOffAction(db, worklogRecord.js.data, user);
        if (worklogRecord.js.data.item_id && worklogRecord.js.data.item_id !== '') await revertWorklogFromOrderItem(db, worklogRecord.js.data, user);

        // Delete worklog record
        let query = `
            DELETE FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3
            RETURNING _id`;

        const params = ['worklog', sid, id];

        const result = await db.query(query, params);

        response = result.rows;

    } catch (error) {
        await db.end();
        return { success: false, error: 'failed to check worklog record ' + error.message };
    }

    return response;
}

// API route
function deleteWorklogRecordApi(app) {

    app.post('/api/delete-worklog-record/', authenticateToken, async (_req, res) => {

        const response = await deleteWorklogRecord(_req.body.id, _req.user);

        res.json({ success: true, response });
    });
}

export default deleteWorklogRecordApi;