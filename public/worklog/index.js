import { createWorklogRecord } from "../_/api/create_worklog_record.js";
import { deleteWorklogRecord } from "../_/api/delete_worklog_record.js";
import { getWorkLog } from "../_/api/get_worklog.js";
import { DropdownSuggestion } from "../_/components/products/dropdown_suggestion.js";
import { ProductSearch } from "../_/components/products/product_search.js";
import { __html, hideLoader, onClick, toast, unescape } from "../_/helpers/global.js";
import { getCoatings, getColors } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { getHtml } from "../_/modules/worklog.js";

/**
 * Work Log
 * 
 * @version 1.0
 */
class WorkLog {

    constructor() {
        this.records = [];
        this.filteredEntries = [];
        this.autoUpdateInterval = null;
        this.filters = {
            product: "",
            user_id: "",
            type: "",
            dateFrom: "",
            dateTo: ""
        };

        this.record = {
            order_id: new URLSearchParams(window.location.search).get('order_id') || "",
            product_id: new URLSearchParams(window.location.search).get('product_id') || "",
            product_name: unescape(new URLSearchParams(window.location.search).get('product_name')) || "",
            color: new URLSearchParams(window.location.search).get('color') || "",
            coating: new URLSearchParams(window.location.search).get('coating') || "",
            qty: new URLSearchParams(window.location.search).get('qty') || 0,
            type: new URLSearchParams(window.location.search).get('type') || '',
        }

        this.mini = new URLSearchParams(window.location.search).get('mini') || false; // Order ID if applicable

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

        document.querySelector('#app').innerHTML = getHtml(this.record);

        // hide summary if viewed in iframe
        if (this.mini) {
            document.querySelector('#app').classList.add('m-2');
            document.querySelector('#app').classList.remove('mt-12');
            document.querySelector('#app').classList.remove('mb-12');
            document.querySelector('#app .container').classList.remove('mt-4');
            document.querySelector('#app .container').classList.remove('container');
        }

        this.listeners();

        setTimeout(() => {
            document.querySelector('#qty').focus();
            document.querySelector('#qty').select();
        }, 100);
    }

    listeners() {

        // Product search
        new ProductSearch({ name: '#productName', coating: '#productCoating', color: '#productColor' }, (product) => {

            this.product = product;

            console.log('Product search selected:', product);
        });

        // Color suggestion
        new DropdownSuggestion({
            input: '#productColor',
            suggestions: this.colorSuggestions
        }, (suggestion) => {

            console.log('Suggestion selected:', suggestion);
        });

        // Coating suggestion
        new DropdownSuggestion({
            input: '#productCoating',
            suggestions: this.coatingSuggestions
        }, (suggestion) => {

            console.log('Suggestion selected:', suggestion);
        });

        // Add work log record
        onClick('.btn-add-worklog-record', (e) => {

            console.log('Add work log record clicked');

            e.preventDefault();

            // Validate required fields
            const requiredFields = [
                { selector: '#productName', name: 'Product name' },
                { selector: '#qty', name: 'Quantity' },
                { selector: '#productColor', name: 'Color' },
                { selector: '#productCoating', name: 'Coating' },
                { selector: '#type', name: 'Type' }
            ];

            for (const field of requiredFields) {
                const element = document.querySelector(field.selector);
                if (!element || !element.value.trim()) {
                    toast(`${field.name} is required`);
                    element?.focus();
                    return;
                }
            }

            // Validate quantity is a positive number
            const qtyValue = parseFloat(document.querySelector('#qty').value);
            if (isNaN(qtyValue) || qtyValue <= 0) {
                toast('Quantity must be a positive number');
                document.querySelector('#qty').focus();
                return;
            }

            // Validate time is a positive number
            const timeValue = parseFloat(document.querySelector('#time').value);
            if (document.querySelector('#time').value.length) if (isNaN(timeValue) || timeValue <= 0) {
                toast('Time must be a positive number');
                document.querySelector('#time').focus();
                return;
            }

            const record = {
                title: document.querySelector('#productName').value.trim(),
                qty: parseFloat(document.querySelector('#qty').value),
                product_id: this.product ? this.product._id : this.record.product_id,
                product_name: document.querySelector('#productName').value,
                color: document.querySelector('#productColor').value.trim(),
                coating: document.querySelector('#productCoating').value.trim(),
                origin: document.querySelector('#origin').value,
                time: parseInt(document.querySelector('#time').value) || 0,
                type: document.querySelector('#type').value,
                user_id: this.user.id,
                order_id: this.record.order_id ? this.record.order_id : '',
            }

            // insert record
            createWorklogRecord(record, (response) => {

                if (response.success) {

                    console.log('Work log record created:', response);
                    this.data(); // Refresh data
                } else {
                    console.error('Error creating work log record:', response.error);
                }
            });
        });
    }

