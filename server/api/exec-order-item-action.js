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

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!actions) return { success: false, error: 'no data provided' };

        if (actions.inventory) {

            // validate inventory data
            if (actions.inventory.origin === undefined || actions.inventory.amount === undefined || actions.inventory.index === undefined || actions.inventory.order_id === undefined || actions.inventory.item_id === undefined) {
                return { success: false, error: 'no inventory data provided' };
            }

            // validate index
            actions.inventory.index = parseInt(actions.inventory.index);
            if (isNaN(actions.inventory.index) || actions.inventory.index < 0 || actions.inventory.index > 1000) {
                return { success: false, error: 'invalid inventory index' };
            }

            // validate amount
            actions.inventory.amount = parseInt(actions.inventory.amount);
            if (isNaN(actions.inventory.amount) || actions.inventory.amount < 0 || actions.inventory.index > 1000000) {
                return { success: false, error: 'invalid inventory amount' };
            }

            // validate origin, m: manufacturing, w: warehouse, c: canceled
            if (!['m', 'w', 'c', 'cm', 'cw'].includes(actions.inventory.origin)) {
                return { success: false, error: 'invalid inventory origin' };
            }

            // validate id
            if (typeof actions.inventory.order_id !== 'string' || !/^[a-zA-Z0-9]{40}$/.test(actions.inventory.order_id)) {
                return { success: false, error: 'invalid order_id' };
            }

            // validate item_id
            if (typeof actions.inventory.item_id !== 'string' || !/^[a-zA-Z0-9]{40}$/.test(actions.inventory.item_id)) {
                return { success: false, error: 'invalid item_id' };
            }

            const inventory = {
                origin: actions.inventory.mnf_date ? actions.inventory.origin : 'c',
                amount: actions.inventory.amount ? actions.inventory.amount : 0,
                mnf_date: actions.inventory.mnf_date ? new Date().toISOString() : null,
                mnf_user: actions.user_id || null
            }

            // find the order item by id
            const itemQuery = `
                SELECT js->'data'->'items' as items
                FROM data 
                WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
            `;

            const itemResult = await client.query(itemQuery, [actions.inventory.order_id, 'ecommerce-order', sid]);

            // console.log('execOrderItemAction itemResult', itemResult.rows[0]);

            let i = actions.inventory.index;
            let items = itemResult.rows[0]?.items || [];

            // check if item exists
            if (items.length === 0 || !items[i]) {
                return { success: false, error: 'item not found' };
            }

            if (!items[i].inventory) {
                items[i].inventory = {};
            }

            // get previous inventory data
            if (items[i].inventory.amount > 0) {

                // revert stock amount
                await updateProductStock(client, { _id: actions.inventory.item_id, amount: -1 * items[i].inventory.amount, coating: actions.inventory.coating, color: actions.inventory.color }, actions.user_id);

                console.log('Previous inventory data:', items[i].inventory.amount);
            }

            if (inventory.amount > 0) {

                // write off stock
                await updateProductStock(client, { _id: actions.inventory.item_id, amount: inventory.amount, coating: actions.inventory.coating, color: actions.inventory.color }, actions.user_id);

                console.log('Current inventory data:', inventory.amount);
            }

            // let origin_prev = items[i].inventory.origin;
            items[i].inventory.origin = inventory.origin;
            items[i].inventory.amount = inventory.amount;
            items[i].inventory.mnf_date = inventory.mnf_date;
            items[i].inventory.mnf_user = inventory.mnf_user;

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
                actions.inventory.order_id,
                'ecommerce-order',
                sid,
                JSON.stringify(items)
            ];

            const updateResult = await client.query(updateQuery, updateParams);
            response = updateResult.rows[0] || {};

            // write off stock
            // if (actions.inventory.origin === 'w') await updateProductStock(client, { _id: actions.inventory.item_id, amount: actions.inventory.amount, coating: actions.inventory.coating, color: actions.inventory.color }, actions.user_id);

            // cancel write off stock
            // if (actions.inventory.origin === 'cw') await updateProductStock(client, { _id: actions.inventory.item_id, amount: -1 * actions.inventory.amount, coating: actions.inventory.coating, color: actions.inventory.color }, actions.user_id);
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

                const itemResult = await client.query(itemQuery, [issueAction.order_id, 'ecommerce-order', sid]);

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

                const updateResult = await client.query(updateQuery, updateParams);
                response = updateResult.rows[0] || {};
            }
        }

    } finally {
        await client.end();
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