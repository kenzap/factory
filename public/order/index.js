import { getOrder } from "../_/api/get_order.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { bus } from "../_/modules/bus.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { ClientPane } from "../_/modules/order/client_pane.js";
import { LeftPane } from "../_/modules/order/left_pane.js";
import { OrderPane } from "../_/modules/order/order_pane.js";
import { state } from "../_/modules/order/state.js";
import { orderUpdatesSSE } from "../_/modules/sse/order_updates.js";
import { Session } from "../_/modules/session.js";

/**
 * Order Create/Edit Page
 * 
 * @version 1.0
 */
class OrderEdit {

    // construct class
    constructor() {

        // get id from url parameter if present
        const urlParams = new URLSearchParams(window.location.search);

        // initialize order and settings
        state.order = { _id: null, id: urlParams.get('id') ? urlParams.get('id') : "", eid: null };
        this.firstLoad = true;
        this.leftPane = null;
        this.orderPane = null;
        this.unsubscribeOrderUpdates = null;

        // connect to backend
        this.init();

        // listeners
        this.listeners();
    }

    init = () => {

        new Modal();

        getOrder(state.order.id, (response) => {

            console.log(response);

            // show UI loader
            if (!response.success) return;

            // init locale
            new Locale(response);

            // hide UI loader
            hideLoader();

            state.settings = response.settings;
            state.order = response.order;
            state.orderTableDirty = false;

            if (!state.order.id) state.order.id = "";

            // session
            new Session();
            this.leftPane = new LeftPane();

            if (state.order.id && this.firstLoad) this.orderPane = new OrderPane();
            if (!state.order.id && this.firstLoad) new ClientPane();
            if (this.firstLoad) this.subscribeToLiveUpdates();

            // set page title
            document.title = state.order.id ? __html(`#%1$`, state.order.id) : __html('New Order');

            this.firstLoad = false;
        });
    }

    subscribeToLiveUpdates = () => {
        if (this.unsubscribeOrderUpdates) return;

        orderUpdatesSSE.connect();
        this.unsubscribeOrderUpdates = orderUpdatesSSE.subscribe((data) => this.handleLiveUpdate(data));
    }

    handleLiveUpdate = (data) => {
        if (!data?.type || !state.order) return;

        switch (data.type) {
            case 'items-update':
                this.handleItemLiveUpdate(data);
                break;
            case 'order-update':
                this.handleOrderLiveUpdate(data);
                break;
            default:
                break;
        }
    }

    handleItemLiveUpdate = (data) => {
        if (!state.order?._id || String(data.order_id || '') !== String(state.order._id)) return;

        const currentItems = Array.isArray(state.order.items) ? state.order.items : [];
        const serverItems = Array.isArray(data.items) ? data.items : [];
        if (!currentItems.length || !serverItems.length) return;

        const serverItemsById = new Map(
            serverItems
                .filter((item) => item?.id !== undefined && item?.id !== null)
                .map((item) => [String(item.id), item])
        );

        const knownIds = new Set();
        const mergedItems = currentItems.map((item) => {
            const serverItem = serverItemsById.get(String(item.id));
            if (!serverItem) return item;

            knownIds.add(String(item.id));

            return {
                ...item,
                inventory: serverItem.inventory ?? item.inventory,
                bundle_items: serverItem.bundle_items ?? item.bundle_items,
                worklog: serverItem.worklog ?? item.worklog,
                width_writeoff: serverItem.width_writeoff ?? item.width_writeoff,
                length_writeoff: serverItem.length_writeoff ?? item.length_writeoff
            };
        });

        serverItems.forEach((item) => {
            if (!knownIds.has(String(item.id))) {
                mergedItems.push(item);
            }
        });

        state.order.items = mergedItems;
        this.orderPane?.syncServerState?.();
    }

    handleOrderLiveUpdate = (data) => {
        const matchesCurrentOrder = String(data.order_id || '') === String(state.order.id || '')
            || String(data.order_record_id || '') === String(state.order._id || '');

        if (!matchesCurrentOrder) return;

        if (Object.prototype.hasOwnProperty.call(data, 'draft')) {
            state.order.draft = data.draft === true || data.draft === 1 || data.draft === '1' || data.draft === 'true';
        }

        ['waybill', 'invoice', 'quotation', 'production_slip', 'packing_list', 'sketch_list'].forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                state.order[field] = data[field] || {};
            }
        });

        this.leftPane?.refreshDocumentButtons?.();
        this.orderPane?.updateToolbarState?.();
    }

    // listeners
    listeners = () => {

        bus.on('order:updated', (id) => {

            console.log('Order updated listener triggered with id:', id);

            state.order.id = id;

            this.init();
        });
    }
}

new OrderEdit();
