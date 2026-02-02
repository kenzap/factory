import { getHome } from "../_/api/get_home.js";
import { __html, initBreadcrumbs } from "../_/helpers/global.js";
import { Auth } from "../_/modules/auth.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";

/**
 * Main navigation menu page of the dashboard.
 * Loads HTMLContent from _cnt_home.js file.
 * Renders menu items in a list view manner
 * 
 * @version 1.0
 */
class Login {

    // construct class
    constructor() {

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        new Locale({});

        new Auth();

        getHome((response) => {

            // show UI loader
            if (!response.success) return;

            // load page
            // this.html();
        });
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/``;
    }

    // render page
    render = () => {

        // initiate breadcrumbs
        initBreadcrumbs(
            [
                { text: __html('Login') },
            ]
        );

        document.title = __html('Login');
    }
}

window.login = new Login();
