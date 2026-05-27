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
        this.visibleProducts = [];
        this.filterOptions = { groups: [], categories: [] };
        this.sort = {
            field: '',
            direction: 'asc'
        };
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

    formatQty(value = 0) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return '0';

        if (Number.isInteger(numericValue)) {
            return numericValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
        }

        return numericValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    formatLeadTime(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';

        const numericValue = Number(value);
        if (numericValue < (1 / 24)) {
            return `${(numericValue * 24 * 60).toFixed(0)} ${__html('minutes')}`;
        }

        if (numericValue < 1) {
            return `${(numericValue * 24).toFixed(1)} ${__html('hours')}`;
        }

        return `${numericValue.toFixed(1)} ${__html('days')}`;
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

        const grossProfit = Number(this.summary.gross_profit || 0);
        const grossProfitClass = grossProfit >= 0 ? 'val-positive' : 'val-negative';
        const summaryCards = [
            { label: __html('Revenue'), value: this.formatMoney(this.summary.revenue_total || 0), icon: 'bi-graph-up-arrow', primary: true },
            { label: __html('Products'), value: this.summary.products || 0, icon: 'bi-box' },
            { label: __html('Quantity'), value: this.formatQty(this.summary.qty || 0), icon: 'bi-hash' },
            { label: __html('Gross Profit'), value: this.formatMoney(grossProfit), icon: 'bi-cash-stack', valueClass: grossProfitClass },
            { label: __html('Cost Coverage'), value: this.formatPercent(this.summary.cost_coverage_pct), icon: 'bi-shield-check' }
        ];

        summaryGrid.innerHTML = summaryCards.map((card) => `
            <div class="pga-kpi ${card.primary ? 'kpi-primary' : ''}">
                <div class="pga-kpi-icon"><i class="bi ${card.icon || 'bi-circle'}"></i></div>
                <div class="pga-kpi-label">${card.label}</div>
                <div class="pga-kpi-value ${card.valueClass || ''}">${card.value}</div>
            </div>
        `).join('');
    }

    renderTable() {
        const container = document.getElementById('productAnalyticsTable');
        if (!container) return;

        this.visibleProducts = this.getSortedProducts();
        const totalRevenue = Number(this.summary.revenue_total || 0);

        const rows = this.visibleProducts.map((item, index) => {
            const coverage = Number(item.cost_coverage_pct || 0);
            const share = totalRevenue > 0 ? Math.min(100, Math.max(0, (Number(item.revenue_total || 0) / totalRevenue) * 100)) : 0;
            const grossProfit = Number(item.gross_profit || 0);
            const profitClass = grossProfit >= 0 ? 'profit-pos' : 'profit-neg';
            const margin = item.margin_pct === null || item.margin_pct === undefined || Number.isNaN(Number(item.margin_pct))
                ? null
                : Number(item.margin_pct);
            const marginPillClass = this.getMarginPillClass(margin);
            const coveragePillClass = this.getCoveragePillClass(coverage);

            return `
                <tr>
                    <td class="col-group">${item.product_name || '-'}</td>
                    <td>${item.group || '-'}</td>
                    <td>${item.category || '-'}</td>
                    <td>${item.orders_count || 0}</td>
                    <td>${this.formatQty(item.qty || 0)}</td>
                    <td>${this.formatMoney(item.revenue_total || 0)}</td>
                    <td class="share-cell">
                        <div class="share-wrap">
                            <div class="share-track"><div class="share-fill" style="width:${share}%"></div></div>
                            <span class="share-pct">${this.formatPercent(share)}</span>
                        </div>
                    </td>
                    <td>${this.formatLeadTime(item.avg_manufacturing_days)}</td>
                    <td class="${profitClass}">${this.formatMoney(grossProfit)}</td>
                    <td><span class="mpill ${marginPillClass}">${margin === null ? 'N/A' : this.formatPercent(margin)}</span></td>
                    <td><span class="mpill ${coveragePillClass}">${this.formatPercent(item.cost_coverage_pct)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="productAnalyticsReport.openDetails(${index})">${__html('View')}</button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="pga-card pga-table-card">
                <div class="pga-card-header">
                    <span class="pga-card-title">${__html('Products breakdown')}</span>
                </div>
                <div class="pga-table-wrapper">
                    <table class="pga-table">
                <thead>
                    <tr>
                        <th>${this.renderSortableHeader('product_name', __html('Product'))}</th>
                        <th>${__html('Group')}</th>
                        <th>${__html('Categories')}</th>
                        <th>${__html('Orders')}</th>
                        <th>${this.renderSortableHeader('qty', __html('Qty'))}</th>
                        <th>${this.renderSortableHeader('revenue_total', __html('Revenue'), this.getHeaderHelp('revenue_total'))}</th>
                        <th>${this.renderHeaderLabel(__html('Share'), this.getHeaderHelp('revenue_share_pct'))}</th>
                        <th>${this.renderSortableHeader('avg_manufacturing_days', __html('Avg Manufacturing'), this.getHeaderHelp('avg_manufacturing_days'))}</th>
                        <th>${this.renderHeaderLabel(__html('Gross Profit'), this.getHeaderHelp('gross_profit'))}</th>
                        <th>${this.renderHeaderLabel(__html('Margin'), this.getHeaderHelp('margin_pct'))}</th>
                        <th>${this.renderHeaderLabel(__html('Cost Coverage'), this.getHeaderHelp('cost_coverage_pct'))}</th>
                        <th>${__html('Details')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="12"><div class="pga-empty">${__html('No products found')}</div></td></tr>`}
                </tbody>
                    </table>
                </div>
            </div>
        `;

        this.initTooltips(container);
    }

    getHeaderHelp(field) {
        const descriptions = {
            revenue_total: __html('Total revenue from all sales lines for this product in the selected period.'),
            revenue_share_pct: __html('Product revenue share inside the current filtered report result.'),
            avg_manufacturing_days: __html('Average elapsed time from release to production to manufactured state across completed lines. Uses order rtp_date and item inventory.rdy_date, with order date as fallback when rtp_date is missing. Values under one day are shown in hours, and values under one hour are shown in minutes.'),
            gross_profit: __html('Revenue with cost data minus calculated cost. Lines without usable cost data are excluded.'),
            margin_pct: __html('Gross profit divided by revenue with cost data. This shows profit percentage only on covered lines.'),
            cost_coverage_pct: __html('Share of total revenue that had enough cost data to calculate profit. Low coverage means margin is incomplete.')
        };

        return descriptions[field] || '';
    }

    getMarginPillClass(margin = null) {
        if (margin === null || margin === undefined || Number.isNaN(Number(margin))) return 'mpill-na';
        if (Number(margin) >= 15) return 'mpill-good';
        if (Number(margin) >= 5) return 'mpill-ok';
        return 'mpill-bad';
    }

    getCoveragePillClass(coverage = null) {
        if (coverage === null || coverage === undefined || Number.isNaN(Number(coverage))) return 'mpill-na';
        if (Number(coverage) >= 99.9) return 'mpill-good';
        if (Number(coverage) >= 80) return 'mpill-ok';
        return 'mpill-bad';
    }

    initTooltips(scope = document) {
        if (typeof bootstrap === 'undefined' || !bootstrap.Tooltip) return;

        scope.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
            bootstrap.Tooltip.getOrCreateInstance(element, {
                trigger: 'hover focus',
                container: 'body'
            });
        });
    }

    escapeHtmlAttr(value = '') {
        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('"', '&quot;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
    }

    renderHeaderHelp(helpText = '') {
        if (!helpText) return '';
        const safeHelpText = this.escapeHtmlAttr(helpText);

        return `
            <span
                class="table-header-help"
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                data-bs-title="${safeHelpText}"
                aria-label="${safeHelpText}"
                tabindex="0"
            >
                <i class="bi bi-question-circle"></i>
            </span>
        `;
    }

    renderHeaderLabel(label, helpText = '') {
        return `
            <span class="table-header-label">
                <span>${label}</span>
                ${this.renderHeaderHelp(helpText)}
            </span>
        `;
    }

    renderSortableHeader(field, label, helpText = '') {
        const isActive = this.sort.field === field;
        const direction = isActive ? this.sort.direction : '';
        const arrow = direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕';
        const activeClass = isActive ? 'is-active' : '';

        return `
            <button
                class="table-sort-button ${activeClass}"
                type="button"
                onclick="productAnalyticsReport.setSort('${field}')"
            >
                <span class="table-header-label">
                    <span>${label}</span>
                    ${this.renderHeaderHelp(helpText)}
                </span>
                <span class="sort-arrow" aria-hidden="true">${arrow}</span>
            </button>
        `;
    }

    getSortedProducts() {
        const products = [...this.products];
        const { field, direction } = this.sort;

        if (!field) return products;

        const multiplier = direction === 'desc' ? -1 : 1;

        return products.sort((a, b) => {
            if (field === 'product_name') {
                const left = String(a.product_name || '').toLocaleLowerCase();
                const right = String(b.product_name || '').toLocaleLowerCase();
                return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
            }

            const left = Number(a[field] || 0);
            const right = Number(b[field] || 0);

            if (left === right) {
                return String(a.product_name || '').localeCompare(String(b.product_name || ''), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            }

            return (left - right) * multiplier;
        });
    }

    setSort(field) {
        if (this.sort.field === field) {
            this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort.field = field;
            this.sort.direction = field === 'product_name' ? 'asc' : 'desc';
        }

        this.renderTable();
    }

    openDetails(index) {
        const product = this.visibleProducts[index];
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

            const linesHtml = lines.map((line) => {
                const grossProfit = line.gross_profit === null || line.gross_profit === undefined
                    ? null
                    : Number(line.gross_profit);
                const profitClass = grossProfit !== null && grossProfit >= 0 ? 'profit-pos' : 'profit-neg';
                const margin = line.margin_pct === null || line.margin_pct === undefined || Number.isNaN(Number(line.margin_pct))
                    ? null
                    : Number(line.margin_pct);
                const marginPillClass = this.getMarginPillClass(margin);

                return `
                    <tr>
                        <td class="col-group">${line.order_id || '-'}</td>
                        <td>${line.order_date ? new Date(line.order_date).toLocaleDateString() : '-'}</td>
                        <td>${line.client_name || '-'}</td>
                        <td>${this.formatQty(line.qty || 0)}</td>
                        <td>${this.formatMoney(line.revenue || 0)}</td>
                        <td>${this.formatLeadTime(line.manufacturing_days)}</td>
                        <td>${line.cost_total === null ? '<span class="mpill mpill-na">N/A</span>' : this.formatMoney(line.cost_total)}</td>
                        <td class="${grossProfit === null ? '' : profitClass}">${grossProfit === null ? 'N/A' : this.formatMoney(grossProfit)}</td>
                        <td><span class="mpill ${marginPillClass}">${margin === null ? 'N/A' : this.formatPercent(margin)}</span></td>
                    </tr>
                `;
            }).join('');

            modal.querySelector('.modal-body').innerHTML = `
                <div class="pa-detail-summary row g-2 mb-3">
                    <div class="col-sm-6 col-xl"><strong>${__html('Revenue')}:</strong> ${this.formatMoney(detail.revenue_total || 0)}</div>
                    <div class="col-sm-6 col-xl"><strong>${__html('Avg Manufacturing')}:</strong> ${this.formatLeadTime(detail.avg_manufacturing_days)}</div>
                    <div class="col-sm-6 col-xl"><strong>${__html('Gross Profit')}:</strong> <span class="${Number(detail.gross_profit || 0) >= 0 ? 'profit-pos' : 'profit-neg'}">${this.formatMoney(detail.gross_profit || 0)}</span></div>
                    <div class="col-sm-6 col-xl"><strong>${__html('Margin')}:</strong> <span class="mpill ${this.getMarginPillClass(detail.margin_pct)}">${this.formatPercent(detail.margin_pct)}</span></div>
                    <div class="col-sm-6 col-xl"><strong>${__html('Cost Coverage')}:</strong> <span class="mpill ${this.getCoveragePillClass(detail.cost_coverage_pct)}">${this.formatPercent(detail.cost_coverage_pct)}</span></div>
                </div>
                <div class="pga-card pga-table-card pga-modal-table-card">
                    <div class="pga-card-header">
                        <span class="pga-card-title">${__html('Order lines')}</span>
                    </div>
                    <div class="pga-table-wrapper">
                        <table class="pga-table">
                        <thead>
                            <tr>
                                <th>${__html('Order')}</th>
                                <th>${__html('Date')}</th>
                                <th>${__html('Client')}</th>
                                <th>${__html('Qty')}</th>
                                <th>${this.renderHeaderLabel(__html('Revenue'), this.getHeaderHelp('revenue_total'))}</th>
                                <th>${this.renderHeaderLabel(__html('Manufacturing Time'), this.getHeaderHelp('avg_manufacturing_days'))}</th>
                                <th>${this.renderHeaderLabel(__html('Cost'), __html('Calculated line cost. If unavailable, the line is excluded from gross profit and margin.'))}</th>
                                <th>${this.renderHeaderLabel(__html('Gross Profit'), this.getHeaderHelp('gross_profit'))}</th>
                                <th>${this.renderHeaderLabel(__html('Margin'), this.getHeaderHelp('margin_pct'))}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linesHtml || `<tr><td colspan="9"><div class="pga-empty">${__html('No records to display')}</div></td></tr>`}
                        </tbody>
                        </table>
                    </div>
                </div>
            `;

            this.initTooltips(modal.querySelector('.modal-body'));
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
