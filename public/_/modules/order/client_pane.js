import { deleteClient } from "../../api/delete_client.js";
import { getBankDetails } from "../../api/get_bank_details.js";
import { getClientDetails } from "../../api/get_client_details.js";
import { saveClient } from "../../api/save_client.js";
import { verifyClient } from "../../api/verify_client.js";
import { ClientAddresses } from "../../components/order/client_addresses.js";
import { ClientContacts } from "../../components/order/client_contacts.js";
import { ClientDiscounts } from "../../components/order/client_discounts.js";
import { ClientDrivers } from "../../components/order/client_drivers.js";
import { ClientNotifications } from "../../components/order/client_notifications.js";
import { __html, attr, countries, onChange, onClick, toast } from "../../helpers/global.js";
import { extractCountryFromVAT } from '../../helpers/tax/index.js';
import { isEmail, isPhone } from "../../helpers/validation.js";
import { bus } from "../../modules/bus.js";
import { state } from "../../modules/order/state.js";

export class ClientPane {

    constructor() {

        this.firstLoad = true;

        state.client = { _id: state.order.eid ? state.order.eid : null, legal_name: state.order.name, drivers: [], addresses: [], contacts: [] };

        // check if header is already present
        this.init();
    }

    init = () => {

        this.data();
    }

    data = () => {

        if (!state.client._id) {

            this.view();

            return;
        }

        getClientDetails(state.client._id, (response) => {

            if (response && response.data) {

                // Update client data with the response
                state.client = response.data;
                state.client.drivers = state.client.drivers || [];
                state.client.addresses = state.client.addresses || [];
                state.client.contacts = state.client.contacts || [];

                state.order.vat_number = state.client.vat_number || '';
                state.order.vat_status = state.client.vat_status || '0';
                state.order.discounts = state.client.discounts || {};
                state.order.notifications = state.client.notifications || {};
                state.order.entity = state.client.entity || 'company';

                state.order.fname = state.client.fname || '';
                state.order.lname = state.client.lname || '';

                state.order.legal_name = state.client.legal_name || '';

                if (!state.client.fname && !state.client.lname && state.client.legal_name) {
                    const nameParts = state.client.legal_name.trim().split(' ');
                    state.client.lname = nameParts[0] || '';
                    state.client.fname = nameParts.slice(1).join(' ') || '';
                }

                console.log('Client data after fetch:', state.order);
            }

            // Refresh the view with client data
            this.view();
        });
    }

