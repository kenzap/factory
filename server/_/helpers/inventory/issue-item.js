import { sseManager } from '../../helpers/sse.js';
import { withLockedOrderItems } from '../../helpers/order-items.js';

export const issueItem = async (db, actions, user) => {

    let response = [];

    if (!actions) return { success: false, error: 'no data provided' };

    for (const issueAction of actions) {

        // validate issue data
        if (issueAction.isu_date === undefined) {
            return { success: false, error: 'no issue data provided' };
        }

        const inventory = {
            // isu_date: issueAction.isu_date ? new Date().toISOString() : null,
            isu_date: issueAction.isu_date,
            isu_user: actions.user_id || null
        };

        const lockedOrder = await withLockedOrderItems(db, { orderRecordId: issueAction.order_id }, ({ items }) => {
            const nextItems = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
            const index = nextItems.findIndex(item => item.id === issueAction.item_id);

            if (index === -1) {
                return { skipUpdate: true, itemMissing: true };
            }

            if (!nextItems[index].inventory) {
                nextItems[index].inventory = {};
            }

            nextItems[index].inventory.isu_date = inventory.isu_date;
            nextItems[index].inventory.isu_user = inventory.isu_user;

            return { items: nextItems };
        });

        if (!lockedOrder || lockedOrder.mutation?.itemMissing) {
            return { success: false, error: 'item not found' };
        }

        response.push({ _id: lockedOrder.orderRecord._id });

        // Notify frontend about items update via SSE
        sseManager.broadcast({
            type: 'items-update',
            message: 'Dispatch state updated for order item',
            items: lockedOrder.items,
            item_id: issueAction.item_id,
            order_id: issueAction.order_id,
            updated_by: { user_id: user?.id, name: user?.fname },
            timestamp: new Date().toISOString()
        });
    }

    return response;
}
