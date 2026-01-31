import { __html, attr, html, onChange, onClick, onKeyUp, onlyNumbers, priceFormat, toast } from "../../helpers/global.js";
import { TAX_REGIMES } from "../../helpers/tax/regimes.js";
import { ProductPriceVariations } from "./product_price_variations.js";

export class ProductPrice {

    constructor(product, settings) {

        this.product = product;
        this.settings = settings;

        this.state = {};

        this.state.proceCoatings = [];

        this.productPriceVariations = new ProductPriceVariations(this.product, this.settings);

        this.init();
    }

    init() {

        this.view();

        this.bind();

        this.priceContVisibility();

        this.listeners();
    }

    view() {

        let self = this;

        document.querySelector('product-price').innerHTML = `
            <h4 id="product-price" class="card-title pt-0 mb-3">${__html('Price')}</h4>
            <div class="mb-3 mw">
                <label class="form-label d-none" for="calc_price">${__html('Calculate price')}</label>
                <select id="calc_price" class="form-select inp" >
                    <option value="variable">${__html('By variation')}</option>
                    <option value="sketch">${__html('By sketch')}</option>
                    <option value="formula">${__html('By formula')}</option>
                    <option value="complex">${__html('Complex product')}</option>
                </select>
                <p class="form-text"> </p>
            </div>
            <div class="mb-3 mw variable_prices_cont">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <input type="hidden" id="price" value="" />
                    <button class="btn btn-sm btn-outline-primary btn-view-variations " type="button">
                        ${__html('Variations')}
                    </button>
                    <div class="ms-3 po copy-price-variations" title="${__html('Copy price variations')}"> 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
                        </svg>
                    </div>
                </div>
                <p class="form-text d-none">${__html('Override default prices by clicking on the button above.')}</p>
            </div>
            <div class="mb-3 mw formula_cont d-none">
                <label class="form-label" for="formula">${__html('Square footage')}</label>
                <input id="formula" type="text" class="form-control inp" placeholder="${__html('(A + B) * L')}">
                <p class="form-text formula-hint">${__html('Square footage formula to calculate price.')}</p>
            </div>
            <div class="mb-3 mw fwl_cont">
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label" for="formula">${__html('Width')}</label>
                        <input id="formula_width" type="text" class="form-control inp" placeholder="${__html('A + B + C')}">
                        <p class="form-text formula_width-hint d-none">${__html('Product width in mm.')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="formula">${__html('Length')}</label>
                        <input id="formula_length" type="text" class="form-control inp" placeholder="${__html('L')}">
                        <p class="form-text formula_length-hint d-none">${__html('Product length in mm.')}</p>
                    </div>
                </div>
            </div>
            <div class="mb-3 mw formula_price_cont d-none">
                <div class="d-flex justify-content-start flex-row">
                    <div class="me-3">
                        <label class="form-label" for="color_coating">${__html('Coating')}</label>
                        <select class="form-select color-coating-price" name="price_parent- " data-type="select">
                        ${this.settings.price.map((price, i) => {

            let option = this.state.proceCoatings.includes(price.parent) || price.parent.length == 0 ? '' : `<option value="${attr(price.price)}" >${html(price.parent) + " " + priceFormat(self, price.price)}</option>`

            this.state.proceCoatings.push(price.parent);

            return option;

        }).join('')
            }
                        </select>
                    </div>
                    <div class="me-3">
                        <label class="form-label" for="material_cost">${__html('Material cost')}</label>
                        <input id="material_cost" type="text" disabled class="form-control inp" style="max-width: 90px;" placeholder="${__html('')}">
                    </div>
                    <div>
                        <label class="form-label" for="formula_price">${__html('Additional cost')}</label>
                        <input id="formula_price" type="text" class="form-control inp" placeholder="${__html('B>1000?1.80:0.90')}">
                    </div>
                </div>
                <p class="form-text formula_price-hint">${__html('Final price = Material cost + Additional cost.')}</p>
            </div>
            <div class="mb-3 mw parts_cont d-none">
                <h4 id="parts-h" class="card-title mb-3">${__html('Parts')}</h4>
                <textarea id="parts" class="form-control mw" name="parts" rows="6" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                <p class="form-text formula_price">${__html('Provide one product ID per line.')}</p>
            </div>

            <div class="mb-3 mw">
                <label class="form-label" for="tax_regime">${__html('Tax regime')}</label>
                <select id="tax_regime" class="form-select inp" name="tax_regime" data-type="select">
                    ${Object.entries(TAX_REGIMES).map(([key, regime]) => {
                if (regime.country !== self.settings.tax_region) return '';
                return `<option value="${attr(key)}" data-rate="${attr(regime.rate)}" data-code="${attr(regime.peppolCode)}" ${self.product.tax_regime === key ? 'selected' : ''}>${html(regime.description)}</option>`;
            }).join('')}
                </select>
                <p class="form-text">${__html('Select applicable tax regime for this product.')}</p>
            </div>

            <div class="mb-3 mw ">
                <label class="form-label" for="tax_id">${__html('Tax ID')}</label>
                <input id="tax_id" class="form-control inp tax_id" name="tax_id" type="text" value="0" data-type="text">
                <p class="form-text">${__html('Tax code for 0 VAT rates.')}</p>
            </div>
        `;
    }

