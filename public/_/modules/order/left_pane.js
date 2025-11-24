import { deleteTransaction } from "../../api/delete_transaction.js";
import { saveOrder } from "../../api/save_order.js";
import { ClientAddressSearch } from "../../components/order/client_address_search.js";
import { ClientContactSearch } from "../../components/order/client_contact_search.js";
import { ClientOrderSearch } from "../../components/order/client_order_search.js";
import { PreviewDocument } from "../../components/order/preview_document.js";
import { __attr, __html, log, onClick, simulateClick, toast, toLocalDateTime } from "../../helpers/global.js";
import { getTotalsHTML } from "../../helpers/price.js";
import { bus } from "../../modules/bus.js";
import { ClientPane } from "../../modules/order/client_pane.js";
import { OrderPane } from "../../modules/order/order_pane.js";
import { state } from "../../modules/order/state.js";

export class LeftPane {

    constructor() {

        // check if header is already present
        this.init();
    }

    init = () => {

        this.view();
    }

    view = () => {

        document.querySelector('.left-pane').innerHTML = /*html*/`
        <!-- Left Pane -->
        <div class="bg-light bg-gradient">
            <div class="top-content">
                <!-- Order ID Section -->
                <div class="form-section p-0 pb-3 border-0">
                    <h6 class="d-none"><i class="bi bi-hash me-2"></i>${state.order.id ? __html('Edit Order') : __html('New Order')}</h6>
                    <div class="mb-2">
                        <div class="draft-check-cnt">
                            <div class="form-check p-0 mb-0 d-flex align-items-center">
                                <input class="form-check-input m-0 me-2" type="checkbox" id="draft" autocomplete="nope" ${state.order.draft ? 'checked' : ''} style="accent-color: #333;">
                                <label class="form-check-label" for="draft">
                                    ${__html('Estimate')}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-ss" id="orderId" autocomplete="nope" placeholder="${__attr('Order ID')}" value="${state.order.id || ''}" data-_id="${state.order._id || ''}" tabindex="0">
                    </div>
                    <div class="mb-2">
                        <client-order-search></client-order-search>
                    </div>
                    <div class="mb-2">
                        <client-address-search></client-address-search>
                    </div>
                    <div class="mb-2">
                        <textarea class="form-control form-control-ss" id="notes" rows="1" autocomplete="nope" placeholder="${__attr('Order notes...')}" tabindex="3">${state.order.notes || ""}</textarea>
                    </div>
                </div>
                
                <!-- Contact Information -->
                <div class="form-section p-0 pb-3 border-0">
                    <h6><i class="bi bi-telephone me-2"></i>${__html('Contact')}</h6>
                    <contact-order-search></contact-order-search>
                    <div class="input-group input-group-ss mb-2">
                        <input id="contactPhone"  type="tel" class="form-control" autocomplete="nope" placeholder="${__attr('Phone number')}" value="${state.order.phone || ""}" tabindex="5">
                        <button class="btn btn-outline-success whatsapp-btn po" type="button" id="whatsappBtn">
                            <i class="bi bi-whatsapp"></i>
                        </button>
                    </div>
                    <div class="mb-2">
                        <input id="contactEmail" type="text" class="form-control form-control-ss" autocomplete="nope" placeholder="${__attr('Contact email')}" value="${state.order.email || ""}" tabindex="6">
                    </div>
                </div>
                
                <!-- Due Date -->
                <div class="form-section p-0 pb-3 border-0">
                    <h6><i class="bi bi-calendar me-2"></i>${__html('Due Date')}</h6>
                    <div class="input-group input-group-ss mb-2">
                        <input type="datetime-local" class="form-control form-control-ss" id="due_date" value="${toLocalDateTime(state.order.due_date) || ''}" tabindex="7">
                        <button class="btn btn-outline-primary order-table-btn po" type="button" id="orderPane">
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Document Types -->
                <div class="form-section p-0 pb-3 border-0">
                    <h6><i class="bi bi-file-earmark-text me-2"></i>${__html('Documents')}</h6>
                    <div class="btn-group-toggle d-flex flex-nowrap gap-1 overflow-hidden-" data-bs-toggle="buttons">
                        <div class="d-flex align-items-center justify-content-between w-100 h-100 overflow-hidden-">
                            <div class="d-flex flex-nowrap overflow-hidden-">
                                <button class="btn ${state.order?.waybill?.number ? 'btn-primary' : 'btn-outline-primary'} btn-ss document-btn me-1 mb-1 flex-shrink-0" data-type="waybill">${state.order?.waybill?.number ? state.order?.waybill?.number : __html('Waybill')}</button>
                                <button class="btn ${state.order?.invoice?.number ? 'btn-primary' : 'btn-outline-primary'} btn-ss document-btn me-1 mb-1 flex-shrink-0" data-type="invoice">${state.order?.invoice?.number ? __html('INV %1$', state.order?.invoice?.number) : __html('Invoice')}</button>
                                <button class="btn ${state.order?.invoice?.number ? 'btn-primary' : 'btn-outline-primary'} btn-ss document-btn me-1 mb-1 flex-shrink-0" data-type="quotation">${__html('P1')}</button>
                                <button class="btn ${state.order?.invoice?.number ? 'btn-primary' : 'btn-outline-primary'} btn-ss document-btn me-1 mb-1 flex-shrink-0" data-type="production-slip">${__html('P2')}</button>
                            </div>
                            <div class="dropdown flex-shrink-0">
                                <svg id="docActions" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po mb-1" viewBox="0 0 16 16">
                                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                </svg>
                                <ul class="dropdown-menu">
                                    <li><button class="dropdown-item document-btn mb-1" data-type="packing-slip">${__html('Packing Slip')}</button></li>
                                    <li><button class="dropdown-item document-btn mb-1" data-type="invoice-eu">${__html('Invoice EU')}</button></li>
                                    <li><button class="dropdown-item document-btn mb-1" data-type="production-slip-detailed">${__html('Production Slip')}</button></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="pt-0 bottom-content">
                <!-- Totals Summary -->
                <div class="form-section p-0 pb-3">
                    <h6><i class="bi bi-calculator me-2"></i>${__html('Summary')}</h6>
                    <order-summary class="mb-1"></order-summary>
                </div>
                
                <!-- Save Button -->
                <div class="form-section p-0">

                    ${state.order.id ? /*html*/`
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-lg- px-3 flex-grow-1" data-action="update" id="saveOrderBtn">
                                <i class="bi bi-floppy fs-5- me-2"></i> ${__html('Save')}
                            </button>
                            <button class="btn btn-outline-danger btn-lg- px-3" id="deleteOrderBtn" style="flex: 0 0 auto;">
                                <i class="bi bi-trash fs-5"></i>
                            </button>
                        </div>
                    ` : /*html*/`
                        <button class="btn ${state.order.id ? 'btn-success' : 'btn-primary'} w-100" data-action="create" id="saveOrderBtn">
                            <i class="bi bi-floppy me-2"></i>${state.order.id ? __html('Save') : __html('Create')}
                        </button>
                    `}
                    
                </div >
            </div >
        </div > `;

        state.clientOrderSearch = new ClientOrderSearch(state.order);

        state.clientAddressSearch = new ClientAddressSearch(state.order);

        state.clientContactSearch = new ClientContactSearch(state.order);

        this.formatDueDate(state.order.due_date);

        // Add event listeners or any additional initialization here
        this.listeners();

        // Focus on order ID input
        const orderIdInput = document.getElementById('orderId');
        const clientFilter = document.getElementById('clientFilter');

        if (orderIdInput.value) {
            orderIdInput.focus();
            orderIdInput.setSelectionRange(orderIdInput.value.length, orderIdInput.value.length);
        } else {
            clientFilter.focus();
        }
    }

