import { execWriteoffAction } from "../_/api/exec_writeoff_action.js";
import { getOrdersForCutting } from "../_/api/get_orders_for_cutting.js";
import { saveSupplylogValue } from "../_/api/save_supplylog_value.js";
import { __html, formatDate, getDimUnit, hideLoader, onClick, toast } from "../_/helpers/global.js";
import { formatCompanyName } from "../_/helpers/order.js";
import { WriteoffMetal } from "../_/modules/cutting/writeoff-metal.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
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
            type: '',
            cm: this.slug == 'cm' ? true : false,
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

            // init locale
            new Locale(response);

            // hide UI loader
            hideLoader();

            this.user = response.user;
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
                            <input type="text" id="orderSearch" class="form-control search-input" placeholder="${__html('Search orders (e.g., 4994 0043)...')}" style="width: 350px;">
                        </div>
                    </div>

                    <!-- Filter Button Group -->
                    <div class="btn-group search-container ms-3 me-3" role="group" aria-label="Filter buttons">
                        <input type="radio" class="btn-check" name="filterOptions" id="allFilter" autocomplete="off" checked>
                        <label class="btn btn-outline-light" for="allFilter">${__html('All')}</label>
                        <input type="radio" class="btn-check" name="filterOptions" id="pendingFilter" autocomplete="off">
                        <label class="btn btn-outline-light" for="pendingFilter">${__html('Pending')}</label>
                        <input type="radio" class="btn-check" name="filterOptions" id="completeFilter" autocomplete="off">
                        <label class="btn btn-outline-light" for="completeFilter">${__html('Complete')}</label>
                    </div>

                    `,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`,
                user: this.user
            });

            // load page html 
            this.html();

            this.listeners();
        });
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
                    <div class="stock-item ${!coil.parent_coil_id ? "parent" : "child"}" data-coil="${coil._id}">
                        <div class="vertical-text wmc">${coil.thickness ? coil.thickness + getDimUnit(this.settings) : ""}</div>
                        <div class="coil-info">
                            <div class="coil-header d-flex align-items-center flex-fill justify-content-between">
                                <div class="coil-dimensions fs-5 wmc">${Number(coil.width).toLocaleString()} × ${this.parseCoilLength(coil.length)}</div>
                                <div class="coil-parameters">
                                    <div class="d-flex me-2">
                                        <div class="form-check form-check-inline cbo m-0 p-0">
                                            <input class="form-check-input mx-1" type="radio" name="type_${coil._id}" id="soft_${coil._id}" value="soft" data-index="0" data-field="type" ${coil?.parameters?.softness === 'soft' ? 'checked' : ''}>
                                            <label class="form-check-label form-text mt-0 d-none" for="soft_${coil._id}">K</label>
                                        </div>
                                        <div class="form-check form-check-inline cbs m-0 p-0">
                                            <input class="form-check-input mx-1" type="radio" name="type_${coil._id}" id="hard_${coil._id}" value="hard" data-index="0" data-field="type" ${coil?.parameters?.softness === 'hard' ? 'checked' : ''}>
                                            <label class="form-check-label form-text mt-0 d-none" for="hard_${coil._id}">Z</label>
                                        </div>
                                        <div class="form-check form-check-inline cbw m-0 p-0">
                                            <input class="form-check-input mx-1" type="radio" name="type_${coil._id}" id="unknown_${coil._id}" value="unknown" data-index="0" data-field="type" ${coil?.parameters?.softness === 'unknown' ? 'checked' : ''}>
                                            <label class="form-check-label form-text mt-0 d-none" for="unknown_${coil._id}">X</label>
                                        </div>
                                    </div> 
                                </div>
                            </div>
                            <div class="coil-supplier d-flex align-items-center flex-fill"><div class="supplier-name me-2 wmc flex-shrink-0">${coil.supplier}</div>${coil.notes ? "/" : ""}<div class="coil-note ms-2 flex-fill"><input type="text" class="editable-notes border-0 bg-transparent w-100" value="${coil.notes}" data-coil-id="${coil._id}" placeholder=""></div></div>
                        </div>
                    </div>
                    `).join('') : `<div class="no-stock text-center py-4">${__html('No stock available')}</div>`}

                </div>
                <div class="writeoff-button-container">
                    <button class="btn btn-primary writeoff-btn" id="writeoffBtn">
                    <i class="bi bi-eye-slash"></i> ${__html('Write Off Selected')}
                    </button>
                </div>
            </div>    
            <div class="orders-panel">
                <div id="archiveOrders" class="tab-content d-none"></div>
                <div id="waitingOrders" class="tab-content">
                    ${this.orders && this.orders.length > 0 ? this.orders.map(order => `
                    <div class="order-group">
                        <div class="order-header">
                            <span><span class="po select-order" data-id="${order.id}">#${order.id}</span> - ${formatCompanyName(order) || 'N/A'} (${formatDate(order.due_date) || 'N/A'})</span>
                            <span class="me-2 form-text">${__html('items: %1$', order.items ? order.items.length : 0)}</span>
                        </div>
                        <div class="order-items">
                            ${order.items ? order.items.map((item, index) => `
                            <div class="order-item ${this.getStatusClass(item)}">
                                <input type="checkbox" class="checkbox" data-item="${order.id}-${index}" data-width="${item.formula_width_calc || 0}">
                                <span class="item-id">${order.id}</span>
                                <span class="item-description">${item.title || 'N/A'}${item.sdesc ? " - " + item.sdesc + " " : ""} ${item.coating || ''} ${item.color || ''}</span>
                                <span class="item-dimensions">
                                    <span class="editable-dimension" data-order-id="${order.id}" data-item-index="${index}" data-field="formula_width_calc">${Number(item.width_writeoff || item.formula_width_calc || 0).toLocaleString()}</span> × 
                                    <span class="editable-dimension" data-order-id="${order.id}" data-item-index="${index}" data-field="formula_length_calc">${Number(item.length_writeoff || item.formula_length_calc || 0).toLocaleString()}</span> ${getDimUnit(this.settings)}
                                </span>
                                <span class="item-quantity">${item.qty || 1}</span>
                                ${this.formatStatus(item)}
                            </div>
                            `).join('') : ''}
                        </div>
                    </div>
                    `).join('') : `<div class="no-orders">${__html('No records added')}</div>`}
                </div>
            </div>
        </div>
        `;
    }

    getStatusClass(item) {
        if (item?.inventory?.wrt_date === undefined || item?.inventory?.wrt_date === null) {
            return "pending-item";
        } else {
            return "complete-item";
        }
    }

    formatStatus(item) {
        if (item?.inventory?.wrt_date === undefined || item?.inventory?.wrt_date === null) {
            return `<span class="item-status status-warning">${__html('Pending')}</span>`;
        } else {
            return `<span class="item-status status-success">${__html('Complete')}</span>`;
        }
    }

    parseCoilLength(length) {

        let text = "";
        if (!length || isNaN(length)) return '0';
        if (length.toString().length > 3) {
            text = length.toString().substr(0, length.toString().length - 3) + '<span class="small">,' + length.toString().substr(-3) + '</span>';
        } else {
            text = length.toLocaleString();
        }

        return text + ' <span class="small">' + getDimUnit(this.settings) + '</span>';
    }

    // init page listeners
    listeners = () => {

        // Search functionality
        const searchInput = document.getElementById('orderSearch');

        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase().trim();
            const orderGroups = document.querySelectorAll('.order-group');

            if (searchTerm === '') {
                // Show all order groups if search is empty
                orderGroups.forEach(group => {
                    group.style.display = 'block';
                });
            } else {
                // Split search terms by whitespace and filter
                const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

                orderGroups.forEach(group => {
                    const orderIdElement = group.querySelector('.po');
                    if (orderIdElement) {
                        const orderId = orderIdElement.textContent.replace('#', '').toLowerCase();

                        // Check if any search term matches the order ID
                        const matches = searchTerms.some(term => orderId.includes(term));

                        group.style.display = matches ? 'block' : 'none';
                    }
                });
            }
        });

        // Filter functionality
        const allFilter = document.getElementById('allFilter');
        const pendingFilter = document.getElementById('pendingFilter');
        const completeFilter = document.getElementById('completeFilter');

        const filterOrders = () => {
            const orderGroups = document.querySelectorAll('.order-group');
            orderGroups.forEach(group => {
                const orderItems = group.querySelectorAll('.order-item');
                let visibleItems = 0;

                orderItems.forEach(item => {
                    let shouldShowItem = false;

                    if (allFilter.checked) {
                        shouldShowItem = true;
                    } else if (pendingFilter.checked) {
                        shouldShowItem = item.classList.contains('pending-item');
                    } else if (completeFilter.checked) {
                        shouldShowItem = item.classList.contains('complete-item');
                    }

                    item.style.display = shouldShowItem ? 'grid' : 'none';
                    if (shouldShowItem) visibleItems++;
                });

                // Hide the entire group if no items are visible
                group.style.display = visibleItems > 0 ? 'block' : 'none';
            });
        };

        allFilter.addEventListener('change', filterOrders);
        pendingFilter.addEventListener('change', filterOrders);
        completeFilter.addEventListener('change', filterOrders);

        allFilter.checked = true;

        // Editable dimension functionality
        onClick('.editable-dimension', e => {
            e.stopPropagation();

            const span = e.target;
            const orderId = span.dataset.orderId;
            const itemIndex = parseInt(span.dataset.itemIndex);
            const field = span.dataset.field;
            const currentValue = span.textContent.replace(/,/g, ''); // Remove commas for editing

            // Create input element
            const input = document.createElement('input');
            input.type = 'number';
            input.value = currentValue;
            input.className = 'form-control form-control-sm d-inline-block';
            input.style.width = '80px';
            input.style.fontSize = 'inherit';

            // Replace span with input
            span.style.display = 'none';
            span.parentNode.insertBefore(input, span);
            input.focus();
            input.select();

            const saveValue = () => {
                const newValue = parseFloat(input.value) || 0;

                // Update the order data
                const order = this.orders.find(o => o.id === orderId);
                if (order && order.items[itemIndex]) {
                    order.items[itemIndex][field] = newValue;

                    // Update display
                    span.textContent = newValue.toLocaleString();

                    // Update checkbox data-width if it's width field
                    if (field === 'formula_width_calc') {
                        const checkbox = document.querySelector(`input[data-item="${orderId}-${itemIndex}"]`);
                        if (checkbox) {
                            checkbox.dataset.width = newValue;
                        }
                    }
                }

                // Remove input and show span only if input is still in DOM
                if (input && input.parentNode) {
                    input.remove();
                }

                span.style.display = 'inline';
            };

            // Save on Enter or blur
            input.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    saveValue();
                }
            });

            input.addEventListener('blur', saveValue);
        });

        onClick('.select-order', e => {

            e.preventDefault();

            const orderId = e.target.dataset.id;

            // Check if any items for this order are currently selected (excluding items with width=0)
            const orderItems = document.querySelectorAll(`.order-item input[type="checkbox"][data-item^="${orderId}-"]`);
            const validItems = Array.from(orderItems).filter(checkbox => checkbox.dataset.width !== '0');
            const checkedItems = validItems.filter(checkbox => checkbox.checked);

            // If any are selected, deselect all; if none are selected, select all (excluding items with width=0)
            const shouldSelect = checkedItems.length === 0;
            validItems.forEach(checkbox => {
                checkbox.checked = shouldSelect;
            });
        });

        onClick('.wmc', e => {

            e.preventDefault();

            const clickedElement = e.target.closest('.stock-item');
            const coilId = clickedElement ? clickedElement.dataset.coil : null;

            console.log('Selected coil ID:', coilId);

            let coil = this.stock.find(c => c._id === coilId);

            let items = [];

            // get selected items
            document.querySelectorAll('.order-item input[type="checkbox"]:checked').forEach(checkbox => {
                let itemId = checkbox.dataset.item;
                let [orderId, index] = itemId.split('-');
                let order = this.orders.find(o => o.id === orderId);

                index = parseInt(index);

                console.log('Selected item:', itemId, orderId, index, order);

                if (order) {
                    const item = order.items.find((i, ii) => ii === index);
                    if (item) {
                        // Get updated values from HTML elements
                        const widthElement = document.querySelector(`[data-order-id="${orderId}"][data-item-index="${index}"][data-field="formula_width_calc"]`);
                        const lengthElement = document.querySelector(`[data-order-id="${orderId}"][data-item-index="${index}"][data-field="formula_length_calc"]`);

                        const formula_width_calc = widthElement ? parseFloat(widthElement.textContent.replace(/,/g, '')) || 0 : item.formula_width_calc;
                        const formula_length_calc = lengthElement ? parseFloat(lengthElement.textContent.replace(/,/g, '')) || 0 : item.formula_length_calc;

                        items.push({
                            id: item.id,
                            index: index,
                            order_id: order.id,
                            product_id: item._id,
                            title: item.title,
                            formula_width_calc: formula_width_calc,
                            formula_length_calc: formula_length_calc,
                            qty: item.qty
                        });
                    }
                }
            });

            console.log('Write off material from coil:', coil);
            console.log('Selected items:', items);

            new WriteoffMetal(coil, items, this.settings, this.user, (updated) => {

                if (updated) {
                    this.init();
                }
            });
        });

        // mark write-off button click
        onClick('.writeoff-btn', e => {

            e.preventDefault();

            console.log('Write off button clicked');

            // get selected items
            let items = [];

            // get selected items
            document.querySelectorAll('.order-item input[type="checkbox"]:checked').forEach(checkbox => {
                let itemId = checkbox.dataset.item;
                let [orderId, index] = itemId.split('-');
                let order = this.orders.find(o => o.id === orderId);

                index = parseInt(index);

                console.log('Selected item:', itemId, orderId, index, order);

                if (order) {
                    const item = order.items.find((i, ii) => ii === index);
                    if (item) {
                        // Get updated values from HTML elements
                        // const widthElement = document.querySelector(`[data-order-id="${orderId}"][data-item-index="${index}"][data-field="formula_width_calc"]`);
                        // const lengthElement = document.querySelector(`[data-order-id="${orderId}"][data-item-index="${index}"][data-field="formula_length_calc"]`);

                        // const formula_width_calc = widthElement ? parseFloat(widthElement.textContent.replace(/,/g, '')) || 0 : item.formula_width_calc;
                        // const formula_length_calc = lengthElement ? parseFloat(lengthElement.textContent.replace(/,/g, '')) || 0 : item.formula_length_calc;

                        items.push({
                            id: item.id,
                            // index: index,
                            order_id: order.id,
                            // item_id: item._id,

                            title: item.title,
                            // formula_width_calc: 0,
                            // formula_length_calc: 0,
                            qty: item.qty
                        });
                    }
                }
            });

            const orderIds = [...new Set(items.map(item => item.order_id).filter(id => id))];

            const record = {
                qty: 0,
                origin: "c",
                type: "cutting",
                title: __html(`Mark complete for %1$ item%2$ from order%3$ #%4$`, items.length, items.length !== 1 ? 's' : '', orderIds.length !== 1 ? 's' : '', orderIds.join(', #')),
                product_name: "",
                time: 0,
                order_ids: orderIds,
                items: items
            }

            if (items.length === 0) {
                toast('No records selected');
                return;
            }

            console.log('Write-off record:', record);

            // block ui button
            let htmlOriginal = e.currentTarget.innerHTML;
            e.currentTarget.disabled = true;
            e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

            // Create product bundle from the selected product
            execWriteoffAction(record, (response) => {

                document.querySelector('.writeoff-btn').innerHTML = htmlOriginal;
                document.querySelector('.writeoff-btn').disabled = false;

                console.log('Write-off response:', response);

                if (!response.success) {
                    alert(__html('Error: %1$', response.error));
                    return;
                }

                this.init();

                toast(__html('Changes applied'));
            });
        });

        // Editable notes functionality
        onClick('.editable-notes', e => {
            e.stopPropagation(); // Prevent triggering parent click events
        });

        document.addEventListener('change', e => {
            if (e.target.classList.contains('editable-notes')) {
                const coilId = e.target.dataset.coilId;
                const newNotes = e.target.value;

                // Find the coil in stock and update notes
                const coil = this.stock.find(c => c._id === coilId);
                if (coil) {
                    coil.notes = newNotes;
                    // Here you could add an API call to save the notes to the backend
                    console.log('Notes updated for coil:', coilId, 'New notes:', newNotes);

                    saveSupplylogValue({ _id: coilId, notes: newNotes }, (response) => {
                        if (response.success) {
                            console.log('Notes saved successfully for coil:', coilId);
                        } else {
                            console.error('Error saving notes for coil:', coilId);
                        }
                    });
                }
            }
        });

        document.addEventListener('keypress', e => {
            if (e.target.classList.contains('editable-notes') && e.key === 'Enter') {
                e.target.blur();
            }
        });

        // Radio button change listener for coil types
        document.addEventListener('change', e => {
            if (e.target.classList.contains('form-check-input') && e.target.type === 'radio') {
                const coilId = e.target.name.replace('type_', '');
                const selectedType = e.target.value;

                console.log('Coil type changed:', coilId, 'New type:', selectedType);

                // Find the coil and update its type
                const coil = this.stock.find(c => c._id === coilId);
                if (coil) {
                    coil.type = selectedType;

                    // Save to backend
                    saveSupplylogValue({ _id: coilId, sofftness: selectedType }, (response) => {
                        if (response.success) {
                            console.log('Coil type saved successfully:', coilId);
                        } else {
                            console.error('Error saving coil type:', coilId);
                        }
                    });
                }
            }
        });
    }
}

new CuttingList();