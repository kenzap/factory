import { __html, toast } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";
import { actionGetBundles } from "./action_get_bundles.js";
import { updateOrderStatus } from "./action_sort_orders.js";
import { updateInventoryButtonsUI } from "./render_inventory_buttons.js";
import { updateInventoryCheckboxesUI } from "./render_inventory_checkboxes.js";
import { updateOrderRowUI } from "./render_order_row.js";
import { updateWorkButtonsUI } from "./render_work_buttons.js";
import { updateWriteoffInputUI } from "./render_writeoff_input.js";

export const actionUpdateState = (data) => {

    console.log('Received SSE update:', data);

    // Handle different types of updates
    switch (data.type) {
        case 'items-update':
            handleItemsUpdate(data);
            break;
        case 'stock-update':
            handleStockUpdate(data);
            break;
        default:
            console.log('Unhandled update type:', data.type);
    }
}

const handleStockUpdate = (data) => {

    // Find the order in our local state
    let order_details = document.querySelector('.sub-items-row')

    if (!order_details) return;

    // actionGetStock(order_details.dataset._id);
    actionGetBundles(order_details.dataset._id);
}

const handleItemsUpdate = (data) => {

    // Find the order in our local state
    const order = state.orders.find(o => o._id === data.order_id);
    if (!order) {
        console.warn('Order not found for items update:', data.order_id);
        return;
    }

    // The backend sends the entire items array with updated data
    // We need to update our local order.items with the new data
    if (data.items && Array.isArray(data.items)) {
        // Replace the entire items array with the updated one from backend
        order.items = data.items;
    }

    // Find the specific item that was updated
    const updatedItem = order.items.find(i => i.id === data.item_id);
    if (!updatedItem) {
        console.warn('Updated item not found for items update:', data.item_id);
        return;
    }

    updateOrderStatus(order);

    // Update the UI for this specific item's work buttons
    updateWorkButtonsUI(order, updatedItem);

    // update the UI of checkboxes
    updateInventoryCheckboxesUI(order, updatedItem);

    // update the inventory buttons UI
    updateInventoryButtonsUI(order, updatedItem);

    // update writeoff input
    updateWriteoffInputUI(order, updatedItem);

    // update the order row UI (e.g. status)
    updateOrderRowUI(order);

    // Show a toast notification if the update was made by another user
    if (data?.updated_by?.user_id !== state.user.id) toast(__html('Order #%1$ updated by %2$', order.id, data.updated_by.name));
}