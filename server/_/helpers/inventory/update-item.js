
import { sid } from './../index.js';

export const updateItem = async (db, actions) => {

    let response = null;

    if (actions) {

        console.log('updateItem actions:', actions);

        // validate update item data
        if (actions.order_id === undefined || actions.index === undefined || actions.item === undefined) {
            return { success: false, error: 'no update item data provided' };
        }

        // validate index
        actions.index = parseInt(actions.index);
        if (isNaN(actions.index) || actions.index < 0 || actions.index > 1000) {
            return { success: false, error: 'invalid update item index' };
        }

        // validate order_id
        if (typeof actions.order_id !== 'string' || !/^[a-zA-Z0-9]{40}$/.test(actions.order_id)) {
            return { success: false, error: 'invalid order_id' };
        }

        const item = actions.item;
        const index = actions.index;

        // update item ready status
        if (item.inventory && item.inventory.origin == 'c') item.inventory.ready = null;
        if (item.inventory && (item.inventory.origin == 'w' || item.inventory.origin == 'm')) { item.inventory.rdy_date = new Date().toISOString(); item.inventory.rdy_user = actions.user_id; }

        // find the order item by id
        const itemQuery = `
                    SELECT js->'data'->'items' as items
                    FROM data 
                    WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
                    `;

        const itemResult = await db.query(itemQuery, [actions.order_id, 'order', sid]);

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
            actions.order_id,
            'order',
            sid,
            JSON.stringify(items)
        ];

        const updateResult = await db.query(updateQuery, updateParams);
        response = updateResult.rows[0] || {};
    }
}
