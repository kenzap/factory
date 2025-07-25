import { __html, onChange, onClick, randomString } from "/_/helpers/global.js";

/**
 * ClientContacts component that manages the contacts associated with a client.
 * Initialized in the right pane of the order edit page.
 * 
 * @class ClientContacts
 */
export class ClientContacts {

    constructor(client) {

        this.client = client;

        this.init();
    }

    init = () => {

        this.view();

        this.refreshContacts();

        this.listeners();
    }

    view = () => {

        document.querySelector('client-contacts').innerHTML = `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5><i class="bi bi-person me-2"></i>${__html('Contacts')}</h5>
                    <button class="btn btn-outline-primary btn-sm" id="addContactBtn">
                        <i class="bi bi-plus me-1"></i>${__html('Add Contact')}
                    </button>
                </div>
                
                <div id="contactsList">
                    <!-- Contact items will be dynamically added here -->
                </div>
                
                <button class="btn add-contact-btn w-100 py-3" id="addContactPlaceholder">
                    <i class="bi bi-plus me-2"></i>${__html('Add First Contact')}
                </button>
            </div>
            `;
    }

    refreshContacts = () => {

        // Clear existing contacts
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';

        // Re-add all contacts
        this.client.contacts.forEach((contact, i) => {

            contactsList.insertAdjacentHTML('beforeend', /*html*/`
                <div class="contact-item bg-light bg-gradient" id="${contact.id}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6><i class="bi bi-person me-2"></i>${__html('Contact #%1$', i + 1)}</h6>
                        <button class="btn btn-outline-danger btn-remove-contact btn-sm" data-id="${contact.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Name')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="contactName_${contact.id}" value="${contact.name}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Phone')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="contactPhone_${contact.id}" value="${contact.phone}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Email')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="contactEmail_${contact.id}" value="${contact.email}">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label">${__html('Note')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="contactNotes_${contact.id}" value="${contact.notes}">
                        </div>
                        <div class="col-12 mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" autocomplete="off" id="contactMain_${contact.id}" name="contactMain_${contact.id}" ${contact.main ? 'checked' : ''}>
                                <label class="form-check-label" for="contactMain_${contact.id}">
                                    ${__html('Primary contact')}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>`
            );
        });

        onClick('.btn-remove-contact', (e) => {
            this.removeContact(e.currentTarget.dataset.id);
        });

        onChange('.contact-item input', (e) => {
            const contactId = e.currentTarget.closest('.contact-item').id;
            const fieldName = e.currentTarget.name.split('_')[0].replace('contact', '').toLowerCase();
            const fieldValue = e.currentTarget.value;

            // Update the contacts object with the new field value
            const contactIndex = this.client.contacts.findIndex(contact => contact.id === contactId);
            if (contactIndex !== -1) {
                if (fieldName === 'contactMain') {
                    this.client.contacts[contactIndex][fieldName] = e.currentTarget.checked;
                } else {
                    this.client.contacts[contactIndex][fieldName] = fieldValue;
                }
            }

            console.log('Updated contact:', this.client.contacts);
        });

        if (this.client.contacts.length === 0) {
            document.getElementById('addContactPlaceholder').classList.remove('d-none');
        }

        if (this.client.contacts.length > 0) {
            document.getElementById('addContactPlaceholder').classList.add('d-none');
        }
    }

    addContact() {

        this.client.contacts.push({
            id: randomString(6),
            name: ``,
            phone: ``,
            email: ``,
            notes: ``,
            main: false
        });

        this.refreshContacts();
    }

    removeContact(contactId) {

        this.client.contacts = this.client.contacts.filter(contact => contact.id !== contactId);

        this.refreshContacts();
    }

    listeners = () => {

        // Add contacts listener
        document.getElementById('addContactBtn').addEventListener('click', this.addContact.bind(this));
        document.getElementById('addContactPlaceholder').addEventListener('click', this.addContact.bind(this));
    }
}