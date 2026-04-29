import { execOrderItemAction } from "../_/api/exec_order_item_action.js";
import { getOrdersForCutting } from "../_/api/get_orders_for_cutting.js";
import { saveSupplylogValue } from "../_/api/save_supplylog_value.js";
import { getAuthToken } from "../_/helpers/auth.js";
import { __html, attr, formatDate, getDimUnit, hideLoader, toast } from "../_/helpers/global.js";
import { formatClientName, getFullClientName } from "../_/helpers/order.js";
// import { WriteoffMetalWithoutCoil } from "../_/modules/cutting/writeoff-metal-without-coil.js";
import { WriteoffMetal } from "../_/modules/cutting/writeoff-metal.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { stockSSE } from "../_/modules/sse/stock_sse.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

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
            coating: this.coating == 'Other' ? '' : this.coating || '',
            items: true
        };
        this.sseUnsubscribe = null;
        this.liveRefreshTimer = null;
        this.liveRefreshPending = { orders: false, stock: false };
        this.liveRefreshInFlight = false;
        this.liveRefreshQueued = false;
        this.listenersBound = false;

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

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'cutting_journal')) return

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
            this.setupSSE();

            document.title = __html('%1$ %2$', this.color, this.coating);
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
                    ${this.getStockListHtml()}

                </div>
                <div class="writeoff-button-container">
                    <button class="btn btn-primary writeoff-btn" id="writeoffBtn">
                    <i class="bi bi-eye-slash"></i> ${__html('Write Off Selected')}
                    </button>
                </div>
                </div>    
            <div class="orders-panel">
                <div id="archiveOrders" class="tab-content d-none"></div>
                <div id="waitingOrders" class="tab-content">${this.getOrdersHtml()}</div>
            </div>
        </div>
        `;
    }

    getStockListHtml = () => {
        return this.stock && this.stock.length > 0 ? this.stock.map(coil => `
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
        `).join('') : `<div class="no-stock text-center text-muted py-4">${__html('No stock available')}</div>`;
    }

    getOrdersHtml = () => {
        return this.orders && this.orders.length > 0 ? this.orders.map(order => `
            <div class="order-group" data-order-record-id="${order._id}" data-order-id="${order.id}">
                <div class="order-header ${this.getEntireOrderStatusClass(order)}">
                    <span><span class="po select-order" data-id="${order.id}">#${order.id}</span> - <span title="${attr(getFullClientName(order) || '')}">${formatClientName(order) || 'N/A'}</span> (${formatDate(order.due_date) || 'N/A'})</span>
                    <span class="me-2 form-text text-dark">${__html('items: %1$', order.items ? order.items.length : 0)}</span>
                </div>
                <div class="order-items">
                    ${order.items ? order.items.map((item, index) => `
                    <div class="order-item ${this.getStatusClass(item)}" data-order-record-id="${order._id}" data-order-id="${order.id}" data-item-id="${item.id}">
                        <input type="checkbox" class="checkbox ${this.getStatusClass(item) === "complete-item" ? 'text-success' : ''}" data-type="cutting" data-item="${order.id}-${index}" data-order-record-id="${order._id}" data-item-id="${item.id}" data-width="${item.formula_width_calc || 0}">
                        <span class="item-id"><a class="${this.getStatusClass(item) === "complete-item" ? 'text-success' : ''}" href="/manufacturing/?id=${order.id}" target="/manufacturing/">${order.id}</a></span>
                        <span class="item-description">${item.title || 'N/A'}${item.sdesc ? " - " + item.sdesc + " " : ""} ${item.coating || ''} ${item.color || ''}</span>
                        <span class="item-dimensions">
                            <span class="editable-dimension" data-order-id="${order.id}" data-item-index="${index}" data-item-id="${item.id}" data-field="formula_width_calc">${Number(item.width_writeoff || item.formula_width_calc || 0).toLocaleString()}</span> × 
                            <span class="editable-dimension" data-order-id="${order.id}" data-item-index="${index}" data-item-id="${item.id}" data-field="formula_length_calc">${Number(item.length_writeoff || item.formula_length_calc || 0).toLocaleString()}</span> ${getDimUnit(this.settings)}
                        </span>
                        <span class="item-quantity">${item.qty || 1}</span>
                        <input type="checkbox" class="checkbox item-manufactured ${this.getStatusClass(item) === "complete-item" ? 'text-success' : ''}" data-item="${order.id}-${index}" data-order-record-id="${order._id}" data-item-id="${item.id}" onchange="window.cutting_list.itemManufactured(event);" ${item?.inventory?.origin == 'm' ? 'checked' : ''} >
                    </div>
                    `).join('') : ''}
                </div>
            </div>
        `).join('') : `<div class="no-orders text-center text-muted py-4"> <i class="bi bi-inbox fs-3 mb-3 d-block"></i> ${__html('No records added')}</div>`;
    }

    renderStockPanel = () => {
        const container = document.getElementById('stockList');
        if (!container) return;
        container.innerHTML = this.getStockListHtml();
    }

    renderOrdersPanel = (uiState = null) => {
        const container = document.getElementById('waitingOrders');
        if (!container) return;
        container.innerHTML = this.getOrdersHtml();
        if (uiState?.selectedCuttingItems?.length) {
            this.restoreSelectedCuttingItems(uiState.selectedCuttingItems);
        }
        this.applyOrderVisibility();
    }

    getSelectedCuttingItems = () => {
        return Array.from(document.querySelectorAll('.order-item input[type="checkbox"][data-type="cutting"]:checked'))
            .map((checkbox) => checkbox.dataset.item)
            .filter(Boolean);
    }

    restoreSelectedCuttingItems = (selectedItems = []) => {
        selectedItems.forEach((itemKey) => {
            const checkbox = document.querySelector(`.order-item input[type="checkbox"][data-type="cutting"][data-item="${itemKey}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    captureUiState = () => {
        return {
            selectedCuttingItems: this.getSelectedCuttingItems()
        };
    }

    applyOrderVisibility = () => {
        const searchTerm = String(document.getElementById('orderSearch')?.value || '').toLowerCase().trim();
        const searchTerms = searchTerm === '' ? [] : searchTerm.split(/\s+/).filter(term => term.length > 0);
        const allFilter = document.getElementById('allFilter');
        const pendingFilter = document.getElementById('pendingFilter');
        const completeFilter = document.getElementById('completeFilter');

        document.querySelectorAll('.order-group').forEach(group => {
            const orderId = String(group.dataset.orderId || '').toLowerCase();
            const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => orderId.includes(term));
            const orderItems = group.querySelectorAll('.order-item');
            let visibleItems = 0;

            orderItems.forEach(item => {
                let shouldShowItem = matchesSearch;

                if (shouldShowItem && pendingFilter?.checked) {
                    shouldShowItem = item.classList.contains('pending-item');
                } else if (shouldShowItem && completeFilter?.checked) {
                    shouldShowItem = item.classList.contains('complete-item');
                } else if (shouldShowItem && allFilter?.checked) {
                    shouldShowItem = true;
                }

                item.style.display = shouldShowItem ? 'grid' : 'none';
                if (shouldShowItem) visibleItems++;
            });

            group.style.display = matchesSearch && visibleItems > 0 ? 'block' : 'none';
        });
    }

    setupSSE = () => {
        if (this.sseUnsubscribe) return;

        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token, skipping cutting list SSE connection');
            return;
        }

        stockSSE.connectWithPost(token);
        this.sseUnsubscribe = stockSSE.subscribe((data) => this.handleLiveUpdate(data));

        window.addEventListener('beforeunload', () => {
            if (this.sseUnsubscribe) {
                this.sseUnsubscribe();
                this.sseUnsubscribe = null;
            }
            stockSSE.disconnect();
        });
    }

    handleLiveUpdate = (data) => {
        if (!data?.type) return;

        switch (data.type) {
            case 'items-update':
                if (this.isRelevantItemsUpdate(data)) {
                    this.scheduleLiveRefresh({ orders: true, stock: true });
                }
                break;
            case 'stock-update':
                if (this.isRelevantStockUpdate(data)) {
                    this.scheduleLiveRefresh({ stock: true });
                }
                break;
            case 'supplylog-update':
                if (this.isRelevantSupplylogUpdate(data)) {
                    this.scheduleLiveRefresh({ stock: true });
                }
                break;
            default:
                break;
        }
    }

    isRelevantItemsUpdate = (data) => {
        if (this.orders.some(order => String(order._id) === String(data.order_id))) {
            return true;
        }

        if (!Array.isArray(data.items)) return false;

        return data.items.some((item) => this.matchesCurrentItemFilter(item));
    }

    isRelevantStockUpdate = (data) => {
        if (this.filters.cm === true) return true;
        return String(data.color || '') === String(this.filters.color || '')
            && String(data.coating || '') === String(this.filters.coating || '');
    }

    isRelevantSupplylogUpdate = (data) => {
        if (this.stock.some(coil => String(coil._id) === String(data.coil_id))) {
            return true;
        }

        if (data.item_type && data.item_type !== 'metal') return false;
        if (this.filters.cm === true) return data.cm === true;

        return data.cm !== true
            && String(data.color || '') === String(this.filters.color || '')
            && String(data.coating || '') === String(this.filters.coating || '');
    }

    matchesCurrentItemFilter = (item) => {
        if (this.filters.cm === true) {
            return item?.cm === true || item?.cm === 'true';
        }

        const isClientMaterial = item?.cm === true || item?.cm === 'true';
        return !isClientMaterial
            && String(item?.color || '') === String(this.filters.color || '')
            && String(item?.coating || '') === String(this.filters.coating || '');
    }

    scheduleLiveRefresh = ({ orders = false, stock = false } = {}) => {
        this.liveRefreshPending.orders = this.liveRefreshPending.orders || orders;
        this.liveRefreshPending.stock = this.liveRefreshPending.stock || stock;

        if (this.liveRefreshInFlight) {
            this.liveRefreshQueued = true;
            return;
        }

        clearTimeout(this.liveRefreshTimer);
        this.liveRefreshTimer = setTimeout(() => {
            this.refreshLiveData();
        }, 250);
    }

    refreshLiveData = () => {
        if (this.liveRefreshInFlight) {
            this.liveRefreshQueued = true;
            return;
        }

        const refreshFlags = { ...this.liveRefreshPending };
        if (!refreshFlags.orders && !refreshFlags.stock) return;

        this.liveRefreshPending = { orders: false, stock: false };
        this.liveRefreshQueued = false;
        this.liveRefreshInFlight = true;

        const uiState = this.captureUiState();

        getOrdersForCutting(this.filters, (response) => {
            try {
                if (!response?.success) return;

                if (refreshFlags.orders) {
                    this.orders = response.orders || [];
                    this.renderOrdersPanel(uiState);
                }

                if (refreshFlags.stock) {
                    this.stock = response.stock || [];
                    this.renderStockPanel();
                }
            } finally {
                this.liveRefreshInFlight = false;

                if (this.liveRefreshQueued || this.liveRefreshPending.orders || this.liveRefreshPending.stock) {
                    this.scheduleLiveRefresh();
                }
            }
        });
    }

    getEntireOrderStatusClass(order) {

        const allComplete = order.items.every(item => this.getStatusClass(item) === "complete-item");

        if (allComplete) {
            return "complete-item";
        } else {
            return "pending-item";
        }
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
            return `<span class="item-status status-secondary">${__html('Pending')}</span>`;
        } else {
            return `<span class="item-status status-secondary">${__html('Complete')}</span>`;
        }
    }

    parseCoilLength(length) {

        let text = "";
        const numericLength = Number(length);
        if (!numericLength || Number.isNaN(numericLength)) return '0';

        // Normalize tiny floating-point errors like 1026400.0000000001 before formatting.
        const roundedLength = Math.round(numericLength);
        const normalizedLength = Math.abs(numericLength - roundedLength) < 1e-6
            ? roundedLength
            : numericLength;
        const formattedLength = normalizedLength.toLocaleString('en-US', {
            useGrouping: false,
            maximumFractionDigits: 3
        });
        const [integerPart, fractionPart] = formattedLength.split('.');

        if (integerPart.length > 3) {
            text = integerPart.substr(0, integerPart.length - 3) + '<span class="small">,' + integerPart.substr(-3) + '</span>';
        } else {
            text = integerPart;
        }

        if (fractionPart) text += '.' + fractionPart;

        return text + ' <span class="small">' + getDimUnit(this.settings) + '</span>';
    }

    activateDimensionEditor = (span) => {
        const orderId = span.dataset.orderId;
        const itemIndex = parseInt(span.dataset.itemIndex);
        const field = span.dataset.field;
        const currentValue = span.textContent.replace(/,/g, '');

        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.className = 'form-control form-control-sm d-inline-block';
        input.style.width = '80px';
        input.style.fontSize = 'inherit';

        span.style.display = 'none';
        span.parentNode.insertBefore(input, span);
        input.focus();
        input.select();

        const saveValue = () => {
            const newValue = parseFloat(input.value) || 0;
            const order = this.orders.find(o => o.id === orderId);

            if (order && order.items[itemIndex]) {
                order.items[itemIndex][field] = newValue;
                span.textContent = newValue.toLocaleString();

                if (field === 'formula_width_calc') {
                    const checkbox = document.querySelector(`input[data-item="${orderId}-${itemIndex}"]`);
                    if (checkbox) checkbox.dataset.width = newValue;
                }
            }

            if (input.parentNode) input.remove();
            span.style.display = 'inline';
        };

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveValue();
        });

        input.addEventListener('blur', saveValue);
    }

    toggleOrderSelection = (orderId) => {
        const orderItems = document.querySelectorAll(`.order-item input[type="checkbox"][data-item^="${orderId}-"][data-type="cutting"]`);
        const validItems = Array.from(orderItems).filter(checkbox => checkbox.dataset.width !== '0');
        const checkedItems = validItems.filter(checkbox => checkbox.checked);
        const shouldSelect = checkedItems.length === 0;

        validItems.forEach((checkbox) => {
            checkbox.checked = shouldSelect;
        });
    }

    collectSelectedItems = () => {
        const items = [];

        document.querySelectorAll('.order-item input[type="checkbox"][data-type="cutting"]:checked').forEach((checkbox) => {
            let itemId = checkbox.dataset.item;
            let [orderId, index] = itemId.split('-');
            let order = this.orders.find(o => o.id === orderId);

            index = parseInt(index);

            if (order) {
                const item = order.items.find((i, ii) => ii === index);
                if (item) {
                    const widthElement = document.querySelector(`[data-order-id="${orderId}"][data-item-index="${index}"][data-field="formula_width_calc"]`);
                    const lengthElement = document.querySelector(`[data-order-id="${orderId}"][data-item-index="${index}"][data-field="formula_length_calc"]`);

                    const formula_width_calc = widthElement ? parseFloat(widthElement.textContent.replace(/,/g, '')) || 0 : item.formula_width_calc;
                    const formula_length_calc = lengthElement ? parseFloat(lengthElement.textContent.replace(/,/g, '')) || 0 : item.formula_length_calc;

                    items.push({
                        id: item.id,
                        index,
                        order_id: order.id,
                        product_id: item._id,
                        title: item.title,
                        formula_width_calc,
                        formula_length_calc,
                        qty: item.qty
                    });
                }
            }
        });

        return items;
    }

    openCoilWriteoff = (coilId) => {
        const coil = this.stock.find(c => c._id === coilId);
        const items = this.collectSelectedItems();

        new WriteoffMetal(coil, items, this.settings, this.user, (updated) => {
            if (updated) {
                this.scheduleLiveRefresh({ orders: true, stock: true });
            }
        });
    }

    openWriteoffModal = () => {
        const items = this.collectSelectedItems();

        new WriteoffMetal(null, items, this.settings, this.user, (updated) => {
            if (updated) {
                this.scheduleLiveRefresh({ orders: true, stock: true });
            }
        });
    }

    handleAppClick = (e) => {
        if (e.target.closest('.editable-notes')) {
            e.stopPropagation();
            return;
        }

        const editableDimension = e.target.closest('.editable-dimension');
        if (editableDimension) {
            e.stopPropagation();
            this.activateDimensionEditor(editableDimension);
            return;
        }

        const selectOrder = e.target.closest('.select-order');
        if (selectOrder) {
            e.preventDefault();
            this.toggleOrderSelection(selectOrder.dataset.id);
            return;
        }

        const writeoffButton = e.target.closest('.writeoff-btn');
        if (writeoffButton) {
            e.preventDefault();
            this.openWriteoffModal();
            return;
        }

        const coilTrigger = e.target.closest('.wmc, .coil-info');
        if (coilTrigger && !e.target.closest('.form-check-input, .form-check-label, .coil-note')) {
            e.preventDefault();

            const stockItem = coilTrigger.closest('.stock-item');
            if (!stockItem?.dataset.coil) return;

            this.openCoilWriteoff(stockItem.dataset.coil);
        }
    }

    // init page listeners
    listeners = () => {
        if (this.listenersBound) return;
        this.listenersBound = true;

        // Search functionality
        const searchInput = document.getElementById('orderSearch');

        searchInput.addEventListener('input', () => this.applyOrderVisibility());

        // Filter functionality
        const allFilter = document.getElementById('allFilter');
        const pendingFilter = document.getElementById('pendingFilter');
        const completeFilter = document.getElementById('completeFilter');

        allFilter.addEventListener('change', () => this.applyOrderVisibility());
        pendingFilter.addEventListener('change', () => this.applyOrderVisibility());
        completeFilter.addEventListener('change', () => this.applyOrderVisibility());

        allFilter.checked = true;
        this.applyOrderVisibility();

        document.getElementById('app')?.addEventListener('click', this.handleAppClick);

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

    itemManufactured = (e) => {

        e.preventDefault();

        console.log('Manufactured checkbox changed:', e.target);

        const checkbox = e.target;
        const itemId = checkbox.dataset.item;
        const [orderId, index] = itemId.split('-');
        const order = this.orders.find(o => o.id === orderId);
        let item = order ? order.items.find((i, ii) => ii === parseInt(index)) : null;

        if (!item) {
            console.error('Item not found for checkbox:', itemId);
            return;
        }

        const isComplete = checkbox.checked;

        console.log('isComplete:', isComplete);

        if (!item.inventory) item.inventory = {};

        if (checkbox.checked) {
            item.inventory.rdy_date = new Date().toISOString();
            item.inventory.origin = 'm';
        } else {
            item.inventory.origin = 'c';
            item.inventory.rdy_date = null;
        }

        const actions = {
            update_item: {
                order_id: order._id,
                item_id: item.id,
                index,
                item
            }
        };

        console.log('Prepared update actions:', actions);

        // Execute the action
        execOrderItemAction(actions, (response) => {

            if (!response.success) {

                toast(__html('Error updating item status'));
                return;
            }

            // cb(order);
        });

        // Here you would call the API to update the item's status in the backend
    }
}

window.cutting_list = new CuttingList();
