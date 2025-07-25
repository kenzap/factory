import { getOrder } from "/_/api/get_order.js";
import { hideLoader } from "/_/helpers/global.js";
import { Modal } from "/_/modules/modal.js";
import { ClientPane } from "/_/modules/order/client_pane.js";
import { LeftPane } from "/_/modules/order/left_pane.js";
import { Session } from "/_/modules/session.js";

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
        this.id = urlParams.get('id');

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getOrder(this.id, (response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.order = response.order;
            this.order = { ...this.order, eid: this.id ? this.id : null };

            // session
            new Session();

            new LeftPane();
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

            console.log(response);
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


    }

    // save order
    save = () => {

        // save order logic here
        // e.g., send updated order data to the server
    }
}

new OrderEdit();