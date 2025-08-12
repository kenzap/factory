import { getOrdersForCutting } from "../_/api/get_orders_for_cutting.js";
import { __html, formatDate, hideLoader } from "../_/helpers/global.js";
import { formatCompanyName } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";


/**
 * This page displays a list of orders for cutting based on selected color and coating.
 * It allow factory workers to write off materials from stock after cutting from coil.
 * 
 * @version 1.0
 */
class CuttingList {

    // construct class
    constructor() {

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.color = urlParams.get('color');
        this.coating = urlParams.get('coating');
        this.slug = urlParams.get('slug');
        this.filters = {
            client: { name: "" },
            dateFrom: '',
            dateTo: '',
            type: '',
            color: this.color || '',
            coating: this.coating || '',
            items: true
        };

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getOrdersForCutting(this.filters, (response) => {

            console.log(response);

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.orders = response.orders;

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                home: '/cutting/',
                title: this.color + " " + this.coating,
                icon: 'gear-fill',
                style: 'navbar-dark bg-dark',
                controls: `     

                    <!-- Color Sample Square -->
                    <div class="color-sample-container search-container me-3">
                        <div class="color-sample" style="background-color: ${this.color || '#ccc'}; background-image: url('/assets/textures/${this.slug}.jpeg'); background-size: cover; background-position: center;"></div>
                    </div>

                    <!-- Search Container -->
                    <div class="search-container d-flex align-items-center">
                        <div class="me-0">
                            <input type="text" id="coatingSearch" class="form-control search-input" placeholder="${__html('Search orders (e.g., 4994 0043)...')}" style="width: 350px;">
                        </div>
                    </div>

                    <!-- Filter Button Group -->
                    <div class="btn-group search-container ms-3 me-3" role="group" aria-label="Filter buttons">
                        <input type="radio" class="btn-check" name="filterOptions" id="activeFilter" autocomplete="off" checked>
                        <label class="btn btn-outline-light" for="activeFilter">${__html('Current')}</label>
                        <input type="radio" class="btn-check" name="filterOptions" id="archiveFilter" autocomplete="off">
                        <label class="btn btn-outline-light" for="archiveFilter">${__html('Archive')}</label>
                    </div>

                    `,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            // init footer
            // new Footer(response);

            // init navigation blocks
            this.initBlocks();

            // load page html 
            this.html();

            // render page
            this.render();

            this.listeners();
        });
    }

    initBlocks = () => {


    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`  
            <div class="main-container">
                <div class="stock-panel">
                    <div class="stock-header d-none">
                        <span>📦</span>
                        <span>Available Stock</span>
                    </div>
                    <div class="stock-list bg-light pt-0" id="stockList">
                        <div class="stock-item" data-coil="7887">
                            <div class="coil-info">
                                <div class="coil-dimensions">1250 × 795,200 mm</div>
                                <div class="coil-details">163 × 750 × 14</div>
                                <div class="coil-supplier">SSAB Europe Oy Nr.3</div>
                            </div>
                        </div>
                        <div class="stock-item" data-coil="7887">
                            <div class="coil-info">
                                <div class="coil-dimensions">1250 × 780,000 mm</div>
                                <div class="coil-details">130 × 500 × 18</div>
                                <div class="coil-supplier">SSAB Europe Oy Nr.2</div>
                            </div>
                        </div>
                        <div class="stock-item" data-coil="2194">
                            <div class="coil-info">
                                <div class="coil-dimensions">1250 × 478,000 mm</div>
                                <div class="coil-details">0 × 1000 × 30</div>
                                <div class="coil-supplier">SSAB Europe Oy Nr.1</div>
                            </div>
                        </div>
                        <div class="stock-item" data-coil="186">
                            <div class="coil-info">
                                <div class="coil-dimensions">1250 × 186,500 mm</div>
                                <div class="coil-details">420 × 26000 × 1</div>
                                <div class="coil-supplier">Ruukki Products AS N 4</div>
                            </div>
                        </div>
                        <div class="stock-item" data-coil="97">
                            <div class="coil-info">
                                <div class="coil-dimensions">1250 × 97,500 mm</div>
                                <div class="coil-details">325 × 1740 × 15</div>
                                <div class="coil-supplier">SSAB Europe Oy stari</div>
                            </div>
                        </div>
                        <div class="stock-item" data-coil="39">
                            <div class="coil-info">
                                <div class="coil-dimensions">1250 × 39,500 mm</div>
                                <div class="coil-details">0 × 1000 × 6</div>
                                <div class="coil-supplier">Ruukki Products AS 5</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="orders-panel">
                    <div id="archiveOrders" class="tab-content d-none">
                        
                    </div>

                    <div id="waitingOrders" class="tab-content">
                        ${this.orders && this.orders.length > 0 ? this.orders.map(order => `
                            <div class="order-group">
                                <div class="order-header">
                                    <span>${__html('Order #')}${order.id} - ${formatCompanyName(order) || 'N/A'} (${formatDate(order.due_date) || 'N/A'})</span>
                                    <span class="me-2">${__html('%1$ items', order.items ? order.items.length : 0)}</span>
                                </div>
                                <div class="order-items">
                                    ${order.items ? order.items.map(item => `
                                        <div class="order-item">
                                            <input type="checkbox" class="checkbox" data-item="${order.id}-${item.id}">
                                            <span class="item-id">${item.id || order.id}</span>
                                            <span class="item-description">${item.title || 'N/A'}</span>
                                            <span class="item-dimensions">${item.formula_width_calc || 0} × ${item.formula_length_calc || 0}</span>
                                            <span class="item-quantity">${item.qty || 1}</span>
                                            <span class="item-status status-${item.status ? item.status.toLowerCase() : 'waiting'}">${item.status || 'Waiting'}</span>
                                            <span class="ms-2">${item.progress || 0}</span>
                                        </div>
                                    `).join('') : ''}
                                </div>
                            </div>
                        `).join('') : '<div class="no-orders">No orders available</div>'}
                    </div>
                </div>
            </div>
    
        `;
    }

    // render page
    render = () => {

    }

    // init page listeners
    listeners = () => {

        // Search functionality
        const searchInput = document.getElementById('coatingSearch');
        const colorCards = document.querySelectorAll('.color-card');
        const filterTabs = document.querySelectorAll('.filter-tab');
        const coatingSections = document.querySelectorAll('.coating-section');

        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();

            colorCards.forEach(card => {
                const colorCode = card.dataset.code.toLowerCase();
                const colorType = card.dataset.type.toLowerCase();

                if (colorCode.includes(searchTerm) || colorType.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });


    }
}

new CuttingList();