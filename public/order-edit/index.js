import { getOrder } from "../_/api/get_order.js";
import { hideLoader } from "../_/helpers/global.js";
import { bus } from "../_/modules/bus.js";
import { Modal } from "../_/modules/modal.js";
import { ClientPane } from "../_/modules/order/client_pane.js";
import { LeftPane } from "../_/modules/order/left_pane.js";
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
        this.settings = {};
        this.order = { _id: null, id: urlParams.get('id') ? urlParams.get('id') : "", eid: null };

        // connect to backend
        this.init();

        // listeners
        this.listeners();
    }

    init = () => {

        new Modal();

        getOrder(this.order.id, (response) => {
            console.log(response);
            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.order = response.order;

            if (!this.order.id) this.order.id = "";

            // session
            new Session();
            new LeftPane(this.settings, this.order);
            new ClientPane(this.order);


        });
    }

    // listeners
    listeners = () => {

        bus.on('order:updated', (id) => {

            this.order.id = id;

            this.init();
        });
    }
}

new OrderEdit();