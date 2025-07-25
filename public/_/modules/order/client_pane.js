import { deleteClient } from "/_/api/delete_client.js";
import { getClientDetails } from "/_/api/get_client_details.js";
import { saveClient } from "/_/api/save_client.js";
import { ClientAddresses } from "/_/components/order/client_addresses.js";
import { ClientContacts } from "/_/components/order/client_contacts.js";
import { ClientDrivers } from "/_/components/order/client_drivers.js";
import { __html, onClick, toast, validateEmail, validatePhone } from "/_/helpers/global.js";
import { bus } from "/_/modules/bus.js";

export class ClientPane {

    constructor(eid) {

        this.client = { _id: eid ? eid : null, drivers: [], addresses: [], contacts: [] };

        // check if header is already present
        this.init();
    }

    init = () => {

        this.view();
    }

    data = () => {

        if (!this.client._id) return;

        getClientDetails(this.client._id, (response) => {
            if (response && response.data) {

                // console.log('Client data fetched:', response.data);
                // Update client data with the response
                this.client = response.data;
                this.client.drivers = this.client.drivers || [];
                this.client.addresses = this.client.addresses || [];
                this.client.contacts = this.client.contacts || [];
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
                        <input type="radio" class="btn-check" name="entity" id="individual_anm" autocomplete="off" ${this.client.entity === 'individual_anm' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="individual_anm">${__html('Fiziskā ANM')}</label>

                        <input type="radio" class="btn-check" name="entity" id="individual" autocomplete="off" ${this.client.entity === 'individual' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="individual">${__html('Fiziskā')}</label>

                        <input type="radio" class="btn-check" name="entity" id="company_anm" autocomplete="off" ${this.client.entity === 'company_anm' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="company_anm">${__html('Juridiskā ANM')}</label>

                        <input type="radio" class="btn-check" name="entity" id="company" autocomplete="off" ${this.client.entity === 'company' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="company">${__html('Juridiskā')}</label>

                        <input type="radio" class="btn-check" name="entity" id="company_export" autocomplete="off" ${this.client.entity === 'company_export' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary btn-sm" for="company_export">${__html('Juridiskā Ārzemes')}</label>
                    </div>
                </div>
            </div>
            
            <!-- Client Details -->
            <div class="row mb-4">
                <div class="col-md-6 mb-3">
                    <label for="regNumber" class="form-label">${__html('Registration Number')}</label>
                    <input type="text" class="form-control" id="regNumber" value="${this.client.regNumber || this.client.reg_num || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="vatNumber" class="form-label">${__html('VAT Number')}</label>
                    <input type="text" class="form-control" id="vatNumber" value="${this.client.vatNumber || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="companyName" class="form-label">${__html('Company Name')}</label>
                    <input type="text" class="form-control" id="companyName" value="${this.client.companyName || this.client.name || ''}">
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
                    <label for="bankName" class="form-label">${__html('Bank Name')}</label>
                    <input type="text" class="form-control" id="bankName" value="${this.client.bankName || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="bankAccount" class="form-label">${__html('Bank Account')}</label>
                    <input type="text" class="form-control" id="bankAccount" value="${this.client.bankAccount || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="regAddress" class="form-label">${__html('Registration Address')}</label>
                    <input type="text" class="form-control" id="regAddress" value="${this.client.regAddress || ''}" >
                </div>
                <div class="col-12 mb-3">
                    <label for="internalNote" class="form-label">${__html('Internal Note')}</label>
                    <textarea class="form-control" id="internalNote" rows="3" >${this.client.internalNote || ''}</textarea>
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
        bus.clear('client:search:refresh');
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
    }

    getValidatedClientData = () => {

        const regNumber = document.getElementById('regNumber').value.trim();
        const vatNumber = document.getElementById('vatNumber').value.trim();
        const companyName = document.getElementById('companyName').value.trim();
        const clientPhoneRight = document.getElementById('clientPhoneRight').value.trim();
        const email = document.getElementById('email').value.trim();
        const bankName = document.getElementById('bankName').value.trim();
        const bankAccount = document.getElementById('bankAccount').value.trim();
        const regAddress = document.getElementById('regAddress').value.trim();
        const internalNote = document.getElementById('internalNote').value.trim();
        const entity = document.querySelector('input[name="entity"]:checked');

        if (!entity) {
            alert('Please select a client type.');
            return false;
        }

        const entityValue = entity.id;

        // Perform validation checks
        if (!regNumber) {
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
            regNumber,
            vatNumber,
            companyName,
            name: companyName, // For compatibility with existing code
            phone: clientPhoneRight,
            email,
            bankName,
            bankAccount,
            regAddress,
            internalNote,
            entity: entityValue,
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

            bus.emit('client:updated', { _id: this.client._id });
        });

        // console.log('Saving client data...', clientData);
    }
}