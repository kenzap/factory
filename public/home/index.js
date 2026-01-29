import { getHome } from "../_/api/get_home.js";
import { __html, attr, hideLoader, html, initBreadcrumbs, link, slugify } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Main navigation menu page of the dashboard.
 * Loads HTMLContent from _cnt_home.js file.
 * Renders menu items in a list view manner
 * 
 * @version 1.0 
 */
class Home {

    // construct class
    constructor() {

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getHome((response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.user = response.user;

            // console.log(this.user.rights);

            // locale
            new Locale(response);

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                title: __html('Dashboard'),
                icon: 'bi bi-grid',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            // init footer
            new Footer(response);

            // init navigation blocks
            this.initBlocks();

            // load page html 
            this.html();

            // render page
            this.render();
        });
    }

    initBlocks = () => {

        // add or remove navigation blocks to the dashboard
        this.blocks = [
            {
                id: 'orders',
                title: __html('Orders'),
                desc: __html('Manage and create new orders, generate order reports.'),
                visible: this.user?.rights.includes('order_management'),
                icon: '<i class="bi bi-bookmark-check me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('New'),
                        link: link('/order/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Orders'),
                        link: link('/orders/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'factory',
                title: __html('Factory'),
                desc: __html('Manage manufacturing processes, prepare orders for cutting.'),
                visible: this.user?.rights.includes('manufacturing_journal') || this.user?.rights.includes('cutting_journal') || this.user?.rights.includes('work_log_journal'),
                icon: '<i class="bi bi-box-seam me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Manufacturing'),
                        link: link('/manufacturing/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Cutting'),
                        link: link('/cutting/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Work Log'),
                        link: link('/worklog/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'finance',
                title: __html('Finance'),
                desc: __html('Manage payments and transactions, generate reports.'),
                visible: this.user?.rights.includes('payments_journal'),
                icon: '<i class="bi bi-bank me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Payments'),
                        link: link('/payments/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'entities',
                title: __html('Clients'),
                desc: __html('Manage corporate and private entities, individual records.'),
                visible: this.user?.rights.includes('client_management'),
                icon: '<i class="bi bi-layout-wtf me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Clients'),
                        link: link('/clients/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'warehouse',
                title: __html('Warehouse'),
                desc: __html('Manage product listings, inventory, prices, and suppliers.'),
                visible: this.user?.rights.includes('warehouse_management'),
                icon: '<i class="bi bi-boxes me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Products'),
                        link: link('/product-list/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Stock'),
                        link: link('/stock/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Metal'),
                        link: link('/metallog/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'settings',
                title: __html('Settings'),
                desc: __html('Modify tax and other settings, configure templates and notifications.'),
                visible: this.user?.rights.includes('settings_management'),
                icon: '<i class="bi bi-gear me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Settings'),
                        link: link('/settings/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'analytics',
                title: __html('Analytics'),
                desc: __html('Generate sales reports, view top sellings products.'),
                visible: this.user?.rights.includes('analytics_access'),
                icon: '<i class="bi bi-graph-up me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Works'),
                        link: link('/employee-performance/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'portal',
                title: __html('Portal'),
                desc: __html('Adjust public portal settings, create announcements.'),
                visible: this.user?.rights.includes('portal_management'),
                icon: '<i class="bi bi-pip me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Blog'),
                        link: link('/blog/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'localization',
                title: __html('Localization'),
                desc: __html('Localize any part of your portal or landing page.'),
                visible: this.user?.rights.includes('localization_management'),
                icon: '<i class="bi bi-translate me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Localization'),
                        link: link('/localization/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'media',
                title: __html('Files'),
                desc: __html('View your file library and manage cloud storage.'),
                visible: this.user?.rights.includes('file_management'),
                icon: '<i class="bi bi-database me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('View'),
                        link: link('/media/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'access',
                title: __html('Access & Security'),
                desc: __html('Grant API access or revoke existing tokens to this portal.'),
                visible: this.user?.rights.includes('access_management'),
                icon: '<i class="bi bi-shield-lock me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Setup'),
                        link: link('/access/'),
                        target: '_blank',
                    }
                ],
            },
            {
                id: 'users',
                title: __html('Users'),
                desc: __html('Grant new user or revoke existing user access to this portal.'),
                visible: this.user?.rights.includes('user_management'),
                icon: '<i class="bi bi-person me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Users'),
                        link: link('/users/'),
                        target: '_blank',
                    }
                ],
            }
        ]
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container p-edit">
                <div class="d-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                </div>
                <div class="row">
                ${this.blocks.map((block) => {

            if (!block.visible) return '';

            return `
                        <div class="col-lg-4 grid-margin stretch-card mb-4">
                            <div class="card border-white shadow-sm p-sm-2 anm br" >
                                <div class="card-body">
                                    <div class="d-flex flex-row">
                                        ${block.icon}
                                        <div class="mr-4 mr-md-0 mr-lg-4 text-left text-lg-left ">
                                            <h5 class="card-title mb-0">${__html(block.title)} <button type="button" class="d-none btn-close float-end fs-6 rm-ext"></button></h5>
                                            <p class="card-description mt-1 mb-0">${__html(block.desc)}</p>
                                            <div class="link-group">
                                                ${block.links.map((link) => {
                return `<a class="mt-2 me-2 text-md-tight text-primary" href="${attr(link.link)}" target="${slugify(link.link)}" data-ext="pages">${html(link.text)}</a>`
            }).join('')}
                                            </div>
                                        </div>
                                    </div>                  
                                </div>
                            </div>
                        </div>
                        `
        }).join('')}
                </div>
            </div>
        </div>`;
    }

    // render page
    render = () => {

        // initiate breadcrumbs
        initBreadcrumbs(
            [
                { text: __html('Home') },
            ]
        );

        document.title = __html('Home');
    }

    // init page listeners
    listeners = () => {


    }
}

window.home = new Home();
