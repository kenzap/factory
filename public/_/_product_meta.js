import { __attr, __html, attr, onChange, onClick } from '@kenzap/k-cloud';
import Quill from 'quill';
import QuillTableBetter from 'quill-table-better';
import { languages, log, makeNumber } from "../_/_helpers.js";
import { ProductSlug } from "../_/_modal_product_slug.js";

export class ProductMeta {

    constructor(state) {

        this.state = state;

        if (!this.state.product['stock']) this.state.product['stock'] = { management: false, sku: "", qty: 0, low_threshold: 0 };

        if (!this.state.product.locales) this.state.product.locales = {};

        this.state.locales.unshift({ locale: 'default', language: 'Default' });

        this.view();

        this.locales();

        this.bind();
    }

    view() {

        document.querySelector('product-meta').innerHTML = `
            <h4 id="elan" class="card-title mb-3 d-flex justify-content-between align-items-center">
                ${__html('Description')}

                <div class="form-text mb-0 d-flex align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-translate me-2" viewBox="0 0 16 16">
                        <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z"/>
                        <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31"/>
                    </svg>
                    <select id="locale-picker" class="form-select form-select-sm border-0" style="width: auto;">

                    </select>
                </div>
            </h4>

            ${this.state.locales.map((locale) => {

            let id = `${locale.locale == "default" ? "" : "-" + locale.locale}`;

            let language = languages.find(lang => lang.code === locale.locale)?.name || locale.language

            if (!this.state.product.locales[locale.locale]) this.state.product.locales[locale.locale] = {};

            // log("id", id);

            return `
                <div id="meta-locale-${locale.locale}" class="meta-locale ${id.length > 0 ? "d-none" : ""}">
                    <div class="mb-3 mww">
                        <label class="banner-title-l form-label" for="p-title${id}">${__html('Title')} ${language != "Default" ? " in " + language : ""}</label>
                        <input type="text" class="form-control ${id.length == 0 ? "inp" : ""}" id="p-title${id}" placeholder="${__html('Metal flashing..')}" value="${this.state.product.locales[locale.locale]['title'] || ""}" maxlength="200">
                        <div class="d-flex justify-content-between form-text">
                            <p class="mb-0">${__html('The unique title and slug of a product.')}</p>
                            <p class="mb-0 mt-0 fst-italic form-text text-decoration-underline po d-flex align-items-center edit-product-slug">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-link me-1" viewBox="0 0 16 16">
                                    <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9q-.13 0-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/>
                                    <path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4 4 0 0 1-.82 1H12a3 3 0 1 0 0-6z"/>
                                </svg>
                                <span class="product-slug-default">/${this.state.product.slugs.default ? this.state.product.slugs.default : __attr('metal-flashing-1')}/</span>
                            </p>
                        </div>
                    </div>
                    <div class="mb-3 mww">
                        <label class="banner-descshort-l form-label" for="p-sdesc${id}">${__html('Short Description')} ${language != "Default" ? " in " + language : ""}</label>
                        <textarea class="form-control ${id.length == 0 ? "inp" : ""}" id="p-sdesc${id}" placeholder=" " maxlength="120" rows="2">${this.state.product.locales[locale.locale]['sdesc'] || ""}</textarea>
                        <p class="form-text">${__html('Used when a product is previewed or shared on social media platforms.')}</p>
                    </div>
                    <div class="mb-3 mww">
                        <div style="clear:both;margin-top:16px;"></div>
                        <label class="form-label" for="p-keywords${id}">${__html('Keywords')} ${language != "Default" ? " in " + language : ""}</label>
                        <textarea class="form-control form-keywords ${id.length == 0 ? "inp" : ""}" id="p-keywords${id}" placeholder=" " maxlength="2000" rows="2" >${this.state.product.locales[locale.locale]['keywords'] || ""}</textarea>
                        <p class="form-text">${__html('Used by an AI assistant to find relevant products.')}</p>
                    </div>
                    <div class="form-quill mb-3 mww scrolling-container">
                        <div style="clear:both;margin-top:16px;"></div>
                        <label class="banner-descshort-l form-label" for="p-ldesc${id}">${__html('Description')} ${language != "Default" ? " in " + language : ""}</label>
                        <div id="r-ldesc${id}" data-key="ldesc" data-type="richtext" data-locale="${locale.locale}" name="ldesc" class="richtext-input"> </div>
                        <textarea class="d-none form-control ${id.length == 0 ? "inp" : ""}" id="p-ldesc${id}" placeholder=" " maxlength="2000" rows="10"></textarea>
                        <p class="form-text">${__html('The main description of the product.')}</p>
                    </div>
                </div>`
        }).join('')}          

                <div class="mb-3 mww">
                    <div style="clear:both;margin-top:16px;"></div>
                    <label class="form-label" for="linked_products">${__html('Linked Products')}</label>
                    <textarea id="linked_products" class="form-control form-linked inp mw-" name="linked_products" rows="6" data-type="text" ></textarea>
                    <p class="form-text">${__html('Provide one product ID per line, ex: 73650c25e8452e7519db0f02042ef283646328bc.')}</p>
                </div>
                <div class="mb-3 mw">
                    <div style="clear:both;margin-top:16px;"></div>
                    <label class="form-label" for="priority">${__html('Priority')}</label>
                    <input type="number" id="priority" class="form-control inp mw-" name="priority" rows="6" data-type="text"></textarea>
                    <p class="form-text">${__html('Prioritizes products in the list.')}</p>
                </div>
            </div >

            <div style='margin:24px 0 48px;border-bottom:0px solid #ccc;'></div>

            <div class="mb-3 mw">
                <h4 id="elan" class="card-title">${__('Inventory')}</h4>
                <div class="input-group">
                    <input id="stock_sku" type="text" style="width:100%;" class="form-control" placeholder="" maxlength="200">
                    <p class="form-text">${__('Product stock unit identification number or SKU.')}</p>
                </div>
            </div>

            <div class="mb-3 mw">
                <div class="form-check">
                    <input id="stock_management" class="form-check-input stock-management" name="stock_management" type="checkbox" value="0" data-type="checkbox">
                    <label class="form-check-label" for="stock_management">
                        ${__('Stock management')}
                    </label>
                </div>
                <p class="form-text">${__('Enable stock management.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="stock_quantity">${__('Stock quantity')}</label>
                <input id="stock_quantity" type="text" class="form-control" placeholder="0">
                <p class="form-text">${__('Total number of products left.')}</p>
            </div>

            <div class="mb-3 mw stock-cont">
                <label class="form-label" for="stock_low_threshold">${__('Low stock')}</label>
                <input id="stock_low_threshold" type="text" class="form-control" placeholder="0">
                <p class="form-text">${__('Low stock threshold.')}</p>
            </div>
        `;
    }

