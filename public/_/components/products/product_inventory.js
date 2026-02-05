// import Quill from 'quill';
// import QuillTableBetter from 'quill-table-better';
import { __html, attr, makeNumber, onClick } from "../../helpers/global.js";

export class ProductInventory {

    constructor(product, locales, settings) {

        this.product = product;
        this.locales = locales;
        this.settings = settings;

        if (!this.product['stock']) this.product['stock'] = { management: false, sku: "", qty: 0, low_threshold: 0 };

        this.view();

        this.bind();
    }

    view() {

        document.querySelector('product-inventory').innerHTML = `
            <div class="mb-3 mw">
                <h4 id="h-inventory" class="card-title">${__html('Inventory')}</h4>
                <div class="mb-3 mw">
                    <div style="clear:both;margin-top:16px;"></div>
                    <label class="form-label" for="stock-category">${__html('Stock categories')}</label>
                    <select id="stock-category" class="form-select" name="stock-category" data-type="select" multiple style="height: auto; min-height: 200px;">
                    ${this.settings.stock_categories ? this.settings.stock_categories.map(cat =>
            `<option value="${attr(cat.id)}" ${Array.isArray(this.product['stock']['category']) && this.product['stock']['category'].includes(cat.id) ? "selected='true'" : ""}">${__html(cat.name)}</option>`
        ).join('') : ''}
                    </select>
                    <p class="form-text">${__html('Assign one or more stock categories by holding Ctrl/Cmd.')}</p>
                </div>
            </div>

            <div class="mb-3 mw">
                <div class="form-check">
                    <input id="stock_management" class="form-check-input stock-management" name="stock_management" type="checkbox" value="0" data-type="checkbox">
                    <label class="form-check-label" for="stock_management">
                        ${__html('Stock management')}
                    </label>
                </div>
                <p class="form-text">${__html('Enable inventory management.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="sku_number">${__html('SKU number')}</label>
                <input id="sku_number" type="text" class="form-control" placeholder="BRA-RNBW-BLK-3X">
                <p class="form-text">${__html('Stock keeping unit - a unique alphanumeric code that retailers assign to each product and its variations to internally track inventory.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="gtin_number">${__html('GTIN number')}</label>
                <input id="gtin_number" type="text" class="form-control" placeholder="4006381333930">
                <p class="form-text">${__html('Global trade item number - a unique, globally recognized product identifier that helps track trade items (products or services) throughout the supply chain.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="mpn_number">${__html('MPN number')}</label>
                <input id="mpn_number" type="text" class="form-control" placeholder="00638HAY">
                <p class="form-text">${__html('Manufacturer part number - a unique alphanumeric code assigned by a product manufacturer to identify a specific product or part.')}</p>
            </div>

            <div class="mb-3 mw stock-cont- d-none">
                <label class="form-label" for="stock_quantity">${__html('Stock quantity')}</label>
                <input id="stock_quantity" type="text" class="form-control" placeholder="0">
                <p class="form-text">${__html('Total number of products left.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="weight">${__html('Weight')}</label>
                <input id="weight" type="text" class="form-control" placeholder="0">
                <p class="form-text">${__html('Product weight in kgs or lbs.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="stock_low_threshold">${__html('Low stock')}</label>
                <input id="stock_low_threshold" type="text" class="form-control" placeholder="0">
                <p class="form-text">${__html('Low stock threshold to trigger a notification.')}</p>
            </div>
        `;
    }

    getStockData() {

        return {
            management: document.querySelector('#stock_management').checked,
            sku: document.querySelector('#sku_number').value,
            gtin: document.querySelector('#gtin_number').value,
            mpn: document.querySelector('#mpn_number').value,
            qty: document.querySelector('#stock_quantity').value,
            weight: document.querySelector('#weight').value,
            low_threshold: document.querySelector('#stock_low_threshold').value,
            category: Array.from(document.querySelector('#stock-category').selectedOptions).map(option => option.value)
        };
    }

    bind() {

        const d = document;

        for (let el of document.querySelectorAll('.stock-cont')) { this.product['stock']['management'] == true ? el.classList.remove('d-none') : el.classList.add('d-none'); }
        document.querySelector('#sku_number').value = this.product['stock']['sku'] ? this.product['stock']['sku'] : "";
        document.querySelector('#gtin_number').value = this.product['stock']['gtin'] ? this.product['stock']['gtin'] : "";
        document.querySelector('#mpn_number').value = this.product['stock']['mpn'] ? this.product['stock']['mpn'] : "";
        if (this.product['stock']['category'] && Array.isArray(this.product['stock']['category'])) {
            const selectElement = document.querySelector('#stock-category');
            this.product['stock']['category'].forEach(categoryId => {
                const option = selectElement.querySelector(`option[value="${categoryId}"]`);
                if (option) option.selected = true;
            });
        }
        document.querySelector('#stock_management').checked = this.product['stock']['management']; //  == "1" ? true: false;
        document.querySelector('#stock_quantity').value = this.product['stock']['qty'] ? makeNumber(this.product['stock']['qty']) : 0;
        document.querySelector('#weight').value = this.product['stock']['weight'] ? parseFloat(this.product['stock']['weight']).toFixed(3).replace(/\.?0+$/, '') : 0;
        document.querySelector('#stock_low_threshold').value = this.product['stock']['low_threshold'] ? makeNumber(this.product['stock']['low_threshold']) : 0;

        onClick('.stock-management', (e) => {

            for (let el of document.querySelectorAll('.stock-cont')) {

                e.currentTarget.checked ? el.classList.remove('d-none') : el.classList.add('d-none');
                e.currentTarget.value = e.currentTarget.checked ? "1" : "0";
            }
        });
    }
}