import { getHome } from "../_/api/get_home.js";
import { __html, attr, hideLoader, html, initBreadcrumbs, link } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
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

            console.log(response);

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;

            // session
            new Session();

            // init header
            new Header(response);

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
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0"/><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/></svg>',
                links: [
                    {
                        text: __html('New'),
                        link: link('/order-edit/'),
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
                icon: '<i class="bi bi-box-seam me-3 mr-md-0 mr-lg-4 text-primary" width="64" height="32" style="max-width: 32px;font-size:32px;"></i>',
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
                    }
                ],
            },
            {
                id: 'finance',
                title: __html('Finance'),
                desc: __html('Manage payments and transactions, generate reports.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-piggy-bank me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M5 6.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.138-1.496A6.6 6.6 0 0 1 7.964 4.5c.666 0 1.303.097 1.893.273a.5.5 0 0 0 .286-.958A7.6 7.6 0 0 0 7.964 3.5c-.734 0-1.441.103-2.102.292a.5.5 0 1 0 .276.962"/><path fill-rule="evenodd" d="M7.964 1.527c-2.977 0-5.571 1.704-6.32 4.125h-.55A1 1 0 0 0 .11 6.824l.254 1.46a1.5 1.5 0 0 0 1.478 1.243h.263c.3.513.688.978 1.145 1.382l-.729 2.477a.5.5 0 0 0 .48.641h2a.5.5 0 0 0 .471-.332l.482-1.351c.635.173 1.31.267 2.011.267.707 0 1.388-.095 2.028-.272l.543 1.372a.5.5 0 0 0 .465.316h2a.5.5 0 0 0 .478-.645l-.761-2.506C13.81 9.895 14.5 8.559 14.5 7.069q0-.218-.02-.431c.261-.11.508-.266.705-.444.315.306.815.306.815-.417 0 .223-.5.223-.461-.026a1 1 0 0 0 .09-.255.7.7 0 0 0-.202-.645.58.58 0 0 0-.707-.098.74.74 0 0 0-.375.562c-.024.243.082.48.32.654a2 2 0 0 1-.259.153c-.534-2.664-3.284-4.595-6.442-4.595M2.516 6.26c.455-2.066 2.667-3.733 5.448-3.733 3.146 0 5.536 2.114 5.536 4.542 0 1.254-.624 2.41-1.67 3.248a.5.5 0 0 0-.165.535l.66 2.175h-.985l-.59-1.487a.5.5 0 0 0-.629-.288c-.661.23-1.39.359-2.157.359a6.6 6.6 0 0 1-2.157-.359.5.5 0 0 0-.635.304l-.525 1.471h-.979l.633-2.15a.5.5 0 0 0-.17-.534 4.65 4.65 0 0 1-1.284-1.541.5.5 0 0 0-.446-.275h-.56a.5.5 0 0 1-.492-.414l-.254-1.46h.933a.5.5 0 0 0 .488-.393m12.621-.857a.6.6 0 0 1-.098.21l-.044-.025c-.146-.09-.157-.175-.152-.223a.24.24 0 0 1 .117-.173c.049-.027.08-.021.113.012a.2.2 0 0 1 .064.199"/></svg>',
                links: [
                    {
                        text: __html('Transactions'),
                        link: link('/journal/transactions/'),
                    },
                    {
                        text: __html('Reports'),
                        link: link('/journal/transactions/'),
                    }
                ],
            },
            {
                id: 'entities',
                title: __html('Clients'),
                desc: __html('Manage corporate and private entities, individual records.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M5 1v8H1V1zM1 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm13 2v5H9V2zM9 1a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM5 13v2H3v-2zm-2-1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1zm12-1v2H9v-2zm-6-1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z"/></svg>',
                links: [
                    {
                        text: __html('Clients'),
                        link: link('/journal/clients/'),
                        target: '_blank',
                    },
                    {
                        text: __html('Reports'),
                        link: link('/journal/transactions/'),
                    }
                ],
            },
            {
                id: 'warehouse',
                title: __html('Warehouse'),
                desc: __html('Manage product listings, inventory, prices, and suppliers.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-card-checklist me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M7.752.066a.5.5 0 0 1 .496 0l3.75 2.143a.5.5 0 0 1 .252.434v3.995l3.498 2A.5.5 0 0 1 16 9.07v4.286a.5.5 0 0 1-.252.434l-3.75 2.143a.5.5 0 0 1-.496 0l-3.502-2-3.502 2.001a.5.5 0 0 1-.496 0l-3.75-2.143A.5.5 0 0 1 0 13.357V9.071a.5.5 0 0 1 .252-.434L3.75 6.638V2.643a.5.5 0 0 1 .252-.434zM4.25 7.504 1.508 9.071l2.742 1.567 2.742-1.567zM7.5 9.933l-2.75 1.571v3.134l2.75-1.571zm1 3.134 2.75 1.571v-3.134L8.5 9.933zm.508-3.996 2.742 1.567 2.742-1.567-2.742-1.567zm2.242-2.433V3.504L8.5 5.076V8.21zM7.5 8.21V5.076L4.75 3.504v3.134zM5.258 2.643 8 4.21l2.742-1.567L8 1.076zM15 9.933l-2.75 1.571v3.134L15 13.067zM3.75 14.638v-3.134L1 9.933v3.134z"/></svg>',
                links: [
                    {
                        text: __html('Products'),
                        target: '_self',
                        link: link('/product-list/'),
                    },
                    {
                        text: __html('Suppliers'),
                        link: link('/warehouse/suppliers/'),
                    },
                    {
                        text: __html('Metal'),
                        link: link('/warehouse/metal/'),
                    }
                ],
            },
            {
                id: 'settings',
                title: __html('Settings'),
                desc: __html('Modify tax and other settings, configure templates and notifications.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/></svg>',
                links: [
                    {
                        text: __html('Settings'),
                        link: link('/settings/'),
                    }
                ],
            },
            {
                id: 'analytics',
                title: __html('Analytics'),
                desc: __html('Generate sales reports, view top sellings products.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"></path></svg>',
                links: [
                    {
                        text: __html('Analytics'),
                        link: link('/analytics/'),
                    }
                ],
            },
            {
                id: 'portal',
                title: __html('Portal'),
                desc: __html('Adjust public portal settings, create announcements.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M2.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm2-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm1 .5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"></path><path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v2H1V3a1 1 0 0 1 1-1h12zM1 13V6h4v8H2a1 1 0 0 1-1-1zm5 1V6h9v7a1 1 0 0 1-1 1H6z"></path></svg>',
                links: [
                    {
                        text: __html('Settings'),
                        link: link('/settings/'),
                    }
                ],
            },
            {
                id: 'localization',
                title: __html('Localization'),
                desc: __html('Localize any part of your portal or landing page.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"></path><path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm7.138 9.995c.193.301.402.583.63.846-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6.066 6.066 0 0 1-.415-.492 1.988 1.988 0 0 1-.94.31z"></path></svg>',
                links: [
                    {
                        text: __html('Localization'),
                        link: link('/localization/'),
                    }
                ],
            },
            {
                id: 'media',
                title: __html('Files'),
                desc: __html('View your file library and manage cloud storage.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" style="max-width: 32px;" class="bi bi-ticket me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16"><path d="M4.318 2.687C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4c0-.374.356-.875 1.318-1.313ZM13 5.698V7c0 .374-.356.875-1.318 1.313C10.766 8.729 9.464 9 8 9s-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777A4.92 4.92 0 0 0 13 5.698ZM14 4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13V4Zm-1 4.698V10c0 .374-.356.875-1.318 1.313C10.766 11.729 9.464 12 8 12s-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777A4.92 4.92 0 0 0 13 8.698Zm0 3V13c0 .374-.356.875-1.318 1.313C10.766 14.729 9.464 15 8 15s-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13s3.022-.289 4.096-.777c.324-.147.633-.323.904-.525Z"></path></svg>',
                links: [
                    {
                        text: __html('View'),
                        link: link('/media/'),
                    }
                ],
            },
            {
                id: 'access',
                title: __html('Access & Security'),
                desc: __html('Grant API access or revoke existing tokens to this portal.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" class="bi bi-pencil-square me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16" style="max-width: 32px;"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"></path><path d="M9.5 6.5a1.5 1.5 0 0 1-1 1.415l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99a1.5 1.5 0 1 1 2-1.415z"></path></svg>',
                links: [
                    {
                        text: __html('Setup'),
                        link: link('/access/'),
                    }
                ],
            },
            {
                id: 'users',
                title: __html('Users'),
                desc: __html('Grant new user or revoke existing user access to this portal.'),
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" fill="currentColor" class="bi bi-pencil-square me-3 mr-md-0 mr-lg-4 text-primary" viewBox="0 0 16 16" style="max-width: 32px;"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"></path><path d="M9.5 6.5a1.5 1.5 0 0 1-1 1.415l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99a1.5 1.5 0 1 1 2-1.415z"></path></svg>',
                links: [
                    {
                        text: __html('Users'),
                        link: link('/users/'),
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
                return `<a class="mt-2 me-2 text-md-tight text-primary" href="${attr(link.link)}" target="${attr(link.target ? link.target : "_self")}" data-ext="pages">${html(link.text)}</a>`
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
    }

    // init page listeners
    listeners = () => {


    }
}

new Home();