    locales() {

        log(this.state.locales);
        // this.state.locales = [];

        document.querySelector("product-meta #locale-picker").innerHTML = `

                ${this.state.locales.map((locale) => {

            // this.state.locales.push(locale.locale);
            return `<option value="${attr(locale.locale)}">${__html(languages.find(lang => lang.code === locale.locale)?.name || locale.language)
                }</option > `
        }).join('')
            }
        `;

        onChange('#locale-picker', (e) => {

            let locale = e.currentTarget.value = e.currentTarget.value || "default";

            document.querySelectorAll('.meta-locale').forEach((el) => {

                if (el.id == `meta-locale-${locale}`) {
                    el.classList.remove('d-none');
                } else {
                    el.classList.add('d-none');
                }
            });
        });
    }

    bind() {

        const d = document;

        this.state.ProductSlug = new ProductSlug(this.state);

        // general section
        d.querySelector("#p-title").value = this.state.product.title;
        d.querySelector("#p-sdesc").value = this.state.product.sdesc;
        d.querySelector("#p-ldesc").value = this.state.product.ldesc;
        d.querySelector("#priority").value = this.state.product.priority;
        d.querySelector("#linked_products").value = this.state.product.linked_products;

        for (let el of document.querySelectorAll('.stock-cont')) { this.state.product['stock']['management'] == true ? el.classList.remove('d-none') : el.classList.add('d-none'); }
        document.querySelector('#stock_sku').value = this.state.product['stock']['sku'] ? this.state.product['stock']['sku'] : "";
        document.querySelector('#stock_management').checked = this.state.product['stock']['management']; //  == "1" ? true: false;
        document.querySelector('#stock_quantity').value = this.state.product['stock']['qty'] ? makeNumber(this.state.product['stock']['qty']) : 0;
        document.querySelector('#stock_low_threshold').value = this.state.product['stock']['low_threshold'] ? makeNumber(this.state.product['stock']['low_threshold']) : 0;

        onClick('.stock-management', (e) => {

            for (let el of document.querySelectorAll('.stock-cont')) {

                e.currentTarget.checked ? el.classList.remove('d-none') : el.classList.add('d-none');
                e.currentTarget.value = e.currentTarget.checked ? "1" : "0";
            }
        });

        this.editor();
    }

