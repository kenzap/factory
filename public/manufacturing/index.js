import { actionGetBundles } from "../_/components/manufacturing/action_get_bundles.js";
import { actionGetOrderDetails } from "../_/components/manufacturing/action_get_order_details.js";
import { actionGetOrders } from "../_/components/manufacturing/action_get_orders.js";
import { actionIssueItem } from "../_/components/manufacturing/action_issue_item.js";
import { actionIssueOrder } from "../_/components/manufacturing/action_issue_order.js";
import { actionRefreshPage } from "../_/components/manufacturing/action_refresh_page.js";
import { actionUpdateState } from "../_/components/manufacturing/action_update_state.js";
import { renderInventoryButtons } from "../_/components/manufacturing/render_inventory_buttons.js";
import { renderPage } from "../_/components/manufacturing/render_page.js";
import { Search } from "../_/components/manufacturing/search.js";
import { SSEService } from "../_/components/manufacturing/sse.js";
import { filterByGroup, refreshOrders, toggleNarrowMode } from "../_/components/manufacturing/utils.js";
import { PreviewWorkLog } from "../_/components/order/preview_worklog.js";
import { signOut } from "../_/helpers/auth.js";
import { __html, hideLoader, slugify, toast } from "../_/helpers/global.js";
import { AddBundle } from "../_/modules/manufacturing/add_bundle.js";
import { Inventory } from "../_/modules/manufacturing/inventory.js";
import { state } from "../_/modules/manufacturing/state.js";
import { Modal } from "../_/modules/modal.js";

/** 
 * Manufacturing log. 
 * 
 * @version 1.0
 */
class Manufacturing {

    constructor() {

        // initialize default manufacturing states
        state.autoUpdateInterval = null;
        state.mouseTime = Date.now() / 1000;

        // Get order ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');

        state.openOrderById = orderId ? orderId.substring(orderId.length - 4) : null;
        state.mode = urlParams.get('mode') ? urlParams.get('mode') : 'normal';
        state.viewMode = localStorage.getItem('manufacturingViewMode') || 'compact';

        // bind functions to state for access in other modules
        state.actionGetOrderDetails = actionGetOrderDetails.bind(this);
        state.actionGetOrders = actionGetOrders.bind(this);
        state.view = this.view.bind(this);

        this.init();
    }

    init() {

        new Modal();

        state.Inventory = new Inventory();

        state.sse = new SSEService();

        state.actionGetOrders();

        hideLoader();
    }

    view() {

        if (document.querySelector('.manufacturing-cont')) return;

        renderPage();

        actionRefreshPage();

        toggleNarrowMode();

        state.Search = new Search();

        this.listeners();
    }

    listeners() {

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });

        // Focus on search input when page loads
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                document.getElementById('orderSearch').focus();
            }, 1500);
        });

        // close button for narrow mode
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.close();
            });
        }

        // backend state updates via SSE
        state.sseUnsubscribe = state.sse.subscribe((data) => {
            actionUpdateState(data);
        });

        // disconnect from sse
        window.addEventListener('beforeunload', () => {
            if (state.sseUnsubscribe) {
                state.sseUnsubscribe();
            }
            state.sse.disconnect();
        });
    }

    addBundle(event, _id, title, color, coating, orderId) {

        event.preventDefault();

        const orders = state.orders;
        const self = this;

        window.addbundle = new AddBundle({ _id, title, color, coating, orderId }, state.settings, (response) => {
            if (!response.success) {
                toast(__html('Error: ') + response.error);
                return;
            }

            // console.log('Getting bundles', response.orderId, orders, state.orders);

            self.orders = orders; // restore orders reference

            actionGetBundles(response.orderId);
        });
    }

    syncCheckboxStates(e, order_id) {

        const order = state.orders.find(o => o._id === order_id);

        if (!order) return;

        // console.log(state.Inventory);
        state.Inventory.syncCheckboxState(e, order);
    }

    async issueOrder(orderId, isIssue) {

        await actionIssueOrder(orderId, isIssue, state.orders, (result) => {

            if (result.success) {

                console.log('Order', result.order);

                renderInventoryButtons(result.order._id);
                // updateWriteoffInputUI(result.order, result.order.items.find(i => i.id === result.item_id));
            } else {
                toast(__html('Error updating order status'));
            }
        });
    }

    openWork(type, id, order_id, item_id, product_id, product_name, color, coating, qty) {

        color = color || '';
        coating = coating || '';
        qty = qty || 0;

        if (type === 'cutting') {

            this.openWindow('_blank', `/cutting-list/?color=${color}&coating=${coating}&slug=${slugify(coating + " " + color)}`); return;
        }

        new PreviewWorkLog({ type, id, order_id, item_id, product_id, product_name, color, coating, qty, user_id: state.user.id }, (response) => {
            if (!response.success) {
                toast(__html('Error opening work log'));
                return;
            }
            if (response.success) {
                state.actionGetOrders();
            }
        });
    }

    openWindow(name, url) {
        const win = window.open(url, name, 'width=1200,height=800,location=yes,menubar=yes,status=no,toolbar=yes,scrollbars=yes,resizable=yes');
        win.focus();
    }

    // Additional methods for item management
    async issueItem(order_id, item_id, isIssue = true) {

        await actionIssueItem(order_id, item_id, isIssue, state.orders, (response) => {

            if (!response.success) { toast(__html('Error updating item status')); return; }

            state.orders = response.orders; // Update orders with the response from the server

            renderInventoryButtons(order_id);
        });
    }

    toggleView() {

        state.viewMode = state.viewMode === 'warehouse' ? 'compact' : 'warehouse'
        document.body.dataset.viewMode = state.viewMode

        localStorage.setItem('manufacturingViewMode', state.viewMode)

        // Rerender orders to apply the new view mode
        window.manufacturing.init()
    }

    destroy() {

        if (state.autoUpdateInterval) {
            clearInterval(state.autoUpdateInterval)
        }
    }

    filterByGroup(orderId, groupId) { filterByGroup(orderId, groupId) }

    refreshOrders() { refreshOrders() }

    signOut(e) { signOut(e) }

    async getOrderDetails(orderId) { state.actionGetOrderDetails(orderId) }

}

window.manufacturing = new Manufacturing();