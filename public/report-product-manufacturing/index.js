import { getProductManufacturingReport } from "../_/api/get_product_manufacturing_report.js";
import { __html, hideLoader } from "../_/helpers/global.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { getHtml } from "../_/modules/performance/product.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class ProductManufacturingReport {

    constructor() {
        this.filters = {
            user_id: "",
            type: "",
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0)).toISOString(),
            dateTo: ""
        };

        this.product_report = [];
        this.init();
    }

    init() {
        new Modal();
        this.data();
        hideLoader();
    }

    view() {
        if (document.querySelector('.product-manufacturing-report')) return;

        document.querySelector('#app').innerHTML = `<div class="product-manufacturing-report">${getHtml(this.filters)}</div>`;
    }

    data() {
        getProductManufacturingReport(this.filters, (response) => {
            if (!response.success) return;
            if (!isAuthorized(response, 'product_manufacturing_report')) return;

            new Locale(response);
            hideLoader();

            this.user = response.user;
            this.users = response.users || [];
            this.settings = response.settings || {};
            this.product_report = response.product_report || [];

            new Session();
            new Header({
                hidden: false,
                title: __html('Product Manufacturing Report'),
                icon: 'bar-chart-line',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-secondary sign-out"><i class="bi bi-box-arrow-right"></i> ${__html('Sign out')}</button>`
            });

            this.view();
            this.populateFilters();
            this.renderTable();
            document.title = __html('Product Manufacturing Report');
        });
    }

    populateFilters() {
        const employeeSelect = document.getElementById('filterEmployee');
        const typeSelect = document.getElementById('filterType');

        if (employeeSelect) {
            if (this.users.length > 0) {
                employeeSelect.innerHTML = `<option value="">${__html('All')}</option>` + this.users.map(user => `
                    <option value="${user._id}" ${this.filters.user_id === user._id ? 'selected' : ''}>${user.fname} ${user.lname?.charAt(0) || ''}</option>
                `).join('');
            } else {
                employeeSelect.innerHTML = `<option value="">${__html('No Employees')}</option>`;
            }
        }

        if (typeSelect) {
            typeSelect.innerHTML = `
                <option value="" ${this.filters.type === '' ? 'selected' : ''}>${__html('All')}</option>
                ${this.settings?.work_categories?.map(category =>
                `<option value="${category.id}" ${this.filters.type === category.id ? 'selected' : ''}>${__html(category.name)}</option>`
            ).join('') || ''}
            `;
        }
    }

    renderTable() {
        const data = [...this.product_report].sort((a, b) =>
            (a.product_name || '').localeCompare((b.product_name || ''))
        );

        const totalOperationsQty = data.reduce((sum, item) => sum + (parseFloat(item.operations_qty) || 0), 0);
        const totalTime = data.reduce((sum, item) => sum + (parseFloat(item.total_time) || 0), 0);

        let tableHTML = `
            <table class="work-summary-table">
                <thead>
                    <tr>
                        <th>${__html('Product')}</th>
                        <th>${__html('Total operations')}</th>
                        <th>${__html('Time')}</th>
                        <th>${__html('Details')}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach((item, index) => {
            tableHTML += `
                <tr>
                    <td>${item.product_name || '-'}</td>
                    <td>${parseFloat(item.operations_qty) || 0}</td>
                    <td>${parseFloat(item.total_time) || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="productManufacturingReport.openDetails(${index})">
                            ${__html('View')}
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                <tr class="table-light">
                    <td><strong>${__html('Total')}</strong></td>
                    <td><strong>${totalOperationsQty}</strong></td>
                    <td><strong>${totalTime}</strong></td>
                    <td></td>
                </tr>
                </tbody>
            </table>
        `;

        document.getElementById('productManufacturingTable').innerHTML = tableHTML;
    }

    openDetails(index) {
        const item = this.product_report[index];
        if (!item) return;

        const tags = Array.isArray(item.tag_breakdown) ? item.tag_breakdown : [];
        const tagColumns = tags.map((tag) => tag.tag);
        const formatOperationLabel = (value = '') => {
            const raw = String(value || '').trim();
            if (!raw) return '';
            const parts = raw.split('/').map((part) => part.trim()).filter(Boolean);
            if (parts.length <= 1) return __html(parts[0] || raw);
            const typeLabel = __html(parts[0]);
            const tagLabel = __html(parts.slice(1).join(' / '));
            return `${typeLabel} / ${tagLabel}`;
        };

        const qtyCells = tagColumns.map((tagName) => {
            const found = tags.find((t) => t.tag === tagName);
            return `<td>${parseFloat(found?.total_qty) || 0}</td>`;
        }).join('');

        const listRows = tags.map((tag) => `
            <tr>
                <td>${formatOperationLabel(tag.tag)}</td>
                <td>${parseFloat(tag.total_qty) || 0}</td>
                <td>${parseFloat(tag.total_time) || 0}</td>
            </tr>
        `).join('');

        const modal = document.querySelector('.modal-item');
        if (!modal) return;
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.remove('modal-sm', 'modal-xl', 'modal-fullscreen');
            modalDialog.classList.add('modal-lg');
        }

        modal.querySelector('.modal-title').textContent = `${__html(item.product_name || '-')} - ${__html('Operations breakdown')}`;
        modal.querySelector('.modal-body').innerHTML = `
            <div class="table-responsive mb-3">
                <table class="table table-sm table-bordered align-middle mb-0">
                    <thead>
                        <tr>
                            ${tagColumns.map((tag) => `<th>${formatOperationLabel(tag)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            ${qtyCells || `<td>${__html('No operations')}</td>`}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                    <thead>
                        <tr>
                            <th>${__html('Operation')}</th>
                            <th>${__html('Qty')}</th>
                            <th>${__html('Time')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${listRows || `<tr><td colspan="3">${__html('No operations')}</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;

        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();
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
}

window.productManufacturingReport = new ProductManufacturingReport();
