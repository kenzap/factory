import { getMachineMeteringReport } from "../_/api/get_machine_metering_report.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { getHtml } from "../_/modules/performance/metering.js";
import { Session } from "../_/modules/session.js";

class MachineMeteringReport {
    constructor() {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        this.filters = {
            machine: "",
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)).toISOString(),
            dateTo: "",
            timezone: browserTimezone
        };

        this.machines = [];
        this.counterTrend = [];
        this.productionRateTrend = [];
        this.shiftHeatmap = [];
        this.machineSummary = [];

        this.charts = {
            counterTrend: null,
            productionRate: null
        };

        this.init();
    }

    init() {
        new Modal();
        this.data();
        hideLoader();
    }

    view() {
        if (document.querySelector('.machine-metering-report')) return;
        document.querySelector('#app').innerHTML = `<div class="machine-metering-report">${getHtml(this.filters)}</div>`;
    }

    data() {
        getMachineMeteringReport(this.filters, (response) => {
            if (!response.success) return;

            new Locale(response);
            hideLoader();

            this.user = response.user;
            this.machines = response.machines || [];
            this.counterTrend = response.counter_trend || [];
            this.productionRateTrend = response.production_rate_trend || [];
            this.shiftHeatmap = response.shift_heatmap || [];
            this.machineSummary = response.machine_summary || [];

            new Session();
            new Header({
                hidden: false,
                title: __html('Machine Metering Report'),
                icon: 'speedometer2',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();
            this.populateFilters();
            this.renderSummary();
            this.renderCounterTrendChart();
            this.renderProductionRateChart();
            this.renderShiftHeatmap();

            document.title = __html('Machine Metering Report');
        });
    }

    populateFilters() {
        const machineSelect = document.getElementById('filterMachine');
        if (!machineSelect) return;

        const machineOptions = this.machines.map((m) => m.machine).filter(Boolean);

        machineSelect.innerHTML = `
            <option value="" ${this.filters.machine === '' ? 'selected' : ''}>${__html('All machines')}</option>
            ${machineOptions.map((machine) => `<option value="${machine}" ${this.filters.machine === machine ? 'selected' : ''}>${machine}</option>`).join('')}
        `;
    }

    renderSummary() {
        const totalProduced = this.machineSummary.reduce((sum, row) => sum + Number(row.produced_total || 0), 0);
        const resetEvents = this.machineSummary.reduce((sum, row) => sum + Number(row.reset_events || 0), 0);
        const activeMachines = this.machineSummary.length;

        const el = document.getElementById('meteringSummary');
        if (!el) return;

        el.innerHTML = `
            <div class="summary-card">
                <h4>${__html('Total produced')}</h4>
                <div class="metric">${Math.round(totalProduced).toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h4>${__html('Active machines')}</h4>
                <div class="metric">${activeMachines}</div>
            </div>
            <div class="summary-card">
                <h4>${__html('Counter reset events')}</h4>
                <div class="metric">${resetEvents}</div>
            </div>
        `;
    }

    getSeriesByMachine(rows, valueField, timeField) {
        const map = new Map();
        rows.forEach((row) => {
            const machine = row.machine || '-';
            const time = row[timeField];
            const value = Number(row[valueField] || 0);
            if (!map.has(machine)) map.set(machine, []);
            map.get(machine).push({ time, value });
        });
        return map;
    }

    machineColor(idx) {
        const palette = ['#0d6efd', '#198754', '#dc3545', '#6610f2', '#fd7e14', '#20c997', '#6f42c1', '#0dcaf0'];
        return palette[idx % palette.length];
    }

    renderCounterTrendChart() {
        const canvas = document.getElementById('machineCounterTrendChart');
        if (!canvas) return;

        const grouped = this.getSeriesByMachine(this.counterTrend, 'reading', 'time');
        const allTimes = [...new Set(this.counterTrend.map((row) => row.time))].sort((a, b) => new Date(a) - new Date(b));
        const labels = allTimes.map((time) => {
            const d = new Date(time);
            const p = (v) => String(v).padStart(2, '0');
            return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
        });

        const datasets = [...grouped.entries()].map(([machine, points], idx) => {
            const byTime = new Map(points.map((p) => [p.time, p.value]));
            return {
                label: machine,
                data: allTimes.map((t) => byTime.has(t) ? byTime.get(t) : null),
                borderColor: this.machineColor(idx),
                backgroundColor: this.machineColor(idx),
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: true,
                tension: 0
            };
        });

        const ctx = canvas.getContext('2d');
        if (this.charts.counterTrend) this.charts.counterTrend.destroy();
        this.charts.counterTrend = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { maxTicksLimit: 12 } },
                    y: { beginAtZero: false }
                }
            }
        });
    }

    renderProductionRateChart() {
        const canvas = document.getElementById('productionRateTrendChart');
        if (!canvas) return;

        const grouped = this.getSeriesByMachine(this.productionRateTrend, 'rate_per_hour', 'hour_bucket');
        const allTimes = [...new Set(this.productionRateTrend.map((row) => row.hour_bucket))].sort((a, b) => new Date(a) - new Date(b));
        const labels = allTimes.map((time) => {
            const d = new Date(time);
            const p = (v) => String(v).padStart(2, '0');
            return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:00`;
        });

        const datasets = [...grouped.entries()].map(([machine, points], idx) => {
            const byTime = new Map(points.map((p) => [p.time, p.value]));
            return {
                label: machine,
                data: allTimes.map((t) => byTime.has(t) ? byTime.get(t) : null),
                borderColor: this.machineColor(idx),
                backgroundColor: this.machineColor(idx),
                borderWidth: 2,
                pointRadius: 2,
                spanGaps: true,
                tension: 0.2
            };
        });

        const ctx = canvas.getContext('2d');
        if (this.charts.productionRate) this.charts.productionRate.destroy();
        this.charts.productionRate = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { maxTicksLimit: 12 } },
                    y: { beginAtZero: true, title: { display: true, text: __html('Units / hour') } }
                }
            }
        });
    }

    heatColor(value, max) {
        if (!max || max <= 0 || value <= 0) return '#f8fafc';
        const alpha = Math.min(0.9, Math.max(0.15, value / max));
        return `rgba(13, 110, 248, ${alpha})`;
    }

    renderShiftHeatmap() {
        const holder = document.getElementById('shiftHeatmapTable');
        if (!holder) return;

        const machineList = this.machines.map((m) => m.machine);
        const valueMap = new Map();
        let maxProduced = 0;

        this.shiftHeatmap.forEach((row) => {
            const machine = row.machine || '-';
            const hour = Number(row.hour_of_day);
            const produced = Number(row.produced_total || 0);
            maxProduced = Math.max(maxProduced, produced);
            valueMap.set(`${machine}|${hour}`, produced);
        });

        const hours = Array.from({ length: 24 }, (_, i) => i);

        const body = machineList.map((machine) => {
            const cells = hours.map((hour) => {
                const value = valueMap.get(`${machine}|${hour}`) || 0;
                const bg = this.heatColor(value, maxProduced);
                return `<td class="heat-cell" style="background:${bg}">${Math.round(value)}</td>`;
            }).join('');

            return `<tr><td><strong>${machine}</strong></td>${cells}</tr>`;
        }).join('');

        holder.innerHTML = `
            <h3 class="mb-3">${__html('Shift heatmap (hourly output by machine)')}</h3>
            <table class="heatmap-table">
                <thead>
                    <tr>
                        <th>${__html('Machine')}</th>
                        ${hours.map((h) => `<th>${String(h).padStart(2, '0')}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${body || `<tr><td colspan="25">${__html('No data')}</td></tr>`}
                </tbody>
            </table>
            <div class="heat-legend">${__html('Darker cell means higher produced count for that hour (UTC)')}</div>
        `;
    }

    applyFilters() {
        const machine = document.getElementById('filterMachine')?.value || '';
        const filterStartDate = document.getElementById('filterStartDate')?.value || '';
        const filterEndDate = document.getElementById('filterEndDate')?.value || '';

        this.filters = {
            machine,
            dateFrom: filterStartDate ? new Date(`${filterStartDate}T00:00:00.000Z`).toISOString() : '',
            dateTo: filterEndDate ? new Date(`${filterEndDate}T23:59:59.999Z`).toISOString() : '',
            timezone: this.filters.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
        };

        this.data();
    }
}

window.machineMeteringReport = new MachineMeteringReport();
