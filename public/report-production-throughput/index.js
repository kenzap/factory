import { getProductionThroughputReport } from "../_/api/get_production_throughput_report.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class ProductionThroughputReport {
    constructor() {
        const today = new Date();
        const from = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        this.filters = {
            dateFrom: from.toISOString(),
            dateTo: today.toISOString(),
            group: ''
        };

        this.summary = {};
        this.forecast = {};
        this.dateAxis = [];
        this.products = [];
        this.groups = [];

        this.init();
    }

    init() {
        new Modal();
        this.data();
        hideLoader();
    }

    toDateInput(value = '') {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }

    view() {
        if (document.querySelector('.production-throughput-report')) return;

        document.querySelector('#app').innerHTML = `
            <div class="production-throughput-report">
                <div class="filters">
                    <div class="filter-group">
                        <label>${__html('Date from')}</label>
                        <input type="date" id="filterStartDate" class="border-0" value="${this.toDateInput(this.filters.dateFrom)}">
                    </div>
                    <div class="filter-group">
                        <label>${__html('Date to')}</label>
                        <input type="date" id="filterEndDate" class="border-0" value="${this.toDateInput(this.filters.dateTo)}">
                    </div>
                    <div class="filter-group">
                        <label>${__html('Product group')}</label>
                        <select id="filterGroup" class="form-select border-0"></select>
                    </div>
                    <div class="filter-group">
                        <label>${__html('Scope')}</label>
                        <input type="text" class="form-control border-0" disabled value="${__html('Daily throughput heat map')}" />
                    </div>
                </div>

                <div class="summary-cards" id="summaryCards"></div>

                <div class="table-container">
                    <div class="panel" id="throughputHeatmap"></div>
                </div>

                <div class="table-container">
                    <div class="panel" id="groupSummary"></div>
                </div>
            </div>
        `;

        this.listeners();
    }

    listeners() {
        const apply = () => this.applyFilters();
        document.getElementById('filterStartDate')?.addEventListener('change', apply);
        document.getElementById('filterEndDate')?.addEventListener('change', apply);
        document.getElementById('filterGroup')?.addEventListener('change', apply);
    }

    data() {
        getProductionThroughputReport(this.filters, (response) => {
            if (!response.success) return;
            if (!isAuthorized(response, 'analytics_access')) return;

            new Locale(response);
            hideLoader();

            this.user = response.user;
            this.summary = response.summary || {};
            this.forecast = response.forecast || {};
            this.dateAxis = response.date_axis || [];
            this.products = response.products || [];
            this.groups = response.groups || [];

            new Session();
            new Header({
                hidden: false,
                title: __html('Production Throughput Forecast'),
                icon: 'grid-3x3-gap',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();
            this.populateFilters();
            this.renderSummary();
            this.renderHeatmap();
            this.renderGroupSummary();
            document.title = __html('Production Throughput Forecast');
        });
    }

    populateFilters() {
        const groupSelect = document.getElementById('filterGroup');
        if (!groupSelect) return;

        const options = this.groups.map((g) => g.group_name).filter(Boolean);
        groupSelect.innerHTML = `
            <option value="" ${this.filters.group === '' ? 'selected' : ''}>${__html('All groups')}</option>
            ${options.map((name) => `<option value="${name}" ${this.filters.group === name ? 'selected' : ''}>${name}</option>`).join('')}
        `;
    }

    heatColor(value, max) {
        if (!max || max <= 0 || value <= 0) return '#f8fafc';
        const ratio = Math.min(1, value / max);
        const alpha = 0.15 + (ratio * 0.8);
        return `rgba(13, 110, 248, ${alpha.toFixed(3)})`;
    }

    roundQty(value = 0) {
        return Math.round(Number(value || 0));
    }

    renderSummary() {
        const el = document.getElementById('summaryCards');
        if (!el) return;

        const cards = [
            { label: __html('30d total qty'), value: Number(this.summary.total_qty_30d || 0).toLocaleString() },
            { label: __html('Products'), value: Number(this.summary.products_count || 0).toLocaleString() },
            { label: __html('Groups'), value: Number(this.summary.groups_count || 0).toLocaleString() },
            { label: __html('Avg daily qty'), value: this.roundQty(this.summary.avg_daily_qty || 0).toLocaleString() },
            { label: __html('Forecast next day'), value: this.roundQty(this.forecast.next_day_qty || 0).toLocaleString() },
            { label: __html('Forecast next 7 days'), value: this.roundQty(this.forecast.next_7_days_qty || 0).toLocaleString() }
        ];

        el.innerHTML = cards.map((card) => `
            <div class="summary-card">
                <h4>${card.label}</h4>
                <div class="metric">${card.value}</div>
            </div>
        `).join('');
    }

    renderHeatmap() {
        const el = document.getElementById('throughputHeatmap');
        if (!el) return;

        const rows = (this.products || []).filter((p) => !this.filters.group || p.group_name === this.filters.group);
        const maxQty = rows.reduce((maxRow, row) => {
            const rowMax = (row.daily || []).reduce((m, day) => Math.max(m, Number(day.qty || 0)), 0);
            return Math.max(maxRow, rowMax);
        }, 0);

        const head = this.dateAxis.map((day) => `<th>${day.slice(5)}</th>`).join('');
        const grouped = rows.reduce((acc, row) => {
            const key = row.group_name || __html('Ungrouped');
            if (!acc.has(key)) acc.set(key, []);
            acc.get(key).push(row);
            return acc;
        }, new Map());

        const body = [...grouped.entries()].map(([groupName, groupRows]) => {
            const groupHeader = `
                <tr class="group-row">
                    <td colspan="${this.dateAxis.length + 2}">
                        <strong>${groupName}</strong>
                    </td>
                </tr>
            `;

            const productRows = groupRows.map((row) => {
                const cells = this.dateAxis.map((day) => {
                    const hit = (row.daily || []).find((entry) => entry.day === day);
                    const qty = Number(hit?.qty || 0);
                    const bg = this.heatColor(qty, maxQty);
                    return `<td class="heat-cell" style="background:${bg}" title="${row.product_name} ${day}: ${qty}">${qty > 0 ? qty.toLocaleString() : ''}</td>`;
                }).join('');

                const productMeta = `${row.group_name} · ${__html('Lead')}: ${Number(row.avg_lead_days || 0).toLocaleString()} ${__html('days')} · ${__html('Total')}: ${Number(row.total_qty || 0).toLocaleString()}`;

                return `
                    <tr>
                        <td>
                            <div class="product-label ps-1" title="${productMeta}">
                                <strong>${row.product_name}</strong>
                            </div>
                        </td>
                        ${cells}
                        <td class="num-cell"><strong>${this.roundQty(row.total_qty || 0).toLocaleString()}</strong></td>
                    </tr>
                `;
            }).join('');

            const dayTotals = this.dateAxis.map((day) => {
                let dayQty = 0;
                for (const row of groupRows) {
                    const hit = (row.daily || []).find((entry) => entry.day === day);
                    dayQty += Number(hit?.qty || 0);
                }
                return dayQty;
            });
            const groupTotal = dayTotals.reduce((sum, qty) => sum + qty, 0);
            const groupTotalCells = dayTotals.map((qty) => `<td class="group-total-cell">${this.roundQty(qty).toLocaleString()}</td>`).join('');

            const groupTotalsRow = `
                <tr class="group-total-row">
                    <td><strong>${__html('Group total')}</strong></td>
                    ${groupTotalCells}
                    <td class="num-cell"><strong>${this.roundQty(groupTotal).toLocaleString()}</strong></td>
                </tr>
            `;

            return `${groupHeader}${productRows}${groupTotalsRow}`;
        }).join('');

        el.innerHTML = `
            <h3 class="mb-3">${__html('Daily throughput heat map (last 30 days)')}</h3>
            <table class="heatmap-table">
                <thead>
                    <tr>
                        <th><span class="ps-1">${__html('Product')}</span></th>
                        ${head}
                        <th>${__html('Total')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${body || `<tr><td colspan="${2 + this.dateAxis.length}">${__html('No data for selected filters.')}</td></tr>`}
                </tbody>
            </table>
            <div class="legend-text">${__html('Darker cells indicate higher daily throughput.')}</div>
        `;
    }

    renderGroupSummary() {
        const el = document.getElementById('groupSummary');
        if (!el) return;

        const rows = (this.groups || []).filter((g) => !this.filters.group || g.group_name === this.filters.group);

        el.innerHTML = `
            <h3 class="mb-3">${__html('30-day totals by product group')}</h3>
            <table class="groups-table">
                <thead>
                    <tr>
                        <th>${__html('Group')}</th>
                        <th class="num">${__html('Total qty')}</th>
                        <th class="num">${__html('Avg daily qty')}</th>
                        <th class="num">${__html('Max throughput')}</th>
                        <th class="num">${__html('Active days')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row) => `
                        <tr>
                            <td>${row.group_name}</td>
                            <td class="num">${this.roundQty(row.total_qty || 0).toLocaleString()}</td>
                            <td class="num">${this.roundQty(row.avg_daily_qty || 0).toLocaleString()}</td>
                            <td class="num">${this.roundQty(row.max_daily_qty || 0).toLocaleString()}</td>
                            <td class="num">${Number(row.active_days || 0).toLocaleString()}</td>
                        </tr>
                    `).join('') || `<tr><td colspan="5">${__html('No groups found.')}</td></tr>`}
                </tbody>
            </table>
        `;
    }

    applyFilters() {
        const from = document.getElementById('filterStartDate')?.value || '';
        const to = document.getElementById('filterEndDate')?.value || '';
        const group = document.getElementById('filterGroup')?.value || '';

        this.filters.dateFrom = from ? new Date(from + 'T00:00:00').toISOString() : '';
        this.filters.dateTo = to ? new Date(to + 'T23:59:59').toISOString() : '';
        this.filters.group = group;

        this.data();
    }
}

window.productionThroughputReport = new ProductionThroughputReport();
