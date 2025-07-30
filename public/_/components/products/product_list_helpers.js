import { createProduct } from "../../api/create_product.js";
import { deleteProduct } from "../../api/delete_product.js";
import { getProducts } from "../../api/get_products.js";
import { formatStatus } from "../../components/products/helpers.js";
import { __html, attr, FILES, formatTime, link, spaceID, toast } from "../../helpers/global.js";
import { Component } from "../component.js";

// Product Model
export class Product {
    constructor(data) {
        Object.assign(this, data);
    }

    get imageUrl() {
        if (this.cad_files?.length) {
            return `${FILES}/${this._id}-250.webp`;
        }

        if (this.img?.[0]) {
            return `${FILES}/S${spaceID()}/product-${this._id}-1-100x100.jpeg?${this.updated}`;
        }

        return 'https://cdn.kenzap.com/loading.png';
    }

    get displayTitle() {
        return this.title || this.title_default || '';
    }

    get displayDescription() {
        return this.sdesc || this.sdesc_default || '';
    }

    get formattedStatus() {
        return formatStatus(this.status);
    }

    get formattedTime() {
        return formatTime(this.updated);
    }
}

// Product Row Component
export class ProductListRow extends Component {
    constructor(product, onDelete) {
        super();
        this.product = new Product(product);
        this.onDelete = onDelete;
    }

    render() {
        return `
            <tr>
                <td style="width:40px;">
                    <div class="timgc">
                        <a href="${link('/product-edit/?id=' + this.product._id)}">
                            <img src="${attr(this.product.imageUrl)}" 
                                 class="img-fluid rounded img-${attr(this.product._id)}" 
                                 alt="${__html("Product placeholder")}">
                        </a>
                    </div>
                </td>
                <td class="destt" style="max-width:250px;min-width:250px;">
                    <div class="my-1">
                        <a class="text-body" href="${link('/product-edit/?id=' + this.product._id)}">
                            ${this.product.displayTitle}
                            <i class="mdi mdi-pencil menu-icon edit-page" 
                               style="color:#9b9b9b;font-size:15px;margin-left:8px;" 
                               title="${__html("Edit product")}"></i>
                        </a>
                        <p class="form-text my-0">${this.product.displayDescription}</p>
                    </div>
                </td>
                <td><span>${this.product.formattedStatus}</span></td>
                <td><span class="fw-bold text-secondary">${this.product.priority || ""}</span></td>
                <td><span class="text-secondary">${this.product.formattedTime}</span></td>
                <td class="text-end">
                    <a href="#" data-id="${this.product._id}" class="remove-product text-danger me-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </a>
                </td>
            </tr>
        `;
    }

    attachListeners() {
        this.addListener(`[data-id="${this.product._id}"]`, 'click', this.handleDelete.bind(this));
    }

    async handleDelete(e) {
        e.preventDefault();

        const confirmed = confirm(__html('Remove product?'));
        if (!confirmed) return;

        try {
            await this.onDelete(this.product._id);
        } catch (error) {
            toast({ type: 'error', text: parseApiError(error) });
        }
    }
}

// Product Service
export class ProductService {
    constructor() {
        this.controller = null;
    }

    async getProducts(params = {}) {
        if (this.controller) this.controller.abort();

        this.controller = new AbortController();

        return new Promise((resolve, reject) => {
            getProducts(
                { ...params, signal: this.controller.signal },
                (response) => {
                    if (response.error) reject(response.error);
                    else resolve(response);
                }
            );
        });
    }

    async createProduct(data) {
        return new Promise((resolve, reject) => {
            createProduct(data, (response) => {
                if (response.error) reject(response.error);
                else resolve(response);
            });
        });
    }

    async deleteProduct(id) {
        return new Promise((resolve, reject) => {
            deleteProduct({ id }, (response) => {
                if (response.error) reject(response.error);
                else resolve(response);
            });
        });
    }
}

// Search Component
export class SearchComponent extends Component {
    constructor(onSearch) {
        super();
        this.onSearch = onSearch;
        this.isActive = false;
    }

    render() {
        return `
            <div class="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#212529" class="bi bi-search mb-0" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
            </div>
        `;
    }

    renderInput() {
        return `
            <div class="search-cont input-group input-group-sm mb-0 justify-content-start">
                <input type="text" placeholder="${__html('Search products')}" class="form-control border-top-0 border-start-0 border-end-0 rounded-0" style="max-width: 200px;">
            </div>
            <span>${__html("Title")}</span>
        `;
    }

    activate() {
        if (this.isActive) return;

        const titleSpan = document.querySelector('.table-p-list thead tr th:nth-child(2) span');
        const searchCont = document.querySelector('.table-p-list thead tr th:nth-child(2) .search-cont');
        const input = document.querySelector('.table-p-list thead tr th:nth-child(2) .search-cont input');

        titleSpan.style.display = 'none';
        searchCont.style.display = 'flex';
        input.focus();

        this.addListener(input, 'keyup', this.handleSearch.bind(this));
        this.isActive = true;
    }

    handleSearch(e) {
        e.preventDefault();
        this.onSearch(e.target.value);
    }

    getValue() {
        const input = document.querySelector('.search-cont input');
        return input ? input.value : '';
    }
}

// Product Modal Component
export class ProductModal extends Component {
    constructor(productService, onSuccess) {
        super();
        this.productService = productService;
        this.onSuccess = onSuccess;
        this.modal = null;
        this.modalInstance = null;
    }

    show() {
        this.modal = document.querySelector(".modal");
        this.modalInstance = new bootstrap.Modal(this.modal);

        this.modal.querySelector(".modal-title").innerHTML = __html('Add Product');
        this.modal.querySelector(".modal-body").innerHTML = this.renderForm();
        this.modal.querySelector(".modal-footer").innerHTML = this.renderFooter();

        this.modalInstance.show();

        setTimeout(() => this.modal.querySelector("#p-title").focus(), 100);
        this.addListener('.btn-modal-add-product', 'click', this.handleSubmit.bind(this));
    }

    renderForm() {
        return `
            <div class="form-cont">
                <div class="form-group mb-3">
                    <label for="p-title" class="form-label">${__html('Title')}</label>
                    <input type="text" class="form-control" id="p-title" autocomplete="off">
                </div>
                <div class="form-group mb-3">
                    <label for="p-sdesc" class="form-label">${__html('Short description')}</label>
                    <input type="text" class="form-control" id="p-sdesc" autocomplete="off">
                </div>
                <div class="form-group mb-3">
                    <label for="p-price" class="form-label">${__html('Price')}</label>
                    <input type="text" class="form-control" id="p-price" autocomplete="off">
                </div>
            </div>
        `;
    }

    renderFooter() {
        return `
            <button type="button" class="btn btn-primary btn-modal btn-modal-add-product">${__html('Add')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
        `;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const data = this.collectFormData();
        if (!this.validateForm(data)) return;

        try {
            await this.productService.createProduct(data);
            this.modalInstance.hide();
            toast('Product added successfully', 'success');
            this.onSuccess();
        } catch (error) {
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    collectFormData() {
        return {
            title: this.modal.querySelector("#p-title").value,
            sdesc: this.modal.querySelector("#p-sdesc").value,
            price: this.modal.querySelector("#p-price").value,
            status: "0",
            img: [],
            cats: []
        };
    }

    validateForm(data) {
        if (data.title.length < 2) {
            alert(__html('Please provide longer title'));
            return false;
        }
        return true;
    }
}