    bind() {

        let self = this, d = document;

        // variable prices
        d.querySelector("#price").value = JSON.stringify(self.product.var_price ? self.product.var_price : []);

        // calculate prce
        d.querySelector("#calc_price").value = self.product.calc_price ? self.product.calc_price : 'default';

        // formula
        d.querySelector("#formula").value = self.product.formula;
        d.querySelector("#formula_price").value = self.product.formula_price;
        d.querySelector("#formula_width").value = self.product.formula_width;
        d.querySelector("#formula_length").value = self.product.formula_length;
        d.querySelector("#tax_id").value = self.product.tax_id;

        // parts
        if (self.product.parts)
            document.querySelector('#parts').value = self.product.parts.length ? self.product.parts.map(kw => kw.id).join('\n') : "";
    }

    listeners() {

        let self = this, d = document;

        // sketch btn group event
        onChange('#calc_price', e => { self.priceContVisibility(); });

        // update price
        onKeyUp('.price-price', e => { self.updatePrice(e); });

        // price public
        onClick('.price-public', e => { self.publicPrice(e); });

        // view variations
        onClick(".btn-view-variations", e => { self.productPriceVariations.show(); });

        // copy price variatons
        onClick(".copy-price-variations", e => { navigator.clipboard.writeText(document.querySelector('#price').value); toast("Copied"); });

        // validate formula
        d.querySelector("#formula").addEventListener('keyup', (e) => {

            // let formula = e.currentTarget.value;
            let labels = self.getLabels("#formula");

            let result = 0;

            try {

                d.querySelector(".formula-hint").innerHTML = '';
                result = eval(self.getFormula("#formula"));
                d.querySelector("#formula").setCustomValidity("");
            } catch (e) {

                d.querySelector("#formula").setCustomValidity(__html("Invalid formula"));
                d.querySelector(".formula-hint").innerHTML = __html("Invalid formula. Use one of the following letters only: " + labels);
            }

            d.querySelector("#formula").parentElement.classList.add('was-validated');

            if (result > 0) d.querySelector(".formula-hint").innerHTML = __html("Result: <b>" + result / 1000000 + " ㎡</b> based on the input fields default values", result);
        });

        // validate formula price
        d.querySelector("#formula_price").addEventListener('keyup', (e) => {

            self.renderPrice();
        });

        d.querySelector(".color-coating-price").addEventListener('change', (e) => {

            // console.log(self.getFormula("#formula"));
            d.querySelector("#material_cost").value = priceFormat(self, self.getMaterialCost());

            self.renderPrice();
        });

        // validate formula width
        d.querySelector("#formula_width").addEventListener('keyup', (e) => {

            let formula = e.currentTarget.value;
            let labels = " ";

            for (let div of d.querySelectorAll('.input-fields > div')) {

                labels += div.querySelector('.field-label').value + " ";
                formula = formula.replaceAll(div.querySelector('.field-label').value, parseFloat(div.querySelector('.field-default').value));
            }

            labels = labels.trim();

            let result = 0;

            try {
                d.querySelector(".formula_width-hint").innerHTML = '';
                result = eval(formula);
                d.querySelector("#formula_width").setCustomValidity("");
            } catch (e) {

                console.log(e);
                d.querySelector("#formula_width").setCustomValidity(__html("Invalid width formula"));
                d.querySelector(".formula_width-hint").innerHTML = __html("Invalid width formula. Use one of the following letters only: " + labels);
            }

            d.querySelector("#formula_width").parentElement.classList.add('was-validated');
        });

        // validate formula length
        d.querySelector("#formula_length").addEventListener('keyup', (e) => {

            let formula = e.currentTarget.value;
            let labels = " ";

            for (let div of d.querySelectorAll('.input-fields > div')) {

                labels += div.querySelector('.field-label').value + " ";
                formula = formula.replaceAll(div.querySelector('.field-label').value, parseFloat(div.querySelector('.field-default').value));
            }

            labels = labels.trim();

            let result = 0;

            try {
                d.querySelector(".formula_length-hint").innerHTML = '';
                result = eval(formula);
                d.querySelector("#formula_length").setCustomValidity("");
            } catch (e) {

                console.log(e);
                d.querySelector("#formula_length").setCustomValidity(__html("Invalid length formula"));
                d.querySelector(".formula_length-hint").innerHTML = __html("Invalid length formula. Use one of the following letters only: " + labels);
            }

            d.querySelector("#formula_length").parentElement.classList.add('was-validated');
        });

        self.renderPrice();

        d.querySelector("#material_cost").value = priceFormat(self, self.getMaterialCost());
    }

