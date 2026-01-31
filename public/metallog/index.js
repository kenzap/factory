import { createSupplyRecord } from "../_/api/create_supply_record.js";
import { deleteSupplyRecord } from "../_/api/delete_supply_record.js";
import { getMetalLog } from "../_/api/get_metal_log.js";
import { saveSupplylogValue } from "../_/api/save_supplylog_value.js";
import { SupplierSuggestion } from "../_/components/metal/supplier_suggestion.js";
import { DropdownSuggestion } from "../_/components/products/dropdown_suggestion.js";
import { ProductSearch } from "../_/components/products/product_search.js";
import { __html, hideLoader, onChange, onClick, parseUnit, priceFormat, toast, unescape } from "../_/helpers/global.js";
import { getCoatings, getColors } from "../_/helpers/order.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { getHtml } from "../_/modules/metallog.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

/**
 * MetalLog
 * 
 * @version 1.0
 */
class MetalLog {

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

        document.querySelector('#app').innerHTML = getHtml(this.record, this.records);

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

        let self = this;

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

        // supplier suggestion
        new SupplierSuggestion({ records: self.records }, (suggestion) => {
            console.log('Supplier selected:', suggestion);
        });

        // Add work log record
        onClick('.btn-add-worklog-record', (e) => {

            e.preventDefault();

            if (e.target.classList.contains('disabled')) return;

            // Clear any existing validation states
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

            // Validate required fields
            let requiredFields = [
                { selector: '#productColor', name: __html('Color') },
                { selector: '#productCoating', name: __html('Coating') },
                { selector: '#width', name: __html('Width') },
                { selector: '#length', name: __html('Length') },
                { selector: '#thickness', name: __html('Thickness') }
            ];

            let type = 'metal';
            let cm = document.querySelector('#clientMaterial').checked ? true : false;
            let hasErrors = false, softErrors = false;

            // Validate required fields
            for (const field of requiredFields) {
                const element = document.querySelector(field.selector);
                if (!element || !element.value.trim()) {
                    element?.classList.add('is-invalid');

                    // Add invalid feedback div
                    const feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback';
                    feedback.textContent = __html('Field required: %1$', field.name);
                    element?.parentNode.appendChild(feedback);

                    hasErrors = true;
                    if (!element?.classList.contains('focused')) {
                        element?.focus();
                        element?.classList.add('focused');
                    }
                }
            }

            // Validate quantity is a positive number
            const qtyValue = 1;
            const qtyElement = document.querySelector('#qty');
            if (isNaN(qtyValue) || qtyValue <= 0) {
                qtyElement?.classList.add('is-invalid');

                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'Quantity must be a positive number';
                qtyElement?.parentNode.appendChild(feedback);

                hasErrors = true;
                if (!hasErrors) qtyElement?.focus();
            }

            // Validate color selection
            const colorElement = document.querySelector('#productColor');
            if (!cm && colorElement && this.colorSuggestions.indexOf(colorElement.value.trim()) === -1) {
                colorElement.classList.add('is-invalid');

                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'Invalid color selected';
                colorElement.parentNode.appendChild(feedback);

                softErrors = true;
            }

            // Validate coating selection
            const coatingElement = document.querySelector('#productCoating');
            if (!cm && coatingElement && this.coatingSuggestions.indexOf(coatingElement.value.trim()) === -1) {
                coatingElement.classList.add('is-invalid');

                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'Invalid coating selected';
                coatingElement.parentNode.appendChild(feedback);

                softErrors = true;
            }

            // If there are validation errors, show toast and return
            if (hasErrors) {
                toast(__html('Please fix the validation errors'));
                return;
            }

            if (softErrors) {
                if (!confirm(__html('Some fields have warnings. Do you want to proceed?'))) {
                    return;
                }
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
                length: parseFloat(document.querySelector('#length').value.trim()) * 1000,
                _width: parseFloat(document.querySelector('#width').value.trim()),
                _length: parseFloat(document.querySelector('#length').value.trim()) * 1000,
                thickness: parseFloat(document.querySelector('#thickness').value.trim()),
                cm: document.querySelector('#clientMaterial').checked ? true : false,
                qty: qtyValue,
                price: parseFloat(document.querySelector('#price').value),
                document: {
                    id: document.querySelector('#document_id').value,
                    date: document.querySelector('#document_date').value ? new Date(document.querySelector('#document_date').value).toISOString() : null,
                },
                notes: document.querySelector('#notes').value.trim(),
                user_id: this.user.id,
            }

            // console.log('Creating work log record:', record);

            // Show spinner and disable button
            document.querySelector('.btn-add-worklog-record').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>';
            document.querySelector('.btn-add-worklog-record').disabled = true;

            // insert record
            createSupplyRecord(record, (response) => {

                document.querySelector('.btn-add-worklog-record').innerHTML = '<i class="bi bi-plus-circle me-1"></i>';
                document.querySelector('.btn-add-worklog-record').disabled = false;

                if (response.success) {

                    toast('Changes applied');

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

        // Editable notes functionality
        onClick('.editable-notes', e => {
            e.stopPropagation(); // Prevent triggering parent click events
        });

        document.addEventListener('change', e => {
            if (e.target.classList.contains('editable-notes')) {
                const coilId = e.target.dataset.coilId;
                const field = e.target.dataset.field;
                const newValue = e.target.value;

                // Find the coil in stock and update the specific field
                const coil = self.records.find(c => c._id === coilId);
                if (coil) {
                    coil[field] = newValue;
                    console.log(`${field} updated for coil:`, coilId, `New ${field}:`, newValue);

                    // Create update object with the specific field
                    const updateData = { _id: coilId, [field]: newValue };

                    saveSupplylogValue(updateData, (response) => {
                        if (response.success) {
                            console.log(`${field} saved successfully for coil:`, coilId);
                        } else {
                            console.error(`Error saving ${field} for coil:`, coilId);
                        }
                    });
                }
            }
        });

        document.addEventListener('keypress', e => {
            if (e.target.classList.contains('editable-notes') && e.key === 'Enter') {
                e.target.blur();
            }
        });

        // Radio button change listener for coil types
        document.addEventListener('change', e => {
            if (e.target.classList.contains('form-check-input') && e.target.type === 'radio') {
                const coilId = e.target.name.replace('type_', '');
                const selectedType = e.target.value;

                // console.log('Coil type changed:', coilId, 'New type:', selectedType);

                // Find the coil and update its type
                const coil = this.records.find(c => c._id === coilId);
                if (coil) {
                    coil.type = selectedType;

                    // Save to backend
                    saveSupplylogValue({ _id: coilId, sofftness: selectedType }, (response) => {
                        if (response.success) {
                            console.log('Coil type saved successfully:', coilId);
                        } else {
                            console.error('Error saving coil type:', coilId);
                        }
                    });
                }
            }
        });

        // Handle Enter key navigation in form fields
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.closest('#supplyEntryForm')) {
                e.preventDefault();

                // Get all focusable form elements
                const formElements = document.querySelectorAll('#supplyEntryForm input, #supplyEntryForm select, #supplyEntryForm textarea');
                const focusableElements = Array.from(formElements).filter(el =>
                    !el.disabled &&
                    !el.readOnly &&
                    el.type !== 'hidden' &&
                    el.offsetParent !== null // Element is visible
                );

                const currentIndex = focusableElements.indexOf(e.target);
                const nextIndex = currentIndex + 1;

                // Move to next element or first element if at the end
                if (nextIndex < focusableElements.length) {
                    focusableElements[nextIndex].focus();
                } else {
                    focusableElements[0].focus();
                }
            }
        });
    }

    async data() {

        // get products
        getMetalLog(this.filters, (response) => {

            console.log(response);

            // show UI loader
            if (!response.success) return;

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'metal_stock_management')) return

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
                title: __html('Metal Log'),
                icon: 'boxes',
                style: 'navbar-light',
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`,
                user: this.user
            });

            this.view();

            this.renderRecords();
            this.updateSummary();

            this.firstLoad = false;

            document.title = __html('Metal Log');
        });
    }

    renderRecords() {

        const theader = document.getElementById('workLogHeader');
        const tbody = document.getElementById('workLogBody');
        const entriesToShow = this.filteredEntries.length > 0 ? this.filteredEntries : this.records;

        if (entriesToShow.length === 0) {
            tbody.innerHTML = `
                    <tr>
                        <td colspan="12" class="text-center text-muted py-4">
                            <i class="bi bi-inbox fs-3 mb-3 d-block"></i>
                            ${__html('No supply entries found')}
                        </td>
                    </tr>
                `;
            return;
        }

        if (this.firstLoad) theader.innerHTML = `
        <tr>
            <th>${__html('Color')}</th>
            <th>${__html('Status')}</th>
            <th>${__html('Thickness')}</th>
            <th>
                <div class="position-relative" >
                    <select class="form-select ms-0 form-select-sm text-start border-0 bg-transparent ms-0 ps-0 py-0" id="widthFilter" onchange="metallog.applyFilters()" style="width:auto; height:21px;">
                        <option value="">${__html('Width')}</option>
                        <option value="1250" ${this.filters.width === '1250' ? 'selected' : ''}>~1250</option>
                        <option value="1249" ${this.filters.width === '1249' ? 'selected' : ''}>&lt;1250</option>
                    </select>
                </div>
            </th>
            <th>${__html('Length')}</th>
            <th>${__html('Qty')}</th>
            <th>${__html('Supplier')}</th>
            <th>${__html('Parameters')}</th>
            <th>${__html('Price')}</th>
            <th>${__html('Notes')}</th>
            <th>${__html('Document')}</th>
            <th></th>
        </tr>
    `;

        // Group entries by coating, then by color
        const entriesByCoatingAndColor = entriesToShow.reduce((groups, entry) => {
            const coating = entry.coating || 'No Coating';
            const color = entry.color || 'No Color';

            if (!groups[coating]) {
                groups[coating] = {};
            }
            if (!groups[coating][color]) {
                groups[coating][color] = [];
            }
            groups[coating][color].push(entry);
            return groups;
        }, {});

        let lastCoating = null;
        tbody.innerHTML = Object.entries(entriesByCoatingAndColor).map(([coating, colorGroups]) => {
            let coatingHeader = '';
            let colorRows = '';

            // Calculate totals for the entire coating group
            if (lastCoating !== coating) {
                const allCoatingEntries = Object.values(colorGroups).flat();
                const availableCoatingEntries = allCoatingEntries.filter(entry => entry.status === 'available');

                const totalLength = Math.round(availableCoatingEntries.reduce((sum, entry) => sum + parseFloat(entry.length || 0), 0) / 1000, 0);
                const totalPrice = availableCoatingEntries.reduce((sum, entry) => {
                    const area = (parseFloat(entry.width || 0) / 1000) * (parseFloat(entry.length || 0) / 1000);
                    return sum + (area * parseFloat(entry.price || 0));
                }, 0);
                const totalArea = availableCoatingEntries.reduce((sum, entry) => {
                    const area = (parseFloat(entry.width || 0) / 1000) * (parseFloat(entry.length || 0) / 1000);
                    return sum + area;
                }, 0);

                coatingHeader = `
                <tr class="thead-dark bg-dark d-none">
                    <th colspan="12" class="bg-dark text-white fw-bold py-2 border-0">
                        ${coating} ${parseUnit(this.settings, totalLength.toLocaleString(), "t/m")} | ${parseUnit(this.settings, totalArea.toFixed(2), "m²")} | ${priceFormat(this.settings, totalPrice)}
                    </th>
                </tr>
            `;
                lastCoating = coating;
            }

            // Process each color group within the coating
            colorRows = Object.entries(colorGroups).map(([color, entries]) => {
                // Calculate totals for this color group
                const availableColorEntries = entries.filter(entry => entry.status === 'available');
                const colorTotalLength = Math.round(availableColorEntries.reduce((sum, entry) => sum + parseFloat(entry.length || 0), 0) / 1000, 0);
                const colorTotalPrice = availableColorEntries.reduce((sum, entry) => {
                    const area = (parseFloat(entry.width || 0) / 1000) * (parseFloat(entry.length || 0) / 1000);
                    return sum + (area * parseFloat(entry.price || 0));
                }, 0);
                const colorTotalArea = availableColorEntries.reduce((sum, entry) => {
                    const area = (parseFloat(entry.width || 0) / 1000) * (parseFloat(entry.length || 0) / 1000);
                    return sum + area;
                }, 0);

                // Color subheader (only show if there are multiple colors or totals are significant)
                const colorHeader = availableColorEntries.length > 0 ? `
                <tr class="bg-light">
                    <th colspan="12" class="bg-light text-dark fw-normal py-1 border-0 ps-2" >
                        <strong class="text-uppercase">${coating} - ${color}</strong> - ${parseUnit(colorTotalLength.toLocaleString(), this.settings, "t/m")} | ${parseUnit(colorTotalArea.toFixed(2), this.settings, "m²")} | ${priceFormat(this.settings, colorTotalPrice)}
                    </th>
                </tr>
            ` : '';

                // Sort entries by width and length
                const sortedEntries = entries.sort((a, b) => {
                    const widthDiff = parseFloat(a.width || 0) - parseFloat(b.width || 0);
                    if (widthDiff !== 0) return widthDiff;
                    return parseFloat(a.length || 0) - parseFloat(b.length || 0);
                });

                const entryRows = sortedEntries.map((entry, i) => `
            <tr class="${i % 2 === 0 ? 'table-light' : ''}">
                <td style="width:80px;" class="align-middle ps-5">
                    ${entry.color || '-'}
                </td>
                <td style="width:80px;" class="align-middle">
                    ${this.supplyStatusBadge(entry)}
                </td>
                <td style="width:80px;" class="align-middle">
                    ${this.renderDimension(entry, 'thickness')}
                </td>
                <td style="width:50px;" class="align-middle">${this.renderDimension(entry, 'width')}</td>
                <td style="width:180px;" class="align-middle">${this.renderDimension(entry, 'length')}</td>
                <td class="align-middle"><strong>${entry.qty}</strong></td>
                <td style="width:80px;" class="text-truncate align-middle">
                    <input type="text" class="editable-notes border-0 bg-transparent w-100" value="${entry?.supplier}" data-coil-id="${entry._id}" data-field="supplier" placeholder="">
                </td>
                <td style="width:160px;" class="align-middle">
                    ${this.renderParameters(entry)}
                </td>
                <td style="width:160px;" class="align-middle">
                    ${priceFormat(this.settings, entry?.price,)}
                </td>
                <td style="width:160px;" class="align-middle">
                    <div class="coil-note ms-2 flex-fill"><input type="text" class="editable-notes border-0 bg-transparent w-100" value="${entry?.notes}" data-field="notes" data-coil-id="${entry._id}" placeholder=""></div>
                </td>
                <td style="width:160px;" class="align-middle">
                    <span class="item-status status-primary ${!entry?.document?.id ? "d-none" : ""}" >${entry?.document?.id}</span>
                </td>
                <td class="text-end align-middle">
                    ${this.supplyActions(entry, i)}
                </td>
            </tr>`).join('');

                return colorHeader + entryRows;
            }).join('');

            return coatingHeader + colorRows;
        }).join('');
    }

    supplyStatusBadge(entry) {

        if (!entry.status) return ``;
        if (entry.status == 'ordered') return `<span class="item-status status-warning">${__html('Ordered')}</span>`;
        if (entry.status == 'available') return `<span class="item-status status-success">${__html('Available')}</span>`;
        if (entry.status == 'used') return `<span class="item-status status-secondary">${__html('Used')}</span>`;

        return `<span class="item-status status-success">${__html('Available')}</span>`;
    }

    supplyActions(entry, i) {

        return `
            <div class="dropdown tableActionsCont py-1">
                <svg id="tableActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                </svg>
                <ul class="dropdown-menu" aria-labelledby="tableActions${i}">
                    ${entry?.status == 'used' ? `<li><a class="dropdown-item po set-cm" href="#" data-index="${i}" onclick="metallog.updateStatus('${entry._id}', 'available')"><i class="bi bi-arrow-return-right"></i> ${__html('Available')}</a></li>` : ''}
                    ${entry?.status == 'ordered' ? `<li><a class="dropdown-item po set-cm" href="#" data-index="${i}" onclick="metallog.updateStatus('${entry._id}', 'available')"><i class="bi bi-arrow-return-right"></i> ${__html('Available')}</a></li>` : ''}
                    ${entry?.status == 'available' || entry?.status == 'instock' ? `<li><a class="dropdown-item po set-cm" href="#" data-index="${i}" onclick="metallog.updateStatus('${entry._id}', 'used')"><i class="bi bi-arrow-return-right"></i> ${__html('Used')}</a></li>` : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item po delete-row" href="#" data-type="delete" data-index="${i}" onclick="metallog.deleteEntry(event, '${entry._id}')"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                </ul>
            </div>`;
    }

    renderDimension(entry, type) {

        if (type === 'thickness') {
            return `<span class="dimension-entry">${parseUnit(entry.thickness, this.settings, "mm")}</span>`;
        }

        if (type === 'width') {
            return `<span class="dimension-entry">${parseUnit(entry.width, this.settings, "mm")}</span>`;
        }

        if (type === 'length') {
            return `<span class="dimension-entry">${this.formatCoilLength(entry.length)}</span>`;
        }
    }

    renderProductName(entry) {

        if (entry.type === 'product') {
            return `<span class="product-name">${entry.product_name}</span>`;
        }

        if (entry.type === 'metal') {
            return `<span class="product-name">${entry.width} x ${this.formatCoilLength(entry.length)}</span>`;
        }

        return `<span class="product-name">${entry.product_name}</span>`;
    }

    // ${getDimUnit(this.settings)}
    formatCoilLength(length) {

        if (!length) return '0 m';
        return `${parseUnit((length / 1000), this.settings, "m")}`;
    }

    renderParameters(entry) {

        const params = entry.parameters || {};

        return `
            <div class="coil-parameters">
                <div class="d-flex me-2">
                    <div class="form-check form-check-inline cbo m-0 p-0">
                        <input class="form-check-input mx-1" type="radio" name="type_${entry._id}" id="soft_${entry._id}" value="soft" data-index="0" data-field="type" ${params?.softness === 'soft' ? 'checked' : ''}  >
                    </div>
                    <div class="form-check form-check-inline cbs m-0 p-0">
                        <input class="form-check-input mx-1" type="radio" name="type_${entry._id}" id="hard_${entry._id}" value="hard" data-index="0" data-field="type" ${params?.softness === 'hard' ? 'checked' : ''}  >
                    </div>
                    <div class="form-check form-check-inline cbw m-0 p-0">
                        <input class="form-check-input mx-1" type="radio" name="type_${entry._id}" id="unknown_${entry._id}" value="unknown" data-index="0" data-field="type" ${params?.softness === 'unknown' ? 'checked' : ''}  >
                    </div>
                </div> 
            </div>`;
    }

    applyFilters() {

        const employeeFilter = document.getElementById('filterEmployee')?.value || '';
        const typeFilter = document.getElementById('filterType')?.value || '';
        const filterStartDate = document.getElementById('filterStartDate')?.value || '';
        const widthFilter = document.getElementById('widthFilter')?.value || '';
        const filterEndDate = document.getElementById('filterEndDate')?.value || '';

        this.filters = {
            width: parseFloat(widthFilter),
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

        // Calculate total length in t/m (convert from mm to m and divide by 1000 for t/m)
        const totalLength = Math.round(entriesToShow.reduce((sum, entry) => sum + parseFloat(entry.length || 0), 0) / 1000);

        // Calculate total area in m²
        const totalArea = entriesToShow.reduce((sum, entry) => {
            const area = (parseFloat(entry.width || 0) / 1000) * (parseFloat(entry.length || 0) / 1000);
            return sum + area;
        }, 0);

        // Calculate total cost
        const totalCost = entriesToShow.reduce((sum, entry) => {
            const area = (parseFloat(entry.width || 0) / 1000) * (parseFloat(entry.length || 0) / 1000);
            return sum + (area * parseFloat(entry.price || 0));
        }, 0);

        // Update fixed bottom summary
        document.getElementById('s1').textContent = totalEntries;
        document.getElementById('s2').textContent = `${totalLength.toLocaleString()} t/m`;
        document.getElementById('s3').textContent = `${totalArea.toFixed(2)} m²`;
        document.getElementById('s4').textContent = priceFormat(this.settings, totalCost);

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

    updateStatus(coilId, newValue) {
        if (confirm('Update status?')) {

            const field = "status";

            // Find the coil in stock and update the specific field
            const coil = this.records.find(c => c._id === coilId);
            if (coil) {
                coil[field] = newValue;
                console.log(`${field} updated for coil:`, coilId, `New ${field}:`, newValue);

                // Create update object with the specific field
                const updateData = { _id: coilId, [field]: newValue };

                saveSupplylogValue(updateData, (response) => {
                    if (response.success) {

                        toast('Changes applied');

                        this.data();

                        // setTimeout(() => { this.data(); }, 1500);
                    } else {
                        console.error(`Error saving ${field} for coil:`, coilId);
                    }
                });
            }
        }
    }

    deleteEntry(event, id) {

        event.preventDefault();

        if (confirm('Delete this record?')) {
            // Save current scroll position
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            deleteSupplyRecord({ id }, (response) => {

                if (!response.success) {

                    console.error('Error deleting work log record:', response.error);
                    return;
                }

                this.records = this.records.filter(entry => entry.id !== id);

                toast('Changes applied');

                // Refresh data after deletion
                this.data();

                // Restore scroll position after DOM updates
                setTimeout(() => {
                    window.scrollTo(0, scrollPosition);
                }, 100);

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

window.metallog = new MetalLog();