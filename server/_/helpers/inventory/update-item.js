
import { sseManager } from '../../helpers/sse.js';
import { sid } from './../index.js';

export const updateItem = async (db, actions, user) => {

    let response = null;

    if (actions) {

        // console.log('updateItem actions:', actions);

        // validate update item data
        if (actions.order_id === undefined || actions.item === undefined) {
            return { success: false, error: 'no update item data provided' };
        }

        // validate order_id
        if (typeof actions.order_id !== 'string' || !/^[a-zA-Z0-9]{40}$/.test(actions.order_id)) {
            return { success: false, error: 'invalid order_id' };
        }

        const item = actions.item;
        const fallbackIndex = Number.isInteger(Number.parseInt(actions.index, 10))
            ? Number.parseInt(actions.index, 10)
            : null;
        const itemId = actions.item_id || item?.id;

        if (!itemId || typeof itemId !== 'string') {
            return { success: false, error: 'invalid item_id' };
        }

        // update item ready status
        if (item.inventory && item.inventory.origin == 'c') item.inventory.ready = null;
        if (item.inventory && (item.inventory.origin == 'w' || item.inventory.origin == 'm')) {
            item.inventory.rdy_date = new Date().toISOString();
            item.inventory.rdy_user = user?.id || null;
        }

        // find the order item by id
        const itemQuery = `
                    SELECT js->'data'->'items' as items
                    FROM data 
                    WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
                    `;

        const itemResult = await db.query(itemQuery, [actions.order_id, 'order', sid]);

        let items = itemResult.rows[0]?.items || [];
        const resolvedIndex = items.findIndex(existingItem => existingItem?.id === itemId);
        const targetIndex = resolvedIndex !== -1 ? resolvedIndex : fallbackIndex;
        const targetItem = Number.isInteger(targetIndex) ? items[targetIndex] : null;

        // check if main item exists
        if (!targetItem) {
            return { success: false, error: 'item not found' };
        }

        // update only inventory and bundle_items keys
        if (item.inventory) {
            items[targetIndex].inventory = {
                ...targetItem.inventory,
                ...item.inventory
            };
        }

        if (item.bundle_items) {
            items[targetIndex].bundle_items = item.bundle_items;
        }

        // console.log('Updated main item:', items[targetIndex]);

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

        // Notify frontend about items update via SSE
        sseManager.broadcast({
            type: 'items-update',
            message: 'Inventory updated for order item',
            items: items,
            item_id: actions.item.id,
            order_id: actions.order_id,
            updated_by: { user_id: user?.id, name: user?.fname },
            timestamp: new Date().toISOString()
        });
    }
}