    editor() {

        Quill.register({
            'modules/table-better': QuillTableBetter
        }, true);

        // richtext editor
        [...document.querySelectorAll(".richtext-input")].forEach((el) => {

            // Create a custom button for HTML editing
            const htmlEditButton = document.createElement('button');
            htmlEditButton.innerHTML = 'HTML';
            htmlEditButton.className = 'ql-html';

            // Create a hidden textarea for HTML editing
            const htmlEditor = document.createElement('textarea');
            htmlEditor.style.display = 'none';
            htmlEditor.style.width = '100%';
            htmlEditor.style.height = '200px';
            htmlEditor.style.marginTop = '10px';
            htmlEditor.style.fontSize = '70%';

            // Add textarea after the editor
            el.parentNode.insertBefore(htmlEditor, el.nextSibling);

            let editor = new Quill(el, {
                // formats: ['table', 'tbody', 'tr', 'td', 'th', 'svg', 'div', 'span'],
                modules: {
                    table: false,
                    toolbar: {
                        container: [
                            [{ 'header': [2, 3, 4, 5, 6, false] }],
                            ['bold', 'italic', 'link'],
                            ['image'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            ['blockquote', 'code-block'], // , { 'background': [] }
                            ['table-better'],
                            ['html'] // Add the HTML button
                        ],
                        handlers: {
                            html: function () {
                                if (htmlEditor.style.display === 'none') {
                                    // Switch to HTML mode
                                    htmlEditor.value = html_beautify(editor.container.firstChild.innerHTML, { indent_size: 0, space_in_empty_paren: false });
                                    // htmlEditor.value = editor.container.firstChild.innerHTML;
                                    htmlEditor.style.display = 'block';
                                    el.style.display = 'none';
                                } else {
                                    // Switch back to Quill mode
                                    editor.container.firstChild.innerHTML = htmlEditor.value.replace(/(^|>)[\n\t]+/g, ">");
                                    htmlEditor.style.display = 'none';
                                    el.style.display = 'block';
                                }
                            },
                            // table: function () {
                            //     const range = this.quill.getSelection();
                            //     this.quill.insertEmbed(range.index, 'table', {
                            //         rows: 3,
                            //         cols: 3
                            //     });
                            // }
                        }
                    },
                    'table-better': {
                        language: 'en_US',
                        menus: ['column', 'row', 'merge', 'table', 'cell', 'wrap', 'copy', 'delete'],
                        toolbarTable: true
                    },
                    keyboard: {
                        bindings: QuillTableBetter.keyboardBindings
                    }
                },
                scrollingContainer: 'scrolling-container',
                placeholder: __html('Start typing..'),
                theme: 'snow'
            });

            // Create custom HTML button icon
            const htmlButtonSVG = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
                </svg>`;

            // Add CSS for the HTML button
            const style = document.createElement('style');
            style.innerHTML = `
                .ql-html {
                    position: relative;
                    width: 28px;
                    height: 24px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .ql-html:after {
                    display: none !important;
                }`;
            document.head.appendChild(style);

            // Replace text with SVG icon when toolbar is ready
            setTimeout(() => {
                const htmlButtons = document.querySelectorAll('.ql-html');
                htmlButtons.forEach(btn => {
                    btn.innerHTML = htmlButtonSVG;
                });
            }, 100);

            // Add the HTML button to the toolbar
            const toolbar = editor.getModule('toolbar');
            toolbar.addHandler('html', toolbar.handlers['html']);

            // Add the HTML button to the toolbar container
            const toolbarContainer = el.previousElementSibling;
            const htmlButtonContainer = toolbarContainer.querySelector('.ql-html');
            if (!htmlButtonContainer) {
                const lastGroup = toolbarContainer.querySelector('.ql-toolbar > span:last-child');
                if (lastGroup) {
                    lastGroup.appendChild(htmlEditButton);
                }
            }

            // text change listener
            editor.on('text-change', (delta, oldDelta, source) => {

            });

            editor.container.firstChild.innerHTML = this.state.product.locales[el.dataset.locale]["ldesc"] || "";
        });
    }
}