    addPrice(e) {

        let obj = {}

        obj.id = document.querySelector('.price-id').value; // document.querySelector('.price-id').value = '';
        obj.title = document.querySelector('.price-title').value; document.querySelector('.price-title').value = '';
        obj.parent = document.querySelector('.price-parent').value; // document.querySelector('.price-parent').value = '';
        obj.price = document.querySelector('.price-price').value; // document.querySelector('.price-price').value = '';
        obj.unit = document.querySelector('.price-unit').value; // document.querySelector('.price-unit').value = '';
        obj.public = true;

        if (obj.title.length < 1 || obj.price.length < 1) return false;

        let prices = document.querySelector('#price').value;

        // console.log(prices);

        if (prices) { prices = JSON.parse(prices); } else { prices = []; }
        if (Array.isArray(prices)) { prices.push(obj); } else { prices = []; }
        document.querySelector('#price').value = JSON.stringify(prices);

        if (document.querySelector('.price-table > tbody [data-parent="' + obj.parent + '"]:last-child')) {
            document.querySelector('.price-table > tbody [data-parent="' + obj.parent + '"]:last-child').insertAdjacentHTML("afterend", self.structCoatingRow(obj, prices.length - 1));
        } else {
            document.querySelector('.price-table').insertAdjacentHTML("beforeend", self.structCoatingRow(obj, prices.length - 1));
        }

        // add price listener
        onClick('.remove-price', e => { self.removePrice(e); });

        // only nums for price
        onlyNumbers(".price-price", [8, 46]);

        // update price
        onKeyUp('.price-price', e => { self.updatePrice(e); });

        // price public 
        onClick('.price-public', e => { self.publicPrice(e); });
    }

