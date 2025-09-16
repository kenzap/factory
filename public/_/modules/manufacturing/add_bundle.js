import { createProductBundle } from "../../api/create_product_bundle.js";
import { deleteProductBundle } from "../../api/delete_product_bundle.js";
import { getProductBundles } from "../../api/get_product_bundles.js";
import { DropdownSuggestion } from "../../components/products/dropdown_suggestion.js";
import { ProductSearch } from "../../components/products/product_search.js";
import { __html, onClick, toast } from "../../helpers/global.js";
import { getCoatings, getColors } from "../../helpers/order.js";

/**
 * AddBundle class for managing product bundles in manufacturing module.
 * Creates a modal interface for adding and managing product bundles with search functionality,
 * dropdown suggestions for colors and coatings, and table display of existing bundles.
 * 
 * @class AddBundle
 * @example
 * const addBundle = new AddBundle(
 *   { _id: 'xdg...', title: 'Štokskrūve', color: '2H3', coating: 'Polyester', orderId: 'vgc...' },
 */
export class AddBundle {

    constructor(o, settings, cb) {

        this.product_id = o._id;
        this.title = o.title;
        this.color = o.color;
        this.coating = o.coating;
        this.orderId = o.orderId;

        this.settings = settings || {};

        this.cb = cb;

        this.view();

        this.init();
    }

    view = () => {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.add('modal-xl');
        this.modal.querySelector(".modal-title").innerHTML = `
            ${__html('Product bundles - %1$', this.title)}
        `;

        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>
        `;

        this.modal.querySelector(".modal-body").classList.add('bg-light');
        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont bundle-cont" style="min-height:300px;">
                <div class="container mt-4 add-bundle-container">
                    <div class="">
                        <div class="card-body- border-0 mb-4">
                            <form id="bundleEntryForm">
                                <div class="row g-3">
                                    <div class="col-md-5 form-cont d-none-" data-type="product">
                                        <label for="productName" class="form-label d-none">${__html('Product')}</label>
                                        <div class="position-relative">
                                            <input type="text" class="form-control pe-5 border-0" id="productName" autocomplete="off" required placeholder="${__html('Product name')}" value="" >
                                            <i class="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3"></i>
                                        </div>
                                    </div>
                                    <div class="col-md-2 form-cont d-none-" data-type="general">
                                        <label for="productColor" class="form-label d-none">${__html('Color')}</label>
                                        <input type="text" class="form-control border-0" id="productColor" autocomplete="off" placeholder="${__html('Color')}" value="${this.color}" required>
                                    </div>
                                    <div class="col-md-2 form-cont d-none-" data-type="general">
                                        <label for="productCoating" class="form-label d-none">${__html('Coating')}</label>
                                        <input type="text" class="form-control border-0" id="productCoating" autocomplete="off" placeholder="${__html('Coating')}" value="${this.coating}" required>
                                    </div>
                                    <div class="col-md-2 form-cont d-none-" data-type="general">
                                        <label for="qty" class="form-label d-none" >${__html('Quantity')}</label>
                                        <input type="number" class="form-control border-0" style="width:8 0px;" id="qty" min="1" placeholder="${__html('Quantity')}" value="" required>
                                    </div>
                                    <div class="col-md-1 form-cont d-flex align-items-end d-none-" data-type="general">
                                        <button type="submit" class="btn btn-dark border-0 btn-add-bundle-record w-100">
                                            <i class="bi bi-plus-circle me-1"></i>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="bundle-table">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead id="bundleHeader">

                                </thead>
                                <tbody id="bundleBody">
                                    <!-- Work entries will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`;

        this.modal.querySelector(".modal-header").classList.add('bg-light');
        this.modal.querySelector(".modal-footer").classList.add('bg-light');
        this.modal.querySelector(".modal-body").classList.add('p-0');

        this.modal_cont.show();
    }