    listeners = () => {

        // Save button
        onClick('#saveOrderBtn', e => {

            e.preventDefault();

            // Handle save order logic here
            console.log('Save Order button clicked');

            // Show loading state
            const saveBtn = document.getElementById('saveOrderBtn');
            this.originalButtonHTML = saveBtn.innerHTML;

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border me-2" role="status" aria-hidden="true" style="width: 1rem; height: 1rem;"></span>Loading...';

            this.save();
        });

        // Save button
        onClick('#deleteOrderBtn', () => {

            // Handle save order logic here
            console.log('deleteOrderBtn', state.order._id);

            if (!confirm(__html('Delete record?'))) return;

            // Remove from db
            deleteTransaction([{ _id: state.order._id }], (response) => {

                if (response.success) {

                    toast('Successfully removed');

                    // Reload current page data
                    window.location.href = '/order/';
                    // this.table.setPage(currentPage);

                } else {
                    toast('Error deleting rows: ' + response.error);
                }
            });
        });

        // Order list table button
        onClick('#editClientBtn', () => {

            new ClientPane(state.settings, state.order);
        });

        // Order list table button
        onClick('#orderPane', () => {

            new OrderPane(state.settings, state.order);
        });

        // Add event listener for order ID input
        // document.getElementById('orderId').addEventListener('keypress', (event) => {
        //     if (event.key === 'Enter') {
        //         event.preventDefault();

        //         state.order.id = document.getElementById('orderId').value;

        //         bus.emit('order:updated', state.order.id);
        //     }
        // });

        // WhatsApp button
        onClick('#whatsappBtn', () => {

            let phone = document.getElementById('contactPhone').value.trim();
            if (phone) {
                // Remove all non-digit characters
                let digits = phone.replace(/\D/g, '');
                // If phone starts with '371' or '+371', use as is, else add +371
                if (!digits.startsWith('371')) {
                    digits = '371' + digits;
                }
                const whatsappUrl = `https://wa.me/${digits}`;
                window.open(whatsappUrl, '_blank');
            } else {
                toast(__html('Please enter a valid phone number'), 'warning');
            }
        });

        // Document type buttons
        onClick('.document-btn', (event) => {

            const type = event.target.dataset.type;

            event.target.disabled = true;

            if (!type) return;

            switch (type) {
                case 'waybill':
                    new PreviewDocument(type, state.order);
                    event.target.innerHTML = '<span class="spinner-border spinner-border-ss me-1" role="status" aria-hidden="true" style="width: 0.75rem; height: 0.75rem;"></span>Loading...';
                    break;
                case 'invoice':
                    new PreviewDocument(type, state.order);
                    event.target.innerHTML = '<span class="spinner-border spinner-border-ss me-1" role="status" aria-hidden="true" style="width: 0.75rem; height: 0.75rem;"></span>Loading...';
                    break;
                case 'quotation':
                    new PreviewDocument(type, state.order);
                    event.target.innerHTML = '<span class="spinner-border spinner-border-ss" role="status" aria-hidden="true" style="width: 0.75rem; height: 0.75rem;"></span>';
                    break;
                case 'production-slip':
                    new PreviewDocument(type, state.order);
                    event.target.innerHTML = '<span class="spinner-border spinner-border-ss" role="status" aria-hidden="true" style="width: 0.75rem; height: 0.75rem;"></span>';
                    break;
            }
        });

        // Due date input focus handler
        document.getElementById('due_date').addEventListener('focus', (event) => {

            // Format the current date if empty
            if (!event.target.value) {
                this.formatDueDate();
            }

            // Trigger the browser's native date picker
            event.target.showPicker();

            // // Handle Enter key to move to next input in tab order
            // event.target.addEventListener('keydown', (e) => {
            //     if (e.key === 'Enter') {
            //         e.preventDefault();

            //         simulateClick('.order-table-btn');
            //     }
            // });
        });

        // Handle Enter key as Tab for all input and textarea fields
        document.querySelectorAll('.left-pane input, .left-pane textarea').forEach(element => {
            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {

                    // console.log('Enter key pressed on:', state.order.id, element.value);
                    // event.preventDefault();
                    // return;

                    if (element.id === 'orderId') if (element.value != state.order.id && element.value > 0) window.location.href = '/order/?id=' + element.value; // bus.emit('order:updated', element.value);
                    if (element.id === 'orderId') if (element.value != state.order.id && element.value == 0) window.location.href = '/order/';
                    if (element.id === 'due_date') { simulateClick(document.querySelector('.order-table-btn')); return; }

                    event.preventDefault();

                    console.log('Enter key pressed, moving to next input', element.value, state.order.id);

                    // Find all focusable elements with tabindex consideration
                    const focusableElements = Array.from(document.querySelectorAll('.left-pane input, .left-pane textarea'))
                        .filter(el => el.tabIndex >= 0)
                        .sort((a, b) => {
                            const aIndex = a.tabIndex || 0;
                            const bIndex = b.tabIndex || 0;
                            return aIndex - bIndex;
                        });

                    const currentIndex = focusableElements.indexOf(event.target);

                    // Move to next focusable element following tab order
                    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {

                        // setTimeout(() => {
                        focusableElements[currentIndex + 1].focus();
                        // }, 10); // Use setTimeout to ensure the focus change happens after the current event loop
                    }
                }
            });
        });

        // Refresh totals
        bus.on('order:table:refreshed', (order) => {

            console.log('LeftPane, order:table:refreshed:', order);

            // state.order = order;

            this.summary();
        });

        // Update order summary when client is updated
        bus.on('client:updated', (client) => {

            console.log('Client updated:', client);

            // state.clientOrderSearch.data();
            state.clientAddressSearch.data();
            state.clientContactSearch.data();

            state.order.vat_status = client.vat_status || '0';

            if (document.getElementById('clientFilter').value != client.legal_name && client.legal_name.length) {
                document.getElementById('clientFilter').value = client.legal_name;
            }

            this.summary();
        });

        // bus.clear('client:removed');
        bus.on('client:removed', (data) => {

            console.log('LeftPane removed received:', data);

            // state.clientOrderSearch.data();
            state.clientAddressSearch.data();
            state.clientContactSearch.data();

            console.log("LeftPane data called");
        });

        bus.clear('contact:search:refresh');
        bus.on('contact:search:refresh', (data) => {

            state.order.eid = data._id;

            console.log('LeftPane contact search received:', data);
            // state.clientOrderSearch.data();
            state.clientAddressSearch.data();
            state.clientContactSearch.data();
        });


        // bus.clear('client:updated');
        // bus.on('client:updated', (data) => {

        //     console.log('Client updated received:', data);
        //     this.data();
        //     console.log("ClientOrderSearch data called");
        // });

        // Summary
        this.summary();
    }

    formatDueDate = (date) => {

        if (date) return;

        log('Formatting due date:', date);

        const now = new Date();
        now.setDate(now.getDate() + 2); // two days ahead
        const pad = n => n.toString().padStart(2, '0');
        const dueDateInput = document.getElementById('due_date');
        const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(12)}:${pad(0)}`; // now.getHours()
        dueDateInput.value = formatted;
        dueDateInput.dispatchEvent(new Event('input'));
    }

    summary = () => {


        // Calculate totals based on the order items and settings
        // state.order.price = getTotals(state.settings, state.order);

        console.log('Order summary updated:', state.order);

        // const order = state.order;

        // if (!order.price) {
        //     order.price = { tax_calc: false, tax_percent: 0, tax_total: 0, total: 0, grand_total: 0 };
        // }

        let totals = getTotalsHTML(state.settings, state.order);

        // console.log('Order totals:', totals.price);

        state.order.price = totals.price;

        document.querySelector('order-summary').innerHTML = /*html*/`<div class="totals">${totals.html || ""}</div>`;

        // // Create the order summary HTML
        // document.querySelector('order-summary').innerHTML = /*html*/`
        //     <div class="d-flex justify-content-between">
        //         <span>${__html('Subtotal')}</span>
        //         <span id="subtotal">${priceFormat(state.settings, order.price.total)}</span>
        //     </div>
        //     <div class="d-flex justify-content-between">
        //         <span>${state.settings.tax_display + " " + state.settings.tax_percent}%</span>
        //         <span id="vat_rate">${priceFormat(state.settings, order.price.tax_total)}</span>
        //     </div>
        //     <div class="d-flex justify-content-between">
        //         <span>${__html('Total')}</span>
        //         <span id="totalAmount">${priceFormat(state.settings, order.price.grand_total)}</span>
        //     </div>`;
    }

    save = () => {

        // Logic to save the order 42171
        const _id = document.getElementById('orderId').dataset._id || '';
        const id = document.getElementById('orderId').value;
        const eid = document.getElementById('clientFilter').dataset._id || ''; // entity id
        const draft = document.getElementById('draft').checked; // draft
        const name = document.getElementById('clientFilter').value; // client entity name
        const contactPerson = document.getElementById('contactPerson').value;
        const contactPhone = document.getElementById('contactPhone').value;
        const contactEmail = document.getElementById('contactEmail').value;
        const address = document.getElementById('address').value;
        const due_date = document.getElementById('due_date').value;
        const notes = document.getElementById('notes').value;

        // console.log('due_date', due_date);

        // Validate required fields
        let due_date_utc = null;
        if (due_date && due_date.trim() !== '') {
            const date = new Date(due_date);
            if (!isNaN(date.getTime())) {
                due_date_utc = date.toISOString();
            }
        }

        // console.log('due_date_utc', due_date_utc);

        // Filter out empty items (no price or product name)
        state.order.items = (state.order.items || []).filter(item => {
            return item && (item.price > 0 || (item.name && item.name.trim().length > 0));
        });

        // Collect other necessary data and send it to the server
        const orderData = {
            _id,
            id,
            eid,
            draft,
            name,
            address,
            person: contactPerson,
            phone: contactPhone,
            email: contactEmail,
            due_date: due_date_utc,
            notes,
            items: state.order.items || [], // Assuming items are stored in state.order.items
            price: state.order.price || {},
            vat_status: state.order.vat_status || '0',
            entity: state.order.entity || 'company',
            // Add more fields as necessary
        };

        // Example of sending data to the server (replace with actual API call)
        // console.log('Order Data:', orderData);

        saveOrder(orderData, (response) => {

            console.log('Order saved successfully:', response.order);

            if (response.order.id) state.order.id = response.order.id;
            if (response.order._id) state.order._id = response.order._id;

            // Update URL to include the order ID
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.set('id', response.order.id);
            window.history.replaceState({}, '', currentUrl);

            // Store reference to restore later
            const saveBtn = document.getElementById('saveOrderBtn');
            if (saveBtn.dataset.action === 'update') {
                saveBtn.disabled = false;
                saveBtn.innerHTML = this.originalButtonHTML;
            }

            toast("Order saved", "success");

            bus.emit('order:updated', response.order.id);

            // this.data();
        });
    }
}