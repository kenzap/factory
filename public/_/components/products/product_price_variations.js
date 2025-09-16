import { __html, onChange, onClick, onKeyUp, onlyNumbers, randomString, toast } from "../../helpers/global.js";

/**
 * Handles creation, editing, and deletion of product price variations
 * 
 * @constructor
 * @param {Object} product - The product object containing variation data
 * @param {Array} product.var_price - Array of price variation objects
 * @param {Object} settings - Configuration settings for the component
 * @param {string} settings.var_parent - Parent variation options (newline separated)
 */
export class ProductPriceVariations {

    constructor(product, settings) {

        this.product = product;
        this.settings = settings;
        this.state = {};
        this.var_parent = this.settings.var_parent;
    }

    show() {

        let self = this;

        this.state.modal = document.querySelector(".modal");
        this.state.modalCont = new bootstrap.Modal(this.state.modal);
        this.state.modal.querySelector(".modal-dialog").classList.add('modal-xl');
        this.state.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-save-variations d-none">${__html('Save')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
        `;

        this.state.modal.querySelector(".modal-title").innerHTML = `
            <div class="d-flex align-items-center">
                ${__html("Variations")}
                <div class="ms-2 po d-none"> 
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
                    </svg>
                </div>
            </div>`;

        this.view();

        // price variations
        let parent_options = '<option value="">' + __html('None') + '</option>';
        if (Array.isArray(this.product.var_price)) {

            // console.log("this.product.var_price", this.product.var_price);

            // pricing row parent
            this.product.var_price.forEach((o, i) => {

                // defaults
                if (!o.id) o.id = randomString(6);
                if (!o.code) o.code = "";

                document.querySelector('.price-table > tbody').insertAdjacentHTML("beforeend", self.structCoatingRow(o, i));
            });

            // // pricing row
            // this.product.var_price.forEach((price, i) => {

            //     if (price.parent) {

            //         if (document.querySelector('.price-table > tbody [data-parent="' + price.parent + '"]')) {
            //             document.querySelector('.price-table > tbody [data-parent="' + price.parent + '"]').insertAdjacentHTML("afterend", self.structCoatingRow(price, i)); // :last-child
            //         } else {
            //             document.querySelector('.price-table > tbody').insertAdjacentHTML("beforeend", self.structCoatingRow(price, i));
            //         }
            //     }
            // });

        } else {
            this.product.var_price = [];
        }

        console.log("this.var_parent", this.var_parent);

        this.var_parent.split('\n').forEach(el => {

            parent_options += '<option value="' + el + '">' + el + '</option>';
        });
        document.querySelector('.price-parent').innerHTML = parent_options;

        // init modal listeners
        this.listeners();

        // view modal
        this.state.modalCont.show();

        // simulate click to enable Paste event handling
        // setTimeout(() => { simulateClick(document.querySelector('.p-modal .modal-header')); }, 2000);
    }

    view() {

        this.state.modal.querySelector(".modal-body").innerHTML = `

            <div class="row">
                <div class="col-sm-12">
                    <div class="table-responsive">
                        <table class="price-table order-form mb-3">
                            <theader>
                                <tr><th><div class="me-1 me-sm-3">${__html('Portal')}</div></th><th class="qty"><div class="me-1 me-sm-3">${__html('Code')}</div></th><th><div class="me-1 me-sm-3">${__html('P1')}</div></th><th><div class="me-1 me-sm-3">${__html('P2')}</div></th><th class="tp"><div class="me-1 me-sm-3">${__html('Price')}</div></th><th class="tp"><div class="me-1 me-sm-3">${__html('Stock')}</div></th><th class="tp"><div class="me-1 me-sm-3">${__html('Unit')}</div></th><th></th></tr>
                                <tr class="new-item-row">
                                    <td>
        
                                    </td>
                                    <td class="tp">
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control price-id" style="max-width:100px;">
                                        </div>
                                    </td>
                                    <td>
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control price-parent" style="max-width:120px;">
                                            <select class="form-select price-parent- inp d-none" name="price_parent- " data-type="select">
        
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" placeholder="" class="form-control price-title" data-id="" data-index="" list="item-suggestions">
                                        </div>
                                    </td>
                                    <td class="price">
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control text-right price-price" style="max-width:80px;">
                                        </div>
                                    </td>
                                    <td class="stock">
                                        <div class="me-1 me-sm-3 mt-2">
                                            <input type="text" value="" autocomplete="off" class="form-control text-right price-stock" style="max-width:80px;">
                                        </div>
                                    </td>
                                    <td class="price">
                                        <div class="me-1 me-sm-3 mt-2">
                                            ${this.measurementUnit(-1, "pc")}
                                        </div>
                                    </td>
                                    <td class="align-middle text-center pt-2"> 
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24" class="bi bi-plus-circle text-success align-middle add-price po"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"></path></svg>
                                    </td>
                                </tr>
                            </theader>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    measurementUnit(i, value) {

        return `
            <select class="form-select price-unit inp" name="price_unit" data-type="select" data-i=${i}>
                <option value="pc" ${value == 'pc' ? "selected" : ""}>${__html('Piece')}</option>
                <option value="set" ${value == 'set' ? "selected" : ""}>${__html('Set')}</option>
                <option value="pair" ${value == 'pair' ? "selected" : ""} >${__html('Pair')}</option>
                <option value="m" ${value == 'm' ? "selected" : ""}>${__html('Meter')}</option>
                <option value="m2" ${value == 'm2' ? "selected" : ""}>${__html('㎡')}</option>
                <option value="hour ${value == 'hour' ? "selected" : ""}">${__html('Hour')}</option>
            </select>
            `;
    }

    addPrice(e) {

        let self = this;

        let obj = {}

        obj.id = document.querySelector('.price-id').value;
        obj.title = document.querySelector('.price-title').value.trim();
        document.querySelector('.price-title').value = '';
        obj.parent = document.querySelector('.price-parent').value.trim();
        obj.price = document.querySelector('.price-price').value.trim();
        obj.stock = document.querySelector('.price-stock').value.trim();
        obj.unit = document.querySelector('.price-unit').value.trim();
        obj.public = true;

        if (obj.title.length < 1 || obj.price.length < 1) return false;

        // Update this.product.var_price instead of DOM
        if (!Array.isArray(this.product.var_price)) {
            this.product.var_price = [];
        }
        this.product.var_price.push(obj);

        if (document.querySelector('.price-table > tbody [data-parent="' + obj.parent + '"]:last-child')) {
            document.querySelector('.price-table > tbody [data-parent="' + obj.parent + '"]:last-child').insertAdjacentHTML("afterend", self.structCoatingRow(obj, this.product.var_price.length - 1));
        } else {
            document.querySelector('.price-table').insertAdjacentHTML("beforeend", self.structCoatingRow(obj, this.product.var_price.length - 1));
        }

        // Reinitialize listeners for new elements
        this.initRowListeners();
    }

    removePrice(e) {

        e.preventDefault();

        let c = confirm(__html('Remove this record?'));

        if (!c) return;

        let hash = e.currentTarget.parentElement.parentElement.dataset.hash;

        this.product.var_price = this.product.var_price.filter((obj) => {
            return escape(obj.id + obj.title + obj.parent) != hash
        });

        e.currentTarget.parentElement.parentElement.remove();
    }

    updatePrice(e) {
        this.updateField(e, 'price', e.currentTarget.value);
    }

    updateUnit(e) {
        this.updateField(e, 'unit', e.currentTarget.value);
    }

    updateStock(e) {
        this.updateField(e, 'stock', parseInt(e.currentTarget.value));
    }

    updateP1(e) {
        this.updateField(e, 'parent', e.currentTarget.value);
    }

    updateP2(e) {
        this.updateField(e, 'title', e.currentTarget.value);
    }

    updateField(e, field, value) {

        e.preventDefault();

        this.product.var_price.forEach((obj, i) => {
            if (obj.id == e.currentTarget.dataset.id) {
                this.product.var_price[i][field] = value;

                console.log('Updated field:', field, 'Value:', value);
            }
        });
    }

    publicPrice(e) {

        this.product.var_price.forEach((obj, i) => {
            if (obj.id == e.currentTarget.dataset.id) {
                this.product.var_price[i].public = e.currentTarget.checked ? true : false;
            }
        });
    }

    initRowListeners() {
        let self = this;

        // Remove existing listeners to prevent duplicates
        document.querySelectorAll('.remove-price').forEach(el => {
            el.replaceWith(el.cloneNode(true));
        });

        // Re-add listeners
        onClick('.remove-price', e => { self.removePrice(e); });
        onlyNumbers(".price-price", [8, 46]);
        onKeyUp('.price-price', e => { self.updatePrice(e); });
        onKeyUp('.price-stock', e => { self.updateStock(e); });
        onKeyUp('.price-parent', e => { self.updateP1(e); });
        onChange('.price-parent', e => { self.updateP1(e); });
        onKeyUp('.price-title', e => { self.updateP2(e); });
        onChange('.price-title', e => { self.updateP2(e); });
        onChange('.price-unit', e => { self.updateUnit(e); });
        onClick('.price-public', e => { self.publicPrice(e); });
    }

    listeners() {

        let self = this;

        // Initialize row-specific listeners
        this.initRowListeners();

        // add price listener
        onClick('.add-price', e => { self.addPrice(e); });

        // add paste event
        this.onPaste();
    }

    onPaste() {

        const target = document.querySelector(".modal");
        target.addEventListener("paste", (event) => {

            let paste = (event.clipboardData || window.clipboardData).getData("text");
            let error = false;

            if (paste.length < 20) return true;

            event.preventDefault();

            try {
                JSON.parse(paste);
            } catch (e) {
                error = true;
            }

            if (!error) {
                this.product.var_price = JSON.parse(paste);
                this.state.modalCont.hide();
                this.show();
                toast("Prices updated")
            }
        });
    }

    /**
     * Generates HTML structure for a single price variation table row.
     * 
     * @method structCoatingRow
     * @param {Object} obj - Price variation object
     * @param {string} obj.id - Unique identifier
     * @param {string} obj.code - Product code
     * @param {string} obj.parent - Parent variation ID
     * @param {string} obj.title - Variation title
     * @param {number} obj.price - Variation price
     * @param {number} obj.stock - Stock quantity
     * @param {string} obj.unit - Measurement unit
     * @param {boolean} obj.public - Public visibility flag
     * @param {number} i - Index in the variations array
     * @returns {string} HTML string for the table row
     */
    structCoatingRow(obj, i) {

        console.log("structCoatingRow", obj.id, obj.title, obj.parent);

        return `
            <tr class="new-item-row ${obj.parent ? "pr-parent" : ""}" data-parent="${obj.parent ? obj.parent : ""}" data-title="${obj.title}" data-hash="${escape(obj.id + obj.title + obj.parent)}">
                <td style="max-width:25px;">
                    <input class="form-check-input price-public" type="checkbox" data-id="${obj.id}" data-i="${i}" value="" ${obj.public ? 'checked' : ""} >
                </td>
                <td class="tp">
                    <div class="me-1 me-sm-3 my-1 ">
                        ${obj.code}
                    </div>
                </td>
                <td>
                    <div class="me-1 me-sm-3 my-1">
                        <input type="text" autocomplete="off" class="form-control form-control-sm text-right price-parent" style="max-width:80px;" data-id="${obj.id}" data-i="${i}" value="${obj.parent ? obj.parent : ""}">
                    </div>
                </td>
                <td>
                    <div class="me-1 me-sm-3 my-1">
                        <input type="text" autocomplete="off" class="form-control form-control-sm text-right price-title" style="max-width:80px;" data-id="${obj.id}" data-i="${i}" value="${obj.title ? obj.title : ''}">
                    </div>
                </td>
                <td class="price">
                    <div class="me-1 me-sm-3 my-1" >
                        <input type="text" autocomplete="off" class="form-control form-control-sm text-right price-price" style="max-width:80px;" data-id="${obj.id}" data-i="${i}" value="${obj.price}">
                    </div>
                </td>
                <td class="price">
                    <div class="me-1 me-sm-3 my-1" >
                        <input type="text" autocomplete="off" class="form-control form-control-sm text-right price-stock" style="max-width:80px;" data-id="${obj.id}" data-i="${i}" value="${obj.stock ? obj.stock : 0}">
                    </div>
                </td>
                <td class="price">
                    <div class="me-1 me-sm-3 my-1">
                        ${this.measurementUnit(i, obj.unit)}
                        <span class="d-none"> ${obj.unit} </span>
                    </div>
                </td>
                <td class="align-middle text-center pt-2"> 
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff0079" class="remove-price bi bi-x-circle po" data-id="${obj.id}" data-i="${i}" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path>
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path>
                    </svg>
                </td>
            </tr>`;
    }
}