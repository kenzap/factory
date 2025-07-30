import { saveOrder } from "../../api/save_order.js";
import { ClientAddressSearch } from "../../components/order/client_address_search.js";
import { ClientContactSearch } from "../../components/order/client_contact_search.js";
import { ClientOrderSearch } from "../../components/order/client_order_search.js";
import { __attr, __html, onClick, priceFormat, toast } from "../../helpers/global.js";
import { getTotals } from "../../helpers/price.js";
import { bus } from "../../modules/bus.js";
import { OrderPane } from "../../modules/order/order_pane.js";

export class LeftPane {

    constructor(settings, order) {

        this.settings = settings;
        this.order = order;

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
                <div class="form-section">
                    <h6><i class="bi bi-hash me-2"></i>${this.order.id ? __html('Edit Order') : __html('New Order')}</h6>
                    <div class="mb-2">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="draft" autocomplete="nope" ${this.order.draft ? 'checked' : ''}>
                            <label class="form-check-label" for="draft">
                                ${__html('Draft')}
                            </label>
                        </div>
                    </div>
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm" id="orderId" autocomplete="nope" placeholder="${__attr('Order ID')}" value="${this.order.id || ''}" data-_id="${this.order._id || ''}">
                    </div>
                    <div class="mb-2">
                        <client-order-search></client-order-search>
                    </div>
                    <div class="mb-2">
                        <client-address-search></client-address-search>
                    </div>
                    <div class="mb-2">
                        <textarea class="form-control form-control-sm" id="notes" rows="2" autocomplete="nope" placeholder="${__attr('Order notes...')}">${this.order.notes || ""}</textarea>
                    </div>
                </div>
                
                <!-- Contact Information -->
                <div class="form-section">
                    <h6><i class="bi bi-telephone me-2"></i>${__html('Contact')}</h6>
                    <contact-order-search></contact-order-search>
                    <div class="input-group input-group-sm mb-2">
                        <input id="contactPhone"  type="tel" class="form-control" autocomplete="nope" placeholder="${__attr('Phone number')}" value="${this.order.phone || ""}">
                        <button class="btn btn-outline-success whatsapp-btn po" type="button" id="whatsappBtn">
                            <i class="bi bi-whatsapp"></i>
                        </button>
                    </div>
                    <div class="mb-2">
                        <input id="contactEmail" type="text" class="form-control form-control-sm" autocomplete="nope" placeholder="${__attr('Contact email')}" value="${this.order.email || ""}">
                    </div>
                </div>
                
                <!-- Due Date -->
                <div class="form-section">
                    <h6><i class="bi bi-calendar me-2"></i>${__html('Due Date')}</h6>
                    <div class="input-group input-group-sm mb-2">
                        <input type="datetime-local" class="form-control form-control-sm" id="due_date" value="${this.order.due_date || ''}">
                        <button class="btn btn-outline-primary order-table-btn po" type="button" id="orderPane">
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Document Types -->
                <div class="form-section">
                    <h6><i class="bi bi-file-earmark-text me-2"></i>${__html('Documents')}</h6>
                    <div class="btn-group-toggle d-flex flex-wrap gap-1" data-bs-toggle="buttons">
                        <button class="btn btn-outline-primary btn-sm document-btn" data-type="waybill">${__html('Waybill')}</button>
                        <button class="btn btn-outline-primary btn-sm document-btn" data-type="invoice">${__html('Invoice')}</button>
                        <button class="btn btn-outline-primary btn-sm document-btn" data-type="invoiceEU">${__html('Invoice EU')}</button>
                        <button class="btn btn-outline-primary btn-sm document-btn" data-type="receipt">${__html('Receipt')}</button>
                        <button class="btn btn-outline-secondary btn-sm document-btn" data-type="draft">${__html('Draft')}</button>
                        <button class="btn btn-outline-primary btn-sm document-btn" data-type="bill">${__html('Bill')}</button>
                        <button class="btn btn-outline-info btn-sm document-btn" data-type="p1">${__html('P1')}</button>
                        <button class="btn btn-outline-info btn-sm document-btn" data-type="p2">${__html('P2')}</button>
                    </div>
                </div>
            </div>
            <div class="bottom-content">
                <!-- Totals Summary -->
                <div class="form-section">
                    <h6><i class="bi bi-calculator me-2"></i>${__html('Summary')}</h6>
                    <order-summary class="mb-1"></order-summary>
                </div>
                
                <!-- Save Button -->
                <div class="form-section">
                    <button class="btn ${this.order.id ? 'btn-success' : 'btn-primary'} w-100" id="saveOrderBtn">
                        <i class="bi bi-floppy me-2"></i>${this.order.id ? __html('Save Changes') : __html('Create Order')}
                    </button>
                </div>
            </div>
        </div>`;

        new ClientOrderSearch(this.order);

        new ClientAddressSearch(this.order);

        new ClientContactSearch(this.order);

        // Add event listeners or any additional initialization here
        this.listeners();
    }

    listeners = () => {

        // Save button
        onClick('#saveOrderBtn', () => {

            // Handle save order logic here
            console.log('Save Order button clicked');

            this.save();
        });

        // Order list table button
        onClick('#orderPane', () => {

            new OrderPane(this.settings, this.order);
        });

        // Add event listener for order ID input
        document.getElementById('orderId').addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();

                this.order.id = document.getElementById('orderId').value;

                bus.emit('order:updated', this.order.id);
            }
        });

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

        // Refresh totals
        bus.on('order:table:refreshed', () => {

            this.summary();
        });

        // Update order summary when client is updated
        bus.on('client:updated', () => {

            this.summary();
        });

        this.summary();
    }

    summary = () => {

        // Calculate totals based on the order items and settings
        this.order.price = getTotals(this.settings, this.order);

        console.log('Order summary updated:', this.order.price);

        const order = this.order;

        if (!order.price) {
            order.price = { tax_calc: false, tax_percent: 0, tax_total: 0, total: 0, grand_total: 0 };
        }

        // Create the order summary HTML
        document.querySelector('order-summary').innerHTML = /*html*/`
            <div class="d-flex justify-content-between">
                <span>${__html('Subtotal')}</span>
                <span id="subtotal">${priceFormat(this.settings, order.price.total)}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>${this.settings.tax_display + " " + this.settings.tax_percent}%</span>
                <span id="vat_rate">${priceFormat(this.settings, order.price.tax_total)}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>${__html('Total')}</span>
                <span id="totalAmount">${priceFormat(this.settings, order.price.grand_total)}</span>
            </div>`;
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

        // console.log(draft)

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
            due_date,
            notes,
            items: this.order.items || [], // Assuming items are stored in this.order.items
            price: this.order.price || {},
            vat_status: this.order.vat_status || '0',
            entity: this.order.entity || 'company',
            // Add more fields as necessary
        };

        // Example of sending data to the server (replace with actual API call)
        // console.log('Order Data:', orderData);

        saveOrder(orderData, (response) => {

            console.log('Order saved successfully:', response.order);

            if (response.order.id) this.order.id = response.order.id;
            if (response.order._id) this.order._id = response.order._id;

            toast("Order saved", "success");

            bus.emit('order:updated', response.order.id);

            // this.data();
        });
    }
}