import { createSupplyRecord } from "../_/api/create_supply_record.js";
import { deleteSupplyRecord } from "../_/api/delete_supply_record.js";
import { getSupplyLog } from "../_/api/get_supply_log.js";
import { DropdownSuggestion } from "../_/components/products/dropdown_suggestion.js";
import { ProductSearch } from "../_/components/products/product_search.js";
import { __html, hideLoader, onChange, onClick, toast, unescape } from "../_/helpers/global.js";
import { getCoatings, getColors } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { getHtml } from "../_/modules/supplies.js";

/**
 * Supplies Log
 * 
 * @version 1.0
 */
class Supplies {

    constructor() {
        this.records = [];
        this.filteredEntries = [];
        this.autoUpdateInterval = null;

        this.record = {
            order_id: new URLSearchParams(window.location.search).get('order_id') || "",
            product_id: new URLSearchParams(window.location.search).get('product_id') || "",
            product_name: unescape(new URLSearchParams(window.location.search).get('product_name')) || "",
            color: new URLSearchParams(window.location.search).get('color') || "",
            coating: new URLSearchParams(window.location.search).get('coating') || "",
            qty: new URLSearchParams(window.location.search).get('qty') || 0,
            type: new URLSearchParams(window.location.search).get('type') || '',
        }

        this.filters = {
            product: "",
            product_id: this.record.product_id || "",
            user_id: "",
            type: "",
            dateFrom: "",
            dateTo: ""
        };

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

        if (document.querySelector('.supplies-log')) return;

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

            // console.log('Add btn clicked');

            e.preventDefault();

            // Validate required fields
            let requiredFields = [
                { selector: '#qty', name: 'Quantity' },
                { selector: '#productColor', name: 'Color' },
                { selector: '#productCoating', name: 'Coating' },
            ];

            let type = document.querySelector(".supply-select-type").value;

            if (type === 'metal') {
                requiredFields.push(
                    { selector: '#width', name: 'Width' },
                    { selector: '#length', name: 'Length' },
                    { selector: '#thickness', name: 'Thickness' }
                );
            }

            if (type === 'product') {
                requiredFields.push(
                    { selector: '#productName', name: 'Product name' }
                );
            }

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

            const record = {
                type: type,
                product_id: this.record.product_id ? this.record.product_id : '',
                product_name: document.querySelector('#productName').value,
                status: document.querySelector('#status').value,
                supplier: document.querySelector('#supplier').value.trim(),
                color: document.querySelector('#productColor').value.trim(),
                coating: document.querySelector('#productCoating').value.trim(),
                width: parseFloat(document.querySelector('#width').value.trim()),
                length: parseFloat(document.querySelector('#length').value.trim()),
                _width: parseFloat(document.querySelector('#width').value.trim()),
                _length: parseFloat(document.querySelector('#length').value.trim()),
                thickness: parseFloat(document.querySelector('#thickness').value.trim()),
                qty: parseFloat(document.querySelector('#qty').value),
                price: parseFloat(document.querySelector('#price').value),
                document: {
                    id: document.querySelector('#document_id').value,
                    date: document.querySelector('#document_date').value ? new Date(document.querySelector('#document_date').value).toISOString() : null,
                },
                notes: document.querySelector('#notes').value.trim(),
                user_id: this.user.id,
            }

            // console.log('Creating work log record:', record);

            // insert record
            createSupplyRecord(record, (response) => {

                if (response.success) {

                    console.log('Record created:', response);
                    this.data(); // Refresh data
                } else {
                    console.error('Error:', response.error);
                }
            });
        });

        onChange('.supply-select-type', (e) => {

            const type = e.target.value;
            const formControls = document.querySelectorAll('.form-cont');
            formControls.forEach((el) => {
                if (el.dataset.type === type || el.dataset.type === 'general') {
                    el.classList.remove('d-none');
                } else {
                    el.classList.add('d-none');
                }

                // Hide form controls if type is not selected
                if (type == '') {
                    el.classList.add('d-none');
                }
            });

            if (type === 'product') {
                document.querySelector('#productName').focus();
            } else {
                document.querySelector('#width').focus();
            }
        });

        // Trigger change event for supply type selector to initialize form visibility
        const supplyTypeSelect = document.querySelector('.supply-select-type');
        if (supplyTypeSelect) {
            supplyTypeSelect.dispatchEvent(new Event('change'));
        }
    }

    async data() {

        // get products
        getSupplyLog(this.filters, (response) => {

            console.log(response);

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
                title: __html('Supplies'),
                icon: 'boxes',
                style: 'navbar-light',
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();

            this.renderRecords();
            this.updateSummary();

            this.firstLoad = false;
        });
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
                                ${__html('No supply entries found')}
                            </td>
                        </tr>
                    `;
            return;
        }

        if (this.firstLoad) theader.innerHTML = `
                <tr>
                    <th style="width:84px;"><i class="bi bi-calendar me-2" id="calendarIcon" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#dateRangeModal"></i> ${__html('Time')}</th>
                    <th>${__html('Status')}</th>
                    <th>${__html('Color')}</th>
                    <th>${__html('Coating')}</th>
                    <th style="width:500px;">
                        <div class="position-relative" style="width:500px;">
                            <input type="text" class="form-control form-control-sm- border-0 bg-transparent ms-4 pe-4" id="productFilter" onchange="workLog.applyFilters()" onkeyup="workLog.applyFilters()" placeholder="${__html('Search product')}" value="${this.filters.product}" style="width: auto; height:21px; padding: 0; padding-right: 1rem;">
                            <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y me-2" style="font-size: 0.8rem;"></i>
                        </div>
                    </th>
                    <th>${__html('Qty')}</th>
                    <th>${__html('Supplier')}</th>
                    <th>${__html('Document')}</th>
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
                <td style="width:80px;">
                    ${this.supplyStatusBadge(entry)}
                </td>
                <td style="width:80px;">
                    ${entry.color || '-'}
                </td>
                <td style="width:120px;">
                    ${entry.coating || '-'}
                </td>
                <td style="width:500px;" ><span style="max-width:450px;">${this.renderProductName(entry)}</span></td>
                <td><strong>${entry.qty}</strong></td>
                <td style="width:80px;" class="text-truncate">
                    ${entry.supplier || ''}
                </td>
                <td style="width:160px;">
                    <span class="item-status status-primary ${!entry?.document?.id ? "d-none" : ""}" >${entry?.document?.id}</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-delete-worklog text-danger" onclick="supplies.deleteEntry('${entry._id}')" title="Delete entry">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    }

    supplyStatusBadge(entry) {

        if (!entry.status) return ``;
        if (entry.status == 'waiting') return `<span class="item-status status-warning">${__html('Waiting')}</span>`;
        if (entry.status == 'instock') return `<span class="item-status status-success">${__html('In stock')}</span>`;
        if (entry.status == 'withdrawn') return `<span class="item-status status-secondary">${__html('Withdrawn')}</span>`;
    }

    renderProductName(entry) {

        if (entry.type === 'product') {
            return `<span class="product-name">${entry.product_name}</span>`;
        }

        if (entry.type === 'metal') {
            return `<span class="product-name">${__html('Metal')} ${entry.width} x ${entry.length} x ${entry.thickness}</span>`;
        }

        return `<span class="product-name">${entry.product_name}</span>`;
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
        this.updateSummary();
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

    getStageClass(type) {
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

            deleteSupplyRecord({ id }, (response) => {

                if (!response.success) {

                    console.error('Error deleting work log record:', response.error);
                    return;
                }

                this.records = this.records.filter(entry => entry.id !== id);

                toast('Changes applied');

                // Refresh data after deletion
                this.data();

                // this.renderEntries();
                this.updateSummary();
            });
        }
    }

    getUserName(userId) {
        if (!this.users) return userId;

        const user = this.users.find(u => u._id === userId);
        return user ? user.fname + ' ' + user.lname.charAt(0) : userId;
    }
}

window.supplies = new Supplies();