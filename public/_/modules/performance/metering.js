import { __html } from "../../helpers/global.js";

const isoToUtcDateInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (v) => String(v).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

export const getHtml = (filters) => {
    return /*html*/`
    <div class="container">
        <div class="filters">
            <div class="filter-group">
                <label for="filterMachine" class="d-none"></label>
                <select class="form-select border-0" id="filterMachine" onchange="machineMeteringReport.applyFilters()"></select>
            </div>

            <div class="filter-group">
                <label for="filterStartDate" class="d-none"></label>
                <input type="date" id="filterStartDate" class="border-0" value="${isoToUtcDateInput(filters.dateFrom)}" onchange="machineMeteringReport.applyFilters()">
            </div>

            <div class="filter-group">
                <label for="filterEndDate" class="d-none"></label>
                <input type="date" id="filterEndDate" class="border-0" value="${isoToUtcDateInput(filters.dateTo)}" onchange="machineMeteringReport.applyFilters()">
            </div>
        </div>

        <div class="summary-cards" id="meteringSummary"></div>

        <div class="charts-section">
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>${__html('Per-machine counter trend')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="machineCounterTrendChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3>${__html('Production rate trend (per hour)')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="productionRateTrendChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="table-container">
            <div id="shiftHeatmapTable"></div>
        </div>
    </div>
    `;
};
