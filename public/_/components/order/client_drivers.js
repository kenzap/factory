import { __html, onChange, onClick, randomString } from "../../helpers/global.js";

/**
 * ClientDrivers component that manages the drivers associated with a client.
 * Initialized in the right pane of the order edit page.
 * 
 * @class ClientDrivers
 */
export class ClientDrivers {

    constructor(client) {

        this.client = client;

        this.init();
    }

    init = () => {

        this.view();

        this.refreshDrivers();

        this.listeners();
    }

    view = () => {

        document.querySelector('client-drivers').innerHTML = `
            <div class="mb-5">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-truck me-2"></i>${__html('Drivers')}</h5>
                    <button class="btn btn-outline-primary btn-sm" id="addDriverBtn">
                        <i class="bi bi-plus me-1"></i>${__html('Add Driver')}
                    </button>
                </div>
                
                <div id="driversList">
                    <!-- Driver items will be dynamically added here -->
                </div>
                
                <button class="btn add-driver-btn w-100 py-3" id="addDriverPlaceholder">
                    <i class="bi bi-plus me-2"></i>${__html('Add First Driver')}
                </button>
            </div>
            `;
    }

    refreshDrivers = () => {

        // Clear existing drivers
        const driversList = document.getElementById('driversList');
        driversList.innerHTML = '';

        // Re-add all drivers
        this.client.drivers.forEach((driver, i) => {

            driversList.insertAdjacentHTML('beforeend', /*html*/`
                <div class="driver-item bg-light bg-gradient p-3 mb-3 border-sm" id="${driver.id}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6><i class="bi bi-person-badge me-2"></i>${__html('Driver #%1$', i + 1)}</h6>
                        <button class="btn btn-outline-danger btn-remove-driver btn-sm" data-id="${driver.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div> 
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Company name')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="companyName_${driver.id}" value="${driver.companyName}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Registration number')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="companyRegNumber_${driver.id}" value="${driver.companyRegNumber}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Driver name')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="driverName_${driver.id}" value="${driver.driverName}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Driver code')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="driverCode_${driver.id}" value="${driver.driverCode}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Car number')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="carNumber_${driver.id}" value="${driver.carNumber}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Car model/info')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="carModel_${driver.id}" value="${driver.carModel}">
                        </div>
                        <div class="col-12 mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" autocomplete="off" id="waybillAllowed_${driver.id}" name="waybillAllowed_${driver.id}" ${driver.waybillAllowed ? 'checked' : ''}>
                                <label class="form-check-label" for="waybillAllowed_${driver.id}">
                                    ${__html('Primary')}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>`
            );
        });

        onClick('.btn-remove-driver', (e) => {
            this.removeDriver(e.currentTarget.dataset.id);
        });

        onChange('.driver-item input', (e) => {
            const driverId = e.currentTarget.closest('.driver-item').id;
            const fieldName = e.currentTarget.name.split('_')[0];
            const fieldValue = e.currentTarget.value;

            // Update the driver object with the new field value
            const driverIndex = this.client.drivers.findIndex(driver => driver.id === driverId);
            if (driverIndex !== -1) {
                if (fieldName === 'waybillAllowed') {
                    this.client.drivers[driverIndex][fieldName] = e.currentTarget.checked;
                } else {
                    this.client.drivers[driverIndex][fieldName] = fieldValue;
                }
            }
        });

        if (this.client.drivers.length === 0) {
            document.getElementById('addDriverPlaceholder').classList.remove('d-none');
        }

        if (this.client.drivers.length > 0) {
            document.getElementById('addDriverPlaceholder').classList.add('d-none');
        }
    }

    addDriver() {

        this.client.drivers.push({
            id: randomString(6),
            companyName: this.client.legal_name || ``,
            companyRegNumber: this.client.reg_number || ``,
            driverName: ``,
            driverCode: ``,
            carNumber: ``,
            carModel: ``,
            waybillAllowed: false,
        });

        this.refreshDrivers();
    }

    removeDriver(driverId) {

        this.client.drivers = this.client.drivers.filter(driver => driver.id !== driverId);

        this.refreshDrivers();
    }

    listeners = () => {

        // Add driver functionality
        document.getElementById('addDriverBtn').addEventListener('click', this.addDriver.bind(this));
        document.getElementById('addDriverPlaceholder').addEventListener('click', this.addDriver.bind(this));
    }
}