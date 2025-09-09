import { getAddresses } from "../../api/get_addresses.js";
import { __html, attr } from "../../helpers/global.js";

/**
 * A contact search component that provides autocomplete functionality for searching addresses.
 * Example, in the orders journal.
 * 
 * @class ClientAddressSearch
 */
export class ClientAddressSearch {

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

        document.querySelector('client-address-search').innerHTML = `
            <div class="autocomplete-container position-relative">
                <div class="input-group input-group-sm autocomplete-container position-relative mb-2">       
                    <input type="text" class="form-control form-control-sm" id="address" autocomplete="nope" placeholder="${__html('Address')}" value="${attr(this.order.address || '')}" tabindex="2">
                </div>
                <div id="addressSuggestion" class="autocomplete-suggestions position-absolute w-100 bg-white border border-top-0 shadow-sm d-none" style="max-height: 300px; overflow-y: auto; z-index: 1000;"></div>
            </div>
            `;
    }

    data = () => {

        this.eid = document.getElementById('clientFilter').dataset._id || this.eid;

        getAddresses({ id: this.eid }, (response) => {

            if (response && response.addresses) {
                this.addresses = response.addresses;
            } else {
                this.addresses = [];
            }
        });
    }

    listeners = () => {

        self = this;

        const addressInput = document.getElementById('address');
        const suggestions = document.getElementById('addressSuggestion');

        let loadSuggestions = (value) => {

            const filtered = this.addresses?.filter(address =>
                address.address.toLowerCase().includes(value)
            );

            suggestions.innerHTML = filtered.map((address, i) =>
                `<div class="autocomplete-item p-2 border-bottom cursor-pointer" data-i="${i}" data-id="${address.id}" style="cursor: pointer;"><div data-i="${i}" data-id="${address.id}">${address.address}</div></div>`
            ).join('');
        }

        addressInput.addEventListener('blur', (e) => {

            setTimeout(() => {
                suggestions.classList.add('d-none');
            }, 500);
        });

        addressInput.addEventListener('focus', (e) => {

            const value = e.target.value.toLowerCase();

            loadSuggestions(value);

            suggestions.classList.remove('d-none');
        });

        addressInput.addEventListener('input', (e) => {

            const value = e.target.value.toLowerCase();

            loadSuggestions(value);

            suggestions.classList.remove('d-none');
        });

        // Handle suggestion clicks
        suggestions.addEventListener('click', (e) => {

            e.preventDefault();

            const i = e.target.dataset.i;

            // console.log('Input contact search value:', i, this.addresses[i]);

            const address = this.addresses.find(address => address.id === e.target.dataset.id);

            console.log('Suggestion clicked:', e.target.dataset.id, address);

            document.getElementById('address').value = address.address;

            suggestions.classList.add('d-none');
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {

            if (!addressInput.contains(e.target) && !suggestions.contains(e.target)) {
                // console.log('Suggestion clicked:', e.target);
                suggestions.classList.add('d-none');
            }
        });

        // Handle keyboard navigation
        addressInput.addEventListener('keydown', (e) => {

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
                    addressInput.value = activeItem.textContent;
                    addressInput.dataset._id = activeItem.dataset._id;
                    suggestions.classList.add('d-none');
                    // console.log('emit:client:search:refresh:1');
                    // bus.emit('contact:search:refresh', { _id: activeItem.dataset._id, name: addressInput.value });
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.add('d-none');
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                // Check if input becomes empty after the key is processed
                setTimeout(() => {
                    if (addressInput.value.trim() === '') {
                        // console.log('emit:client:search:refresh:2');
                        // bus.emit('contact:search:refresh', { _id: '', name: '' });
                    }
                }, 0);
            }
        });

        // bus.on('client:removed', (data) => {

        //     this.eid = '';

        //     console.log('ClientAddressSearch removed received:', data);
        //     this.data();
        // });

        // bus.clear('contact:search:refresh');
        // bus.on('contact:search:refresh', (data) => {

        //     this.eid = data._id;

        //     console.log('ClientAddressSearch search received:', data);
        //     this.data();
        // });

        // bus.clear('client:updated');
        // bus.on('client:updated', (data) => {

        //     this.eid = data._id;

        //     console.log('ClientAddressSearch update received:', data);
        //     this.data();
        // });
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