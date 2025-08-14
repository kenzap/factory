import { getOrdersForCutting } from "../_/api/get_orders_for_cutting.js";
import { __html, formatDate, getDimUnit, hideLoader } from "../_/helpers/global.js";
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
            this.stock = response.stock;

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

                    ${this.stock && this.stock.length > 0 ? this.stock.map(coil => `
                        <div class="stock-item" data-coil="${coil.id}">
                            <div class="vertical-text">${coil.thickness ? coil.thickness + getDimUnit(this.settings) : ""}</div>
                            <div class="coil-info">
                                <div class="coil-dimensions fs-5">${coil.width} × ${coil.length} ${getDimUnit(this.settings)}</div>
                                <div class="coil-supplier">${coil.supplier} / <input type="text" class="editable-notes border-0 bg-transparent" value="${coil.notes}" data-coil-id="${coil.id}" style="width: auto; min-width: 50px;"></div>
                            </div>
                        </div>
                    `).join('') : `<div class="no-stock text-center py-4">${__html('No stock available')}</div>`}

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
                                    <span class="item-dimensions">${item.formula_width_calc || 0} × ${item.formula_length_calc || 0} ${getDimUnit(this.settings)}</span>
                                    <span class="item-quantity">${item.qty || 1}</span>
                                    ${this.formatStatus(item)}
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

    formatStatus(item) {

        // console.log(item.status);
        if (item.status === 'waiting') {
            return `<span class="item-status status-warning">${__html('Waiting')}</span>`;
        } else if (item.status === 'instock') {
            return `<span class="item-status status-success">${__html('In Stock')}</span>`;
        } else if (item.status === 'withdrawn') {
            return `<span class="item-status status-danger">${__html('Withdrawn')}</span>`;
        } else {
            return `<span class="item-status status-warning">${__html('Waiting')}</span>`;
        }
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