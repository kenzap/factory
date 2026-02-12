import { getOrders } from "../../api/get_orders.js";
import { __html, hideLoader } from "../../helpers/global.js";
import { Header } from "../../modules/header.js";
import { Locale } from "../../modules/locale.js";
import { state } from "../../modules/manufacturing/state.js";
import { Session } from "../../modules/session.js";
import { isAuthorized } from "../../modules/unauthorized.js";
import { renderOrders } from "./render_orders.js";
import { renderStats } from "./render_stats.js";

export const actionGetOrders = async () => {

    // get orders
    getOrders(state.filters, (response) => {

        // console.log(response);

        // show UI loader
        if (!response.success) return;

        // init locale
        new Locale(response);

        // hide UI loader
        hideLoader();

        // check if authorized
        if (!isAuthorized(response, 'manufacturing_journal')) return

        // cache variables
        state.response = response;
        state.settings = response.settings;
        state.orders = response.orders.records;
        state.user = response.user;

        // session
        new Session();
        new Header({
            hidden: true,
            title: __html('Manufacturing'),
            icon: 'card-text',
            style: 'navbar-dark bg-dark',
            user: state.user,
            menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
        });

        // set page title
        document.title = __html('Manufacturing');

        state.view();

        renderOrders();

        renderStats();

        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('ordersContainer').style.display = 'block';

        if (state.openOrderById) { document.querySelector('#orderSearch').value = state.openOrderById; state.Search.byOrderId(state.openOrderById); state.openOrderById = null; }
    });
}