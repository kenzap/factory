import { state } from "../../modules/manufacturing/state.js";
import { actionSortOrders } from "./action_sort_orders.js";
import { renderInventoryButtons } from "./render_inventory_buttons.js";
import { renderOrderRow } from "./render_order_row.js";

export const renderOrders = () => {

    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    let ordersSorted = actionSortOrders(state.orders);

    // Output orders in the chronological sequence from state.ordersSorted
    // const orderSequence = ['urgent', 'manufacturing', 'ready', 'issued'];
    Object.keys(ordersSorted).forEach(status => {
        ordersSorted[status].forEach((order, index) => {
            const orderElement = renderOrderRow(order, index);
            container.appendChild(orderElement);

            renderInventoryButtons(order._id);
        });
    });
}