    async data() {

        // get products
        getWorkLog(this.filters, (response) => {

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
            this.coatingSuggestions = getCoatings(this.settings);
            this.colorSuggestions = getColors(this.settings);

            // session
            new Session();
            new Header({
                hidden: this.mini || false,
                title: __html('Work Log'),
                icon: 'journal-text',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();

            this.renderRecords();

            this.populateFilters();

            document.title = __html('Work Log');

            this.firstLoad = false;
        });
    }

    populateFilters() {

        const employeeSelect = document.getElementById('filterEmployee');
        const typeSelect = document.getElementById('filterType');
        const dateFromInput = document.getElementById('filterStartDate');
        const dateToInput = document.getElementById('filterEndDate');
        const type = document.getElementById('type');

        // Populate employee filter
        if (this.users && this.users.length > 0) {
            if (employeeSelect) employeeSelect.innerHTML = `<option value="">${__html('All')}</option>` + this.users.map(user => `
            <option value="${user._id}" ${this.filters.user_id === user._id ? 'selected' : ''}>${user.fname} ${user?.lname?.charAt(0) || ''}</option>
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

        const recordType = `
            <option value="" ${this.record.type === '' ? 'selected' : ''}>${__html('Select type')}</option>
            ${this.settings?.work_categories?.map(category =>
            `<option value="${category.id}" ${this.record.type === category.id ? 'selected' : ''}>${__html(category.name)}</option>`
        ).join('') || ''}
        `;

        if (typeSelect) typeSelect.innerHTML = filterType;
        if (!type.innerHTML) type.innerHTML = recordType;

        // Populate date filters
        if (dateFromInput) dateFromInput.value = this.filters.dateFrom || '';
        if (dateToInput) dateToInput.value = this.filters.dateTo || '';
    }

    renderRecords() {

        const theader = document.getElementById('workLogHeader');
        const tbody = document.getElementById('workLogBody');
        const entriesToShow = this.filteredEntries.length > 0 ? this.filteredEntries : this.records;

        if (entriesToShow.length === 0) {
            tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center text-muted py-4">
                                <i class="bi bi-inbox fs-3 mb-3 d-block"></i>
                                ${__html('No work entries found')}
                            </td>
                        </tr>
                    `;
            return;
        }

        if (this.firstLoad) theader.innerHTML = `
                <tr>
                    <th style="width:84px;"><i class="bi bi-calendar me-2" id="calendarIcon" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#dateRangeModal"></i> ${__html('Time')}</th>
                    <th style="width:160px;">
                       <select class="form-select form-select-sm border-0 bg-transparent p-0" id="filterEmployee" onchange="workLog.applyFilters()" ></select>
                    </th>
                    <th>${__html('Color')}</th>
                    <th>${__html('Coating')}</th>
                    <th style="width:500px;">
                        <div class="position-relative" style="width:500px;">
                            <input type="text" class="form-control form-control-sm- border-0 bg-transparent ms-4 pe-4" id="productFilter" onchange="workLog.applyFilters()" onkeyup="workLog.applyFilters()" placeholder="${__html('Search product')}" value="${this.filters.product}" style="width: auto; height:21px; padding: 0; padding-right: 1rem;">
                            <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y me-2" style="font-size: 0.8rem;"></i>
                        </div>
                    </th>
                    <th>
                        <select class="form-select form-select-sm border-0 bg-transparent p-0" id="filterType" onchange="workLog.applyFilters()"></select>
                    </th>
                    <th>${__html('Qty')}</th>
                    <th>${__html('MIN')}</th>
                    <th></th>
                </tr>
        `;

        let lastDate = null;
        tbody.innerHTML = entriesToShow.map(entry => {
            const entryDate = new Date(entry.date).toDateString();
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

            let dateHeader = '';
            if (lastDate !== entryDate) {
                let dateLabel;
                if (entryDate === today) {
                    dateLabel = 'Today';
                } else if (entryDate === yesterday) {
                    dateLabel = 'Yesterday';
                } else {
                    dateLabel = new Date(entry.date).toLocaleDateString();
                }

                dateHeader = `
                <tr>
                    <td colspan="9" class="bg-light fw-bold py-2 text-secondary border-0 form-text">
                        ${dateLabel}
                    </td>
                </tr>
            `;
                lastDate = entryDate;
            }

            return dateHeader + `
            <tr>
                <td style="width:80px;">
                    <span class="time-badge">${this.formatTime(entry.date)}</span>
                </td>
                <td style="width:160px;">
                    <span class="employee-tag" >${this.getUserName(entry.user_id)}</span>
                </td>
                <td tyle="width:80px;">
                    ${entry.color || '-'}
                </td>
                <td tyle="width:80px;">
                    ${entry.coating || '-'}
                </td>
                <td style="width:500px;" ><span style="max-width:450px;">${entry.product_name || entry.title}</span></td>
                <td>
                    <span class="badge ${this.getTypeClass(entry.type)} stage-badge">
                        ${__html(entry.type.charAt(0).toUpperCase() + entry.type.slice(1).replace('-', ' '))}
                    </span>
                </td>
                <td><strong>${entry.qty}</strong></td>
                <td><strong>${entry.time == "0" ? "" : entry.time}</strong></td>
                <td class="text-end">
                    <button class="btn btn-delete-worklog text-danger" onclick="workLog.deleteEntry('${entry._id}')" title="Delete entry">
                    <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    }

    applyFilters() {

        const employeeFilter = document.getElementById('filterEmployee').value;
        const typeFilter = document.getElementById('filterType').value;
        const filterStartDate = document.getElementById('filterStartDate').value;
        const productFilter = document.getElementById('productFilter').value;
        const filterEndDate = document.getElementById('filterEndDate').value;

        this.filters = {
            product: productFilter,
            user_id: employeeFilter,
            type: typeFilter,
            dateFrom: filterStartDate,
            dateTo: filterEndDate
        };

        this.data();

        // this.renderEntries();
        // this.updateSummary();
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

    formatTime(date) {

        if (!date) return '';

        const dateObj = new Date(date);
        return dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    getTypeClass(type) {
        const stageClasses = {
            'cutting': 'stage-cutting',
            'bending': 'stage-bending',
            'assembly': 'stage-assembly',
            'welding': 'stage-welding',
            'coating': 'stage-coating',
            'finishing': 'stage-finishing'
        };
        return stageClasses[type] || 'bg-secondary';
    }

    deleteEntry(id) {
        if (confirm('Delete this record?')) {

            deleteWorklogRecord({ id }, (response) => {

                if (!response.success) {

                    console.error('Error deleting work log record:', response.error);
                    return;
                }

                this.records = this.records.filter(entry => entry.id !== id);

                toast('Changes applied');

                // Refresh data after deletion
                this.data();

                // this.renderEntries();
                // this.updateSummary();
            });
        }
    }

    getUserName(userId) {
        if (!this.users) return userId;

        const user = this.users.find(u => u._id === userId);
        return user ? user.fname + ' ' + user.lname.charAt(0) : userId;
    }
}

window.workLog = new WorkLog();