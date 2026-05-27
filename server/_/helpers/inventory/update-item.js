
import { sseManager } from '../../helpers/sse.js';
import { withLockedOrderItems } from '../../helpers/order-items.js';

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

        const lockedOrder = await withLockedOrderItems(db, { orderRecordId: actions.order_id }, ({ items }) => {
            const nextItems = Array.isArray(items) ? items.map((entry) => ({ ...entry })) : [];
            const resolvedIndex = nextItems.findIndex(existingItem => existingItem?.id === itemId);
            const targetIndex = resolvedIndex !== -1 ? resolvedIndex : fallbackIndex;
            const targetItem = Number.isInteger(targetIndex) ? nextItems[targetIndex] : null;

            if (!targetItem) {
                return { skipUpdate: true, itemMissing: true };
            }

            if (item.inventory) {
                nextItems[targetIndex].inventory = {
                    ...targetItem.inventory,
                    ...item.inventory
                };
            }

            if (item.bundle_items) {
                nextItems[targetIndex].bundle_items = item.bundle_items;
            }

            return { items: nextItems };
        });

        if (!lockedOrder || lockedOrder.mutation?.itemMissing) {
            return { success: false, error: 'item not found' };
        }
        response = { _id: lockedOrder.orderRecord._id };

        // Notify frontend about items update via SSE
        sseManager.broadcast({
            type: 'items-update',
            message: 'Inventory updated for order item',
            items: lockedOrder.items,
            item_id: itemId,
            order_id: actions.order_id,
            updated_by: { user_id: user?.id, name: user?.fname },
            timestamp: new Date().toISOString()
        });
    }
}
