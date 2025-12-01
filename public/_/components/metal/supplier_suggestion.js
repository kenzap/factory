import { __html } from "../../helpers/global.js";

/**
 * A contact search component that provides autocomplete functionality for searching addresses.
 * Example, in the orders journal.
 * 
 * @class ClientAddressSearch
 */
export class SupplierSuggestion {

    constructor(o, cb) {

        this.records = o.records || [];
        this.cb = cb;

        this.init();
    }

    init = () => {

        this.view();

        this.listeners();
    }

    view = () => {

        document.querySelector('supplier-suggestion').innerHTML = `
            <label for="supplier" class="form-label d-none">${__html('Supplier')}</label>
            <div class="position-relative">
                <input type="text" class="form-control border-0" id="supplier" placeholder="${__html('Company AB')}" value="" autocomplete="off">
                <div id="supplierSuggestions" class="dropdown-menu position-absolute w-100" style="max-height: 200px; overflow-y: auto; display: none; z-index: 1000;"></div>
            </div>
            `;
    }

    listeners = () => {

        self = this;

        const supplierInput = document.getElementById('supplier');
        const suggestionsDiv = document.getElementById('supplierSuggestions');
        let selectedIndex = -1;

        supplierInput.addEventListener('input', (e) => {
            const query = e.currentTarget.value.toLowerCase().trim();
            selectedIndex = -1; // Reset selection when typing

            if (query.length === 0) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            // Get unique suppliers from records
            const suppliers = [...new Set(
                self.records
                    .filter(record => record.supplier && record.supplier.toLowerCase().includes(query))
                    .map(record => record.supplier)
            )];

            if (suppliers.length === 0) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            // Build suggestions HTML
            const suggestionsHTML = suppliers
                .slice(0, 10) // limit to first 10 suggestions
                .map((supplier, index) => `<a href="#" class="dropdown-item" data-supplier="${supplier}" data-index="${index}">${supplier}</a>`)
                .join('');

            suggestionsDiv.innerHTML = suggestionsHTML;
            suggestionsDiv.style.display = 'block';
        });

        // Handle keyboard navigation
        supplierInput.addEventListener('keydown', (e) => {
            const suggestions = suggestionsDiv.querySelectorAll('.dropdown-item');

            if (suggestions.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = (selectedIndex + 1) % suggestions.length;
                    updateSelection(suggestions);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
                    updateSelection(suggestions);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                        supplierInput.value = suggestions[selectedIndex].dataset.supplier;
                        this.cb({ supplier: supplierInput.value });
                        suggestionsDiv.style.display = 'none';
                        selectedIndex = -1;
                    }
                    break;
                case 'Escape':
                    suggestionsDiv.style.display = 'none';
                    selectedIndex = -1;
                    break;
            }
        });

        function updateSelection(suggestions) {
            suggestions.forEach((item, index) => {
                if (index === selectedIndex) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        // Handle suggestion clicks
        suggestionsDiv.addEventListener('click', function (e) {
            e.preventDefault();
            if (e.target.classList.contains('dropdown-item')) {
                supplierInput.value = e.target.dataset.supplier;
                this.cb({ supplier: e.target.dataset.supplier });
                suggestionsDiv.style.display = 'none';
                selectedIndex = -1;
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function (e) {
            if (!supplierInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    }
}