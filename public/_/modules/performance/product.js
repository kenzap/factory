import { __html } from "../../helpers/global.js";

export const getHtml = (filters) => {

    return /*html*/`
    <div class="container">
        <div class="filters">
            <div class="filter-group">
                <label for="filterEmployee" class="d-none"></label>
                <select class="form-select border-0" id="filterEmployee" onchange="productManufacturingReport.applyFilters()"></select>
            </div>

            <div class="filter-group">
                <label for="filterStartDate" class="d-none"></label>
                <input type="date" id="filterStartDate" class="border-0" value="${filters.dateFrom ? new Date(new Date(filters.dateFrom).getTime() - new Date(filters.dateFrom).getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}" onchange="productManufacturingReport.applyFilters()">
            </div>

            <div class="filter-group">
                <label for="filterEndDate" class="d-none"></label>
                <input type="date" id="filterEndDate" class="border-0" value="${filters.dateTo ? new Date(new Date(filters.dateTo).getTime() - new Date(filters.dateTo).getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}" onchange="productManufacturingReport.applyFilters()">
            </div>

            <div class="filter-group">
                <label for="filterType" class="d-none"></label>
                <select class="form-select border-0" id="filterType" onchange="productManufacturingReport.applyFilters()" required=""></select>
            </div>
        </div>

        <div class="table-container">
            <div id="productManufacturingTable"></div>
        </div>
    </div>
    `;
}
