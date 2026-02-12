import { execOrderItemAction } from "../../api/exec_order_item_action.js";
import { __html } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";

export const actionIssueOrder = async (orderId, isIssue, orders, cb) => {

    if (state.inQuery) return;

    // Only show confirmation for cancellation
    if (!isIssue) {
        let msg = __html('Cancel issuing the order #%1$?', orderId);
        if (!confirm(msg)) {
            return;
        }
    }

    state.inQuery = true;

    try {

        let actions = {
            issue: []
        };

        // TODO: go through all order items
        let order = orders.find(o => o.id === orderId);

        order.items.forEach((item, i) => {

            // cancel issue
            if (!isIssue) {

                // update current state
                item.inventory.isu_date = null

                // action for db
                actions.issue.push({
                    order_id: order._id,
                    index: i,
                    isu_date: item.inventory.isu_date,
                    item_id: item.id,
                    product_id: item._id
                });
            }

            // mark as issued if not already
            if (isIssue && item.inventory && item.inventory.rdy_date && !item.inventory.isu_date) {

                // update current state
                item.inventory.isu_date = new Date().toISOString();

                // action for db
                actions.issue.push({
                    order_id: order._id,
                    index: i,
                    isu_date: item.inventory.isu_date,
                    item_id: item.id,
                    product_id: item._id
                });
            }
        });

        await execOrderItemAction(actions, (response) => {

            state.inQuery = false;

            if (!response.success) {

                cb({ success: false, error: response.error });
                return;
            }

            cb({ success: true, order });
        });

        // toast(__html('Order updated'));
    } catch (error) {

        state.inQuery = false;
        console.error('Error issuing order:', error);
        cb({ success: false, error: error.message });
    }
}