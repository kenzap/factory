import { execOrderItemAction } from "../_/api/exec_order_item_action.js";
import { getOrders } from "../_/api/get_orders.js";
import { getProductStock } from "../_/api/get_product_stock.js";
import { PreviewWorkLog } from "../_/components/order/preview_worklog.js";
import { __html, hideLoader, toast, toLocalUserDate, toLocalUserTime } from "../_/helpers/global.js";
import { formatCompanyName } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { getHtml } from "../_/modules/manufacturing.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Manufacturing log.
 * 
 * @version 1.0
 */
class Manufacturing {

    constructor() {
        this.orders = [];
        this.subItems = new Map();
        this.autoUpdateInterval = null;
        this.mouseTime = Date.now() / 1000;
        this.filters = {
            for: "manufacturing",
            client: '',
            dateFrom: '',
            dateTo: '',
            items: true,
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

        this.loadOrders();

        hideLoader();
    }

    view() {

        if (document.querySelector('.manufacturing-cont')) return;

        document.querySelector('#app').innerHTML = getHtml();

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

    async loadOrders(orderId = '', company = '') {

        // get orders
        getOrders(this.filters, (response) => {

            /// console.log(response);

            // show UI loader
            if (!response.success) return;

            // init locale
            new Locale(response);

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.orders = response.orders;

            // session
            new Session();
            new Header({
                hidden: false,
                title: __html('Manufacturing'),
                icon: 'card-text',
                style: 'navbar-light',
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();

            this.renderOrders();
            this.renderStats();

            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('ordersContainer').style.display = 'block';

            // console.log(response);
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
                if (item.inventory && item.inventory.mnf_date) {
                    const mnfDate = new Date(item.inventory.mnf_date);
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
            order.isReady = this.isOrderReady(order);// order.mnf_date.length;
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

        order.items.forEach(item => {

            if (!item.inventory || !item.inventory.mnf_date) return false;
            if (item.inventory.mnf_date) c++;
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

        // order.status = 'new';
        div.className = `order-card status-${order.status} fade-in`;
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
                    <div class="mb-2 d-none">
                        <strong>Pozīcijas pasūtījumam:</strong> ${orderId}
                        <button class="btn btn-sm btn-outline-secondary float-end" onclick="this.parentNode.parentNode.parentNode.remove()">Aizvērt</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered- mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="d-none">${__html('Nr.')}</th>
                                    <th>${__html('Works')}</th>
                                    <th>${__html('Product')}</th>
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
                                    <tr>
                                        <td class="d-none">${i + 1}</td>
                                        <td>
                                            <div class="work-buttons">
                                                <button class="work-btn btn btn-outline-primary btn-sm" onclick="manufacturing.openWork('markup', '${order._id}', '${item._id}', '${item.title + (item.sdesc.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">M</button>
                                                <button class="work-btn btn btn-outline-success btn-sm" onclick="manufacturing.openWork('bending', '${order._id}', '${item._id}', '${item.title + (item.sdesc.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">L</button>
                                                <button class="work-btn btn btn-outline-warning btn-sm" onclick="manufacturing.openWork('stamping', '${order._id}', '${item._id}', '${item.title + (item.sdesc.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">K</button>
                                                <button class="work-btn btn btn-outline-info btn-sm" onclick="manufacturing.openWork('assembly', '${order._id}', '${item._id}', '${item.title + (item.sdesc.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">N</button>
                                            </div>
                                        </td>
                                        <td>
                                            <div><strong>${i + 1}. ${item.title + (item.sdesc.length ? ' - ' + item.sdesc : '')}</strong></div>
                                            <small class="text-muted">${item.coating} ${item.color} ${item.formula_width_calc > 0 ? item.formula_width_calc : ''} ${item.formula_width_calc > 0 && item.formula_length_calc > 0 ? 'x' : ''} ${item.formula_length_calc > 0 ? item.formula_length_calc : ''}</small>
                                        </td>
                                        <td>${item.unit || "gab"}</td>
                                        <td>${item.qty}</td>
                                        <td>
                                            <div class="d-flex align-items-center action-ns">
                                                <input type="checkbox" data-type="w" data-i="${i}" onchange="manufacturing.execOrderItemAction(event, '${order._id}')" class="form-check-input m-0 me-3" ${item?.inventory?.origin == 'w' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
                                                <input type="checkbox" data-type="m" data-i="${i}" onchange="manufacturing.execOrderItemAction(event, '${order._id}')" class="form-check-input m-0" ${item?.inventory?.origin == 'm' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
                                            </div>
                                        </td>
                                        <td><div class="stock-${item.coating}-${item.color}-${item._id}"></div></td>
                                        <td>
                                            <input type="number" class="form-control form-control-sm writeoff-amount" data-type="w" data-order-id="${order._id}" data-i="${i}" value="${item?.inventory?.amount}" style="width: 80px;">
                                        </td>
                                        <td class="action-items-col text-end" data-order-id="${order._id}" data-item-i="${i}">
                                            
                                        </td>
                                    </tr >
                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Insert after the target card
            targetCard.parentNode.insertBefore(subRow, targetCard.nextSibling);

            this.refreshButtons(order._id);

            this.getStock(order._id);

        } catch (error) {
            console.error('Error loading order details:', error);
            toast('Error ' + error);
        }
    }

    getStock(order_id) {

        // Get stock for each item in the order
        const order = this.orders.find(o => o._id === order_id);
        if (!order) return;

        let products = [];

        order.items.forEach((item, i) => {

            // todo: add bundled products
            products.push({
                _id: item._id,
                hash: item.coating + item.color + item._id,
                coating: item.coating || '',
                color: item.color || ''
            });
        });

        getProductStock(products, (response) => {

            console.log('getProductStock response', response);

            if (response.success && response.products && response.products.length > 0) {

                response.products.forEach((item, i) => {

                    let sel = `.stock-${item.coating}-${item.color}-${item._id}`;

                    if (document.querySelector(sel)) document.querySelector(sel).innerHTML = `
                        <span class="text-muted">${item.stock || 0}</span>
                    `;
                });
            }
        });
    }

    refreshButtons(order_id) {

        // Refresh action buttons for the order
        let order = this.orders.find(o => o._id === order_id);

        if (!order) return;

        // reset action buttons
        document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = ``;

        // refresh row button state
        let counter = { mnf: 0, isu: 0 };
        this.orders = this.orders.map((o, i) => {
            if (o._id === order._id) {
                o.items.forEach((item, j) => {
                    if (item.inventory?.mnf_date) counter.mnf++;
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
                    <button class="btn action-btn btn-outline-success text-nowrap me-3" onclick="manufacturing.issueOrder('${order.id}', true)">
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
                <button class="btn action-btn btn-outline-dark text-nowrap me-3" onclick="manufacturing.issueOrder('${order.id}', false)">
                    </i> ${toLocalUserDate(mostRecentIssueDate)} ${toLocalUserTime(mostRecentIssueDate)}
                </button>
            `;
        }

        // checkboxes enable/disable
        order.items.forEach((item, i) => {
            let checkboxW = document.querySelector(`.action-ns input[data-type="w"][data-i="${i}"]`);
            let checkboxM = document.querySelector(`.action-ns input[data-type="m"][data-i="${i}"]`);
            let writeoffAmount = document.querySelector(`.writeoff-amount[data-order-id="${order._id}"][data-i="${i}"]`);

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
        });

        // inventory amount
        order.items.forEach((item, i) => {

            let input = document.querySelector(`.writeoff-amount[data-order-id="${order._id}"][data-i="${i}"]`);
            if (input) {

                input.value = 0;
                if (item?.inventory?.origin == 'w' && item?.inventory?.amount) input.value = item?.inventory?.amount || 0;

                // Only add the event listener if it hasn't been attached yet
                if (!input.dataset.listenerAttached) {
                    input.addEventListener('change', (e) => {
                        this.execOrderItemAction(e, order._id);
                    });
                    input.dataset.listenerAttached = "true";
                }
            }
        });
    }

    getActionItemsButton(order_id, index) {

        const item = this.orders.find(order => order._id === order_id)?.items[index];
        if (!item) return '';

        // console.log('getActionItemsButton inventory', item?.inventory);

        return `
        ${item?.inventory?.mnf_date ?
                `
                    <button class="btn btn-sm btn-outline-danger btn-cancel ${!item?.inventory?.isu_date ? 'd-none' : ''}" onclick="manufacturing.issueItem('${order_id}','${index}',false)" > ${toLocalUserDate(item?.inventory?.isu_date)} ${toLocalUserTime(item?.inventory?.isu_date)}</button>
                    <button class="btn btn-sm btn-outline-success btn-issue ${item?.inventory?.isu_date ? 'd-none' : ''}" onclick="manufacturing.issueItem('${order_id}','${index}',true)" > ${__html('Issue')}</button>
                `: ``
            }
        `;
    }

    // w: product item taken from warehouse
    // m: product item manufactured
    // c: product item action canceled
    execOrderItemAction(e, _id) {

        if (this.inQuery) return;

        this.inQuery = true;

        const order = this.orders.find(o => o._id === _id);

        // const checkbox = e.target;
        // const i = checkbox.dataset.i;
        const i = e.target.dataset.i;

        let input = document.querySelector(`.writeoff-amount[data-order-id="${order._id}"][data-i="${i}"]`);
        let amount = parseInt(input.value) || 0;

        // If checkbox is unchecked, set input value to 0
        let checkbox_m = document.querySelector(`.action-ns input[data-type="m"][data-i="${i}"]`);
        let checkbox_w = document.querySelector(`.action-ns input[data-type="w"][data-i="${i}"]`);

        if (!checkbox_m || !input || !checkbox_w) return;

        if (checkbox_w.checked && amount == 0) input.value = order.items[i].qty || 0;

        if (!checkbox_w.checked && amount > 0) input.value = 0;

        this.inQuery = false;

        // console.log('write off amount ', input.value);

        // if (checkbox.checked && input && checkbox.dataset.type === 'w')
        //     if (input.value == 0 || input.value == '')
        //         input.value = order.items[i].qty || 0;

        let actions = {
            inventory:
            {
                order_id: order._id,
                // origin: checkbox_w.checked : 'c' + checkbox.dataset.type, // 'w' or 'm' or 'cw' or 'cm'
                index: i,
                item_id: order.items[i]._id,
                amount: input.value,
                mnf_date: checkbox_w.checked || checkbox_m.checked ? new Date().toISOString() : null,
                color: order.items[i].color || '',
                coating: order.items[i].coating || ''
            }
        };

        if (checkbox_w.checked) actions.inventory.origin = 'w';
        if (checkbox_m.checked) actions.inventory.origin = 'm';
        if (!checkbox_w.checked && !checkbox_m.checked) actions.inventory.origin = 'c';

        console.log('execOrderItemAction actions', actions);

        execOrderItemAction(actions, (response) => {

            this.inQuery = false;

            if (!response.success) {
                toast(__html('Error updating item status'));
                return;
            }

            if (!order.items[i].inventory) order.items[i].inventory = {};

            order.items[i].inventory.amount = actions.inventory.amount;
            order.items[i].inventory.mnf_date = actions.inventory.mnf_date;
            order.items[i].inventory.origin = actions.inventory.origin;

            // order.items[i].inventory = actions.inventory;

            this.refreshButtons(order._id);

            // Update stock for the item
            this.getStock(order._id);

        });
    }

    async issueOrder(orderId, isIssue) {

        if (this.inQuery) return;

        let msg = isIssue ? __html('Issue order %1$?', orderId) : __html('Cancel order %1$?', orderId);

        if (confirm(msg)) {

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
                    if (isIssue && item.inventory && item.inventory.mnf_date && !item.inventory.isu_date) {

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
                    toast(__html('Record updated'));
                });

                // toast(__html('Order updated'));
            } catch (error) {
                console.error('Error issuing order:', error);
                toast('Kļūda izsniegšanas procesā');
            }
        }
    }

    openWork(stage, order_id, product_id, product_name, color, coating, qty) {

        color = color || '';
        coating = coating || '';
        qty = qty || 0;

        new PreviewWorkLog({ stage, order_id, product_id, product_name, color, coating, qty }, (response) => {
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
            filtered = filtered.filter(order =>
                order.name.toLowerCase().includes(name.toLowerCase())
            );
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
    }

    refreshOrders() {
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('ordersContainer').style.display = 'none';
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
            if ((now - this.mouseTime) > 30) {
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

        if (this.inQuery) return;

        this.inQuery = true;

        try {

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

                toast(__html('Record updated'));
            });

        } catch (error) {
            toast('Error ' + error);
        }
    }

    async cancelItemIssue(itemId) {
        if (confirm('Cancel?')) {
            try {
                await this.delay(300);
                toast('Record updated');
                // Update UI to reflect the change
                const button = document.querySelector(`button[onclick *= "${itemId}"]`);
                if (button && button.textContent === 'Atcelt') {
                    button.className = 'btn btn-sm btn-success';
                    button.textContent = 'Izsniegt';
                    button.onclick = () => this.issueItem(itemId);
                }
            } catch (error) {
                toast('Kļūda atcelšanas procesā');
            }
        }
    }

    // Autocomplete functionality
    setupAutocomplete(inputElement, dataSource) {
        let suggestions = [];

        inputElement.addEventListener('input', async (e) => {
            const value = e.target.value;
            if (value.length < 2) {
                this.hideAutocomplete();
                return;
            }

            try {
                // Simulate API call for suggestions
                suggestions = await this.getSuggestions(dataSource, value);
                this.showAutocomplete(inputElement, suggestions);
            } catch (error) {
                console.error('Error getting suggestions:', error);
            }
        });

        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAutocomplete();
            }
        });
    }

    async getSuggestions(dataSource, query) {
        // Mock suggestion data
        const mockSuggestions = {
            colors: ['Balts', 'Melns', 'Sarkans', 'Zils', 'Zaļš', 'Dzeltens'],
            materials: ['Metāls', 'Plastmasa', 'Koks', 'Stikls', 'Betona'],
            companies: ['VILARDS SIA', 'AVLAND SIA', 'AVR Baltija SIA', 'BOGUS SIA']
        };

        await this.delay(200);

        const data = mockSuggestions[dataSource] || [];
        return data.filter(item =>
            item.toLowerCase().includes(query.toLowerCase())
        );
    }

    showAutocomplete(inputElement, suggestions) {
        this.hideAutocomplete();

        if (suggestions.length === 0) return;

        const container = document.createElement('div');
        container.className = 'autocomplete-suggestions';
        container.style.top = `${inputElement.offsetTop + inputElement.offsetHeight} px`;
        container.style.left = `${inputElement.offsetLeft} px`;
        container.style.width = `${inputElement.offsetWidth} px`;

        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'autocomplete-suggestion';
            div.textContent = suggestion;
            div.addEventListener('click', () => {
                inputElement.value = suggestion;
                this.hideAutocomplete();
                inputElement.dispatchEvent(new Event('input'));
            });
            container.appendChild(div);
        });

        inputElement.parentNode.style.position = 'relative';
        inputElement.parentNode.appendChild(container);
    }

    hideAutocomplete() {
        const existing = document.querySelector('.autocomplete-suggestions');
        if (existing) {
            existing.remove();
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