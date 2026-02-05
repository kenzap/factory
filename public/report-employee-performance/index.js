import { getEmployeePerformance } from "../_/api/get_employee_performance.js";
import { drawWorkCategoryChart } from "../_/components/charts/work_category_chart.js";
import { drawWorkSummaryTable } from "../_/components/charts/work_summary_table.js";
import { drawWorkTotalsByDayChart } from "../_/components/charts/work_totals_by_day_chart.js";
import { drawWorkTotalsChart } from "../_/components/charts/work_totals_chart.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { getCoatings, getColors } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { getHtml } from "../_/modules/performance/employee.js";
import { Session } from "../_/modules/session.js";

/**
 * Employee Performance Page
 * 
 * @version 1.0
 */
class EmployeePerformance {

    constructor() {
        this.records = [];
        this.filters = {
            user_id: "",
            type: "",
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)).toISOString(),
            dateTo: ""
        };

        this.firstLoad = true;

        this.init();
    }

    init() {

        new Modal();

        this.data();

        hideLoader();
    }

    view() {

        if (document.querySelector('.work-log')) return;

        document.querySelector('#app').innerHTML = getHtml(this.filters);

        this.listeners();
    }

    listeners() {


    }

    async data() {

        // get products
        getEmployeePerformance(this.filters, (response) => {

            // console.log(response);

            // show UI loader
            if (!response.success) return;

            // init locale
            new Locale(response);

            // hide UI loader
            hideLoader();

            this.user = response.user;
            this.users = response.users;
            this.settings = response.settings;
            this.records = response.records;
            this.work_categories_stats = response.work_categories_stats;
            this.work_categories_by_day_stats = response.work_categories_by_day_stats;
            this.employee_performance = response.employee_performance;
            this.coatingSuggestions = getCoatings(this.settings);
            this.colorSuggestions = getColors(this.settings);

            // session
            new Session();
            new Header({
                hidden: this.mini || false,
                title: __html('Employee Performance'),
                icon: 'graph-up-arrow',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();

            this.populateFilters();
            this.renderCharts();

            this.firstLoad = false;

            document.title = __html('Employee Performance')
        });
    }

    populateFilters() {

        const employeeSelect = document.getElementById('filterEmployee');
        const typeSelect = document.getElementById('filterType');

        // Populate employee filter
        if (this.users && this.users.length > 0) {
            if (employeeSelect) employeeSelect.innerHTML = `<option value="">${__html('All')}</option>` + this.users.map(user => `
            <option value="${user._id}" ${this.filters.user_id === user._id ? 'selected' : ''}>${user.fname} ${user.lname?.charAt(0) || ''}</option>
            `).join('');
        } else {
            if (employeeSelect) employeeSelect.innerHTML = `<option value="">${__html('No Employees')}</option>`;
        }

        // Populate type filter
        const filterType = `
            <option value="" ${this.filters.type === '' ? 'selected' : ''}>${__html('All')}</option>
            ${this.settings?.work_categories?.map(category =>
            `<option value="${category.id}" ${this.filters.type === category.id ? 'selected' : ''}>${__html(category.name)}</option>`
        ).join('') || ''}
        `;

        if (typeSelect) typeSelect.innerHTML = filterType;
    }

    renderCharts() {

        drawWorkCategoryChart('workTypeChart', this.settings, this.work_categories_stats);
        drawWorkTotalsChart('employeeChart', this.settings, this.work_categories_stats);
        drawWorkTotalsByDayChart('workTotalsByDayChart', this.settings, this.work_categories_by_day_stats);
        drawWorkSummaryTable('workSummaryTable', this.settings, this.users, this.employee_performance);
    }

    applyFilters() {

        const employeeFilter = document.getElementById('filterEmployee').value;
        const typeFilter = document.getElementById('filterType').value;
        const filterStartDate = document.getElementById('filterStartDate').value;
        const filterEndDate = document.getElementById('filterEndDate').value;

        this.filters = {
            user_id: employeeFilter,
            type: typeFilter,
            dateFrom: filterStartDate ? new Date(filterStartDate + 'T00:00:00').toISOString() : '',
            dateTo: filterEndDate ? new Date(filterEndDate + 'T23:59:59').toISOString() : ''
        };

        this.data();
    }

    updateSummary() {

        const entriesToShow = this.filteredEntries.length > 0 ? this.filteredEntries : this.records;
        const totalEntries = entriesToShow.length;
        const totalQuantity = entriesToShow.reduce((sum, entry) => sum + parseFloat(entry.qty || 0), 0);
        const totalTime = entriesToShow.reduce((sum, entry) => sum + parseFloat(entry.time || 0), 0);
        const uniqueProducts = new Set(entriesToShow.map(entry => entry.product_id)).size;

        // Update new fixed bottom summary
        document.getElementById('summaryEntries').textContent = totalEntries;
        document.getElementById('summaryProducts').textContent = uniqueProducts;
        document.getElementById('totalQuantity').textContent = totalQuantity;
        document.getElementById('summaryTime').textContent = totalTime.toLocaleString();

        // hide summary if viewed in iframe
        if (this.mini) document.querySelector('.fixed-summary').style.display = 'none';
    }
}

window.employeePerformance = new EmployeePerformance();