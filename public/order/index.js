import { getOrder } from "../_/api/get_order.js";
import { hideLoader } from "../_/helpers/global.js";
import { bus } from "../_/modules/bus.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { ClientPane } from "../_/modules/order/client_pane.js";
import { LeftPane } from "../_/modules/order/left_pane.js";
import { OrderPane } from "../_/modules/order/order_pane.js";
import { state } from "../_/modules/order/state.js";
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
        // state.settings = {};
        state.order = { _id: null, id: urlParams.get('id') ? urlParams.get('id') : "", eid: null };
        this.firstLoad = true;

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

            if (!state.order.id) state.order.id = "";

            // session
            new Session();
            new LeftPane();

            if (state.order.id && this.firstLoad) new OrderPane();
            if (!state.order.id && this.firstLoad) new ClientPane();

            this.firstLoad = false;
        });
    }

    // listeners
    listeners = () => {

        bus.on('order:updated', (id) => {

            state.order.id = id;

            this.init();
        });
    }
}

new OrderEdit();