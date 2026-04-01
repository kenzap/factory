import { getClientRevenueDetail, getClientRevenueReport } from "../_/api/get_client_revenue_report.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class ClientRevenueReport {
    constructor() {
        this.filters = {
            search: '',
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)).toISOString(),
            dateTo: '',
            top: 10
        };

        this.summary = {};
        this.clients = [];
        this.topClients = [];
        this.revenueShare = [];
        this.monthlyTrend = [];
        this.charts = { topClients: null, revenueShare: null, monthlyTrend: null };

        this.init();
    }

    init() {
        new Modal();
        this.data();
        hideLoader();
    }

    view() {
        if (document.querySelector('.client-revenue-report')) return;

        document.querySelector('#app').innerHTML = `
            <div class="client-revenue-report">
                <div class="filters">
                    <div class="filter-group">
                        <input type="text" id="filterSearch" class="form-control border-0" placeholder="${__html('Search client...')}" value="${this.filters.search || ''}">
                    </div>
                    <div class="filter-group">
                        <input type="date" id="filterStartDate" class="border-0" value="${this.toDateInput(this.filters.dateFrom)}">
                    </div>
                    <div class="filter-group">
                        <input type="date" id="filterEndDate" class="border-0" value="${this.toDateInput(this.filters.dateTo)}">
                    </div>
                    <div class="filter-group">
                        <select id="filterTop" class="form-select border-0">
                            <option value="5" ${Number(this.filters.top) === 5 ? 'selected' : ''}>Top 5</option>
                            <option value="10" ${Number(this.filters.top) === 10 ? 'selected' : ''}>Top 10</option>
                            <option value="15" ${Number(this.filters.top) === 15 ? 'selected' : ''}>Top 15</option>
                            <option value="20" ${Number(this.filters.top) === 20 ? 'selected' : ''}>Top 20</option>
                        </select>
                    </div>
                </div>

                <div class="summary-cards" id="summaryCards"></div>

                <div class="charts-section">
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h3>${__html('Top clients by revenue')}</h3>
                            <div class="chart-wrapper"><canvas id="topClientsChart"></canvas></div>
                        </div>
                        <div class="chart-container">
                            <h3>${__html('Revenue share')}</h3>
                            <div class="chart-wrapper"><canvas id="revenueShareChart"></canvas></div>
                        </div>
                        <div class="chart-container full-width-chart">
                            <h3>${__html('Monthly revenue trend')}</h3>
                            <div class="chart-wrapper"><canvas id="monthlyRevenueTrendChart"></canvas></div>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <div id="clientRevenueTable"></div>
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
        document.getElementById('filterTop')?.addEventListener('change', apply);
    }

    data() {
        getClientRevenueReport(this.filters, (response) => {
            if (!response.success) return;
            if (!isAuthorized(response, 'product_sales_report')) return;

            new Locale(response);
            hideLoader();

            this.user = response.user;
            this.settings = response.settings || {};
            this.summary = response.summary || {};
            this.clients = response.clients || [];
            this.topClients = response.top_clients || [];
            this.revenueShare = response.revenue_share || [];
            this.monthlyTrend = response.monthly_trend || [];

            new Session();
            new Header({
                hidden: false,
                title: __html('Top Clients Revenue Report'),
                icon: 'bar-chart-line',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();
            this.renderSummary();
            this.renderTopClientsChart();
            this.renderRevenueShareChart();
            this.renderMonthlyTrendChart();
            this.renderTable();
            document.title = __html('Top Clients Revenue Report');
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

    formatPercent(value = 0) {
        const num = Number(value);
        if (!Number.isFinite(num)) return '0.0%';
        return `${num.toFixed(1)}%`;
    }

    renderSummary() {
        const el = document.getElementById('summaryCards');
        if (!el) return;

        const cards = [
            { label: __html('Clients'), value: this.summary.clients_count || 0 },
            { label: __html('Orders'), value: this.summary.orders_count || 0 },
            { label: __html('Revenue'), value: this.formatMoney(this.summary.revenue_total || 0) },
            { label: __html('Paid'), value: this.formatMoney(this.summary.paid_total || 0) },
            { label: __html('Outstanding'), value: this.formatMoney(this.summary.outstanding_total || 0) },
            { label: __html('Top client share'), value: this.formatPercent(this.summary.top_client_share_pct || 0) }
        ];

        el.innerHTML = cards.map((card) => `
            <div class="summary-card">
                <h4>${card.label}</h4>
                <div class="metric">${card.value}</div>
            </div>
        `).join('');
    }

    renderTopClientsChart() {
        const canvas = document.getElementById('topClientsChart');
        if (!canvas) return;

        const labels = this.topClients.map((c) => c.client_name);
        const data = this.topClients.map((c) => Number(c.revenue_total || 0));

        if (this.charts.topClients) this.charts.topClients.destroy();
        this.charts.topClients = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: __html('Revenue'),
                    data,
                    backgroundColor: 'rgba(13, 110, 248, 0.75)',
                    borderColor: 'rgba(13, 110, 248, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    renderRevenueShareChart() {
        const canvas = document.getElementById('revenueShareChart');
        if (!canvas) return;

        const labels = this.revenueShare.map((x) => x.label);
        const data = this.revenueShare.map((x) => Number(x.value || 0));
        const palette = ['#0d6efd', '#198754', '#fd7e14', '#dc3545', '#6610f2', '#0dcaf0', '#6c757d', '#20c997', '#ffc107', '#adb5bd'];

        if (this.charts.revenueShare) this.charts.revenueShare.destroy();
        this.charts.revenueShare = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: labels.map((_, idx) => palette[idx % palette.length]),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    renderMonthlyTrendChart() {
        const canvas = document.getElementById('monthlyRevenueTrendChart');
        if (!canvas) return;

        const labels = this.monthlyTrend.map((x) => x.month);
        const values = this.monthlyTrend.map((x) => Number(x.revenue || 0));

        if (this.charts.monthlyTrend) this.charts.monthlyTrend.destroy();
        this.charts.monthlyTrend = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: __html('Revenue'),
                    data: values,
                    borderColor: '#0d6ef8',
                    backgroundColor: 'rgba(13, 110, 248, 0.14)',
                    fill: true,
                    tension: 0.2,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    renderTable() {
        const holder = document.getElementById('clientRevenueTable');
        if (!holder) return;

        const rows = this.clients.map((c, index) => {
            const outstandingClass = Number(c.outstanding_total || 0) > 0 ? 'negative-value' : 'positive-value';
            return `
                <tr>
                    <td>${c.client_name || '-'}</td>
                    <td>${c.orders_count || 0}</td>
                    <td>${this.formatMoney(c.revenue_total || 0)}</td>
                    <td>${this.formatMoney(c.paid_total || 0)}</td>
                    <td class="${outstandingClass}">${this.formatMoney(c.outstanding_total || 0)}</td>
                    <td>${this.formatMoney(c.avg_order_value || 0)}</td>
                    <td>${this.formatPercent(c.paid_ratio || 0)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="clientRevenueReport.openDetails(${index})">${__html('View')}</button>
                    </td>
                </tr>
            `;
        }).join('');

        holder.innerHTML = `
            <table class="work-summary-table">
                <thead>
                    <tr>
                        <th>${__html('Client')}</th>
                        <th>${__html('Orders')}</th>
                        <th>${__html('Revenue')}</th>
                        <th>${__html('Paid')}</th>
                        <th>${__html('Outstanding')}</th>
                        <th>${__html('Average order')}</th>
                        <th>${__html('Paid ratio')}</th>
                        <th>${__html('Details')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || `<tr><td colspan="8">${__html('No records to display')}</td></tr>`}
                </tbody>
            </table>
        `;
    }

    openDetails(index) {
        const client = this.clients[index];
        if (!client) return;

        const modal = document.querySelector('.modal-item');
        if (!modal) return;

        const dialog = modal.querySelector('.modal-dialog');
        if (dialog) {
            dialog.classList.remove('modal-sm');
            dialog.classList.add('modal-xl');
        }

        modal.querySelector('.modal-title').textContent = `${client.client_name} - ${__html('Order breakdown')}`;
        modal.querySelector('.modal-body').innerHTML = `<div class="py-3">${__html('Loading..')}</div>`;
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();

        getClientRevenueDetail({ ...this.filters, client_key: client.client_key }, (response) => {
            const orders = response?.orders || [];
            const summary = response?.summary || {};

            const lines = orders.map((row) => `
                <tr>
                    <td>${row.order_id || '-'}</td>
                    <td>${row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                    <td>${this.formatMoney(row.revenue || 0)}</td>
                    <td>${this.formatMoney(row.paid || 0)}</td>
                    <td>${this.formatMoney(row.outstanding || 0)}</td>
                    <td>${row.invoice_number || '-'}</td>
                    <td>${row.waybill_number || '-'}</td>
                </tr>
            `).join('');

            modal.querySelector('.modal-body').innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-4"><strong>${__html('Revenue')}:</strong> ${this.formatMoney(summary.revenue_total || 0)}</div>
                    <div class="col-md-4"><strong>${__html('Paid')}:</strong> ${this.formatMoney(summary.paid_total || 0)}</div>
                    <div class="col-md-4"><strong>${__html('Outstanding')}:</strong> ${this.formatMoney(summary.outstanding_total || 0)}</div>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-striped align-middle mb-0">
                        <thead>
                            <tr>
                                <th>${__html('Order')}</th>
                                <th>${__html('Date')}</th>
                                <th>${__html('Revenue')}</th>
                                <th>${__html('Paid')}</th>
                                <th>${__html('Outstanding')}</th>
                                <th>${__html('Invoice')}</th>
                                <th>${__html('Waybill')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lines || `<tr><td colspan="7">${__html('No records to display')}</td></tr>`}
                        </tbody>
                    </table>
                </div>
            `;
        });
    }

    applyFilters() {
        const search = document.getElementById('filterSearch')?.value || '';
        const start = document.getElementById('filterStartDate')?.value || '';
        const end = document.getElementById('filterEndDate')?.value || '';
        const top = Number(document.getElementById('filterTop')?.value || 10);

        this.filters = {
            search,
            dateFrom: start ? new Date(`${start}T00:00:00`).toISOString() : '',
            dateTo: end ? new Date(`${end}T23:59:59`).toISOString() : '',
            top
        };

        this.data();
    }
}

window.clientRevenueReport = new ClientRevenueReport();
