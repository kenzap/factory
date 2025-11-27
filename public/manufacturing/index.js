import { execOrderItemAction } from "../_/api/exec_order_item_action.js";
import { getOrders } from "../_/api/get_orders.js";
import { getProductBundles } from "../_/api/get_product_bundles.js";
import { getProductStock } from "../_/api/get_product_stock.js";
import { PreviewWorkLog } from "../_/components/order/preview_worklog.js";
import { __html, hideLoader, toast, toLocalUserDate, toLocalUserTime } from "../_/helpers/global.js";
import { formatCompanyName } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { AddBundle } from "../_/modules/manufacturing/add_bundle.js";
import { getHtml } from "../_/modules/manufacturing/html.js";
import { Inventory } from "../_/modules/manufacturing/inventory.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/** 
 * Manufacturing log. 
 * 
 * @version 1.0
 */
class Manufacturing {

    constructor() {
        this.orders = { records: [], total: 0 };
        this.subItems = new Map();
        this.autoUpdateInterval = null;
        this.mouseTime = Date.now() / 1000;
        this.filters = {
            for: "manufacturing",
            client: {},
            dateFrom: '',
            dateTo: '',
            items: true,
            limit: 1000,
            offset: 0,
            sort_by: null,
            sort_dir: null,
            type: '' // Default to 'All'
        };

        this.stats = {
            latest: [],
            issued: []
        }

        this.init();
    }

    init() {

        new Modal();

        this.Inventory = new Inventory();

        this.loadOrders();

        hideLoader();
    }

    view() {

        if (document.querySelector('.manufacturing-cont')) return;

        document.querySelector('#app').innerHTML = getHtml(this.response);

        this.setupEventListeners();
        this.startAutoUpdate();

        // Track mouse movement
        document.addEventListener('mousemove', () => {
            this.mouseTime = Date.now() / 1000;
        });

        this.listeners();
    }

