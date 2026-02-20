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
class AnalyticsMenu {

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
                id: 'analytics',
                title: __html('Analytics'),
                desc: __html('Generate sales reports, view top selling products, and analyze business performance.'),
                visible: this.user?.rights.includes('analytics_access'),
                icon: '<i class="bi bi-graph-up me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                links: [
                    {
                        text: __html('Employee Performance'),
                        link: link('/employee-performance/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Product Manufacturing Report'),
                        link: link('/report-product-manufacturing/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Sales Reports'),
                        link: link('/sales-reports/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Product Analytics'),
                        link: link('/product-analytics/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Financial Reports'),
                        link: link('/financial-reports/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Customer Analytics'),
                        link: link('/customer-analytics/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Inventory Reports'),
                        link: link('/inventory-reports/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Dashboard Overview'),
                        link: link('/dashboard-overview/'),
                        target: '_blank',
                    }
                ],
            },
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

window.analyticsMenu = new AnalyticsMenu();
