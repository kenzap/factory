import { deleteClient } from "../../api/delete_client.js";
import { getClientDetails } from "../../api/get_client_details.js";
import { saveClient } from "../../api/save_client.js";
import { verifyClient } from "../../api/verify_client.js";
import { ClientAddresses } from "../../components/order/client_addresses.js";
import { ClientContacts } from "../../components/order/client_contacts.js";
import { ClientDrivers } from "../../components/order/client_drivers.js";
import { __html, onClick, toast, validateEmail, validatePhone } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class ClientPane {

    constructor(order) {

        this.order = order;
        this.client = { _id: this.order.eid ? this.order.eid : null, drivers: [], addresses: [], contacts: [] };

        // check if header is already present
        this.init();
    }

    init = () => {

        this.view();

        this.data();
    }

    data = () => {

        console.log('Fetching client details for ID:', this.client);

        if (!this.client._id) return;

        getClientDetails(this.client._id, (response) => {
            if (response && response.data) {

                // console.log('Client data fetched:', response.data);
                // Update client data with the response
                this.client = response.data;
                this.client.drivers = this.client.drivers || [];
                this.client.addresses = this.client.addresses || [];
                this.client.contacts = this.client.contacts || [];

                this.order.vat_status = this.client.vat_status || '0';
                this.order.entity = this.client.entity || 'company';

                // console.log('Client data after fetch:', this.order);
            }

            // Refresh the view with client data
            this.view();
        });
    }

    view = () => {

        // Add fade effect to indicate loading/disabled state
        // document.querySelector('.right-pane').style.opacity = '0.5';
        // document.querySelector('.right-pane').style.pointerEvents = 'none';
        document.querySelector('.right-pane').innerHTML = /*html*/`
            <!-- Right Pane -->
            <h4 class="mb-4"><i class="bi bi-building me-2"></i>${__html('Client Information')}</h4>
            
            <!-- Client Type -->
            <div class="row mb-3">
                <div class="col-12">
                    <h6>${__html('Client Type')}</h6>
                    <div class="btn-group" role="group">
                        <input type="radio" class="btn-check" name="entity" id="individual_anm" data-entity="individual" data-vat_status="1" autocomplete="off" ${this.client.entity === 'individual' && this.client.vat_status === '1' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="individual_anm">${__html('Fiziskā ANM')}</label>

                        <input type="radio" class="btn-check" name="entity" id="individual" data-entity="individual" data-vat_status="0" autocomplete="off" ${this.client.entity === 'individual' && this.client.vat_status === '0' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="individual">${__html('Fiziskā')}</label>

                        <input type="radio" class="btn-check" name="entity" id="company_anm" data-entity="company" data-vat_status="1" autocomplete="off" ${this.client.entity === 'company' && this.client.vat_status === '1' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="company_anm">${__html('Juridiskā ANM')}</label>

                        <input type="radio" class="btn-check" name="entity" id="company" data-entity="company" data-vat_status="0" autocomplete="off" ${this.client.entity === 'company' && this.client.vat_status === '0' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="company">${__html('Juridiskā')}</label>

                        <input type="radio" class="btn-check" name="entity" id="company_export" data-entity="company" data-vat_status="2" autocomplete="off" ${this.client.entity === 'company' && this.client.vat_status === '2' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="company_export">${__html('Juridiskā Ārzemes')}</label>
                    </div>
                </div>
            </div>
            
            <!-- Client Details -->
            <div class="row mb-4">
                <div class="col-md-6 mb-3">
                    <label for="reg_number" class="form-label">${__html('Registration Number')} <span class="ms-2 po verify_company">⇄</span></label>
                    <input type="text" class="form-control" id="reg_number" value="${this.client.reg_number || this.client.reg_num || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="vat_number" class="form-label">${__html('VAT Number')}</label>
                    <input type="text" class="form-control" id="vat_number" value="${this.client.vat_number || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="legal_name" class="form-label">${__html('Company Name')}</label>
                    <input type="text" class="form-control" id="legal_name" value="${this.client.legal_name || this.client.name || ''}">
                </div>
                <div class="col-md-6 mb-3 d-none">
                    <label for="clientPhoneRight" class="form-label">${__html('Phone Number')}</label>
                    <input type="tel" class="form-control" id="clientPhoneRight" value="${this.client.phone || ''}" >
                </div>
                <div class="col-md-6 mb-3 d-none">
                    <label for="email" class="form-label">${__html('Email')}</label>
                    <input type="email" class="form-control" id="email" value="${this.client.email || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="bank_name" class="form-label">${__html('Bank Name')}</label>
                    <input type="text" class="form-control" id="bank_name" value="${this.client.bank_name || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="bank_acc" class="form-label">${__html('Bank Account')}</label>
                    <input type="text" class="form-control" id="bank_acc" value="${this.client.bank_acc || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="reg_address" class="form-label">${__html('Registration Address')}</label>
                    <input type="text" class="form-control" id="reg_address" value="${this.client.reg_address || ''}" >
                </div>
                <div class="col-12 mb-3">
                    <label for="client_notes" class="form-label">${__html('Internal Note')}</label>
                    <textarea class="form-control" id="client_notes" rows="3" >${this.client.notes || ''}</textarea>
                </div>
            </div>
            
            <!-- Company Contacts Section -->
            <client-contacts></client-contacts>

            <!-- Company Drivers Section -->
            <client-drivers></client-drivers>

            <!-- Construction Addresses -->
            <client-addresses></client-addresses>

            <!-- Save Button -->
            <div class="text-end">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary btn-lg px-5" id="saveClientBtn">
                        <i class="bi bi-floppy fs-5 me-2"></i> ${__html('Save Client')}
                    </button>
                    <button class="btn btn-outline-danger btn-lg px-5" id="removeClientBtn">
                        <i class="bi bi-trash fs-5"></i>
                    </button>
                </div>
            </div>`;

        new ClientContacts(this.client);

        new ClientDrivers(this.client);

        new ClientAddresses(this.client);

        // Add event listeners or any additional initialization here
        this.listeners();
    }

    listeners = () => {

        // Add event listeners for buttons and other interactive elements
        onClick('#saveClientBtn', this.save);

        // From the client side
        bus.clear('order');
        bus.on('client:search:refresh', (data) => {

            // console.log('client:search:refresh received:', data);

            if (!data) return;

            if (!data._id) {

                this.client = { _id: null, drivers: [], addresses: [] };
                this.view();
            }

            if (data._id) {
                this.client._id = data._id;
                this.data();
            }
        });

        onClick('#removeClientBtn', () => {
            if (confirm(__html('Delete client?'))) {
                // Call the API to remove the client
                deleteClient({ id: this.client._id }, (response) => {

                    toast(__html('Client removed'), 'success');

                    bus.emit('client:removed', { _id: this.client._id });

                    // console.log('Client removed:', response);
                    // Optionally, redirect or clear the view
                    this.client = { _id: null, drivers: [], addresses: [] };
                    this.view();
                });
            }
        });

        // Verify company details
        onClick('.verify_company', () => {

            verifyClient(document.getElementById('reg_number').value.trim(), (response) => {
                if (response && response.success) {

                    console.log('Client verification response:', response);

                    // document.getElementById('reg_number').value = response.reg_number || '';
                    document.getElementById('vat_number').value = response.client.pvncode || '';
                    document.getElementById('legal_name').value = response.client.klients_new || '';
                    document.getElementById('reg_address').value = response.client.adress_full || '';
                    this.client.vat_status = response.client.pvnStatus || '';

                    // // Update client data with the verified details
                    // this.client = { ...this.client, ...response.data };

                    // // Update the view with the new client data
                    // this.view();

                    toast(__html('Client details verified'), 'success');
                } else {
                    toast(__html('Failed to verify client details'), 'error');
                }
            });
        });
    }

    getValidatedClientData = () => {

        const reg_number = document.getElementById('reg_number').value.trim();
        const vat_number = document.getElementById('vat_number').value.trim();
        const legal_name = document.getElementById('legal_name').value.trim();
        const clientPhoneRight = document.getElementById('clientPhoneRight').value.trim();
        const email = document.getElementById('email').value.trim();
        const bank_name = document.getElementById('bank_name').value.trim();
        const bank_acc = document.getElementById('bank_acc').value.trim();
        const reg_address = document.getElementById('reg_address').value.trim();
        const notes = document.getElementById('client_notes').value.trim();
        const entity = document.querySelector('input[name="entity"]:checked');

        if (!entity) {
            alert('Please select a client type.');
            return false;
        }

        // Perform validation checks
        if (!reg_number) {
            alert('Please fill in all required fields.');
            return false;
        }

        if (email) if (!validateEmail(email)) {
            alert('Please enter a valid email address.');
            return false;
        }

        if (clientPhoneRight) if (!validatePhone(clientPhoneRight)) {
            alert('Please enter a valid phone number.');
            return false;
        }

        const clientData = {
            _id: this.client._id || null,
            entity: entity.dataset.entity,
            vat_status: entity.dataset.vat_status,
            reg_number,
            vat_number,
            legal_name,
            name: legal_name, // For compatibility with existing code
            phone: clientPhoneRight,
            email,
            bank_name,
            bank_acc,
            reg_address,
            notes,
            drivers: this.client.drivers,
            addresses: this.client.addresses,
            contacts: this.client.contacts
        };

        return clientData;
    }

    save = () => {

        const clientData = this.getValidatedClientData();

        if (!clientData) return;

        saveClient(clientData, (response) => {

            // console.log('Saved successfully', response);

            toast(__html('Client updated'), 'success');

            this.order.vat_status = clientData.vat_status;
            this.order.entity = clientData.entity;

            bus.emit('client:updated', { _id: this.client._id });
        });

        // console.log('Saving client data...', clientData);
    }
}