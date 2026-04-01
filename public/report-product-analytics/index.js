import { getProductAnalyticsDetail, getProductAnalyticsReport } from "../_/api/get_product_analytics_report.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class ProductAnalyticsReport {
    constructor() {
        this.filters = {
            search: "",
            group: "",
            category: "",
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)).toISOString(),
            dateTo: ""
        };
        this.summary = {};
        this.products = [];
        this.filterOptions = { groups: [], categories: [] };
        this.init();
    }

    init() {
        new Modal();
        this.data();
        hideLoader();
    }

    view() {
        if (document.querySelector('.product-analytics')) return;

        document.querySelector('#app').innerHTML = `
            <div class="product-analytics">
                <div class="container">
                    <div class="filters">
                        <div class="filter-group">
                            <input type="text" id="filterSearch" class="form-control border-0" placeholder="${__html('Search products')}" value="${this.filters.search || ''}">
                        </div>
                        <div class="filter-group">
                            <select class="form-select border-0" id="filterGroup"></select>
                        </div>
                        <div class="filter-group">
                            <select class="form-select border-0" id="filterCategory"></select>
                        </div>
                        <div class="filter-group">
                            <input type="date" id="filterStartDate" class="border-0" value="${this.toDateInput(this.filters.dateFrom)}">
                        </div>
                        <div class="filter-group">
                            <input type="date" id="filterEndDate" class="border-0" value="${this.toDateInput(this.filters.dateTo)}">
                        </div>
                    </div>
                </div>

                <div class="summary-strip">
                    <div class="container">
                        <div class="summary-grid" id="summaryGrid"></div>
                    </div>
                </div>

                <div class="table-container">
                    <div class="container">
                        <div id="productAnalyticsTable"></div>
                    </div>
                </div>
            </div>
        `;

        this.listeners();
    }

    listeners() {
        const bind = (id, event = 'change') => {
            const element = document.getElementById(id);
            if (!element) return;
            element.addEventListener(event, () => this.applyFilters());
        };

        bind('filterGroup');
        bind('filterCategory');
        bind('filterStartDate');
        bind('filterEndDate');
        bind('filterSearch', 'keyup');
    }

    data() {
        getProductAnalyticsReport(this.filters, (response) => {
            if (!response.success) return;
            if (!isAuthorized(response, 'product_sales_report')) return;

            new Locale(response);
            hideLoader();

            this.user = response.user;
            this.settings = response.settings || {};
            this.summary = response.summary || {};
            this.products = response.products || [];
            this.filterOptions = response.filter_options || { groups: [], categories: [] };

            new Session();
            new Header({
                hidden: false,
                title: __html('Product Analytics'),
                icon: 'bar-chart-line',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();
            this.populateFilters();
            this.renderSummary();
            this.renderTable();
            document.title = __html('Product Analytics');
        });
    }

    toDateInput(value = '') {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }

    formatMoney(value = 0) {
        const number = Number(value) || 0;
        const symbol = this.settings?.currency_symb || '€';
        const loc = this.settings?.currency_symb_loc || 'left';
        const formatted = number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (loc === 'right') return `${formatted}${symbol}`;
        if (loc === 'left_space') return `${symbol} ${formatted}`;
        if (loc === 'right_space') return `${formatted} ${symbol}`;
        return `${symbol}${formatted}`;
    }

    formatPercent(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
        return `${Number(value).toFixed(1)}%`;
    }

    populateFilters() {
        const groupSelect = document.getElementById('filterGroup');
        const categorySelect = document.getElementById('filterCategory');

        if (groupSelect) {
            groupSelect.innerHTML = `
                <option value="">${__html('All')} ${__html('Group')}</option>
                ${(this.filterOptions.groups || []).map((group) =>
                    `<option value="${group}" ${this.filters.group === group ? 'selected' : ''}>${group}</option>`
                ).join('')}
            `;
        }

        if (categorySelect) {
            categorySelect.innerHTML = `
                <option value="">${__html('All')} ${__html('Categories')}</option>
                ${(this.filterOptions.categories || []).map((category) =>
                    `<option value="${category}" ${this.filters.category === category ? 'selected' : ''}>${category}</option>`
                ).join('')}
            `;
        }
    }

    renderSummary() {
        const summaryGrid = document.getElementById('summaryGrid');
        if (!summaryGrid) return;

        const summaryCards = [
            { label: __html('Products'), value: this.summary.products || 0 },
            { label: __html('Quantity'), value: Number(this.summary.qty || 0).toFixed(2) },
            { label: __html('Revenue'), value: this.formatMoney(this.summary.revenue_total || 0) },
            { label: __html('Gross Profit'), value: this.formatMoney(this.summary.gross_profit || 0) },
            { label: __html('Cost Coverage'), value: this.formatPercent(this.summary.cost_coverage_pct) }
        ];

        summaryGrid.innerHTML = summaryCards.map((card) => `
            <div class="summary-card">
                <div class="label">${card.label}</div>
                <div class="value">${card.value}</div>
            </div>
        `).join('');
    }

    renderTable() {
        const container = document.getElementById('productAnalyticsTable');
        if (!container) return;

        const rows = this.products.map((item, index) => {
            const coverage = Number(item.cost_coverage_pct || 0);
            const coverageClass = coverage < 99.9 ? 'table-coverage-warn' : '';
            return `
                <tr>
                    <td>${item.product_name || '-'}</td>
                    <td>${item.group || '-'}</td>
                    <td>${item.category || '-'}</td>
                    <td>${item.orders_count || 0}</td>
                    <td>${Number(item.qty || 0).toFixed(2)}</td>
                    <td>${this.formatMoney(item.revenue_total || 0)}</td>
                    <td>${this.formatMoney(item.gross_profit || 0)}</td>
                    <td>${this.formatPercent(item.margin_pct)}</td>
                    <td class="${coverageClass}">${this.formatPercent(item.cost_coverage_pct)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="productAnalyticsReport.openDetails(${index})">${__html('View')}</button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="work-summary-table">
                <thead>
                    <tr>
                        <th>${__html('Product')}</th>
                        <th>${__html('Group')}</th>
                        <th>${__html('Categories')}</th>
                        <th>${__html('Orders')}</th>
                        <th>${__html('Qty')}</th>
                        <th>${__html('Revenue')}</th>
                        <th>${__html('Gross Profit')}</th>
                        <th>${__html('Margin')}</th>
                        <th>${__html('Cost Coverage')}</th>
                        <th>${__html('Details')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="10">${__html('No products found')}</td></tr>`}
                </tbody>
            </table>
        `;
    }

    openDetails(index) {
        const product = this.products[index];
        if (!product) return;

        const modal = document.querySelector('.modal-item');
        if (!modal) return;

        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.remove('modal-sm');
            modalDialog.classList.add('modal-xl');
        }

        modal.querySelector('.modal-title').textContent = `${product.product_name} - ${__html('Detailed Review')}`;
        modal.querySelector('.modal-body').innerHTML = `<div class="py-3">${__html('Loading..')}</div>`;

        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();

        getProductAnalyticsDetail({
            ...this.filters,
            product_id: product.product_id || '',
            product_name: product.product_name || ''
        }, (response) => {
            const detail = response?.summary || {};
            const lines = response?.lines || [];

            const linesHtml = lines.map((line) => `
                <tr>
                    <td>${line.order_id || '-'}</td>
                    <td>${line.order_date ? new Date(line.order_date).toLocaleDateString() : '-'}</td>
                    <td>${line.client_name || '-'}</td>
                    <td>${Number(line.qty || 0).toFixed(2)}</td>
                    <td>${this.formatMoney(line.revenue || 0)}</td>
                    <td>${line.cost_total === null ? 'N/A' : this.formatMoney(line.cost_total)}</td>
                    <td>${line.gross_profit === null ? 'N/A' : this.formatMoney(line.gross_profit)}</td>
                    <td>${this.formatPercent(line.margin_pct)}</td>
                </tr>
            `).join('');

            modal.querySelector('.modal-body').innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-3"><strong>${__html('Revenue')}:</strong> ${this.formatMoney(detail.revenue_total || 0)}</div>
                    <div class="col-md-3"><strong>${__html('Gross Profit')}:</strong> ${this.formatMoney(detail.gross_profit || 0)}</div>
                    <div class="col-md-3"><strong>${__html('Margin')}:</strong> ${this.formatPercent(detail.margin_pct)}</div>
                    <div class="col-md-3"><strong>${__html('Cost Coverage')}:</strong> ${this.formatPercent(detail.cost_coverage_pct)}</div>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-striped align-middle">
                        <thead>
                            <tr>
                                <th>${__html('Order')}</th>
                                <th>${__html('Date')}</th>
                                <th>${__html('Client')}</th>
                                <th>${__html('Qty')}</th>
                                <th>${__html('Revenue')}</th>
                                <th>${__html('Cost')}</th>
                                <th>${__html('Gross Profit')}</th>
                                <th>${__html('Margin')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linesHtml || `<tr><td colspan="8">${__html('No records to display')}</td></tr>`}
                        </tbody>
                    </table>
                </div>
            `;
        });
    }

    applyFilters() {
        const search = document.getElementById('filterSearch')?.value || '';
        const group = document.getElementById('filterGroup')?.value || '';
        const category = document.getElementById('filterCategory')?.value || '';
        const filterStartDate = document.getElementById('filterStartDate')?.value || '';
        const filterEndDate = document.getElementById('filterEndDate')?.value || '';

        this.filters = {
            search,
            group,
            category,
            dateFrom: filterStartDate ? new Date(`${filterStartDate}T00:00:00`).toISOString() : '',
            dateTo: filterEndDate ? new Date(`${filterEndDate}T23:59:59`).toISOString() : ''
        };

        this.data();
    }
}

window.productAnalyticsReport = new ProductAnalyticsReport();
