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
import { isAuthorized } from "../_/modules/unauthorized.js";
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
            dateTo: "",
            user_id: "",
        };

        this.btnWorkLogHTML = `<i class="bi bi-plus-circle me-1"></i>`;

        const params = new URLSearchParams(window.location.search);

        this.record = {
            id: params.get('id') || "",
            item_id: params.get('item_id') || "",
            order_id: params.get('order_id') || "",
            product_id: params.get('product_id') || "",
            product_name: unescape(params.get('product_name')) || "",
            color: params.get('color') || "",
            coating: params.get('coating') || "",
            qty: params.get('qty') || 0,
            type: params.get('type') || '',
            tag: params.get('tag') || '',
            label: params.get('label') || '',
        }

        this.groupCandidates = this.parseGroupCandidates(params.get('group_items'));

        this.filters.user_id = params.get('user_id') || "";

        // pre-select user if called from manufacturing journal
        // if (!this.filters.user_id) this.filters.user_id = this.record.id ? this.user.id : "";
        // if (!this.filters.user_id) this.filters.user_id = this.record.id ? this.user.id : "";

        // console.log('Worklog record initialized:', this.record);

        this.mini = params.get('mini') || false; // Order ID if applicable

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

        this.renderGroupedWorkHint();

        this.listeners();

        setTimeout(() => {
            document.querySelector('#qty').focus();
            document.querySelector('#qty').select();
        }, 100);
    }

    listeners() {

        // Keep Enter-submit behavior consistent with button click validation flow.
        document.querySelector('#workEntryForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            document.querySelector('.btn-add-worklog-record')?.click();
        });

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
        onClick('.btn-add-worklog-record', async (e) => {
            e.preventDefault();

            const baseRecord = this.prepareBaseRecord();
            if (!baseRecord) return;

            this.setSubmitPendingState(e.currentTarget, true);

            try {
                if (this.groupCandidates.length > 1) {
                    await this.openGroupedCreateModal(baseRecord);
                    return;
                }

                const response = await this.createWorklogRecordAsync(baseRecord);
                if (!response?.success) {
                    toast(__html(`Failed to create work log record: %1$s`, response?.error || 'Unknown error'));
                    this.setSubmitPendingState(e.currentTarget, false);
                    return;
                }

                this.data();
            } catch (err) {
                this.setSubmitPendingState(e.currentTarget, false);
                toast(__html('Failed to create work log record'));
            }
        });
    }

    parseGroupCandidates(rawValue) {
        if (!rawValue) return [];

        try {
            const parsed = JSON.parse(rawValue);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(item => item && item.item_id && item.order_id)
                .map(item => ({
                    id: item.id || '',
                    order_id: item.order_id,
                    item_id: item.item_id,
                    product_id: item.product_id || '',
                    product_name: item.product_name || '',
                    group: item.group || '',
                    color: item.color || '',
                    coating: item.coating || '',
                    dimensions: item.dimensions || '',
                    qty: parseFloat(item.qty || 0)
                }));
        } catch (error) {
            return [];
        }
    }

    renderGroupedWorkHint() {
        const hint = document.getElementById('groupedWorkHint');
        if (!hint || this.groupCandidates.length <= 1) return;

        hint.innerHTML = `
            <div class="alert alert-light border mb-3">
                ${__html('Grouped items detected:')} <strong>${this.groupCandidates.length}</strong>.
                ${__html('When you save, you can select all or individual products.')}
            </div>
        `;
    }

    prepareBaseRecord() {
        const requiredFields = [
            { selector: '#productName', name: 'Product name' },
            { selector: '#qty', name: 'Quantity' },
            { selector: '#type', name: 'Type' }
        ];

        for (const field of requiredFields) {
            const element = document.querySelector(field.selector);
            if (!element || !element.value.trim()) {
                toast(`${field.name} is required`);
                element?.focus();
                return null;
            }
        }

        const qtyValue = parseFloat(document.querySelector('#qty').value);
        if (isNaN(qtyValue) || qtyValue <= 0) {
            toast('Quantity must be a positive number');
            document.querySelector('#qty').focus();
            return null;
        }

        const timeInput = document.querySelector('#time');
        const timeValue = parseFloat(timeInput.value);
        if (timeInput.value.length && (isNaN(timeValue) || timeValue <= 0)) {
            toast('Time must be a positive number');
            timeInput.focus();
            return null;
        }

        const colorValue = document.querySelector('#productColor').value.trim();
        const coatingValue = document.querySelector('#productCoating').value.trim();
        if (!colorValue || !coatingValue) {
            const shouldContinue = window.confirm('Color or coating is empty. Save this record anyway?');
            if (!shouldContinue) {
                (!colorValue ? document.querySelector('#productColor') : document.querySelector('#productCoating'))?.focus();
                return null;
            }
        }

        const selectedUser = document.getElementById('filterEmployee')?.value;
        const user_id = selectedUser || this.user?.id;

        return {
            title: document.querySelector('#productName').value.trim(),
            qty: qtyValue,
            item_id: this.record.item_id || '',
            product_id: this.product ? this.product._id : this.record.product_id,
            product_name: document.querySelector('#productName').value,
            color: colorValue,
            coating: coatingValue,
            origin: document.querySelector('#origin').value,
            time: parseInt(timeInput.value, 10) || 0,
            type: document.querySelector('#type').value,
            label: this.record?.label || '',
            tag: this.record?.tag || '',
            user_id: user_id,
            order_id: this.record.order_id || '',
            order_ids: this.record.id ? [this.record.id] : []
        };
    }

    setSubmitPendingState(button, pending) {
        if (!button) return;

        if (pending) {
            this.btnWorkLogHTML = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>';
            return;
        }

        button.innerHTML = this.btnWorkLogHTML;
        button.disabled = false;
    }

    createWorklogRecordAsync(record) {
        return new Promise((resolve) => {
            createWorklogRecord(record, (response) => resolve(response));
        });
    }

    async openGroupedCreateModal(baseRecord) {
        const modalElement = document.getElementById('groupWorklogModal');
        const listContainer = document.getElementById('groupWorkItems');
        const selectAll = document.getElementById('groupWorkSelectAll');
        const confirmBtn = document.getElementById('groupWorkConfirm');
        const confirmBtnTop = document.getElementById('groupWorkConfirmTop');
        const submitBtn = document.querySelector('.btn-add-worklog-record');
        const modalTitle = modalElement?.querySelector('.modal-title');

        if (!modalElement || !listContainer || !selectAll || !confirmBtn || !confirmBtnTop) {
            this.setSubmitPendingState(submitBtn, false);
            return;
        }

        if (modalTitle) {
            const orderLabel = this.record.id ? `#${this.record.id}` : '';
            const typeLabel = this.getWorkTypeLabel(baseRecord.type);
            modalTitle.textContent = `${orderLabel} · ${__html(typeLabel)}`.trim();
        }

        const rows = this.groupCandidates.map((candidate, index) => `
            <tr>
                <td style="width:32px;" class="p-2">
                    <input class="form-check-input group-item-check d-flex" type="checkbox" data-index="${index}" tabindex="-1" ${candidate.item_id === this.record.item_id ? 'checked' : ''}>
                </td>
                <td style="min-width:220px;">${candidate.product_name || '-'}</td>
                <td style="width:110px;">${candidate.color || '-'}</td>
                <td style="width:120px;">${candidate.coating || '-'}</td>
                <td style="width:120px;">${candidate.dimensions || '-'}</td>
                <td style="width:130px;">
                    <input type="number" class="form-control form-control-sm group-item-final-qty" data-index="${index}" min="0.01" step="0.01" value="${candidate.qty || 0}">
                </td>
            </tr>
        `).join('');

        listContainer.innerHTML = `
            <table class="table table-sm align-middle">
                <thead>
                    <tr>
                        <th></th>
                        <th>${__html('Product')}</th>
                        <th>${__html('Color')}</th>
                        <th>${__html('Coating')}</th>
                        <th>${__html('Dimensions')}</th>
                        <th>${__html('Qty')}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

        const getCheckedCount = () => listContainer.querySelectorAll('.group-item-check:checked').length;
        selectAll.checked = getCheckedCount() === this.groupCandidates.length;

        selectAll.onchange = () => {
            listContainer.querySelectorAll('.group-item-check').forEach((checkbox) => {
                checkbox.checked = selectAll.checked;
            });
        };

        listContainer.querySelectorAll('.group-item-check').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                selectAll.checked = getCheckedCount() === this.groupCandidates.length;
            });
        });

        listContainer.querySelectorAll('.group-item-final-qty').forEach((input) => {
            input.addEventListener('focus', (event) => {
                event.target.select();
            });
        });

        // Focus first qty input after modal is fully shown (post-animation).
        const focusFirstSelectedInput = () => {
            const firstSelectedCheckbox = listContainer.querySelector('.group-item-check:checked');
            if (!firstSelectedCheckbox) return;

            const firstIndex = firstSelectedCheckbox.dataset.index;
            const firstQtyInput = listContainer.querySelector(`.group-item-final-qty[data-index="${firstIndex}"]`);
            if (!firstQtyInput) return;

            firstQtyInput.focus();
            firstQtyInput.select();
        };
        modalElement.addEventListener('shown.bs.modal', focusFirstSelectedInput, { once: true });

        const selectedRows = () => {
            const checks = listContainer.querySelectorAll('.group-item-check');
            const qtyInputs = listContainer.querySelectorAll('.group-item-final-qty');
            const selected = [];

            checks.forEach((checkbox) => {
                if (!checkbox.checked) return;
                const index = parseInt(checkbox.dataset.index, 10);
                const qtyInput = Array.from(qtyInputs).find(input => parseInt(input.dataset.index, 10) === index);
                const qty = parseFloat(qtyInput?.value || 0);

                if (isNaN(qty) || qty <= 0) return;

                selected.push({
                    ...this.groupCandidates[index],
                    final_qty: qty
                });
            });

            return selected;
        };

        const submitSelection = async () => {
            if (confirmBtn.disabled || confirmBtnTop.disabled) return;

            const candidates = selectedRows();
            if (!candidates.length) {
                toast('Select at least one product with a valid quantity');
                return;
            }

            confirmBtn.disabled = true;
            confirmBtnTop.disabled = true;

            let successCount = 0;
            for (const candidate of candidates) {
                const qty = parseFloat(candidate.final_qty || 0);
                const baseQty = parseFloat(baseRecord.qty || 0);
                const baseTime = parseFloat(baseRecord.time || 0);
                const ratio = baseQty > 0 ? qty / baseQty : 0;
                const time = Math.round(baseTime * ratio);

                const payload = {
                    ...baseRecord,
                    title: candidate.product_name,
                    qty: qty,
                    item_id: candidate.item_id,
                    product_id: candidate.product_id || baseRecord.product_id,
                    product_name: candidate.product_name || baseRecord.product_name,
                    color: candidate.color || baseRecord.color,
                    coating: candidate.coating || baseRecord.coating,
                    time: time,
                    order_id: candidate.order_id || baseRecord.order_id,
                    order_ids: candidate.id ? [candidate.id] : baseRecord.order_ids
                };

                const response = await this.createWorklogRecordAsync(payload);
                if (response?.success) successCount += 1;
            }

            confirmBtn.disabled = false;
            confirmBtnTop.disabled = false;
            modal.hide();

            this.setSubmitPendingState(submitBtn, false);

            if (!successCount) {
                toast(__html('Failed to create grouped work log records'));
                return;
            }

            toast(__html(`Records created: %1$s`, successCount));
            this.data();
        };
        confirmBtn.onclick = submitSelection;
        confirmBtnTop.onclick = submitSelection;

        const handleEnterSubmit = (event) => {
            if (event.key !== 'Enter') return;
            if (!(event.target instanceof HTMLInputElement)) return;
            if (!event.target.closest('#groupWorklogModal')) return;

            event.preventDefault();
            submitSelection();
        };
        modalElement.addEventListener('keydown', handleEnterSubmit);

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.removeEventListener('shown.bs.modal', focusFirstSelectedInput);
            modalElement.removeEventListener('keydown', handleEnterSubmit);
            this.setSubmitPendingState(submitBtn, false);
            confirmBtn.disabled = false;
            confirmBtnTop.disabled = false;
        }, { once: true });
    }

    getWorkTypeLabel(type) {
        const category = this.settings?.work_categories?.find(item => item.id === type);
        if (category?.name) return category.name;
        return type ? type.replace(/-/g, ' ') : __html('Work Log');
    }

    formatRowFinalQty(baseQty, productQty) {
        const total = parseFloat(baseQty || 0) * parseFloat(productQty || 0);
        if (!Number.isFinite(total)) return '0';
        return Number.isInteger(total) ? String(total) : total.toFixed(2).replace(/\.00$/, '');
    }

    async data() {

        // get products
        getWorkLog(this.filters, (response) => {

            // console.log(response);

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'work_log_journal')) return

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

            document.querySelector('.btn-add-worklog-record').innerHTML = this.btnWorkLogHTML;
            document.querySelector('.btn-add-worklog-record').disabled = false;

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

        if (this.firstLoad) theader.innerHTML = `
                <tr>
                    <th style="width:84px;"><i class="bi bi-calendar me-2" id="calendarIcon" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#dateRangeModal"></i> ${__html('Time')}</th>
                    <th style="width:160px;">
                       <select class="form-select form-select-sm border-0 bg-transparent p-0" id="filterEmployee" onchange="workLog.applyFilters()" ></select>
                    </th>
                    <th>${__html('ID')}</th>
                    <th>${__html('Color')}</th>
                    <th>${__html('Coating')}</th>
                    <th>
                        <div class="position-relative" style=";">
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

        if (entriesToShow.length === 0) {
            tbody.innerHTML = `
                        <tr>
                            <td colspan="10" class="text-center text-muted py-4">
                                <i class="bi bi-inbox fs-3 mb-3 d-block"></i>
                                ${__html('No work entries found')}
                            </td>
                        </tr>
                    `;
            return;
        }

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

                // Calculate totals for this date
                const entriesForDate = entriesToShow.filter(e => new Date(e.date).toDateString() === entryDate);
                const totalQtyForDate = entriesForDate.reduce((sum, e) => sum + parseFloat(e.qty || 0), 0);
                const totalTimeForDate = entriesForDate.reduce((sum, e) => sum + parseFloat(e.time || 0), 0);

                dateHeader = `
                <tr>
                    <td colspan="7" class="bg-light fw-bold py-2 border-0 text-secondary form-text" >
                        ${dateLabel}
                    </td>
                    <td colspan="1" class="bg-light fw-bold py-2 border-0 text-secondary form-text ${!this.filters.type ? "d-none" : ""}" >${totalQtyForDate}</td>
                    <td colspan="1" class="bg-light fw-bold py-2 border-0 text-secondary form-text ${!this.filters.type ? "d-none" : ""}" >${totalTimeForDate}</td>
                    <td></td>
                </tr>
            `;
                lastDate = entryDate;
            }

            return dateHeader + `
            <tr>
                <td style="width:80px;">
                    <span class="time-badge">${this.formatTime(entry.date)}</span>
                </td>
                <td style="width:160px;white-space:nowrap;">
                    <span class="employee-tag" >${this.getUserName(entry.user_id)}</span>
                </td>
                <td style="width:60px;white-space:nowrap;">
                    ${this.formatIds(entry.order_ids)}
                </td>
                <td tyle="width:80px;">
                    ${entry.color || '-'}
                </td>
                <td tyle="width:80px;">
                    ${entry.coating || '-'}
                </td>
                <td><span class="po product-name" onclick="window.workLog.filterProduct('${entry.product_id}', '${entry.product_name}')">${entry.product_name || entry.title}</span></td>
                <td>
                    <span class="badge ${this.getTypeClass(entry.type)} stage-badge">
                        ${__html(entry.type.charAt(0).toUpperCase() + entry.type.slice(1).replace('-', ' '))}
                    </span>

                    ${entry?.label ? `<span class="badge bg-secondary stage-badge ms-1">${__html(entry.label.charAt(0).toUpperCase() + entry.label.slice(1).replace('-', ' '))}</span>` : ''}
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

    filterProduct(product_id, product_name) {

        // this.filters.product = entry.product_id;
        document.getElementById('productFilter').value = product_name;
        this.applyFilters();
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
        if (confirm(__html('Remove?'))) {

            deleteWorklogRecord({ id }, (response) => {

                if (!response.success) {

                    toast(__html(`Failed to delete work log record: %1$s`, response.error));

                    return;
                }

                this.records = this.records.filter(entry => entry.id !== id);

                toast('Changes applied');

                // Refresh data after deletion
                this.data();
            });
        }
    }

    getUserName(userId) {
        if (!this.users) return userId;

        const user = this.users.find(u => u._id === userId);
        return user ? user.fname + ' ' + user.lname.charAt(0) : userId.substring(0, 6) + "...";
    }

    formatIds(ids) {

        ids = ids ? ids.join(', ') : '-';
        if (ids.length > 8) ids = ids.substring(0, 8) + '...';

        return ids;
    }
}

window.workLog = new WorkLog();
