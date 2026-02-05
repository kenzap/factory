import { getSettings } from "../_/api/get_settings.js";
import { saveSettings } from "../_/api/save_settings.js";
import { __html, escape, initBreadcrumbs, link, onClick, onKeyUp, onlyNumbers, priceFormat, toast, unescape } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { TabExtensions } from "../_/modules/settings/tab_extensions.js";
import { TabGeneral } from "../_/modules/settings/tab_general.js";
import { TabParameters } from "../_/modules/settings/tab_parameters.js";
import { TabTemplates } from "../_/modules/settings/tab_templates.js";
import { getHtml } from "../_/modules/settings/tabs.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

/** 
 * Settings page of the dashboard.
 * Loads HTMLContent from ui/settings.js file.
 * Renders settings options in tabbed view.
 * 
 * @version 1.1
 */
class Settings {

    constructor() {

        this.firstLoad = true;
        this.editors = {};

        this.init();
    }

    init() {

        new Modal();

        getSettings(response => {

            console.log(response);

            this.settings = response.settings;
            this.extensions = response.extensions;

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'settings_management')) return

            // initialize session
            new Session();

            // render header and footer
            new Header(
                {
                    hidden: false,
                    title: __html('Settings'),
                    icon: 'gear',
                    style: 'navbar-light',
                    user: response?.user,
                    menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
                }
            );
            new Footer();

            // html
            document.querySelector('#app').innerHTML = getHtml();

            // init tabs
            new TabGeneral();
            new TabTemplates(this.settings, this.editors);
            new TabParameters(this.settings);
            new TabExtensions(this.settings, this.extensions);

            // render
            this.view();

            // listeners
            this.listeners();

            // first load
            this.firstLoad = false;
        });
    }

    view() {

        let self = this;

        if (this.firstLoad) initBreadcrumbs(
            [
                { link: link('/home/'), text: __html('Home') },
                { text: __html('Settings') }
            ]
        );

        // page title
        document.title = __html('Settings');

        // setup coatings and prices
        let price = [];
        let parent_options = '<option value="">' + __html('None') + '</option>';
        if (this.settings.price) price = this.settings.price;

        // sort by 
        if (Array.isArray(price)) {

            // pricing row parent
            price.forEach((price, i) => {

                if (!price.parent) {

                    document.querySelector('.price-table > tbody').insertAdjacentHTML("beforeend", self.structCoatingRow(price, i));
                    // parent_options += '<option value="'+price.id+'">'+price.title+'</option>';
                }
            });

            // pricing row
            price.forEach((price, i) => {

                if (price.parent) {

                    // console.log('.price-table > tbody [data-parent="'+price.parent+'"]');
                    if (document.querySelector('.price-table > tbody [data-parent="' + price.parent + '"]')) {
                        document.querySelector('.price-table > tbody [data-parent="' + price.parent + '"]').insertAdjacentHTML("afterend", self.structCoatingRow(price, i));
                    } else {
                        document.querySelector('.price-table > tbody').insertAdjacentHTML("beforeend", self.structCoatingRow(price, i));
                    }
                }
            });

        } else {
            price = [];
            document.querySelector('#price').value = '[]';
        }

        // populate fields
        for (let field in self.settings) {

            if (typeof (self.settings[field]) === "undefined") continue;
            if (self.settings[field] == "") continue;
            if (document.querySelector("[name='" + field + "']")) switch (document.querySelector("[name='" + field + "']").dataset.type) {

                case 'text':
                case 'email':
                case 'emails':
                case 'select':
                case 'textarea': document.querySelector("#" + field).value = self.settings[field]; break;
                case 'checkbox': document.querySelector("#" + field).checked = self.settings[field] == "1" ? true : false; break;
                case 'radio': document.querySelector("[name='" + field + "'][value='" + self.settings[field] + "']").checked = true; break;
            }
        }

        // pricing parent options
        // console.log(document.querySelector('#var_parent').value);
        document.querySelector('#var_parent').value.split('\n').forEach(el => {

            parent_options += '<option value="' + el + '">' + el + '</option>';
        });
        document.querySelector('.price-parent').innerHTML = parent_options;

        // add price listener
        onClick('.remove-price', (e) => { this.removePrice(this, e) });

        // only nums for price
        onlyNumbers(".price-price", [8, 46]);

        // update price
        onKeyUp('.price-price', e => this.updatePrice(this, e));

        // price public
        onClick('.price-public', e => this.publicPrice(this, e));

        // cache prices
        document.querySelector('#price').value = JSON.stringify(price);
    }

    listeners() {

        // add product modal
        onClick('.btn-save', e => { this.saveSettings(this, e) });

        // add price listener
        onClick('.add-price', e => { this.addPrice(this, e) });

        // remove price listener
        // onClick('.remove-price', (e) => { this.removePrice(this, e) });
    }

    addPrice(self, e) {

        let obj = {}

        obj.id = document.querySelector('.price-id').value; document.querySelector('.price-id').value = '';
        obj.title = document.querySelector('.price-title').value; document.querySelector('.price-title').value = '';
        obj.parent = document.querySelector('.price-parent').value; document.querySelector('.price-parent').value = '';
        obj.price = document.querySelector('.price-price').value; document.querySelector('.price-price').value = '';
        obj.unit = document.querySelector('.price-unit').value; document.querySelector('.price-unit').value = '';

        if (obj.title.length < 1 || obj.price.length < 1) return false;

        // console.log(obj);

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
        onClick('.remove-price', (e) => { this.removePrice(this, e) });

        // only nums for price
        onlyNumbers(".price-price", [8, 46]);

        // update price
        onKeyUp('.price-price', (e) => { this.updatePrice(this, e) });

        // price public
        onClick('.price-public', (e) => { this.publicPrice(this, e) });
    }

    removePrice(self, e) {

        e.preventDefault();

        let c = confirm(__html('Remove?'));

        if (!c) return;

        let hash = unescape(e.currentTarget.dataset.hash);

        let prices = JSON.parse(document.querySelector('#price').value);

        prices = prices.filter((obj) => {

            // console.log(JSON.stringify(obj) + " - "+ hash);
            return JSON.stringify(obj) != hash
        });

        document.querySelector('#price').value = JSON.stringify(prices);

        e.currentTarget.parentElement.parentElement.remove();
    }

    updatePrice(el, e) {

        e.preventDefault();

        let i = e.currentTarget.dataset.i;

        if (!i) return;

        let prices = JSON.parse(document.querySelector('#price').value);

        prices[i].price = e.currentTarget.value;

        document.querySelector('#price').value = JSON.stringify(prices);

        console.log(prices);
    }

    publicPrice(el, e) {

        // e.preventDefault();

        let i = e.currentTarget.dataset.i;

        let prices = JSON.parse(document.querySelector('#price').value);

        // console.log(i);

        prices[i].public = e.currentTarget.checked ? true : false;

        // prices[i].public = e.currentTarget.value;

        document.querySelector('#price').value = JSON.stringify(prices);
    }

    saveSettings(self, e) {

        e.preventDefault();

        let data = {};

        // iterate through all fields
        for (let s of document.querySelectorAll('.inp')) {

            switch (s.dataset.type) {

                case 'text':
                case 'email':
                case 'emails':
                case 'select':
                case 'textarea': data[s.id] = s.value; break;
                case 'checkbox': data[s.id] = s.checked ? s.value : ""; break;
                case 'radio': data[s.name] = s.parentElement.parentElement.parentElement.parentElement.querySelector('input:checked').value; break;
                case 'editor': data[s.id] = this.editors[s.id].getValue(); break;
            }
        }

        // console.log(data['price']);

        // normalize price array
        if (data['price']) data['price'] = JSON.parse(data['price']);

        // do not save last_order_id if it was unchanged. Avoids conflicts.
        if (this.settings.last_order_id == data.last_order_id) {

            delete data.last_order_id;
        }

        data.work_categories = this.settings.work_categories;
        data.stock_categories = this.settings.stock_categories;
        data.groups = this.settings.groups;

        // console.log(data); return;

        delete data[''];

        // save settings
        saveSettings(data, response => { toast('Changes applied'); });
    }

    structCoatingRow(obj, i) {

        return `
            <tr class="new-item-row ${obj.parent ? "pr-parent" : ""}" data-parent="${obj.parent ? obj.parent : ""}" data-title="${obj.title}">
                <td style="max-width:25px;">
                    <input class="form-check-input price-public" type="checkbox" value="" data-i="${i}" ${obj.public ? 'checked' : ""} >
                </td>
                <td class="tp">
                    <div class="me-1 me-sm-3 my-1 ">
                        ${obj.id}
                    </div>
                </td>
                <td>
                    <div class="me-1 me-sm-3 my-1">
                        ${obj.parent ? obj.parent : ""}
                    </div>
                </td>
                <td>
                    <div class="me-1 me-sm-3 my-1">
                        ${obj.title}
                    </div>
                </td>
                <td class="price">
                    <div class="me-1 me-sm-3 my-1" >
                        <input type="text" autocomplete="off" class="form-control form-control-sm text-right price-price" style="max-width:80px;" data-i="${i}" value="${obj.price}">
                        <span class="d-none"> ${priceFormat(this, obj.price)} </span>
                    </div>
                </td>
                <td class="price">
                    <div class="me-1 me-sm-3 my-1">
                        ${__html(obj.unit)}
                    </div>
                </td>
                <td class="align-middle text-center pt-2"> 
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff0079" class="remove-price bi bi-x-circle po" data-i="${i}" data-hash="${escape(JSON.stringify(obj))}" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path>
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path>
                    </svg>
                </td>
            </tr>`;
    }
}

new Settings();