    priceContVisibility() {

        document.querySelector('.formula_cont').classList.add("d-none");
        document.querySelector('.formula_price_cont').classList.add("d-none");
        document.querySelector('.parts_cont').classList.add("d-none");
        // document.querySelector('.variable_prices_cont').classList.add("d-none");

        let calc_price = document.querySelector('#calc_price').value;

        if (calc_price == "variable") {

            // document.querySelector('.variable_prices_cont').classList.remove("d-none");
        }

        if (calc_price == "formula") {

            document.querySelector('.formula_cont').classList.remove("d-none");
            document.querySelector('.formula_price_cont').classList.remove("d-none");
        }

        if (calc_price == "complex") {

            document.querySelector('.parts_cont').classList.remove("d-none");
        }
    }

    removePrice(e) {

        e.preventDefault();

        let c = confirm(__html('Remove this record?'));

        if (!c) return;

        let hash = e.currentTarget.parentElement.parentElement.dataset.hash;

        let prices = JSON.parse(document.querySelector('#price').value);

        prices = prices.filter((obj) => { return escape(obj.id + obj.title + obj.parent) != hash });

        document.querySelector('#price').value = JSON.stringify(prices);

        e.currentTarget.parentElement.parentElement.remove();
    }

    updatePrice(e) {

        e.preventDefault();

        let hash = (e.currentTarget.parentElement.parentElement.parentElement.dataset.hash);

        if (!hash) return;

        let prices = JSON.parse(document.querySelector('#price').value);

        prices.forEach((obj, i) => { if (escape(obj.id + obj.title + obj.parent) == hash) { prices[i].price = e.currentTarget.value; } });

        document.querySelector('#price').value = JSON.stringify(prices);

    }

    getFormula(sel) {

        let self = this, d = document;

        let formula = d.querySelector(sel).value;

        // console.log('getFormula', formula);
        // return;

        // selected coating price
        formula = formula.replaceAll("COATING", parseFloat(document.querySelector(".color-coating-price").value));
        formula = formula.replaceAll("M2", d.querySelector("#formula").value + "/1000000");

        for (let price of self.settings.price) {

            if (price.id.length == 0) continue;

            formula = formula.replaceAll(price.id, parseFloat(price.price));
        }

        for (let div of d.querySelectorAll('.input-fields > div')) {

            formula = formula.replaceAll(div.querySelector('.field-label').value, parseFloat(div.querySelector('.field-default').value));
        }

        let result = 0;

        try {

            result = eval(formula);
        } catch (e) {

        }

        return formula;
    }

    getMaterialCost() {

        let res = 0;
        try {
            res = Math.round((parseFloat(document.querySelector(".color-coating-price").value) * eval(this.getFormula("#formula")) / 1000000) * 100) / 100;

        } catch (e) {
            console.log(e);
        }

        return res;
    }

    getLabels() {

        let d = document;
        let labels = "COATING MARGIN M2 ";

        for (let div of d.querySelectorAll('.input-fields > div')) {

            labels += div.querySelector('.field-label').value + " ";
        }
        labels = labels.trim();

        return labels;
    }

    renderPrice() {

        let self = this, d = document, cost = 0, markup = 0;

        try {

            d.querySelector(".formula_price-hint").innerHTML = '';
            markup = eval(self.getFormula("#formula_price"));
            cost = self.getMaterialCost();
            d.querySelector("#formula_price").setCustomValidity("");

            if (markup > 0) d.querySelector(".formula_price-hint").innerHTML = __html("Final price: <b>%1$</b> based on the input fields default values", priceFormat(self, cost + markup));
        } catch (e) {

            console.log(e);

            d.querySelector("#formula_price").setCustomValidity(__html("Invalid formula"));
            d.querySelector(".formula_price-hint").innerHTML = __html("Invalid formula. Use one of the following letters only: " + self.getLabels());
        }

        d.querySelector("#formula_price").parentElement.classList.add('was-validated');
    }

    publicPrice(e) {

        let hash = (e.currentTarget.parentElement.parentElement.dataset.hash);

        let prices = JSON.parse(document.querySelector('#price').value);

        prices.forEach((obj, i) => { if (escape(obj.id + obj.title + obj.parent) == hash) { prices[i].public = e.currentTarget.checked ? true : false; } });

        document.querySelector('#price').value = JSON.stringify(prices);
    }
}