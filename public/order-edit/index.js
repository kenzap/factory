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
        this.order = { _id: null, id: urlParams.get('id') ? urlParams.get('id') : null, eid: null };

        // connect to backend
        this.init();

        // listeners
        this.listeners();
    }

    init = () => {

        new Modal();

        getOrder(this.order.id, (response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.order = response.order;

            // session
            new Session();
            new LeftPane(this.settings, this.order);
            new ClientPane(this.order.eid);

            // init header
            // new Header(response);

            console.log(response);

            // no authenticated => stop here
            // if (!response.user) return;

            // console.log(response);

            // load page html 
            this.html();

            // render page
            this.render();

            // init footer
            // new Footer(response);

            // console.log(response);
        });
    }

    // load page
    html = () => {

    }

    // render page
    render = () => {

        // initiate breadcrumbs
        // initBreadcrumbs(
        //     [
        //         { text: __html('Home') },
        //     ]
        // );
    }

    // listeners
    listeners = () => {

        bus.on('order:reload', (id) => {

            this.order.id = id;

            this.init();
        });
    }

    // save order
    save = () => {

        // save order logic here
        // e.g., send updated order data to the server
    }
}

new OrderEdit();