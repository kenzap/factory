import { __html, attr, onClick, slugify } from "../../helpers/global.js";

/**
 * Class representing a ProductSlug.
 */
export class ProductSlug {

    constructor(product, locales, settings) {

        this.product = product || {};
        this.locales = locales || {};
        this.settings = settings || {};

        this.listeners();
    }

    listeners() {

        onClick('.edit-product-slug', (e) => {

            e.preventDefault();

            this.view();
        });
    }

    view() {

        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        this.modal.querySelector(".modal-title").innerHTML = __html('Edit Product Slugs');
        this.modal.querySelector(".modal-footer").innerHTML = `
                <button type="button" class="btn btn-primary btn-modal btn-update-product-slugs">${__html('Update')}</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
            `;

        this.modal.querySelector(".modal-body").innerHTML = `

                <div class="form-cont">
                    <div class="form-group mb-3">
                        <label for="p-locale-default" class="form-label">${__html('Default')}</label>
                        <input type="text" class="form-control inp-slug" id="p-locale-default" data-locale="default" autocomplete="off" placeholder="" value="${this.product.slugs.default || ""}">
                    </div>
                    ${this.locales.map((locale) => {
            return `          
                                <div class="form-group mb-3">
                                    <label for="p-locale-${attr(locale.locale)}" class="form-label">${__html('Locale')} <b>${attr(locale.locale)}</b></label>
                                    <input type="text" class="form-control inp-slug" id="p-locale-${attr(locale.locale)}" data-locale="${attr(locale.locale)}" autocomplete="off" placeholder="" value="${this.product.slugs[locale.locale] || ""}">
                                </div>
                            `
        }).join('')
            }
                    <div class="form-text mb-3">${__html('Additional locales can be added in the %1$translation dashboard%2$.', '<a href="/localization/">', '</a>')}</div>
                </div>
            `;

        onClick('.btn-update-product-slugs', (e) => {

            e.preventDefault();

            this.product.slugs = {};

            document.querySelectorAll('.inp-slug').forEach((el) => {

                this.product.slugs[el.dataset.locale] = el.value;

                if (el.dataset.locale == "default") document.querySelector(".product-slug-default").innerHTML = "/" + el.value + "/";
            });

            console.log(this.product.slugs);

            this.modal_cont.hide();
        });

        this.populateEmptySlugs();

        this.modal_cont.show();

        // }
        // getProductSlugs(this.state);
    }

    populateEmptySlugs() {

        document.querySelectorAll('.inp-slug').forEach((el) => {

            el.value = el.value || "";

            if (!el.value) {

                let locale = el.dataset.locale;
                let localization = this.product.locales[locale];
                let title = localization.title || "";

                if (el.id == "p-locale-default") {
                    locale = "en";
                }

                let slug = slugify(title, {
                    replacement: '-',  // replace spaces with replacement character, defaults to `-`
                    remove: undefined, // remove characters that match regex, defaults to `undefined`
                    lower: true,       // convert to lower case, defaults to `false`
                    strict: true,      // strip special characters except replacement, defaults to `false`
                    locale: locale,    // language code of the locale to use
                    trim: true         // trim leading and trailing replacement chars, defaults to `true`
                });

                slug = slug.trim('/');

                el.value = slug;
            }
        });
    }
}