    listeners() {

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });

        // Check if narrow mode should be enabled
        if (document.cookie.includes('mode=narrow')) {
            document.getElementById('closeBtn').classList.remove('d-none');
            // Adjust layout for narrow mode
            document.querySelectorAll('.narrow').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {

            // F5 or Ctrl+R to refresh
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.refreshOrders();
            }

            // Escape to clear search
            if (e.key === 'Escape') {
                document.getElementById('orderSearch').value = '';
                document.getElementById('companySearch').value = '';
                this.loadOrders();
            }
        });

        // Focus on search input when page loads
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                document.getElementById('orderSearch').focus();
            }, 1500);
        });
    }

    setupEventListeners() {

        const orderSearch = document.getElementById('orderSearch');
        const companySearch = document.getElementById('companySearch');

        orderSearch.addEventListener('input', (e) => {
            if (e.target.value.length > 3) {
                this.searchOrders(e.target.value, '');
            } else if (e.target.value.length === 0) {
                this.loadOrders();
            }
        });

        companySearch.addEventListener('input', (e) => {
            if (e.target.value.length > 0) {
                orderSearch.value = '';
                this.searchOrders('', e.target.value);
            } else {
                this.loadOrders();
            }
        });
    }

    async loadOrders() {

        // get orders
        getOrders(this.filters, (response) => {

            // console.log(response);

            // show UI loader
            if (!response.success) return;

            // init locale
            new Locale(response);

            // hide UI loader
            hideLoader();

            this.response = response;
            this.settings = response.settings;
            this.orders = response.orders.records;

            // session
            new Session();
            new Header({
                hidden: true,
                title: __html('Manufacturing'),
                icon: 'card-text',
                style: 'navbar-dark bg-dark',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();

            this.renderOrders();
            this.renderStats();

            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('ordersContainer').style.display = 'block';

            // this.searchOrders(e.target.value, '');
        });
    }

    renderStats() {

        // Find most recently issued orders by checking all order items' inventory.isu_date
        const issuedOrders = [];
        const manufacturedOrders = [];
        this.orders.forEach(order => {
            let mostRecentIsuDate = null;
            let mostRecentMnfDate = null;
            order.items.forEach(item => {
                if (item.inventory && item.inventory.isu_date) {
                    const isuDate = new Date(item.inventory.isu_date);
                    if (!mostRecentIsuDate || isuDate > mostRecentIsuDate) {
                        mostRecentIsuDate = isuDate;
                    }
                }
                if (item.inventory && item.inventory.rdy_date) {
                    const mnfDate = new Date(item.inventory.rdy_date);
                    if (!mostRecentMnfDate || mnfDate > mostRecentMnfDate) {
                        mostRecentMnfDate = mnfDate;
                    }
                }
            });
            if (mostRecentIsuDate) {
                issuedOrders.push({ orderId: order.id, isuDate: mostRecentIsuDate });
            }
            if (mostRecentMnfDate) {
                manufacturedOrders.push({ orderId: order.id, mnfDate: mostRecentMnfDate });
            }
        });

        // Sort by most recent isu_date descending
        manufacturedOrders.sort((a, b) => b.mnfDate - a.mnfDate);
        issuedOrders.sort((a, b) => b.isuDate - a.isuDate);

        // Take top 5 most recently issued orders
        this.stats.latest = manufacturedOrders.slice(0, 5).map(o => o.orderId.substring(o.orderId.length - 4));
        this.stats.issued = issuedOrders.slice(0, 5).map(o => o.orderId.substring(o.orderId.length - 4));

        this.updateStats(this.stats);
    }

    renderOrders() {
        const container = document.getElementById('ordersContainer');
        container.innerHTML = '';

        this.ordersSorted = { urgent: [], today: [], manufacturing: [], ready: [], issued: [] };

        this.orders.forEach((order, index) => {

            // Check if due_date is past the current time
            const dueDate = new Date(order.due_date);
            const now = new Date();
            order.isOverdue = dueDate < now;
            order.isReady = this.isOrderReady(order);
            order.isIssued = this.isOrderIssued(order);
            order.isToday = dueDate.getDate() === now.getDate()

            if (order.isOverdue && !order.isReady && !order.isIssued) { order.status = "urgent"; this.ordersSorted.urgent.push(order); }
            if (order.isReady && !order.isIssued) { order.status = "ready"; this.ordersSorted.ready.push(order); }
            if (order.isReady && order.isIssued) { order.status = "issued"; this.ordersSorted.issued.push(order); }
            if (!order.isOverdue && !order.isReady && !order.isIssued && !order.isToday) { order.status = "manufacturing"; this.ordersSorted.manufacturing.push(order); }
            if (!order.isOverdue && !order.isReady && !order.isIssued && order.isToday) { order.status = "today"; this.ordersSorted.today.push(order); }
        });

        // Output orders in the chronological sequence from this.ordersSorted
        // const orderSequence = ['urgent', 'manufacturing', 'ready', 'issued'];
        Object.keys(this.ordersSorted).forEach(status => {
            this.ordersSorted[status].forEach((order, index) => {
                const orderElement = this.createOrderRow(order, index);
                container.appendChild(orderElement);

                this.refreshButtons(order._id);
            });
        });
    }

    isOrderReady(order) {
        let c = 0;

        // console.log(order)

        order.items.forEach(item => {

            if (!item.inventory || !item.inventory.rdy_date) return false;
            if (item.inventory.rdy_date) c++;
        });

        return c === order.items.length;
    }

    isOrderIssued(order) {
        let c = 0;

        order.items.forEach(item => {
            if (!item.inventory || !item.inventory.isu_date) return false;
            if (item.inventory.isu_date) c++;
        });

        return c === order.items.length;
    }

    createOrderRow(order, index) {
        const div = document.createElement('div');

        div.className = `order-card status-${order.status} fade-in-`;
        div.style.animationDelay = `${index * 0.05}s`;

        const shortId = order.id.substring(0, order.id.length - 4);
        const lastFour = order.id.substring(order.id.length - 4);

        div.innerHTML = `
            <div class="card-body d-flex flex-row justify-content-between align-items-center" data-order-id="${order.id}">
                <div class="row flex-grow-1 align-items-center">
                    <div class="col-md-2" onclick="manufacturing.loadOrderDetails('${order.id}')">
                        <div class="order-id ms-2 p-2 po">
                            ${shortId} <strong>${lastFour}</strong>
                        </div>
                    </div>
                    <div class="col-md-5 po px-0 py-2" onclick="manufacturing.loadOrderDetails('${order.id}')">
                        <div class="company-name">${formatCompanyName(order)}</div>
                        <small class="text-muted elipsized">${order.notes}</small>
                    </div>
                    <div class="col-md-1 po" onclick="manufacturing.loadOrderDetails('${order.id}')">
                        <small class="text-muted- text-dark text-nowrap">${toLocalUserDate(order.due_date)}</small>
                    </div>
                    <div class="col-md-1 po" onclick="manufacturing.loadOrderDetails('${order.id}')">
                        <small class="text-muted- text-dark text-nowrap">${toLocalUserTime(order.due_date)}</small>
                    </div>
                    <div class="col-md-1">
                        <small class="text-muted">${order.operator}</small>
                    </div>
                </div>
                <div class="col-md-2 text-end action-col ms-auto" data-order-id="${order._id}">
                   
                </div>
            </div>
        `;

        return div;
    }

    async loadOrderDetails(orderId) {
        try {

            let order = this.orders.find(order => order.id === orderId);

            // check if sub-items already loaded for this order
            if (document.querySelector('.sub-items-row[data-order-id="' + orderId + '"]')) {

                document.querySelector('.sub-items-row[data-order-id="' + orderId + '"]').remove();
                return;
            }

            // Remove any existing sub-items rows
            document.querySelectorAll('.sub-items-row').forEach(row => row.remove());

            // Find the order card element
            const orderCards = document.querySelectorAll('.order-card');
            let targetCard = null;
            orderCards.forEach(card => {
                if (card.querySelector('.order-id') && card.querySelector('.order-id').textContent.replace(/\s/g, '').includes(orderId)) {
                    targetCard = card;
                }
            });

            if (!targetCard) return;

            // Create a new row for sub-items
            const subRow = document.createElement('div');
            subRow.className = `sub-items-row status-${order.status}`;
            subRow.dataset.orderId = orderId;

            // Render sub-items as a table
            subRow.innerHTML = `
                <div class="p-3">
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered- mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="d-none">${__html('Nr.')}</th>
                                    <th>${__html('Works')}</th>
                                    <th>
                                        <div class="d-flex align-items-center text-bold product-name">
                                            <div class="d-none">${__html('Product')}</div>
                                            <select class="form-select- form-select-sm- bg-transparent ps-0 p-0 border-0 fw-bold" id="groupFilter-${orderId}" style="width: auto;" onchange="manufacturing.filterByGroup('${order._id}', this.value)">
                                                <option value="">${__html('Products')}</option>
                                                ${this.settings?.groups ? this.settings.groups.map(group => `
                                                    <option value="${group.id}" class="fw-700">${__html(group.name)}</option>
                                                `).join('') : ''}
                                            </select>
                                        </div>
                                    </th>
                                    <th>${__html('Unit')}</th>
                                    <th>${__html('Quantity')}</th>
                                    <th>&nbsp&nbsp;&nbsp;N&nbsp;&nbsp;&nbsp;&nbsp-&nbsp;&nbsp;&nbsp&nbsp;S</th>
                                    <th>${__html('Stock')}</th>
                                    <th>${__html('Taken')}</th>
                                    <th class="text-end">${__html('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map((item, i) => `
                                    <tr class="order-item-row" data-i="${i}" data-order_id="${order._id}" data-item_id="${item._id}" data-qty="${item.qty}" data-group="${item.group}" >
                                        <td class="d-none">${i + 1}</td>
                                        <td>
                                            <div class="work-buttons">
                                                <button class="work-btn btn btn-outline-primary btn-sm" onclick="manufacturing.openWork('marking', '${order._id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">M</button>
                                                <button class="work-btn btn btn-outline-success btn-sm" onclick="manufacturing.openWork('bending', '${order._id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">L</button>
                                                <button class="work-btn btn btn-outline-warning btn-sm" onclick="manufacturing.openWork('pipe-forming', '${order._id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">K</button>
                                                <button class="work-btn btn btn-outline-info btn-sm" onclick="manufacturing.openWork('assembly', '${order._id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">N</button>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="d-flex justify-content-start align-items-center product-name">
                                                <strong>${i + 1}. ${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}</strong>
                                                <div class="dropdown itemsActionsCont ms-2">
                                                    <svg id="itemsActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                                        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                                    </svg>
                                                    <ul class="dropdown-menu" aria-labelledby="itemsActions${i}">
                                                        <li><a class="dropdown-item po set-cm" href="#" data-index="${i}" onclick="manufacturing.addBundle(event, '${item._id}', '${item.title}', '${item.color}', '${item.coating}', '${order._id}')"><i class="bi bi-boxes me-1"></i> ${__html('Bundles')}</a></li>
                                                        <li><hr class="dropdown-divider d-none"></li>
                                                        <li><a class="dropdown-item po delete-row d-none" href="#" data-type="cancel" data-index="${i}"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <small class="text-muted">${item.coating} ${item.color} ${item.formula_width_calc > 0 ? item.formula_width_calc : ''} ${item.formula_width_calc > 0 && item.formula_length_calc > 0 ? 'x' : ''} ${item.formula_length_calc > 0 ? item.formula_length_calc : ''}</small>
                                        </td>
                                        <td>${item.unit || "gab"}</td>
                                        <td>${item.qty}</td>
                                        <td>
                                            <div class="d-flex align-items-center action-ns">
                                                <input type="checkbox" data-type="w" data-i="${i}" data-source="item" data-order-id="${order._id}" onchange="manufacturing.syncCheckboxStates(event, '${order._id}')" class="form-check-input m-0 me-3" ${item?.inventory?.origin == 'w' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
                                                <input type="checkbox" data-type="m" data-i="${i}" data-source="item" data-order-id="${order._id}" onchange="manufacturing.syncCheckboxStates(event, '${order._id}')" class="form-check-input m-0" ${item?.inventory?.origin == 'm' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
                                            </div>
                                        </td>
                                        <td><div class="stock-${item.coating}-${item.color}-${item._id}"><span>&nbsp;</span></div></td>
                                        <td>
                                            <input type="number" class="form-control form-control-sm writeoff-amount" data-type="w" data-source="item" data-order-id="${order._id}" data-i="${i}" value="${item?.inventory?.writeoff_amount}" style="width: 80px;">
                                        </td>
                                        <td class="action-items-col text-end" data-order-id="${order._id}" data-item-i="${i}">
                                            
                                        </td> 
                                    </tr>
                `).join('')}
                                    <tr class="order-item-row-empty d-none">
                                        <td class="d-none">0</td>
                                        <td class="align-middle">
                                            <div class="work-buttons">
                                                <button class="work-btn btn btn-outline-primary btn-sm" >M</button>
                                                <button class="work-btn btn btn-outline-success btn-sm" >L</button>
                                                <button class="work-btn btn btn-outline-warning btn-sm" >K</button>
                                                <button class="work-btn btn btn-outline-info btn-sm" >N</button>
                                            </div>
                                        </td>
                                        <td colspan="6" class="text-center align-middle">
                                            <div class="d-flex align-items-center justify-content-start h-100">
                                                <span class="text-muted">${__html('No products found')}</span>
                                            </div>
                                        </td>
                                    </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Insert after the target card
            targetCard.parentNode.insertBefore(subRow, targetCard.nextSibling);

            this.refreshButtons(order._id);

            this.getBundles(order._id);

        } catch (error) {
            console.error('Error loading order details:', error);
            toast('Error ' + error);
        }
    }

    getBundles(orderId) {

        // Get stock for each item in the order
        const order = this.orders.find(o => o._id === orderId);
        if (!order) return;

        let products = [];

        order.items.forEach((item, i) => {

            // todo: add bundled products
            products.push({
                _id: item._id,
                coating: item.coating || '',
                color: item.color || ''
            });
        });

        // Reload bundles for all orders
        getProductBundles(products, (response) => {

            if (response.success && response.products && response.products.length > 0) {

                // Clear existing bundles for this order before adding new ones
                document.querySelectorAll(`.order-item-row[data-order_id="${orderId}"]`).forEach(element => {

                    // Remove any existing bundle rows that follow this item
                    let nextSibling = element.nextElementSibling;
                    while (nextSibling && !nextSibling.classList.contains('order-item-row')) {
                        let toRemove = nextSibling;
                        nextSibling = nextSibling.nextElementSibling;
                        toRemove.remove();
                    }
                });

                // Group products by product_id first
                const groupedProducts = {};
                response.products.forEach(product => {
                    if (!groupedProducts[product.product_id]) {
                        groupedProducts[product.product_id] = [];
                    }
                    groupedProducts[product.product_id].push(product);
                });

                // Process each product group
                Object.keys(groupedProducts).forEach(productId => {
                    const bundleItems = groupedProducts[productId];

                    document.querySelectorAll(`.order-item-row[data-order_id="${orderId}"][data-item_id="${productId}"]`).forEach((element, bi) => {
                        let bundleItemIndex = 0;
                        const itemIndex = parseInt(element.dataset.i);
                        const orderItem = order.items[itemIndex];

                        bundleItems.forEach((bundleItem) => {

                            console.log('Adding bundle item:', bundleItem);

                            // Map bundle data from order.items.bundles if it exists
                            let bundleInventory = null;
                            let bundleId = "";
                            let bundleAmount = 0;
                            let bundleChecked = 0;

                            if (orderItem.bundle_items && Array.isArray(orderItem.bundle_items)) {

                                const matchingBundle = orderItem.bundle_items.find(b =>
                                    b.inventory._id === bundleItem.bundle_id
                                );

                                if (matchingBundle) {
                                    bundleId = matchingBundle.inventory._id
                                    bundleInventory = matchingBundle.inventory || bundleItem.inventory;
                                    bundleAmount = matchingBundle.inventory?.writeoff_amount || bundleItem.inventory?.writeoff_amount || 0;
                                    bundleChecked = matchingBundle.inventory?.checked || bundleItem.inventory?.checked || false;
                                }
                            } else {

                                // if (!orderItem.bundle_items) orderItem.bundle_items = [];

                                // orderItem.bundle_items.push({
                                //     bundle_id: bundleItem.bundle_id,
                                //     coating: bundleItem.coating,
                                //     color: bundleItem.color,
                                //     title: bundleItem.title,
                                //     unit: bundleItem.unit,
                                //     qty: bundleItem.qty,
                                //     inventory: bundleItem.inventory
                                // });

                                bundleId = bundleItem.bundle_id;
                                bundleInventory = bundleItem.inventory;
                                bundleAmount = bundleItem.inventory?.writeoff_amount || 0;
                                bundleChecked = bundleItem.inventory?.checked || false;
                            }

                            let row = ` 
                                <tr data-bundle-id="${bundleItem.bundle_id}" class="">
                                    <td class="d-none py-0"></td>
                                    <td class="py-0">

                                    </td>
                                    <td class="py-0" >
                                        <div class="product-name">
                                            <small class="text-muted me-2"><i class="bi bi-box me-1"></i> ${bundleItem?.title}</small>
                                            <small class="text-muted me-2">${bundleItem?.coating}</small>
                                            <small class="text-muted me-2">${bundleItem?.color}</small>
                                        </div>
                                    </td>
                                    <td class="py-0"><small class="text-muted">${bundleItem?.unit || "gab"}</small></td>
                                    <td class="py-0">
                                        <small class="text-muted">${bundleItem?.qty || 1} x ${element.dataset.qty}</small>
                                    </td>
                                    <td class="py-0">
                                        <div class="d-flex align-items-center action-ns">
                                            <input type="checkbox" data-type="w" data-i="${bundleItemIndex}" data-amount="${(bundleItem?.qty || 1) * element.dataset.qty}" data-id="${bundleItem.bundle_id}" data-source="bundle" data-color="${bundleItem?.color}" data-coating="${bundleItem?.coating}" onchange="manufacturing.syncCheckboxStates(event, '${orderId}')" class="form-check-input m-0 me-3" ${bundleChecked ? 'checked' : ''}  >
                                        </div>
                                    </td>
                                    <td class="py-0">
                                        <small class="text-muted">
                                            <div class="stock-${bundleItem?.coating}-${bundleItem?.color}-${bundleItem?.bundle_id}"><span></span></div>
                                        </small>
                                    </td>
                                    <td class="py-0">
                                        <input type="number" class="form-control form-control-xs writeoff-amount ${bundleAmount == 0 ? 'd-none' : ''}" data-type="w" data-id="${bundleItem.bundle_id}" data-source="bundle" data-order-id="${orderId}" data-i="${bundleItemIndex}" value="${bundleAmount}" style="width: 80px;">
                                    </td>
                                    <td class="py-0 action-items-col- text-end" data-order-id="${orderId}" data-item-i="${bundleItemIndex}">
                                    </td> 
                                </tr>`;

                            element.insertAdjacentHTML('afterend', row);
                            bundleItemIndex++;
                        });
                    });
                });
            }

            this.getStock(order._id, response.products);

            this.refreshButtons(order._id);
        });
    }

    addBundle(event, _id, title, color, coating, orderId) {

        event.preventDefault();

        const orders = this.orders;
        const self = this;

        new AddBundle({ _id, title, color, coating, orderId }, this.settings, (response) => {
            if (!response.success) {
                toast(__html('Error: ') + response.error);
                return;
            }

            console.log('Getting bundles', response.orderId, orders, this.orders);

            self.orders = orders; // restore orders reference

            this.getBundles(response.orderId);
        });
    }

    getStock(order_id, extensionList = []) {

        // Get stock for each item in the order
        const order = this.orders.find(o => o._id === order_id);
        if (!order) return;

        let products = [];

        order.items.forEach((item, i) => {

            // product items
            products.push({
                _id: item._id,
                hash: item.coating + item.color + item._id,
                coating: item.coating || '',
                color: item.color || ''
            });

            // bundled products that are not yet in items inventory (e.g. when bundles are added after initial load)
            extensionList.forEach(prod => {
                if (prod.product_id === item._id) {
                    products.push({
                        _id: prod.bundle_id,
                        hash: (prod.coating || '') + (prod.color || '') + prod.bundle_id,
                        coating: prod.coating || '',
                        color: prod.color || ''
                    });
                }
            });

            // bundled products
            if (item.bundle_items && Array.isArray(item.bundle_items)) {
                item.bundle_items.forEach(bundleItem => {
                    if (bundleItem.inventory) {
                        products.push({
                            _id: bundleItem.inventory._id,
                            hash: (bundleItem.inventory.coating || '') + (bundleItem.inventory.color || '') + bundleItem.inventory._id,
                            coating: bundleItem.inventory.coating || '',
                            color: bundleItem.inventory.color || ''
                        });
                    }
                });
            }
        });

        getProductStock(products, (response) => {

            // console.log('getProductStock response', response);

            if (response.success && response.products && response.products.length > 0) {

                response.products.forEach((product, i) => {

                    if (!product.stock) return;

                    let sel = `.stock-${product.coating}-${product.color}-${product._id}`;

                    // console.log('Updating stock for', sel, product.stock);

                    document.querySelectorAll(sel).forEach(element => {
                        element.innerHTML = `<span class="text-muted">${product.stock || 0}</span>`;
                    });
                });
            }
        });
    }

    filterByGroup(orderId, groupId) {

        // console.log('Filtering by group', groupId, orderId);

        const rows = document.querySelectorAll(`.order-item-row[data-order_id="${orderId}"]`);
        rows.forEach(row => {
            const itemGroup = row.dataset.group;

            if (groupId === '' || itemGroup === groupId) {

                // Show the row
                row.classList.remove("d-none");

                // Also show any bundle rows that follow this item
                let nextSibling = row.nextElementSibling;
                while (nextSibling && !nextSibling.classList.contains('order-item-row')) {
                    // nextSibling.style.display = '';
                    nextSibling.classList.remove("d-none");
                    nextSibling = nextSibling.nextElementSibling;
                }
            } else {

                // Hide the row
                row.classList.add("d-none");

                // Also hide any bundle rows that follow this item
                let nextSibling = row.nextElementSibling;
                while (nextSibling && !nextSibling.classList.contains('order-item-row')) {
                    // nextSibling.style.display = 'none';
                    nextSibling.classList.add("d-none");
                    nextSibling = nextSibling.nextElementSibling;
                }
            }
        });

        // Check if any rows are visible
        const anyVisible = Array.from(rows).some(row => !row.classList.contains("d-none"));
        const emptyRow = document.querySelector(`.order-item-row-empty`);

        console.log('Any visible rows:', anyVisible, emptyRow);

        if (emptyRow) {
            if (anyVisible) {
                emptyRow.classList.add('d-none');
            } else {
                emptyRow.classList.remove('d-none');
            }
        }
    }

    refreshButtons(order_id) {

        // Refresh action buttons for the order
        let order = this.orders.find(o => o._id === order_id);

        if (!order) return;

        // reset action buttons
        document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = ``;

        // console.log('Refreshing buttons for order', order);

        // refresh row button state
        let counter = { mnf: 0, isu: 0 };
        this.orders = this.orders.map((o, i) => {
            if (o._id === order._id) {
                o.items.forEach((item, j) => {
                    if (item.inventory?.rdy_date) counter.mnf++;
                    if (item.inventory?.isu_date) counter.isu++;

                    let sel = `.action-items-col[data-order-id="${o._id}"][data-item-i="${j}"]`;
                    if (document.querySelector(sel)) document.querySelector(sel).innerHTML = this.getActionItemsButton(order._id, j);
                });
            }
            return o;
        });

        // issue order button
        if (counter.mnf == order.items.length && counter.isu != order.items.length) {
            document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = `
                    <button class="btn action-btn btn-outline-dark text-nowrap me-3" onclick="manufacturing.issueOrder('${order.id}', true)">
                        <i class="bi bi-check-circle me-1"></i> ${__html('Issue')}
                    </button>
                `;
        }

        // cancel issue order button
        if (counter.mnf == order.items.length && counter.isu == order.items.length) {

            // Find the most recent issue date among all items
            let mostRecentIssueDate = null;
            order.items.forEach((item, i) => {
                if (item.inventory?.isu_date) {
                    item.issued = true;
                    item.issuedDate = item.inventory.isu_date;
                    const isuDate = new Date(item.inventory.isu_date);
                    if (!mostRecentIssueDate || isuDate > mostRecentIssueDate) {
                        mostRecentIssueDate = isuDate;
                    }
                }
            });

            document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = `
                <button class="btn action-btn btn-outline-dark border-0 text-nowrap me-3" onclick="manufacturing.issueOrder('${order.id}', false)">
                    </i> ${toLocalUserDate(mostRecentIssueDate)} ${toLocalUserTime(mostRecentIssueDate)}
                </button>
            `;
        }

        // checkboxes enable/disable
        order.items.forEach((item, i) => {
            let checkboxW = document.querySelector(`.action-ns input[data-source="item"][data-type="w"][data-i="${i}"]`);
            let checkboxM = document.querySelector(`.action-ns input[data-source="item"][data-type="m"][data-i="${i}"]`);
            let writeoffAmount = document.querySelector(`.writeoff-amount[data-source="item"][data-order-id="${order._id}"][data-i="${i}"]`);

            if (!checkboxW || !checkboxM) return;

            checkboxW.disabled = item.inventory?.isu_date ? true : false;
            if (checkboxM.checked) checkboxW.disabled = true; // Disable warehouse checkbox if manufactured is checked

            checkboxM.disabled = item.inventory?.isu_date ? true : false;
            if (checkboxW.checked) checkboxM.disabled = true; // Disable manufactured checkbox if warehouse is checked

            if (checkboxM.checked || (!checkboxW.checked && !checkboxM.checked)) {

                writeoffAmount.classList.add('d-none'); // Disable input if manufactured is checked
            } else {
                writeoffAmount.classList.remove('d-none'); // Enable input if warehouse is checked
            }

            // Handle bundle items writeoff-amount visibility
            if (item.bundle_items && Array.isArray(item.bundle_items)) {
                item.bundle_items.forEach((bundleItem, bundleIndex) => {
                    let bundleCheckboxW = document.querySelector(`.action-ns input[data-source="bundle"][data-type="w"][data-i="${bundleIndex}"]`);
                    let bundleWriteoffAmount = document.querySelector(`.writeoff-amount[data-source="bundle"][data-order-id="${order._id}"][data-i="${bundleIndex}"]`);

                    if (!bundleCheckboxW || !bundleWriteoffAmount) return;

                    if (!bundleCheckboxW.checked) {
                        bundleWriteoffAmount.classList.add('d-none'); // Hide input if bundle checkbox is not checked
                    } else {
                        bundleWriteoffAmount.classList.remove('d-none'); // Show input if bundle checkbox is checked
                    }
                });
            }
        });

        // inventory amount
        document.querySelectorAll(`.writeoff-amount`).forEach(input => {

            // Only add the event listener if it hasn't been attached yet
            if (!input.dataset.listenerAttached) {
                input.addEventListener('change', (e) => {

                    this.Inventory.syncInventoryState(e, order, (order) => {

                        // Refresh UI
                        this.refreshButtons(order._id);
                        this.getStock(order._id);
                    });
                });
                input.dataset.listenerAttached = "true";
            }
        });
    }

    getActionItemsButton(order_id, index) {

        const item = this.orders.find(order => order._id === order_id)?.items[index];
        if (!item) return '';

        return `
        ${item?.inventory?.rdy_date ?
                `
                    <button class="btn btn-sm btn-outline-dark btn-cancel ${!item?.inventory?.isu_date ? 'd-none' : ''}" onclick="manufacturing.issueItem('${order_id}','${index}',false)" > ${toLocalUserDate(item?.inventory?.isu_date)} ${toLocalUserTime(item?.inventory?.isu_date)}</button>
                    <button class="btn btn-sm btn-outline-dark btn-issue ${item?.inventory?.isu_date ? 'd-none' : ''}" onclick="manufacturing.issueItem('${order_id}','${index}',true)" > ${__html('Issue')}</button>
                `: ``
            }
        `;
    }

    syncCheckboxStates(e, order_id) {

        const order = this.orders.find(o => o._id === order_id);
        if (!order) return;

        // console.log(this.Inventory);
        this.Inventory.syncCheckboxState(e, order);
    }

    async issueOrder(orderId, isIssue) {

        if (this.inQuery) return;

        // Only show confirmation for cancellation
        if (!isIssue) {
            let msg = __html('Cancel issuing the order #%1$?', orderId);
            if (!confirm(msg)) {
                return;
            }
        }

        this.inQuery = true;

        try {

            let actions = {
                issue: []
            };

            // TODO: go through all order items
            const order = this.orders.find(o => o.id === orderId);

            order.items.forEach((item, i) => {

                // cancel issue
                if (!isIssue) {

                    // update current state
                    item.inventory.isu_date = null

                    // action for db
                    actions.issue.push({
                        order_id: order._id,
                        isu_date: item.inventory.isu_date,
                        index: i,
                        item_id: item._id
                    });
                }

                // mark as issued if not already
                if (isIssue && item.inventory && item.inventory.rdy_date && !item.inventory.isu_date) {

                    // update current state
                    item.inventory.isu_date = new Date().toISOString();

                    // action for db
                    actions.issue.push({
                        order_id: order._id,
                        isu_date: item.inventory.isu_date,
                        index: i,
                        item_id: item._id
                    });
                }
            });

            execOrderItemAction(actions, (response) => {

                this.inQuery = false;

                if (!response.success) {
                    toast(__html('Error updating item status'));
                    return;
                }

                // this.renderOrders();

                this.refreshButtons(order._id);

                // Update UI or perform any other actions based on response
                // toast(__html('Record updated'));
            });

            // toast(__html('Order updated'));
        } catch (error) {
            console.error('Error issuing order:', error);
            toast('Kļūda izsniegšanas procesā');
        }
    }

    openWork(type, order_id, product_id, product_name, color, coating, qty) {

        color = color || '';
        coating = coating || '';
        qty = qty || 0;

        new PreviewWorkLog({ type, order_id, product_id, product_name, color, coating, qty }, (response) => {
            if (!response.success) {
                toast(__html('Error opening work log'));
                return;
            }
        });
    }

    openWindow(name, url) {
        const win = window.open(url, name, 'width=1200,height=800,location=yes,menubar=yes,status=no,toolbar=yes,scrollbars=yes,resizable=yes');
        win.focus();
    }

    searchOrders(orderId, name) {
        // Filter orders based on search criteria
        let filtered = this.orders;

        if (orderId) {
            filtered = filtered.filter(order =>
                order.id.toLowerCase().includes(orderId.toLowerCase())
            );
        }

        if (name) {
            filtered = filtered.filter(order => {
                const normalizedOrderName = order.name.toLowerCase()
                    .replace(/[āàáâãäå]/g, 'a')
                    .replace(/[ēèéêë]/g, 'e')
                    .replace(/[īìíîï]/g, 'i')
                    .replace(/[ōòóôõö]/g, 'o')
                    .replace(/[ūùúûü]/g, 'u')
                    .replace(/[ķ]/g, 'k')
                    .replace(/[ļ]/g, 'l')
                    .replace(/[ņ]/g, 'n')
                    .replace(/[ģ]/g, 'g')
                    .replace(/[š]/g, 's')
                    .replace(/[ž]/g, 'z')
                    .replace(/[č]/g, 'c');

                const normalizedSearchName = name.toLowerCase()
                    .replace(/[āàáâãäå]/g, 'a')
                    .replace(/[ēèéêë]/g, 'e')
                    .replace(/[īìíîï]/g, 'i')
                    .replace(/[ōòóôõö]/g, 'o')
                    .replace(/[ūùúûü]/g, 'u')
                    .replace(/[ķ]/g, 'k')
                    .replace(/[ļ]/g, 'l')
                    .replace(/[ņ]/g, 'n')
                    .replace(/[ģ]/g, 'g')
                    .replace(/[š]/g, 's')
                    .replace(/[ž]/g, 'z')
                    .replace(/[č]/g, 'c');

                return normalizedOrderName.includes(normalizedSearchName);
            });
        }

        this.renderFilteredOrders(filtered);
    }

    renderFilteredOrders(orders) {
        const container = document.getElementById('ordersContainer');
        container.innerHTML = '';

        orders.forEach((order, index) => {
            const orderElement = this.createOrderRow(order, index);
            container.appendChild(orderElement);

            this.refreshButtons(order._id);
        });

        // Auto-expand details if only one order is shown
        if (orders.length === 1) {
            setTimeout(() => {
                this.loadOrderDetails(orders[0].id);
            }, 100);
        }

        // Scroll to top after rendering filtered orders
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    refreshOrders() {
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('ordersContainer').style.display = 'none';

        document.querySelector('#companySearch').value = '';
        document.querySelector('#orderSearch').value = '';

        this.loadOrders();
    }

    startAutoUpdate() {
        this.autoUpdateInterval = setInterval(() => {
            this.autoUpdate();
        }, 45000); // 45 seconds
    }

    async autoUpdate() {
        try {
            // Simulate checking for updates
            const now = Date.now() / 1000;

            // Only update if user hasn't been active for 30 seconds
            if ((now - this.mouseTime) > 60) {
                await this.loadOrders();
            } else {
                // Show update indicator
                this.showUpdateIndicator();
            }
        } catch (error) {
            console.error('Auto update failed:', error);
        }
    }

    showUpdateIndicator() {
        const refreshBtn = document.querySelector('.btn-outline-light');
        refreshBtn.style.color = '#e74c3c';
        setTimeout(() => {
            refreshBtn.style.color = '';
        }, 3000);
    }

    updateStats(stats) {
        document.getElementById('latestOrders').textContent = stats.latest.join(', ');
        document.getElementById('issuedOrders').textContent = stats.issued.join(', ');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Additional methods for item management
    async issueItem(order_id, item_i, isIssue = true) {

        // console.log('Issuing item A', order_id, item_i, isIssue);

        if (this.inQuery) return;

        this.inQuery = true;

        try {

            // console.log('Issuing item B', order_id, item_i, isIssue);

            const order = this.orders.find(o => o._id === order_id);

            let actions = {
                issue: [
                    {
                        order_id: order._id,
                        index: item_i,
                        item_id: order.items[item_i]._id,
                        isu_date: isIssue ? new Date().toISOString() : null
                    }
                ]
            };

            execOrderItemAction(actions, (response) => {

                this.inQuery = false;

                if (!response.success) {
                    toast(__html('Error updating item status'));
                    return;
                }

                // refresh button state
                this.orders = this.orders.map(o => {
                    if (o._id === order._id) {
                        o.items[item_i].inventory.isu_date = actions.issue[0].isu_date;
                    }
                    return o;
                });

                this.refreshButtons(order._id);

                // toast(__html('Record updated'));
            });

        } catch (error) {
            toast('Error ' + error);
        }
    }

    async cancelItemIssue(itemId) {
        if (confirm('Cancel?')) {
            try {
                await this.delay(300);
                // toast('Record updated');
                // Update UI to reflect the change
                const button = document.querySelector(`button[onclick *= "${itemId}"]`);
                if (button && button.textContent === 'Atcelt') {
                    button.className = 'btn btn-sm btn-dark';
                    button.textContent = 'Izsniegt';
                    button.onclick = () => this.issueItem(itemId);
                }
            } catch (error) {
                toast('Kļūda atcelšanas procesā');
            }
        }
    }

    destroy() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        this.hideAutocomplete();
    }
}

window.manufacturing = new Manufacturing();