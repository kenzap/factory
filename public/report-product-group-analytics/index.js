import { getProductGroupAnalyticsReport } from "../_/api/get_product_group_analytics_report.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class ProductGroupAnalyticsReport {
    constructor() {
        this.filters = {
            search: '',
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)).toISOString(),
            dateTo: ''
        };

        this.summary = {};
        this.groups = [];
        this.chartsData = {
            revenue_by_group: [],
            revenue_share: [],
            price_margin_by_group: [],
            profit_margin_by_group: []
        };
        this.charts = {
            revenueByGroup: null,
            revenueShare: null,
            priceMargin: null,
            profitMarginByGroup: null
        };

        this.init();
    }

    init() {
        new Modal();
        this.data();
        hideLoader();
    }

    view() {
        if (document.querySelector('.pga')) return;

        document.querySelector('#app').innerHTML = `
            <div class="pga">
                <div class="pga-kpis" id="pgaKpis"></div>

                <div class="pga-filters">
                    <div class="pga-filter-item">
                        <label><i class="bi bi-search"></i> ${__html('Search')}</label>
                        <input type="text" id="filterSearch" placeholder="${__html('Groups or products...')}" value="${this.filters.search || ''}">
                    </div>
                    <div class="pga-filter-item">
                        <label><i class="bi bi-calendar3"></i> ${__html('From')}</label>
                        <input type="date" id="filterStartDate" value="${this.toDateInput(this.filters.dateFrom)}">
                    </div>
                    <div class="pga-filter-item">
                        <label><i class="bi bi-calendar3"></i> ${__html('To')}</label>
                        <input type="date" id="filterEndDate" value="${this.toDateInput(this.filters.dateTo)}">
                    </div>
                </div>

                <div class="pga-charts-top">
                    <div class="pga-card">
                        <div class="pga-card-header">
                            <span class="pga-card-title">${__html('Revenue by product group')}</span>
                        </div>
                        <div class="pga-chart-area"><canvas id="revenueByGroupChart"></canvas></div>
                    </div>
                    <div class="pga-card">
                        <div class="pga-card-header">
                            <span class="pga-card-title">${__html('Revenue share')}</span>
                        </div>
                        <div class="pga-share-layout">
                            <div class="pga-share-donut"><canvas id="revenueShareChart"></canvas></div>
                            <div class="pga-share-legend" id="revenueShareLegend"></div>
                        </div>
                    </div>
                </div>

                <div class="pga-charts-bottom">
                    <div class="pga-card">
                        <div class="pga-card-header">
                            <span class="pga-card-title">${__html('Profit margin by group')}</span>
                        </div>
                        <div class="pga-chart-area"><canvas id="profitMarginByGroupChart"></canvas></div>
                    </div>
                    <div class="pga-card">
                        <div class="pga-card-header">
                            <span class="pga-card-title">${__html('Avg unit price & margin')}</span>
                        </div>
                        <div class="pga-chart-area"><canvas id="priceMarginChart"></canvas></div>
                    </div>
                </div>

                <div class="pga-card pga-table-card">
                    <div class="pga-card-header">
                        <span class="pga-card-title">${__html('Groups breakdown')}</span>
                    </div>
                    <div class="pga-table-wrapper" id="productGroupAnalyticsTable"></div>
                </div>
            </div>
        `;

        this.listeners();
    }

    listeners() {
        const apply = () => this.applyFilters();
        document.getElementById('filterSearch')?.addEventListener('keyup', apply);
        document.getElementById('filterStartDate')?.addEventListener('change', apply);
        document.getElementById('filterEndDate')?.addEventListener('change', apply);
    }

    data() {
        getProductGroupAnalyticsReport(this.filters, (response) => {
            if (!response.success) return;
            if (!isAuthorized(response, 'product_sales_report')) return;

            new Locale(response);
            hideLoader();

            this.user = response.user;
            this.settings = response.settings || {};
            this.summary = response.summary || {};
            this.groups = response.groups || [];
            this.chartsData = response.charts || {
                revenue_by_group: [],
                revenue_share: [],
                price_margin_by_group: [],
                profit_margin_by_group: []
            };

            new Session();
            new Header({
                hidden: false,
                title: __html('Product Group Analytics'),
                icon: 'bar-chart-line',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();
            this.renderSummary();
            this.renderRevenueByGroupChart();
            this.renderRevenueShareChart();
            this.renderProfitMarginByGroupChart();
            this.renderPriceMarginChart();
            this.renderTable();
            document.title = __html('Product Group Analytics');
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

    renderSummary() {
        const el = document.getElementById('pgaKpis');
        if (!el) return;

        const marginValue = Number(this.summary.margin_pct);
        const marginValueClass = !Number.isNaN(marginValue) ? (marginValue >= 0 ? 'val-positive' : 'val-negative') : '';

        const kpis = [
            { label: __html('Revenue'), value: this.formatMoney(this.summary.revenue_total || 0), icon: 'bi-graph-up-arrow', primary: true },
            { label: __html('Orders'), value: this.summary.orders_count || 0, icon: 'bi-bag' },
            { label: __html('Groups'), value: this.summary.groups_count || 0, icon: 'bi-grid' },
            { label: __html('Products'), value: this.summary.products_count || 0, icon: 'bi-box' },
            { label: __html('Avg unit price'), value: this.formatMoney(this.summary.avg_unit_price || 0), icon: 'bi-tag' },
            { label: __html('Margin'), value: this.formatPercent(this.summary.margin_pct), icon: 'bi-percent', valueClass: marginValueClass }
        ];

        el.innerHTML = kpis.map((kpi) => `
            <div class="pga-kpi ${kpi.primary ? 'kpi-primary' : ''}">
                <div class="pga-kpi-icon"><i class="bi ${kpi.icon}"></i></div>
                <div class="pga-kpi-label">${kpi.label}</div>
                <div class="pga-kpi-value ${kpi.valueClass || ''}">${kpi.value}</div>
            </div>
        `).join('');
    }

    renderRevenueByGroupChart() {
        const canvas = document.getElementById('revenueByGroupChart');
        if (!canvas) return;

        const labels = (this.chartsData.revenue_by_group || []).map((row) => row.label);
        const values = (this.chartsData.revenue_by_group || []).map((row) => Number(row.revenue || 0));

        if (this.charts.revenueByGroup) this.charts.revenueByGroup.destroy();
        this.charts.revenueByGroup = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: __html('Revenue'),
                    data: values,
                    backgroundColor: 'rgba(37, 99, 235, 0.82)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 0,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        padding: 10,
                        callbacks: {
                            label: (ctx) => ` ${this.formatMoney(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        border: { color: '#f3f4f6' },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            callback: (value) => this.formatMoney(value)
                        }
                    },
                    y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#374151', font: { size: 11 } }
                    }
                }
            }
        });
    }

    renderRevenueShareChart() {
        const canvas = document.getElementById('revenueShareChart');
        const legendEl = document.getElementById('revenueShareLegend');
        if (!canvas) return;

        const rows = this.chartsData.revenue_share || [];
        const labels = rows.map((row) => row.label);
        const values = rows.map((row) => Number(row.value || 0));
        const total = values.reduce((sum, v) => sum + v, 0);
        const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#6b7280', '#f97316'];
        const self = this;

        if (this.charts.revenueShare) this.charts.revenueShare.destroy();
        this.charts.revenueShare = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: labels.map((_, i) => palette[i % palette.length]),
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    pieOutlabels: false,
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        padding: 10,
                        callbacks: {
                            label: (ctx) => ` ${self.formatMoney(ctx.raw)}  (${total ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`
                        }
                    }
                }
            }
        });

        if (legendEl) {
            legendEl.innerHTML = rows.map((row, i) => {
                const color = palette[i % palette.length];
                const val = Number(row.value || 0);
                const pct = total ? ((val / total) * 100).toFixed(1) : '0.0';
                return `
                    <div class="pga-leg-item">
                        <span class="pga-leg-dot" style="background:${color}"></span>
                        <span class="pga-leg-name">${row.label}</span>
                        <span class="pga-leg-pct">${pct}%</span>
                        <span class="pga-leg-val">${self.formatMoney(val)}</span>
                    </div>
                `;
            }).join('');
        }
    }

    renderProfitMarginByGroupChart() {
        const canvas = document.getElementById('profitMarginByGroupChart');
        if (!canvas) return;

        const labels = (this.chartsData.profit_margin_by_group || []).map((row) => row.label);
        const values = (this.chartsData.profit_margin_by_group || []).map((row) => row.margin_pct === null ? null : Number(row.margin_pct));
        const colors = values.map((value) => (Number(value) || 0) >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)');
        const borderColors = values.map((value) => (Number(value) || 0) >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)');

        if (this.charts.profitMarginByGroup) this.charts.profitMarginByGroup.destroy();
        this.charts.profitMarginByGroup = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: __html('Margin'),
                    data: values,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 0,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        padding: 10,
                        callbacks: {
                            label: (ctx) => ctx.raw !== null ? ` ${Number(ctx.raw).toFixed(1)}%` : ' N/A'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f3f4f6' },
                        border: { color: '#f3f4f6' },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            callback: (value) => `${value}%`
                        }
                    },
                    y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#374151', font: { size: 11 } }
                    }
                }
            }
        });
    }

    renderPriceMarginChart() {
        const canvas = document.getElementById('priceMarginChart');
        if (!canvas) return;

        const labels = (this.chartsData.price_margin_by_group || []).map((row) => row.label);
        const avgUnitPrice = (this.chartsData.price_margin_by_group || []).map((row) => Number(row.avg_unit_price || 0));
        const margins = (this.chartsData.price_margin_by_group || []).map((row) => row.margin_pct === null ? null : Number(row.margin_pct || 0));

        if (this.charts.priceMargin) this.charts.priceMargin.destroy();
        this.charts.priceMargin = new Chart(canvas.getContext('2d'), {
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: __html('Avg unit price'),
                        data: avgUnitPrice,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderWidth: 0,
                        borderRadius: 5,
                        borderSkipped: false,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: __html('Margin %'),
                        data: margins,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#f59e0b',
                        borderWidth: 2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            borderRadius: 3,
                            useBorderRadius: true,
                            color: '#6b7280',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        padding: 10,
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.dataset.yAxisID === 'y') return ` ${this.formatMoney(ctx.raw)}`;
                                return ctx.raw !== null ? ` ${Number(ctx.raw).toFixed(1)}%` : ' N/A';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: '#9ca3af', font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        grid: { color: '#f3f4f6' },
                        border: { color: '#f3f4f6', dash: [4, 4] },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            callback: (value) => this.formatMoney(value)
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        border: { display: false },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });
    }

    renderTable() {
        const container = document.getElementById('productGroupAnalyticsTable');
        if (!container) return;

        const rows = this.groups.map((group) => {
            const coverage = Number(group.cost_coverage_pct || 0);
            const profit = Number(group.gross_profit || 0);
            const margin = group.margin_pct === null ? null : Number(group.margin_pct);
            const share = Math.min(Number(group.revenue_share_pct || 0), 100);

            const profitClass = profit >= 0 ? 'profit-pos' : 'profit-neg';

            let marginPillClass = 'mpill-na';
            let marginLabel = 'N/A';
            if (margin !== null) {
                marginLabel = `${margin.toFixed(1)}%`;
                if (margin >= 15) marginPillClass = 'mpill-good';
                else if (margin >= 5) marginPillClass = 'mpill-ok';
                else marginPillClass = 'mpill-bad';
            }

            const covDotClass = coverage >= 99.9 ? 'ok' : 'warn';

            return `
                <tr>
                    <td class="col-group">${group.group_name || '—'}</td>
                    <td>${group.orders_count || 0}</td>
                    <td>${group.products_count || 0}</td>
                    <td>${Number(group.qty || 0).toFixed(2)}</td>
                    <td>${this.formatMoney(group.revenue_total || 0)}</td>
                    <td class="share-cell">
                        <div class="share-wrap">
                            <div class="share-track"><div class="share-fill" style="width:${share}%"></div></div>
                            <span class="share-pct">${this.formatPercent(group.revenue_share_pct)}</span>
                        </div>
                    </td>
                    <td>${this.formatMoney(group.avg_unit_price || 0)}</td>
                    <td class="${profitClass}">${this.formatMoney(profit)}</td>
                    <td><span class="mpill ${marginPillClass}">${marginLabel}</span></td>
                    <td>
                        <div class="cov-wrap">
                            <span class="cov-dot ${covDotClass}"></span>
                            ${this.formatPercent(group.cost_coverage_pct)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="pga-table">
                <thead>
                    <tr>
                        <th>${__html('Group')}</th>
                        <th>${__html('Orders')}</th>
                        <th>${__html('Products')}</th>
                        <th>${__html('Qty')}</th>
                        <th>${__html('Revenue')}</th>
                        <th>${__html('Share')}</th>
                        <th>${__html('Avg price')}</th>
                        <th>${__html('Gross profit')}</th>
                        <th>${__html('Margin')}</th>
                        <th>${__html('Coverage')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="10"><div class="pga-empty">${__html('No data to display')}</div></td></tr>`}
                </tbody>
            </table>
        `;
    }

    applyFilters() {
        const search = document.getElementById('filterSearch')?.value || '';
        const filterStartDate = document.getElementById('filterStartDate')?.value || '';
        const filterEndDate = document.getElementById('filterEndDate')?.value || '';

        this.filters = {
            search,
            dateFrom: filterStartDate ? new Date(`${filterStartDate}T00:00:00`).toISOString() : '',
            dateTo: filterEndDate ? new Date(`${filterEndDate}T23:59:59`).toISOString() : ''
        };

        this.data();
    }
}

window.productGroupAnalyticsReport = new ProductGroupAnalyticsReport();