    init = () => {

        this.coatingSuggestions = getCoatings(this.settings);
        this.colorSuggestions = getColors(this.settings);

        console.log('Colors', this.colorSuggestions);

        // Product search
        new ProductSearch({ name: `#productName`, coating: `#productCoating`, color: `#productColor` }, (product) => {

            this.product_bundle = product;

            console.log('Product search selected:', product);
        });

        // Color suggestion
        new DropdownSuggestion({ input: '#productColor', suggestions: this.colorSuggestions }, (suggestion) => {

            console.log('Suggestion selected:', suggestion);
        });

        // Color suggestion
        new DropdownSuggestion({ input: '#productCoating', suggestions: this.coatingSuggestions }, (suggestion) => {

            console.log('Suggestion selected:', suggestion);
        });

        this.data();

        this.listeners();
    }

    data = () => {

        let products = [{
            _id: this.product_id,
            coating: this.coating || '',
            color: this.color || ''
        }];

        // Reload bundles for all orders
        getProductBundles(products, (response) => {

            if (response.success && response.products) {

                this.product_bundles = response.products;

                this.table();
            }
        });
    }

    table() {

        const theader = document.getElementById('bundleHeader');
        const tbody = document.getElementById('bundleBody');
        const entriesToShow = this.product_bundles || [];

        if (entriesToShow.length === 0) {
            tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center text-muted py-4">
                                <i class="bi bi-inbox fs-3 mb-3 d-block"></i>
                                ${__html('No entries found')}
                            </td>
                        </tr>
                    `;
            return;
        }

        if (this.firstLoad) theader.innerHTML = `
                <tr>
                    <th>${__html('Title')}</th>
                    <th>${__html('Color')}</th>
                    <th>${__html('Coating')}</th>
                    <th>${__html('Status')}</th>
                    <th>${__html('Qty')}</th>
                    <th></th>
                </tr>
        `;

        tbody.innerHTML = entriesToShow.map(entry => {

            return `
            <tr>
                <td style="width:320px;" class="align-middle">
                    ${entry.title}
                </td>
                <td style="width:80px;" class="align-middle">
                    ${entry.color || '-'}
                </td>
                <td style="width:120px;" class="align-middle">
                    ${entry.coating || '-'}
                </td>
                <td class="align-middle">
                    <strong>${entry.qty}</strong>
                </td>
                <td style="width:100px;" class="align-middle">
                   ${this.statusBadge(entry)}
                </td>
                <td class="text-end align-middle">
                    <button class="btn btn-delete-entry text-danger" data-_id="${entry._id}" title="Delete entry">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');

        onClick('.btn-delete-entry', (e) => {

            const id = e.currentTarget.getAttribute('data-_id');

            if (!confirm(__html('Remove?'))) return;

            deleteProductBundle({ id }, (response) => {

                if (!response.success) {

                    console.error('Error: %1$', response.error);
                    return;
                }

                this.data();

                response.orderId = this.orderId;

                this.cb(response);
            });
        });
    }

    statusBadge(entry) {

        if (!entry.status) return `<span class="item-status status-primary">${__html('Published')}</span>`;
        if (entry.status == 'waiting') return `<span class="item-status status-warning">${__html('Waiting')}</span>`;
    }

    listeners = () => {

        onClick('.btn-add-bundle-record', async (e) => {
            e.preventDefault();

            const bundle_id = this.product_bundle?._id || this.product_bundle._id;
            const color = document.querySelector('#productColor').value.trim();
            const coating = document.querySelector('#productCoating').value.trim();
            const qty = parseInt(document.querySelector('#qty').value.trim(), 10) || 1;
            const orderId = this.orderId;

            // console.log('Add bundle record:', { bundle_id, color, coating, qty, orderId });

            if (!bundle_id) {
                alert(__html('Please select a product'));
                return;
            }

            // Create product bundle from the selected product
            createProductBundle(
                {
                    product_id: this.product_id,
                    product_color: this.color,
                    product_coating: this.coating,
                    bundle_id: bundle_id,
                    bundle_color: color,
                    bundle_coating: coating,
                    bundle_qty: qty
                }, (response) => {

                    if (!response.success) {
                        alert(__html('Error: %1$', response.error));
                        return;
                    }

                    toast(__html('Changes applied'));

                    // this.modal_cont.hide();
                    this.data();

                    response.orderId = this.orderId;

                    this.cb(response);
                });
        });
    }
}