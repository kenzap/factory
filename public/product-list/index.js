import { Component } from "../_/components/component.js";
import { getPageNumber, getPagination, replaceQueryParam } from "../_/components/products/helpers.js";
import { ProductListRow, ProductModal, ProductService, SearchComponent } from "../_/components/products/product_list_helpers.js";
import { __html, hideLoader, initBreadcrumbs, link, parseApiError, showLoader, toast } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

// Main Product List Component
class ProductList extends Component {
    constructor() {
        super();
        this.state = {
            products: [],
            loading: false,
            firstLoad: true,
            limit: 50,
            offset: 0,
            searchQuery: ''
        };

        this.productService = new ProductService();
        this.searchComponent = new SearchComponent(this.handleSearch.bind(this));
        this.productModal = new ProductModal(this.productService, this.refresh.bind(this));

        this.init();
    }

    async init() {
        new Modal();
        this.render();
        await this.loadData();
        new Session();
        new Footer();
    }

    render() {
        if (!this.state.firstLoad) return;

        document.querySelector('#app').innerHTML = this.getTemplate();
        this.initBreadcrumbs();
        this.attachListeners();
    }

    getTemplate() {
        return `
            <div class="container">
                <div class="d-md-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                    <button class="btn btn-primary btn-add-product mt-3 mb-1 mt-md-0 mb-md-0" type="button">
                        ${__html('Add product')}
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-12 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
                        <div class="card border-white shadow-sm border-0">
                            <div class="card-body p-0">
                                <div class="no-footer">
                                    <div class="row">
                                        <div class="col-sm-12">
                                            <div class="table-responsive">
                                                <table class="table table-hover table-borderless align-middle table-striped table-p-list mb-0" style="min-width: 800px;">
                                                    <thead>
                                                        <tr>
                                                            <th class="d-flex align-items-center justify-content-center">
                                                                ${this.searchComponent.render()}
                                                            </th>
                                                            <th>
                                                                ${this.searchComponent.renderInput()}
                                                            </th>
                                                            <th>${__html("Status")}</th>
                                                            <th>${__html("Priority")}</th>
                                                            <th>${__html("Last change")}</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody></tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row my-2">
                                        <div class="col-sm-12 col-md-5 d-flex align-items-center">
                                            <div class="dataTables_info mx-2 text-secondary fw-lighter" id="listing_info" role="status" aria-live="polite">&nbsp;</div>
                                        </div>
                                        <div class="col-sm-12 col-md-7">
                                            <div class="dataTables_paginate paging_simple_numbers m-2" id="listing_paginate"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initBreadcrumbs() {
        initBreadcrumbs([
            { link: link('/home/'), text: __html('Home') },
            { text: __html('Product List') }
        ]);
    }

    attachListeners() {
        if (!this.state.firstLoad) return;

        this.addListener('.btn-add-product', 'click', this.handleAddProduct.bind(this));
        this.addListener('.bi-search', 'click', this.handleSearchActivate.bind(this));
    }

    async loadData() {
        if (this.state.firstLoad) showLoader();

        this.setState({ loading: true });

        try {
            const params = {
                s: this.searchComponent.getValue(),
                limit: this.state.limit,
                offset: (getPageNumber() - 1) * this.state.limit
            };

            const response = await this.productService.getProducts(params);

            hideLoader();
            new Header(response);

            this.setState({
                products: response.products,
                settings: response.settings,
                meta: response.meta,
                loading: false,
                firstLoad: false
            });

            this.renderProducts();
            this.initPagination(response);

        } catch (error) {
            hideLoader();
            this.setState({ loading: false });
            toast({ type: 'error', text: parseApiError(error) });
        }
    }

    renderProducts() {
        const tbody = document.querySelector(".table tbody");

        if (this.state.products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">${__html("No products to display.")}</td></tr>`;
            return;
        }

        const productRows = this.state.products.map(product => {
            const row = new ProductListRow(product, this.handleDeleteProduct.bind(this));
            return row.render();
        }).join('');

        tbody.innerHTML = productRows;

        // Attach listeners to each row
        this.state.products.forEach(product => {
            const row = new ProductListRow(product, this.handleDeleteProduct.bind(this));
            row.attachListeners();
        });
    }

    async handleDeleteProduct(productId) {
        await this.productService.deleteProduct(productId);
        toast('Product removed successfully', 'success');
        this.refresh();
    }

    handleAddProduct(e) {
        e.preventDefault();
        this.productModal.show();
    }

    handleSearchActivate(e) {
        if (e) e.preventDefault();
        this.searchComponent.activate();
    }

    handleSearch(query) {
        this.setState({ searchQuery: query });

        const str = replaceQueryParam('page', 1, window.location.search);
        window.history.replaceState("pagination", document.title, window.location.pathname + str);

        this.loadData();
    }

    initPagination(response) {
        getPagination(response.meta, this.loadData.bind(this));
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    refresh() {
        this.setState({ firstLoad: false });
        this.loadData();
    }
}

// Initialize the application
new ProductList();