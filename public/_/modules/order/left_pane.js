import { onClick } from "../../helpers/global";
import { getOrder } from "/_/api/get_order.js";
import { saveOrder } from "/_/api/save_order.js";
import { ClientContactSearch } from '/_/components/order/client_contact_search.js';
import { ClientOrderSearch } from '/_/components/order/client_order_search.js';
import { __attr, __html, toast } from "/_/helpers/global.js";
import { bus } from "/_/modules/bus.js";

export class LeftPane {

    constructor() {

        this.order = { _id: null, id: null, eid: null };

        // check if header is already present
        this.init();
    }

    init = () => {

        this.view();
    }

    data = () => {

        getOrder(this.order.id, (response) => {

            if (!response.success) return;

            this.order = response.order;

            // refresh view
            this.view();

            // console.log('client:search:refresh:', this.order);

            // refresh right pane
            bus.emit('client:search:refresh', { _id: this.order.eid, name: this.order.clientName });
        });
    }

    view = () => {

        document.querySelector('.left-pane').innerHTML = /*html*/`
        <!-- Left Pane -->
        <div class="left-pane bg-light bg-gradient">
            <div class="top-content">
                <!-- Order ID Section -->
                <div class="form-section">
                    <h6><i class="bi bi-hash me-2"></i>${this.order.id ? __html('Edit Order') : __html('New Order')}</h6>
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm" id="orderId" placeholder="${__attr('Order ID')}" value="${this.order.id || ''}" data-_id="${this.order._id || ''}">
                    </div>
                    <div class="mb-2">
                        <client-order-search></client-order-search>
                    </div>
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm" id="address" placeholder="Construction site address">
                    </div>
                    <div class="mb-2">
                        <textarea class="form-control form-control-sm" id="notes" rows="2" placeholder="${__attr('Order notes...')}">${this.order.notes || ""}</textarea>
                    </div>
                </div>
                
                <!-- Contact Information -->
                <div class="form-section">
                    <h6><i class="bi bi-telephone me-2"></i>${__html('Contact')}</h6>
                    <contact-order-search></contact-order-search>
                    <div class="input-group input-group-sm mb-2">
                        <input type="tel" class="form-control" id="contactPhone" placeholder="${__attr('Phone number')}" value="${this.order.phone || ""}">
                        <button class="btn btn-outline-success whatsapp-btn po" type="button" id="whatsappBtn">
                            <i class="bi bi-whatsapp"></i>
                        </button>
                    </div>
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm" id="contactEmail" placeholder="${__attr('Contact email')}" value="${this.order.email || ""}">
                    </div>
                </div>
                
                <!-- Due Date -->
                <div class="form-section">
                    <h6><i class="bi bi-calendar me-2"></i>${__html('Due Date')}</h6>
                    <div class="input-group input-group-sm mb-2">
                        <input type="datetime-local" class="form-control form-control-sm" id="dueDate" value="${this.order.dueDate || ''}">
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
                    <div class="summary-item">
                        <span>Subtotal:</span>
                        <span id="subtotal">€0.00</span>
                    </div>
                    <div class="summary-item">
                        <span>VAT 21%:</span>
                        <span id="vat21">€0.00</span>
                    </div>
                    <div class="summary-item">
                        <span>VAT 0%:</span>
                        <span id="vat0">€0.00</span>
                    </div>
                    <div class="summary-item summary-total">
                        <span>Total:</span>
                        <span id="totalAmount">€0.00</span>
                    </div>
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

        new ClientContactSearch(this.order);

        // Add event listeners or any additional initialization here
        this.listeners();
    }

    listeners = () => {

        // Example: Add event listener for save button
        document.getElementById('saveOrderBtn').addEventListener('click', () => {

            // Handle save order logic here
            console.log('Save Order button clicked');

            this.save();
        });

        // Add event listener for order ID input
        document.getElementById('orderId').addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();

                this.order.id = document.getElementById('orderId').value;
                this.data();
            }
        });

        // whatsapp button
        onClick('#whatsappBtn', () => {

            const phone = document.getElementById('contactPhone').value;
            if (phone) {
                const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}`;
                window.open(whatsappUrl, '_blank');
            } else {
                toast(__html('Please enter a valid phone number'), 'warning');
            }
        });
    }

    save = () => {

        // Logic to save the order 42171
        const _id = document.getElementById('orderId').dataset._id || '';
        const id = document.getElementById('orderId').value;
        const eid = document.getElementById('clientFilter').dataset._id || ''; // entity id
        const clientName = document.getElementById('clientFilter').value; // client entity name
        const contactPerson = document.getElementById('contactPerson').value;
        const contactPhone = document.getElementById('contactPhone').value;
        const contactEmail = document.getElementById('contactEmail').value;
        const address = document.getElementById('address').value;
        const dueDate = document.getElementById('dueDate').value;
        const notes = document.getElementById('notes').value;

        // Collect other necessary data and send it to the server
        const orderData = {
            _id,
            id,
            eid,
            clientName,
            address,
            contactPerson,
            phone: contactPhone,
            email: contactEmail,
            dueDate,
            notes,
            // Add more fields as necessary
        };

        // Example of sending data to the server (replace with actual API call)
        // console.log('Order Data:', orderData);

        saveOrder(orderData, (response) => {

            // console.log('Order saved successfully:', response);

            if (response.order.id) this.order.id = response.order.id;
            if (response.order._id) this.order._id = response.order._id;

            toast("Order saved", "success");

            this.data();
        });
    }
}