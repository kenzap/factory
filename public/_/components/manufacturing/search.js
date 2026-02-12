import { state } from "../../modules/manufacturing/state.js";
import { actionSortOrders } from "./action_sort_orders.js";
import { renderInventoryButtons } from "./render_inventory_buttons.js";
import { renderOrderRow } from "./render_order_row.js";

export class Search {
    constructor() {

        this.listeners();
    }

    listeners() {

        // Search inputs
        const orderSearch = document.getElementById('orderSearch');
        const companySearch = document.getElementById('companySearch');

        orderSearch.addEventListener('input', (e) => {
            if (e.target.value.length > 3) {
                this.byOrderId(e.target.value);
            } else if (e.target.value.length === 0) {
                state.actionGetOrders();
            }
        });

        companySearch.addEventListener('input', (e) => {
            if (e.target.value.length > 0) {
                orderSearch.value = '';
                this.byClientName(e.target.value);
            } else {
                state.actionGetOrders();
            }
        });
    }

    byOrderId(orderId) {

        let filtered = state.orders;

        if (orderId) {
            filtered = filtered.filter(order =>
                order.id.toLowerCase().includes(orderId.toLowerCase())
            );
        }

        this.renderFilteredOrders(filtered);
    }

    byClientName(name) {

        let filtered = state.orders;
        if (name) {
            filtered = filtered.filter(order => {
                const normalizedOrderName = order.name.toLowerCase()
                    .replace(/[āàáâãäå]/g, 'a')
                    .replace(/[ēèéêë]/g, 'e')
                    .replace(/[īìíîï]/g, 'i')
                    .replace(/[ōòóôõö]/g, 'o')
                    .replace(/[ūùúûü]/g, 'u')
                    .replace(/[ķ]/g, 'k')
                    .replace(/[ļ]/g, 'l')
                    .replace(/[ņ]/g, 'n')
                    .replace(/[ģ]/g, 'g')
                    .replace(/[š]/g, 's')
                    .replace(/[ž]/g, 'z')
                    .replace(/[č]/g, 'c');

                const normalizedSearchName = name.toLowerCase()
                    .replace(/[āàáâãäå]/g, 'a')
                    .replace(/[ēèéêë]/g, 'e')
                    .replace(/[īìíîï]/g, 'i')
                    .replace(/[ōòóôõö]/g, 'o')
                    .replace(/[ūùúûü]/g, 'u')
                    .replace(/[ķ]/g, 'k')
                    .replace(/[ļ]/g, 'l')
                    .replace(/[ņ]/g, 'n')
                    .replace(/[ģ]/g, 'g')
                    .replace(/[š]/g, 's')
                    .replace(/[ž]/g, 'z')
                    .replace(/[č]/g, 'c');

                return normalizedOrderName.includes(normalizedSearchName);
            });
        }


        this.renderFilteredOrders(filtered);
    }

    orders = async (orderId, name) => {

        // Filter orders based on search criteria
        let filtered = state.orders;

        if (orderId) {
            filtered = filtered.filter(order =>
                order.id.toLowerCase().includes(orderId.toLowerCase())
            );
        }

        if (name) {
            filtered = filtered.filter(order => {
                const normalizedOrderName = order.name.toLowerCase()
                    .replace(/[āàáâãäå]/g, 'a')
                    .replace(/[ēèéêë]/g, 'e')
                    .replace(/[īìíîï]/g, 'i')
                    .replace(/[ōòóôõö]/g, 'o')
                    .replace(/[ūùúûü]/g, 'u')
                    .replace(/[ķ]/g, 'k')
                    .replace(/[ļ]/g, 'l')
                    .replace(/[ņ]/g, 'n')
                    .replace(/[ģ]/g, 'g')
                    .replace(/[š]/g, 's')
                    .replace(/[ž]/g, 'z')
                    .replace(/[č]/g, 'c');

                const normalizedSearchName = name.toLowerCase()
                    .replace(/[āàáâãäå]/g, 'a')
                    .replace(/[ēèéêë]/g, 'e')
                    .replace(/[īìíîï]/g, 'i')
                    .replace(/[ōòóôõö]/g, 'o')
                    .replace(/[ūùúûü]/g, 'u')
                    .replace(/[ķ]/g, 'k')
                    .replace(/[ļ]/g, 'l')
                    .replace(/[ņ]/g, 'n')
                    .replace(/[ģ]/g, 'g')
                    .replace(/[š]/g, 's')
                    .replace(/[ž]/g, 'z')
                    .replace(/[č]/g, 'c');

                return normalizedOrderName.includes(normalizedSearchName);
            });
        }

        this.renderFilteredOrders(filtered);
    }

    renderFilteredOrders = (orders) => {
        const container = document.getElementById('ordersContainer');
        container.innerHTML = '';

        let ordersSorted = actionSortOrders(orders);

        Object.keys(ordersSorted).forEach(status => {
            ordersSorted[status].forEach((order, index) => {
                const orderElement = renderOrderRow(order, index);
                container.appendChild(orderElement);

                renderInventoryButtons(order._id);
            });
        });

        // Auto-expand details if only one order is shown
        if (orders.length === 1) {
            setTimeout(() => {
                state.actionGetOrderDetails(orders[0].id);
            }, 100);
        }

        // Scroll to top after rendering filtered orders
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}