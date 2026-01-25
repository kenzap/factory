import { getClientSuggestions } from "../../api/get_client_suggestions.js";
import { __html, attr, onClick } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

/**
 * A client search component that provides autocomplete functionality for searching clients.
 * Example, in the orders journal.
 * 
 * @class ClientSearch 
 */
export class ClientOrderSearch {

    constructor(order) {

        this.order = order;

        this.init();
    }

    init = () => {

        // this.data();

        this.view();

        this.listeners();
    }

    view = () => {

        document.querySelector('client-order-search').innerHTML = `
            <div class="autocomplete-container position-relative">
                <div class="input-group input-group-ss autocomplete-container position-relative mb-2">       
                    <input type="text" class="form-control form-control-ss d-none-" id="clientFilter" placeholder="${__html('Search client...')}" autocomplete="off" value="${attr(this.order?.name || '')}" data-_id="${this.order?.eid || ''}" tabindex="1" >
                    <button class="btn btn-outline-primary edit-client-btn po" type="button" id="editClientBtn" >
                        <i class="bi bi-arrow-right"></i>
                    </button>
                </div>
                <div id="clientSuggestions" class="autocomplete-suggestions position-absolute w-100 bg-white border border-top-0 shadow-ss d-none" style="max-height: 300px; overflow-y: auto; z-index: 1000;"></div>
            </div>
            `;
    }

    listeners = () => {

        self = this;

        const clientInput = document.getElementById('clientFilter');
        const suggestions = document.getElementById('clientSuggestions');

        clientInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();

            if (value.length === 0) {
                suggestions.classList.add('d-none');
                return;
            }

            getClientSuggestions({ s: value }, (response) => {

                // console.log('Clients response:', response);
                if (response && response.clients) {
                    this.clients = response.clients;
                    if (this.clients.length > 0) {
                        suggestions.innerHTML = this.clients.map(client => {
                            let name = client.name;
                            if (client.entity == 'individual' && client.fname && client.lname) {
                                name = (client.lname || '') + ' ' + (client.fname || '');
                            }

                            console.log('Client name:', client.name);
                            return `<div class="autocomplete-item p-2 border-bottom cursor-pointer" data-_id="${client._id}" data-address="${attr(client.address)}" style="cursor: pointer;">${name}</div>`
                        }).join('');
                        suggestions.classList.remove('d-none');

                        // Reset scroll position and remove any active states
                        suggestions.scrollTop = 0;
                        const items = suggestions.querySelectorAll('.autocomplete-item');
                        items.forEach(item => {
                            item.style.backgroundColor = '';
                            item.style.color = '';
                            item.classList.remove('active');
                        });
                    } else {
                        suggestions.classList.add('d-none');
                    }
                } else {
                    this.clients = [];
                }
            });
        });


        // Handle suggestion clicks
        suggestions.addEventListener('click', (e) => {
            const addressInput = document.getElementById('address');
            if (e.target.classList.contains('autocomplete-item')) {
                clientInput.value = e.target.textContent;
                addressInput.value = e.target.dataset.address || '';
                clientInput.dataset._id = e.target.dataset._id;
                suggestions.classList.add('d-none');
                // console.log('emit:client:search:refresh:4');
                bus.emit('client:search:refresh', { _id: e.target.dataset._id, name: clientInput.value });
                bus.emit('contact:search:refresh', { _id: e.target.dataset._id, name: clientInput.value });
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!clientInput.contains(e.target) && !suggestions.contains(e.target)) {
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
                    console.log('Current Index:', currentIndex);
                    this.highlightItem(items, currentIndex);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeItem) {
                    const addressInput = document.getElementById('address');
                    clientInput.value = activeItem.textContent;
                    addressInput.value = activeItem.dataset.address || '';
                    clientInput.dataset._id = activeItem.dataset._id;
                    suggestions.classList.add('d-none');
                    // console.log('emit:client:search:refresh:1');
                    bus.emit('client:search:refresh', { _id: activeItem.dataset._id, name: clientInput.value });
                    bus.emit('contact:search:refresh', { _id: activeItem.dataset._id, name: clientInput.value });
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.add('d-none');
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                // Check if input becomes empty after the key is processed
                setTimeout(() => {
                    if (clientInput.value.trim() === '') {
                        // console.log('emit:client:search:refresh:2');
                        bus.emit('client:search:refresh', { _id: '', name: '' });
                        bus.emit('contact:search:refresh', { _id: '', name: '' });
                    }
                }, 0);
                // normal keyboard input, reset ids
            } else {

                clientInput.dataset._id = "";

                console.log("current value ", clientInput.value);
            }
        });

        onClick('.edit-client-btn', (e) => {

            const clientName = clientInput.value.trim();

            if (clientName.length > 0 && clientInput.dataset._id) {

                // client name entered and selected from suggestion list
                bus.emit('client:search:refresh', { _id: clientInput.dataset._id, name: clientName });
                bus.emit('contact:search:refresh', { _id: clientInput.dataset._id, name: clientName });

            } else if (clientName.length > 0 && clientInput.dataset._id === "") {

                // client name entered but not selected from suggestion list, try to match
                this.clients.forEach(client => {

                    if (clientInput.value.trim() === client.name) {

                        bus.emit('client:search:refresh', { _id: client._id, name: client.name });
                    }
                });

                // no client match
                bus.emit('client:search:refresh', { _id: '', name: '' });
                bus.emit('contact:search:refresh', { _id: '', name: '' });

            } else {

                // no client name entered
                bus.emit('client:search:refresh', { _id: '', name: '' });
                bus.emit('contact:search:refresh', { _id: '', name: '' });
            }
        });
    }

    highlightItem = (items, index) => {

        items.forEach((item, i) => {
            if (i === index) {
                item.style.backgroundColor = 'var(--primary-color)';
                item.style.color = 'white';
                item.classList.add('active');

                // Scroll the active item into view
                const suggestionsContainer = document.getElementById('clientSuggestions');
                const itemTop = item.offsetTop;
                const itemHeight = item.offsetHeight;
                const containerScrollTop = suggestionsContainer.scrollTop;
                const containerHeight = suggestionsContainer.clientHeight;

                // Check if item is above visible area
                if (itemTop < containerScrollTop) {
                    suggestionsContainer.scrollTop = itemTop;
                }
                // Check if item is below visible area
                else if (itemTop + itemHeight > containerScrollTop + containerHeight) {
                    suggestionsContainer.scrollTop = itemTop + itemHeight - containerHeight;
                }

            } else {
                item.style.backgroundColor = ''; // Reset color
                item.style.color = '';
                item.classList.remove('active');
            }
        });
    }

}