    view = () => {

        document.querySelector('.right-pane').innerHTML = /*html*/`
        <client-pane>

            <!-- Alert Notification -->
            <alert-notification></alert-notification>

            <!-- Right Pane -->
            <h4 class="mb-4"><client-badge><i class="bi ${state.client.entity == "company" ? "bi-building" : "bi-person fs-4"} me-2"></i></client-badge>${state.client._id ? __html('Edit Client') : __html('New Client')}<verified-badge></verified-badge></h4>
            
            <!-- Client Type -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <label for="individual" class="form-label">${__html('Client type')}</label>
                    <div class="btn-group d-flex" role="group">
                        <input type="radio" class="btn-check" name="entity" id="individual" data-entity="individual" autocomplete="off" ${state.client.entity === 'individual' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary" for="individual" style="height: 38px; line-height: 1.5;">${__html('Individual')}</label>
                        <input type="radio" class="btn-check" name="entity" id="company" data-entity="company" autocomplete="off" ${state.client.entity === 'company' ? 'checked' : ''}>
                        <label class="btn btn-outline-primary" for="company" style="height: 38px; line-height: 1.5;">${__html('Company')}</label>
                    </div>
                </div>
                <div class="col-md-6">
                    <label for="tax_region" class="form-label">${__html('Tax region')}</label>
                    <select id="tax_region" class="form-select inp" name="tax_region" data-type="select">
                      <option value="">${__html('Select')}</option>
                      ${countries.map(c => `<option value="${c.code}" ${(state.client.tax_region || state.settings.tax_region) === c.code ? 'selected' : ''}>${__html(c.name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <!-- Client Details -->
            <div class="row mb-5">
                <div class="col-md-6 mb-3">
                    <label for="reg_number" class="form-label">${__html('Registration number')} <span class="ms-2 po verify_company"><i class="bi bi-arrow-left-right"></i></span> <span class="ms-2 po verify_company_locally"><i class="bi bi-search"></i></span></label>
                    <input type="text" class="form-control" id="reg_number" value="${state.client.reg_number || state.client.reg_num || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <input class="form-check-input me-1 vat_status" type="checkbox" role="switch" ${state.client.vat_status === '1' ? 'checked' : ''} >
                    <label for="vat_number" class="form-label">${__html('VAT Number')}</label>
                    <input type="text" class="form-control" id="vat_number" value="${state.client.vat_number || ''}">
                </div>
                <div class="col-md-6 mb-3 company-name-cont ${state.client.entity == "individual" ? 'd-none' : ''}">
                    <label id="label-company-name" for="legal_name" class="form-label">${__html('Company name')}</label>
                    <label id="label-legal-name" for="legal_name" class="form-label d-none">${__html('Full name')}</label>
                    <input type="text" class="form-control" id="legal_name" value="${attr(state.client.legal_name || state.client.name || '')}">
                </div>
                <div class="col-md-3 mb-3 name-cont ${state.client.entity == "individual" ? '' : 'd-none'}">
                    <label id="label-fname" for="fname" class="form-label">${__html('First name')}</label>
                    <input type="text" class="form-control" id="fname" value="${attr(state.client.fname || '')}">
                </div>
                <div class="col-md-3 mb-3 name-cont ${state.client.entity == "individual" ? '' : 'd-none'}">
                    <label id="label-lname" for="lname" class="form-label">${__html('Last name')}</label>
                    <input type="text" class="form-control" id="lname" value="${attr(state.client.lname || '')}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="bank_name" class="form-label">${__html('Bank name')}</label>
                    <input type="text" class="form-control" id="bank_name" value="${(attr(state.client.bank_name || ''))}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="bank_acc" class="form-label">${__html('Bank account')}</label>
                    <input type="text" class="form-control" id="bank_acc" value="${state.client.bank_acc || ''}">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="reg_address" class="form-label">${__html('Registration address')}</label>
                    <input type="text" class="form-control" id="reg_address" value="${state.client.reg_address || ''}" >
                </div>
                <div class="col-12 mb-0">
                    <label for="client_notes" class="form-label">${__html('Internal note')}</label>
                    <textarea class="form-control" id="client_notes" rows="3" >${state.client.notes || ''}</textarea>
                </div>
                <div class="col-md-6 mb-3 d-none">
                    <label for="clientPhoneRight" class="form-label">${__html('Phone number')}</label>
                    <input type="tel" class="form-control" id="clientPhoneRight" value="${attr(state.client.phone || '')}" >
                </div>
                <div class="col-md-6 mb-3 d-none">
                    <label for="email" class="form-label">${__html('Email')}</label>
                    <input type="email" class="form-control" id="email" value="${attr(state.client.email || '')}">
                </div>
            </div>
            
            <!-- Company Contacts Section -->
            <client-contacts></client-contacts>

            <!-- Company Drivers Section -->
            <client-drivers></client-drivers>

            <!-- Construction Addresses -->
            <client-addresses></client-addresses>

            <!-- Construction Addresses -->
            <client-discounts></client-discounts>

            <!-- Client Notifications -->
            <client-notifications></client-notifications>

            <!-- Save Button -->
            <div class="text-end mb-3">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary btn-lg- px-3" id="saveClientBtn"><i class="bi bi-floppy fs-6 me-2"></i> ${__html('Save')}</button>
                    <button class="btn btn-outline-danger btn-lg- px-3" id="removeClientBtn"><i class="bi bi-trash fs-5"></i></button>
                </div>
            </div>
        <client-pane>`;

        new ClientContacts(state.client);

        new ClientDrivers(state.client);

        new ClientAddresses(state.client);

        new ClientDiscounts(state.settings, state.client);

        new ClientNotifications(state.client);

        // Add event listeners or any additional initialization here
        this.listeners();
    }

    listeners = () => {

        if (!this.firstLoad) return;

        // Add event listeners for buttons and other interactive elements
        onClick('#saveClientBtn', () => { this.save(false) });

        onChange('input[name="entity"]', (event) => {

            const entity = event.target.dataset.entity;

            if (entity == "individual") {
                document.querySelector('.company-name-cont').classList.add('d-none');
                [...document.querySelectorAll('.name-cont')].forEach(el => el.classList.remove('d-none'));

                if (!state.client._id) {

                    console.log('Setting individual default names');

                    if (!state.client.fname && !state.client.lname && (state.client.legal_name || state.client.name)) {
                        const nameParts = (state.client.legal_name || state.client.name).trim().split(' ');
                        state.client.lname = nameParts[0] || '';
                        state.client.fname = nameParts.slice(1).join(' ') || '';

                        document.getElementById('fname').value = state.client.fname;
                        document.getElementById('lname').value = state.client.lname;
                    }
                }

            } else {
                document.querySelector('.company-name-cont').classList.remove('d-none');
                [...document.querySelectorAll('.name-cont')].forEach(el => el.classList.add('d-none'));
            }

            // udpate badge
            document.querySelector('client-badge').innerHTML = /*html*/`<i class="bi ${entity == "company" ? "bi-building" : "bi-person fs-4"} me-2"></i> `;
        });

        onChange('.vat_status', (event) => {

            state.client.vat_status = event.target.checked ? '1' : '0';
        });

        // From the client side
        bus.clear('client:search:refresh');
        bus.on('client:search:refresh', (data) => {

            console.log('client:search:refresh received:', data);

            if (!data) return;

            if (!data._id) {

                state.client = { _id: null, drivers: [], addresses: [], name: data.name };
                this.view();
            }

            if (data._id) {
                state.client._id = data._id;
                this.data();
            }
        });

        // remove cient
        onClick('#removeClientBtn', () => {
            if (confirm(__html('Delete client?'))) {
                // Call the API to remove the client
                deleteClient({ id: state.client._id }, (response) => {

                    toast('Successfully removed');

                    bus.emit('client:removed', { _id: state.client._id });

                    // Optionally, redirect or clear the view
                    state.client = { _id: null, drivers: [], addresses: [] };

                    this.view();
                });
            }
        });

        // Verify company details 
        onClick('.verify_company', () => {

            verifyClient({ reg_number: document.getElementById('reg_number').value.trim(), tax_region: document.getElementById('tax_region').value }, (response) => {
                if (response && response.success) {

                    // console.log('Client verification response:', response);

                    document.getElementById('vat_number').value = response.client.pvncode || '';

                    // entity
                    const entity = document.querySelector('input[name="entity"]:checked');

                    if (!entity) {

                        alert('Select a client type.');
                        return false;
                    }

                    // clear previous alert
                    document.querySelector('alert-notification').innerHTML = '';

                    // trigger alert if client can not be verified
                    if (response.client.vatStatus === '0' && entity.dataset.entity === 'company') {

                        document.querySelector('alert-notification').innerHTML = /*html*/`
                            <div class="alert alert-danger d-flex alert-dismissible mb-4" role="alert">
                                <div class="align-items-center">
                                    <i class="bi bi-exclamation-triangle fs-5 me-2"></i>
                                    ${__html('Client status can not be verified')}
                                </div>
                                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            </div>`
                    }

                    if (response.client.vatStatus === '1') {

                        if (response.client.klients_new) document.getElementById('legal_name').value = response.client.klients_new || '';
                        if (response.client.vatStatus) state.client.vat_status = response.client.vatStatus || '';
                        if (response.client.adress_full) { state.client.reg_address = response.client.adress_full || ''; document.getElementById('reg_address').value = state.client.reg_address; }

                        const tax_region = extractCountryFromVAT(response.client.vatNumber || '');
                        if (tax_region) document.querySelector('#tax_region').value = tax_region;
                    }

                    if (response.client.vatStatus === '1' && entity.dataset.entity === 'company') {

                        document.querySelector('.vat_status').checked = true;
                        document.querySelector('verified-badge').innerHTML = /*html*/`<i class="bi bi-check-circle ms-2 text-success"></i>`;

                        this.save(true);
                    }

                    toast(__html('Client details verified'), 'success');
                } else {
                    toast(__html('Failed to verify client details'), 'error');
                }
            });
        });

        // Verify company details in local registry
        onClick('.verify_company_locally', () => {
            window.open("https://company.lursoft.lv/" + document.getElementById('reg_number').value.trim(), '_blank');
        });

        // on
        onChange('#bank_acc', (event) => {

            const bankAcc = event.target.value.trim();

            if (bankAcc.length < 10) return;

            // Extract bank code and prepend it
            const code = bankAcc.substr(4, 4) + bankAcc.substr(0, 2);

            getBankDetails({ code }, (response) => {
                if (response && response.success && response.data) {

                    console.log('Bank details fetched:', response.data);
                    document.getElementById('bank_name').value = response.data.name || '';
                }
            });
            // event.target.value = bankCode;
        });

        // Handle Enter key as Tab for all input and textarea fields
        document.querySelectorAll('.right-pane input, .right-pane textarea').forEach(element => {
            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {

                    event.preventDefault();

                    console.log('Enter key pressed, moving to next input', element.value, state.order.id);

                    // Find all focusable elements with tabindex consideration
                    const focusableElements = Array.from(document.querySelectorAll('.right-pane input, .right-pane textarea'))
                        .filter(el => el.tabIndex >= 0)
                        .sort((a, b) => {
                            const aIndex = a.tabIndex || 0;
                            const bIndex = b.tabIndex || 0;
                            return aIndex - bIndex;
                        });

                    const currentIndex = focusableElements.indexOf(event.target);

                    // Move to next focusable element following tab order
                    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {

                        focusableElements[currentIndex + 1].focus();
                    }
                }
            });
        });

        this.firstLoad = true;
    }

    getValidatedClientData = () => {

        const reg_number = document.getElementById('reg_number').value.trim();
        const vat_number = document.getElementById('vat_number').value.trim();
        const legal_name = document.getElementById('legal_name').value.trim();
        const fname = document.getElementById('fname').value.trim();
        const lname = document.getElementById('lname').value.trim();
        const clientPhoneRight = document.getElementById('clientPhoneRight').value.trim();
        const email = document.getElementById('email').value.trim();
        const bank_name = document.getElementById('bank_name').value.trim();
        const bank_acc = document.getElementById('bank_acc').value.trim();
        const reg_address = document.getElementById('reg_address').value.trim();
        const notes = document.getElementById('client_notes').value.trim();
        const entity = document.querySelector('input[name="entity"]:checked');
        const vat_status = document.querySelector('.vat_status').checked ? '1' : '0';
        const tax_region = document.getElementById('tax_region').value || '';

        if (!entity) {
            alert('Select a client type.');
            return false;
        }

        // Clear previous validation states
        document.querySelectorAll('.right-pane .is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });

        let hasErrors = false;

        // Perform validation checks
        if (entity.dataset.entity == "company" && !reg_number) {
            document.getElementById('reg_number').classList.add('is-invalid');
            hasErrors = true;
        }

        if (email && !isEmail(email)) {
            document.getElementById('email').classList.add('is-invalid');
            hasErrors = true;
        }

        if (clientPhoneRight && !isPhone(clientPhoneRight)) {
            document.getElementById('clientPhoneRight').classList.add('is-invalid');
            hasErrors = true;
        }

        if (!legal_name) {
            document.getElementById('legal_name').classList.add('is-invalid');
            hasErrors = true;
        }

        if (entity.dataset.entity == "individual" && !fname) {
            document.getElementById('fname').classList.add('is-invalid');
            hasErrors = true;
        }

        if (entity.dataset.entity == "individual" && !lname) {
            document.getElementById('lname').classList.add('is-invalid');
            hasErrors = true;
        }

        if (hasErrors) {

            // Scroll to first invalid field
            const firstInvalidField = document.querySelector('.right-pane .is-invalid');
            if (firstInvalidField) {

                // Check if the invalid field is visible
                if (firstInvalidField.offsetParent === null) {
                    // Field is hidden, scroll to top instead
                    document.querySelector('.right-pane').scrollTop = 0;
                } else {
                    firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstInvalidField.focus();
                }
                console.log('Validation errors found in client data.');
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalidField.focus();
            }
            return false;
        }

        const clientData = {
            _id: state.client._id || null,
            entity: entity.dataset.entity,
            vat_status,
            reg_number,
            vat_number,
            legal_name,
            tax_region,
            fname,
            lname,
            name: legal_name, // For compatibility with existing code
            phone: clientPhoneRight,
            email,
            bank_name,
            bank_acc,
            reg_address,
            notes,
            discounts: state.client.discounts || {},
            drivers: state.client.drivers,
            addresses: state.client.addresses,
            contacts: state.client.contacts,
            notifications: state.client.notifications || {}
        };

        return clientData;
    }

    save = (silent = false) => {

        const clientData = this.getValidatedClientData();

        if (!clientData) return;

        saveClient(clientData, (response) => {

            if (!silent) toast('Changes applied');

            clientData._id = response.data._id;

            this.data();

            bus.emit('client:updated', clientData);
        });
    }
}