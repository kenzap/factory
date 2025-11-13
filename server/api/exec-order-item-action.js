import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';

/**
 * execOrderItemAction
 * Executes an action on an order item.
 * This function updates the order item in the database based on the provided actions.
 * 
 * @version 1.0
 * @param {JSON} actions - Object containing actions to perform on the order item.
 * @returns {Array<Object>} - Response
*/
async function execOrderItemAction(actions) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!actions) return { success: false, error: 'no data provided' };

        if (actions.update_item) {

            // validate update item data
            if (actions.update_item.order_id === undefined || actions.update_item.index === undefined || actions.update_item.item === undefined) {
                return { success: false, error: 'no update item data provided' };
            }

            // validate index
            actions.update_item.index = parseInt(actions.update_item.index);
            if (isNaN(actions.update_item.index) || actions.update_item.index < 0 || actions.update_item.index > 1000) {
                return { success: false, error: 'invalid update item index' };
            }

            // validate order_id
            if (typeof actions.update_item.order_id !== 'string' || !/^[a-zA-Z0-9]{40}$/.test(actions.update_item.order_id)) {
                return { success: false, error: 'invalid order_id' };
            }

            const item = actions.update_item.item;
            const index = actions.update_item.index;

            // update item ready status
            if (item.inventory.origin == 'c') item.inventory.ready = null;
            if (item.inventory.origin == 'w' || item.inventory.origin == 'm') { item.inventory.rdy_date = new Date().toISOString(); item.inventory.rdy_user = actions.user_id; }

            // find the order item by id
            const itemQuery = `
                SELECT js->'data'->'items' as items
                FROM data 
                WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
                `;

            const itemResult = await db.query(itemQuery, [actions.update_item.order_id, 'ecommerce-order', sid]);

            let items = itemResult.rows[0]?.items || [];
            let targetItem = items[index];

            // check if main item exists
            if (!targetItem) {
                return { success: false, error: 'item not found' };
            }

            // update only inventory and bundle_items keys
            if (item.inventory) {
                items[index].inventory = {
                    ...targetItem.inventory,
                    ...item.inventory
                };
            }

            if (item.bundle_items) {
                items[index].bundle_items = item.bundle_items;
            }

            // console.log('Updated main item:', items[index]);

            const updateQuery = `
                UPDATE data
                SET js = jsonb_set(
                    js,
                    '{data,items}',
                    $4::jsonb,
                    true
                )
                WHERE _id = $1 AND ref = $2 AND sid = $3
                RETURNING _id
                `;

            const updateParams = [
                actions.update_item.order_id,
                'ecommerce-order',
                sid,
                JSON.stringify(items)
            ];

            const updateResult = await db.query(updateQuery, updateParams);
            response = updateResult.rows[0] || {};

            // console.log('Updated order item in DB:', response);
        }

        if (actions.update_stock) {

            // validate stock update data
            if (!actions.update_stock.order_id || !actions.update_stock.item_id ||
                actions.update_stock.index === undefined || actions.update_stock.amount === undefined) {
                return { success: false, error: 'missing stock update data' };
            }

            // validate index
            actions.update_stock.index = parseInt(actions.update_stock.index);
            if (isNaN(actions.update_stock.index) || actions.update_stock.index < 0 || actions.update_stock.index > 1000) {
                return { success: false, error: 'invalid stock update index' };
            }

            // validate amount
            actions.update_stock.amount = parseInt(actions.update_stock.amount);
            if (isNaN(actions.update_stock.amount) || actions.update_stock.amount < 0) {
                return { success: false, error: 'invalid amount, must be non-negative number' };
            }

            // Start transaction for atomic stock update
            await db.query('BEGIN');

            try {
                // find the order item by id
                const itemQuery = `
                    SELECT js->'data'->'items' as items
                    FROM data 
                    WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
                    `;

                const itemResult = await db.query(itemQuery, [actions.update_stock.order_id, 'ecommerce-order', sid]);

                let items = itemResult.rows[0]?.items || [];
                let targetItem = items[actions.update_stock.index];

                if (!targetItem) {
                    await db.query('ROLLBACK');
                    return { success: false, error: 'item not found' };
                }

                // get current stock amount from product inventory with row lock to prevent race conditions
                const productQuery = `
                    SELECT js->'data'->>'last_stock_writeoff' as last_stock_writeoff
                    FROM data 
                    WHERE _id = $1 AND ref = $2 AND sid = $3 
                    FOR UPDATE
                    LIMIT 1
                    `;

                const productResult = await db.query(productQuery, [actions.update_stock.item_id, 'ecommerce-product', sid]);
                const last_stock_writeoff = productResult.rows[0]?.last_stock_writeoff || 0;
                let update_last_stock_writeoff = false;

                // revert last stock writeoff if exists
                if (last_stock_writeoff) {

                    console.log('Reverting last stock writeoff:', last_stock_writeoff);

                    await updateProductStock(db, {
                        _id: actions.update_stock.item_id,
                        amount: parseFloat(last_stock_writeoff),
                        coating: actions.update_stock.coating,
                        color: actions.update_stock.color
                    }, actions.user_id);

                    update_last_stock_writeoff = true;
                }

                // only proceed if there's an actual change
                if (actions.update_stock.amount !== 0) {

                    // apply stock change
                    await updateProductStock(db, {
                        _id: actions.update_stock.item_id,
                        amount: -1 * parseFloat(actions.update_stock.amount),
                        coating: actions.update_stock.coating,
                        color: actions.update_stock.color
                    }, actions.user_id);

                    update_last_stock_writeoff = true;
                }

                if (update_last_stock_writeoff) {

                    // update last_stock_writeoff in product
                    const updateProductQuery = `
                        UPDATE data 
                        SET js = jsonb_set(js, '{data,last_stock_writeoff}', $1)
                        WHERE _id = $2 AND ref = $3 AND sid = $4
                        RETURNING _id
                        `;

                    const updateProductParams = [JSON.stringify(actions.update_stock.amount), actions.update_stock.item_id, 'ecommerce-product', sid];
                    const updateProductResult = await db.query(updateProductQuery, updateProductParams);

                    if (updateProductResult.rows.length === 0) {
                        await db.query('ROLLBACK');
                        return { success: false, error: 'Product not found or update failed' };
                    }
                }

                // Commit transaction
                await db.query('COMMIT');

            } catch (error) {
                await db.query('ROLLBACK');
                throw error;
            }
        }

        if (Array.isArray(actions.issue)) {

            for (const issueAction of actions.issue) {

                // validate issue data
                if (issueAction.isu_date === undefined) {
                    return { success: false, error: 'no issue data provided' };
                }

                const inventory = {
                    isu_date: issueAction.isu_date ? new Date().toISOString() : null,
                    isu_user: actions.user_id || null
                };

                // find the order item by id
                const itemQuery = `
                    SELECT js->'data'->'items' as items
                    FROM data 
                    WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
                `;

                const itemResult = await db.query(itemQuery, [issueAction.order_id, 'ecommerce-order', sid]);

                let i = issueAction.index;
                let items = itemResult.rows[0]?.items || [];

                // check if item exists
                if (items.length === 0 || !items[i]) {
                    return { success: false, error: 'item not found' };
                }

                if (!items[i].inventory) {
                    items[i].inventory = {};
                }

                items[i].inventory.isu_date = inventory.isu_date;
                items[i].inventory.isu_user = inventory.isu_user;

                const updateQuery = `
                    UPDATE data
                    SET js = jsonb_set(
                    js,
                    '{data,items}',
                    $4::jsonb,
                    true
                    )
                    WHERE _id = $1 AND ref = $2 AND sid = $3
                    RETURNING _id
                `;

                const updateParams = [
                    issueAction.order_id,
                    'ecommerce-order',
                    sid,
                    JSON.stringify(items)
                ];

                const updateResult = await db.query(updateQuery, updateParams);
                response = updateResult.rows[0] || {};
            }
        }

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function execOrderItemActionApi(app) {

    app.post('/api/exec-order-item-action/', authenticateToken, async (_req, res) => {

        // console.log('/api/exec-order-item-action/', _req.body);
        // console.log('/api/exec-order-item-action/', _req.user);

        const data = _req.body;
        data.user_id = _req.user.id;
        const response = await execOrderItemAction(data);

        // console.log('response', response);

        res.json({ success: true, status: response });
    });
}

export default execOrderItemActionApi;