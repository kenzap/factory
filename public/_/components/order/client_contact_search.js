import { getContacts } from "/_/api/get_contacts.js";
import { __html } from "/_/helpers/global.js";
import { bus } from "/_/modules/bus.js";

/**
 * A contact search component that provides autocomplete functionality for searching contacts.
 * Example, in the orders journal.
 * 
 * @class ClientContactSearch
 */
export class ClientContactSearch {

    constructor(order) {

        this.order = order;

        this.init();
    }

    init = () => {

        this.data();

        this.view();

        this.listeners();
    }

    view = () => {

        document.querySelector('contact-order-search').innerHTML = `
            <div class="autocomplete-container position-relative">
                <div class="input-group input-group-sm autocomplete-container position-relative mb-2">       
                    <input type="text" class="form-control form-control-sm d-none-" id="contactPerson" placeholder="${__html('Contact person')}" autocomplete="nope" value="${this.order.contactPerson || ''}" >
                </div>
                <div id="contactSuggestions" class="autocomplete-suggestions position-absolute w-100 bg-white border border-top-0 shadow-sm d-none" style="max-height: 300px; overflow-y: auto; z-index: 1000;"></div>
            </div>
            `;
    }

    data = () => {

        // const contactInput = document.getElementById('clientFilter');

        this.eid = document.getElementById('clientFilter').dataset._id || this.eid;

        console.log('Contacts request:', this.eid);

        getContacts({ id: this.eid }, (response) => {

            console.log('Contacts response:', response.contacts);

            if (response && response.contacts) {
                this.contacts = response.contacts;
            } else {
                this.contacts = [];
            }
        });
    }

    listeners = () => {

        self = this;

        const clientInput = document.getElementById('contactPerson');
        const suggestions = document.getElementById('contactSuggestions');

        clientInput.addEventListener('input', (e) => {

            const value = e.target.value.toLowerCase();
            console.log('Input contact search value:', value);

            if (value.length === 0) {
                suggestions.classList.add('d-none');
                return;
            }

            const filtered = this.contacts.filter(contact =>
                contact.name.toLowerCase().includes(value)
            );

            if (filtered.length > 0) {
                suggestions.innerHTML = filtered.map((contact, i) =>
                    `<div class="autocomplete-item p-2 border-bottom cursor-pointer" data-i="${i}" data-id="${contact.id}" style="cursor: pointer;"><div data-i="${i}" data-id="${contact.id}">${contact.name}</div><div class="form-text" data-i="${i}" data-id="${contact.id}">${contact.phone} ${contact.email}</div></div>`
                ).join('');
                suggestions.classList.remove('d-none');
            } else {
                suggestions.classList.add('d-none');
            }
        });

        // Handle suggestion clicks
        suggestions.addEventListener('click', (e) => {

            e.preventDefault();

            const i = e.target.dataset.i;

            console.log('Input contact search value:', i, this.contacts[i]);

            const contact = this.contacts.find(contact => contact.id === e.target.dataset.id);

            console.log('Suggestion clicked:', e.target.dataset.id, contact);

            document.getElementById('contactPerson').value = contact.name;
            document.getElementById('contactPhone').value = contact.phone;
            document.getElementById('contactEmail').value = contact.email;

            suggestions.classList.add('d-none');

            // if (e.target.classList.contains('autocomplete-item')) {
            //     clientInput.value = e.target.textContent;
            //     clientInput.dataset._id = e.target.dataset._id;
            //     suggestions.classList.add('d-none');
            //     // console.log('emit:client:search:refresh:4');
            //     // bus.emit('client:search:refresh', { _id: e.target.dataset._id, name: clientInput.value });
            // }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {

            if (!clientInput.contains(e.target) && !suggestions.contains(e.target)) {
                // console.log('Suggestion clicked:', e.target);
                suggestions.classList.add('d-none');
            }
        });

        // Handle keyboard navigation
        clientInput.addEventListener('keydown', (e) => {

            // console.log('Key pressed:', e.key);
            const items = suggestions.querySelectorAll('.autocomplete-item');
            const activeItem = suggestions.querySelector('.autocomplete-item.active');
            let currentIndex = activeItem ? Array.from(items).indexOf(activeItem) : -1;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length > 0) {
                    if (currentIndex < items.length - 1) {
                        currentIndex++;
                    } else {
                        currentIndex = 0;
                    }
                    this.highlightItem(items, currentIndex);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    if (currentIndex > 0) {
                        currentIndex--;
                    } else {
                        currentIndex = items.length - 1;
                    }
                    this.highlightItem(items, currentIndex);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeItem) {
                    clientInput.value = activeItem.textContent;
                    clientInput.dataset._id = activeItem.dataset._id;
                    suggestions.classList.add('d-none');
                    // console.log('emit:client:search:refresh:1');
                    // bus.emit('contact:search:refresh', { _id: activeItem.dataset._id, name: clientInput.value });
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.add('d-none');
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                // Check if input becomes empty after the key is processed
                setTimeout(() => {
                    if (clientInput.value.trim() === '') {
                        // console.log('emit:client:search:refresh:2');
                        // bus.emit('contact:search:refresh', { _id: '', name: '' });
                    }
                }, 0);
            }
        });

        bus.clear('client:removed');
        bus.on('client:removed', (data) => {

            this.eid = '';

            console.log('contact removed received:', data);
            this.data();
        });

        bus.clear('contact:search:refresh');
        bus.on('contact:search:refresh', (data) => {

            this.eid = data._id;

            console.log('Client search received:', data);
            this.data();
        });

        bus.clear('client:updated');
        bus.on('client:updated', (data) => {

            this.eid = data._id;

            console.log('Client update received:', data);
            this.data();
        });
    }

    highlightItem = (items, index) => {

        items.forEach((item, i) => {
            if (i === index) {
                item.style.backgroundColor = 'var(--primary-color)';
                item.style.color = 'white';
                item.classList.add('active');
            } else {
                item.style.backgroundColor = ''; // Reset color
                item.style.color = '';
                item.classList.remove('active');
            }
        });
    }
}