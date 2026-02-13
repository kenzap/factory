import { execOrderItemAction } from "../../api/exec_order_item_action.js";
import { __html, toast } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";

export const actionIssueItem = async (order_id, item_id, isIssue, orders, cb) => {

    if (state.inQuery) return;

    state.inQuery = true;

    try {

        console.log('Issuing item B', order_id, item_id, isIssue);

        const order = orders.find(o => o._id === order_id);

        const targetItem = order.items.find(item => item.id === item_id);
        if (!targetItem) {
            state.inQuery = false;
            toast(__html('Item not found'));
            return;
        }

        let actions = {
            issue: [
                {
                    order_id: order._id,
                    item_id: item_id,
                    product_id: targetItem._id,
                    isu_date: isIssue ? new Date().toISOString() : null
                }
            ]
        };

        await execOrderItemAction(actions, (response) => {

            state.inQuery = false;

            if (!response.success) {
                toast(__html('Error updating item status'));
                return;
            }

            // refresh button state
            orders = orders.map(o => {
                if (o._id === order._id) {
                    const targetItem = o.items.find(item => item.id === item_id);
                    if (targetItem && targetItem.inventory) {
                        targetItem.inventory.isu_date = actions.issue[0].isu_date;
                    }
                }
                return o;
            });

            cb({ success: true, orders });
        });

    } catch (error) {

        state.inQuery = false;
        console.error('Error issuing item:', error);
        cb({ success: false, error: error.message });
    }
}