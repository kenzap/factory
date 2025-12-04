import { __html } from "../../helpers/global.js";

export const getHtml = (filters) => {

    return /*html*/`
    <div class="container">

        <div class="filters">
            <div class="filter-group">
                <label for="filterEmployee" class="d-none"></label>
                <select class="form-select border-0" id="filterEmployee" onchange="employeePerformance.applyFilters()"></select>
            </div>

            <div class="filter-group">
                <label for="filterStartDate" class="d-none"></label>
                <input type="date" id="filterStartDate" class="border-0" value="${filters.dateFrom ? new Date(new Date(filters.dateFrom).getTime() - new Date(filters.dateFrom).getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}" onchange="employeePerformance.applyFilters()">
            </div>

            <div class="filter-group">
                <label for="filterEndDate" class="d-none"></label>
                <input type="date" id="filterEndDate" class="border-0" value="${filters.dateTo ? new Date(new Date(filters.dateTo).getTime() - new Date(filters.dateTo).getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}" onchange="employeePerformance.applyFilters()">
            </div>

            <div class="filter-group">
                <label for="filterType" class="d-none"></label>
                <select class="form-select border-0" id="filterType" onchange="employeePerformance.applyFilters()" required=""></select>
            </div>
        </div>

        <div class="stats d-none">
            <div class="stat-card">
                <h3>Kopējais daudzums</h3>
                <div class="value" id="totalQty">0</div>
            </div>
            <div class="stat-card">
                <h3>Ieraksti</h3>
                <div class="value" id="totalEntries">0</div>
            </div>
            <div class="stat-card">
                <h3>Darbinieki</h3>
                <div class="value" id="totalEmployees">0</div>
            </div>
            <div class="stat-card">
                <h3>Darba veidi</h3>
                <div class="value" id="totalWorkTypes">0</div>
            </div>
        </div>

        <div class="charts-section">
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>${__html('Categories')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="workTypeChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3>${__html('Total')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="employeeChart"></canvas>
                    </div>
                </div>

                <div class="chart-container full-width-chart">
                    <h3>${__html('Total by day')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="workTotalsByDayChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}