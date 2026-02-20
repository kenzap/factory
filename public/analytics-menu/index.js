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

            console.log(this.user.rights);

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
                subtitle: __html('Browse reports by business area.'),
                visible: this.user?.rights.includes('analytics_access'),
                icon: '<i class="bi bi-graph-up me-3 mr-md-0 mr-lg-4 text-primary" style="max-width: 32px;font-size:32px;"></i>',
                sections: [
                    {
                        title: __html('Operations'),
                        links: [
                            {
                                text: __html('Employee Performance Report'),
                                link: link('/report-employee-performance/'),
                                target: '_blank',
                                rights: ['employee_performance_report'],
                            },
                            {
                                text: __html('Product Manufacturing Report'),
                                link: link('/report-product-manufacturing/'),
                                target: '_blank',
                                rights: ['product_manufacturing_report'],
                            },
                            {
                                text: __html('Inventory Reports'),
                                link: link('/inventory-reports/'),
                                target: '_blank',
                                rights: ['inventory_report'],
                            }
                        ]
                    },
                    {
                        title: __html('Sales'),
                        links: [
                            {
                                text: __html('Sales Reports'),
                                link: link('/sales-reports/'),
                                target: '_blank',
                                rights: ['product_sales_report'],
                            },
                            {
                                text: __html('Customer Analytics'),
                                link: link('/customer-analytics/'),
                                target: '_blank',
                                rights: ['product_sales_report'],
                            },
                            {
                                text: __html('Product Analytics'),
                                link: link('/product-analytics/'),
                                target: '_blank',
                                rights: ['product_sales_report'],
                            }
                        ]
                    },
                    {
                        title: __html('Finance & Overview'),
                        links: [
                            {
                                text: __html('Financial Reports'),
                                link: link('/financial-reports/'),
                                target: '_blank',
                                rights: ['financial_reports'],
                            },
                            {
                                text: __html('Dashboard Overview'),
                                link: link('/dashboard-overview/'),
                                target: '_blank',
                                rights: ['analytics_access'],
                            }
                        ]
                    }
                ],
            },
        ]
    }

    hasAnyRight = (rights = []) => {
        if (!Array.isArray(rights) || rights.length === 0) return true;
        return rights.some((right) => this.user?.rights?.includes(right));
    }

    getVisibleBlocks = () => {
        return this.blocks
            .filter((block) => block.visible)
            .map((block) => {
                const sections = (block.sections || [])
                    .map((section) => ({
                        ...section,
                        links: (section.links || []).filter((sectionLink) => this.hasAnyRight(sectionLink.rights))
                    }))
                    .filter((section) => section.links.length > 0);

                return {
                    ...block,
                    sections
                };
            })
            .filter((block) => (block.sections || []).length > 0);
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container p-edit">
                <div class="d-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                </div>
                <div class="row">
                ${this.getVisibleBlocks().map((block) => {

            return `
                        <div class="col-12 grid-margin stretch-card mb-4">
                            <div class="card border-white shadow-sm analytics-hub anm br">
                                <div class="card-body p-4 p-lg-5">
                                    <div class="d-flex flex-row align-items-start analytics-head">
                                        ${block.icon}
                                        <div class="mr-4 mr-md-0 mr-lg-4 text-left text-lg-left">
                                            <h5 class="card-title mb-1">${__html(block.title)} <button type="button" class="d-none btn-close float-end fs-6 rm-ext"></button></h5>
                                            <p class="card-description mb-1">${__html(block.desc)}</p>
                                            <p class="analytics-subtitle mb-0">${__html(block.subtitle)}</p>
                                        </div>
                                    </div>
                                    <div class="row report-sections">
                                        ${block.sections.map((section) => {
                return `
                                                <div class="col-md-6 col-xl-4 mb-3 mb-xl-0">
                                                    <div class="report-section-card h-100">
                                                        <h6 class="report-section-title">${html(section.title)}</h6>
                                                        <div class="link-group d-flex flex-column align-items-start">
                                                            ${section.links.map((sectionLink) => {
                    return `<a class="mt-2 text-md-tight text-primary report-link" href="${attr(sectionLink.link)}" target="${attr(sectionLink.target || slugify(sectionLink.link))}" data-ext="pages">${html(sectionLink.text)}</a>`
                }).join('')}
                                                        </div>
                                                    </div>
                                                </div>
                                            `
            }).join('')}
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
                { text: __html('Home'), link: link('/home/') },
                { text: __html('Analytics') },
            ]
        );

        document.title = __html('Analytics');
    }

    // init page listeners
    listeners = () => {


    }
}

window.analyticsMenu = new AnalyticsMenu();
