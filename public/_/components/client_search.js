import { getClientSuggestions } from "/_/api/get_client_suggestions.js";
import { __html } from "/_/helpers/global.js";
import { bus } from "/_/modules/bus.js";

/**
 * A client search component that provides autocomplete functionality for searching clients.
 * Example, in the orders journal.
 * 
 * @class ClientSearch
 */
export class ClientSearch {

    constructor() {

        this.init();
    }

    init = () => {

        this.data();

        this.view();

        this.listeners();
    }

    view = () => {

        document.querySelector('client-search').innerHTML = `
            <label class="form-label d-none">${__html('Client:')}</label>
            <div class="autocomplete-container position-relative">
                <input 
                    type="text" 
                    class="form-control" 
                    id="clientFilter" 
                    placeholder="Search or enter client name..."
                    autocomplete="off"
                >
                <div id="clientSuggestions" class="autocomplete-suggestions position-absolute w-100 bg-white border border-top-0 shadow-sm d-none" style="max-height: 200px; overflow-y: auto; z-index: 1000;"></div>
            </div>
        `;
    }

    data = () => {

        getClientSuggestions((response) => {

            console.log('Clients response:', response);
            if (response && response.clients) {
                this.clients = response.clients;
            } else {
                this.clients = [];
            }
        });
    }

    listeners = () => {

        self = this;

        const clientInput = document.getElementById('clientFilter');
        const suggestions = document.getElementById('clientSuggestions');

        // Hardcoded client list for testing
        // const hardcodedClients = [
        //     'ABC Manufacturing Corp',
        //     'XYZ Industries Ltd',
        //     'Global Solutions Inc',
        //     'TechnoWorks Company',
        //     'Premium Parts Ltd',
        //     'Industrial Systems Corp',
        //     'Advanced Materials Inc',
        //     'Quality Components Ltd',
        //     'Precision Manufacturing',
        //     'Elite Products Group'
        // ];

        clientInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();

            if (value.length === 0) {
                suggestions.classList.add('d-none');
                return;
            }

            const filtered = this.clients.filter(client =>
                client.name.toLowerCase().includes(value)
            );

            if (filtered.length > 0) {
                suggestions.innerHTML = filtered.map(client =>
                    `<div class="autocomplete-item p-2 border-bottom cursor-pointer" style="cursor: pointer;">${client.name}</div>`
                ).join('');
                suggestions.classList.remove('d-none');
            } else {
                suggestions.classList.add('d-none');
            }
        });

        // Handle suggestion clicks
        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('autocomplete-item')) {
                clientInput.value = e.target.textContent;
                suggestions.classList.add('d-none');
                this.applyFilters();
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
                    this.highlightItem(items, currentIndex);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeItem) {
                    clientInput.value = activeItem.textContent;
                    suggestions.classList.add('d-none');
                    bus.emit('table:refresh', { name: clientInput.value });
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.add('d-none');
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                // Check if input becomes empty after the key is processed
                setTimeout(() => {
                    if (clientInput.value.trim() === '') {
                        bus.emit('table:refresh', { name: '' });
                    }
                }, 0);
            }
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