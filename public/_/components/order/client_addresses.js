import { __html, onChange, onClick, randomString } from "../../helpers/global.js";

/**
 * ClientAddresses component that manages the addresses associated with a client.
 * Initialized in the right pane of the order edit page.
 * 
 * @class ClientAddresses
 */
export class ClientAddresses {

    constructor(client) {

        this.client = client;

        this.init();
    }

    init = () => {

        this.view();

        this.refreshAddresses();

        this.listeners();
    }

    view = () => {

        document.querySelector('client-addresses').innerHTML = `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-geo-alt me-2"></i>${__html('Addresses')}</h5>
                    <button class="btn btn-outline-primary btn-sm" id="addAddressBtn">
                        <i class="bi bi-plus me-1"></i>${__html('Add Address')}
                    </button>
                </div>
                
                <div id="addressList">
                <!-- Address items will be dynamically added here -->
                </div>
                
                <button class="btn add-address-btn w-100 py-3" id="addAddressPlaceholder">
                    <i class="bi bi-plus me-2"></i>${__html('Add First Address')}
                </button>
            </div>
            `;
    }

    refreshAddresses = () => {

        // Clear existing drivers
        const driversList = document.getElementById('addressList');
        driversList.innerHTML = '';

        // Re-add all drivers
        this.client.addresses.forEach((address, i) => {

            driversList.insertAdjacentHTML('beforeend', /*html*/`
                <div class="address-item" id="${address.id}">
                    <div class="d-flex gap-2 mb-3">
                        <input type="text" class="form-control form-control-sm-" placeholder="${__html('Address')}" value="${address.address}" name="address_${address.id}" autocomplete="off">
                        <button type="button" class="btn btn-outline-danger btn-remove-address btn-sm" data-id="${address.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                `
            );
        });

        onClick('.btn-remove-address', (e) => {
            this.removeAddress(e.currentTarget.dataset.id);
        });

        onChange('.address-item input', (e) => {
            const addressId = e.currentTarget.closest('.address-item').id;
            const fieldName = e.currentTarget.name.split('_')[0];
            const fieldValue = e.currentTarget.value;

            // Update the driver object with the new field value
            const index = this.client.addresses.findIndex(address => address.id === addressId);
            if (index !== -1) {
                this.client.addresses[index][fieldName] = fieldValue;
            }
        });

        if (this.client.addresses.length === 0) {
            document.getElementById('addAddressPlaceholder').classList.remove('d-none');
        }

        if (this.client.addresses.length > 0) {
            document.getElementById('addAddressPlaceholder').classList.add('d-none');
        }
    }


    addAddress() {

        this.client.addresses.push({
            id: randomString(6),
            address: ``
        });

        this.refreshAddresses();
    }

    removeAddress(addressId) {

        this.client.addresses = this.client.addresses.filter(address => address.id !== addressId);

        this.refreshAddresses();
    }

    listeners = () => {

        // Add addresses functionality
        document.getElementById('addAddressBtn').addEventListener('click', this.addAddress.bind(this));
        document.getElementById('addAddressPlaceholder').addEventListener('click', this.addAddress.bind(this));
    }
}