import { getOrders } from "../_/api/get_orders.js";
import { ClientSearch } from "../_/components/entity/client_search.js";
import { __html, hideLoader, priceFormat } from "../_/helpers/global.js";
import { TabulatorFull } from '../_/libs/tabulator_esm.min.mjs';
import { bus } from "../_/modules/bus.js";
import { Footer } from "../_/modules/footer.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Orders Journal
 * 
 * @version 1.0
 */
class Orders {

    // construct class
    constructor() {

        this.table = null;
        this.firstLoad = true;
        this.selectedRows = [];
        this.modal = null;
        this.filters = {
            for: "orders",
            client: '',
            dateFrom: '',
            dateTo: '',
            type: '' // Default to 'All'
        };

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        this.html();

        this.setupTable();

        this.data();
    }

    data = () => {

        getOrders(this.filters, (response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.orders = response.orders;

            // init locale
            new Locale(response);

            // session
            new Session();

            // render page
            this.render();

            // init footer
            new Footer(response);

            this.listeners();

            // console.log(response);
        });
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12 my-0">
                        <h2 class="mb-4 d-none">
                            <i class="fas fa-clipboard-list"></i> ${__html('Order Journal')}
                        </h2>
                        <!-- Toolbar -->
                        <div class="toolbar border-0 mb-0">
                            <div class="row align-items-center">
                                <div class="col-md-3">
                                    <client-search></client-search>
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label d-none">${__html('From:')}</label>
                                    <input type="date" class="form-control border-0" id="dateFrom">
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label d-none">${__html('To:')}</label>
                                    <input type="date" class="form-control border-0" id="dateTo">
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label d-none">${__html('Type:')}</label>
                                    <select class="form-select border-0" id="typeFilter">
                                        <option value="">${__html('All')}</option>
                                        <option value="draft">${__html('Draft')}</option>
                                        <option value="issued">${__html('Issued')}</option>
                                        <option value="manufactured">${__html('Manufactured')}</option>
                                    </select>
                                </div>
                                <div class="col-md-6 d-flex justify-content-end">
                                    <label class="form-label d-none">&nbsp;</label>
                                    <div class="btn-group d-flex gap-0" role="group">
                                        <button class="btn btn-outline-dark d-flex align-items-center" id="refreshBtn">
                                            <i class="bi bi-arrow-repeat d-flex me-1"></i> ${__html('Refresh')}
                                        </button>
                                        <button class="btn btn-outline-dark d-flex align-items-center" id="reportBtn">
                                            <i class="bi bi-filetype-pdf d-flex me-1"></i> ${__html('Report')}
                                        </button>
                                        <button class="btn btn-outline-dark d-flex align-items-center" id="deleteBtn">
                                           <i class="bi bi-trash d-flex me-1"></i> ${__html('Delete')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Data Grid -->
                        <div class="card border-0">
                            <div class="card-body p-0">
                            <div id="ordersTable"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize client search component
        new ClientSearch();
    }

    // render page
    render = () => {

        this.table.setData(this.orders);

        this.updateSummary();
    }

    // init page listeners
    listeners = () => {

        if (!this.firstLoad) return;

        // Filter event listeners
        document.getElementById('dateFrom').addEventListener('change', (e) => { this.filters.dateFrom = e.currentTarget.value; this.data() });
        document.getElementById('dateTo').addEventListener('change', (e) => { this.filters.dateTo = e.currentTarget.value; this.data() });
        document.getElementById('typeFilter').addEventListener('change', (e) => { this.filters.type = e.currentTarget.value; this.data(); });

        // Button event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => this.data());
        document.getElementById('reportBtn').addEventListener('click', () => this.generateReport());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteSelected());

        // Clear date input on backspace
        document.getElementById('dateFrom').addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                e.target.value = '';
                this.filters.dateFrom = '';
                this.data();
            }
        });

        document.getElementById('dateTo').addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                e.target.value = '';
                this.filters.dateTo = '';
                this.data();
            }
        });

        this.firstLoad = false;
    }

    setupTable() {

        const self = this;

        this.table = new TabulatorFull("#ordersTable", {
            height: "calc(100vh - 51px)",
            layout: "fitColumns",
            pagination: true, //enable pagination
            paginationMode: "local", //enable remote pagination
            paginationSize: 100,
            // footerElement: this.getSummary(),
            selectable: true,
            columns: [
                {
                    title: "ID",
                    field: "id",
                    width: 80,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<a href="/order/?id=${value}" target="_blank" class="text-decoration-none fw-bold text-primary">${value}</a>`;
                    }
                },
                {
                    title: __html("Date"),
                    field: "created",
                    width: 120,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        const row = cell.getRow().getData();
                        const timestamp = value || row.created2;
                        const date = new Date(timestamp * 1000);
                        return `<span>${date.toLocaleDateString()}</span>`;
                    }
                },
                {
                    title: __html("Client"),
                    field: "name",
                    minWidth: 200,
                    formatter: function (cell) {
                        const value = cell.getValue();
                        return `<span class="fw-bold text-dark">${value}</span>`;
                    }
                },
                {
                    title: __html("Draft"),
                    field: "draft",
                    width: 80,
                    formatter: function (cell) {
                        const value = cell.getValue();
                        if (value === true) {
                            return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-warning">${__html('Draft')}</span></div>`;
                        }
                        return "";
                    }
                },
                {
                    title: __html("Type"),
                    field: "tkl",
                    width: 80,
                    formatter: function (cell) {
                        const value = cell.getValue();
                        let badge = '';
                        switch (value) {
                            case '1': badge = '<span class="status-badge status-large">L.</span>'; break;
                            case '2': badge = '<span class="status-badge status-small">K.</span>'; break;
                            case '3': badge = '<span class="status-badge status-both">K&L</span>'; break;
                            default: badge = value;
                        }
                        return badge;
                    }
                },
                { title: __html("Material"), field: "materl", width: 100 },
                {
                    title: __html("Total"),
                    field: "total",
                    width: 120,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span>${priceFormat(self.settings, value)}</span>`;
                    }
                },
                {
                    title: __html("Due Date"),
                    field: "due_date",
                    width: 120,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        if (!value) return '';
                        const date = new Date(value);
                        return `<span class="fw-bold- text-success-">${date.toLocaleDateString()}</span>`;
                    }
                },
                {
                    title: __html("Time"),
                    field: "due_date",
                    width: 80,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        if (!value) return '';
                        const date = new Date(value);
                        return `<span class="fw-bold- text-success-">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
                    }
                },
                // {
                //     title: "Manufacturing Date",
                //     field: "inventory",
                //     width: 110,
                //     formatter: (cell) => {
                //         const inventory = cell.getValue();
                //         if (!inventory || !inventory.isu_date || inventory.isu_date === '0000-00-00') return '';
                //         const isu_date = new Date(inventory.isu_date);
                //         return `<span class="fw-bold text-success">${isu_date.toLocaleDateString()}</span>`;
                //     },
                // },
                // {
                //     title: "Issue Date",
                //     field: "inventory",
                //     width: 110,
                //     formatter: (cell) => {
                //         const inventory = cell.getValue();
                //         if (!inventory || !inventory.mnf_date || inventory.mnf_date === '0000-00-00') return '';
                //         const mnf_date = new Date(inventory.mnf_date);
                //         return `<span class="fw-bold text-success">${mnf_date.toLocaleDateString()}</span>`;
                //     },
                // },
                {
                    title: "Payment",
                    field: "payment",
                    width: 120,
                    formatter: (cell) => {
                        const payment = cell.getValue();
                        if (!payment || !payment.date || payment.date === '0000-00-00') return '';
                        const date = new Date(payment.date);
                        return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-success">${date.toLocaleDateString()}</span></div>`;
                    },
                },
                {
                    title: "Invoice",
                    field: "invoice",
                    width: 120,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.date || waybill.date === '0000-00-00') return '';
                        const date = new Date(waybill.date);
                        return `<span>${date.toLocaleDateString()}</span>`;
                    },
                },
                {
                    title: "Invoice #",
                    field: "invoice",
                    width: 110,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.number) return '';
                        return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-danger">INV-${waybill.number}</span></div>`;
                    },
                },
                {
                    title: "Waybill",
                    field: "waybill",
                    width: 120,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.date || waybill.date === '0000-00-00') return '';
                        const date = new Date(waybill.date);
                        return `<span>${date.toLocaleDateString()}</span>`;
                    },
                },
                {
                    title: "Waybill #",
                    field: "waybill",
                    width: 110,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.number) return '';
                        return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-danger">${waybill.number}</span></div>`;
                    },
                },
                { title: __html("Operator"), field: "operator", width: 100 },
                {
                    title: __html("Notes"),
                    field: "notes",
                    minWidth: 180,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span title="${value}">${value}</span>`;
                    }
                }
            ],
            rowSelectionChanged: (data, rows) => {
                this.selectedRows = rows;
            },
            cellDblClick: (e, cell) => {
                this.editRow(cell.getRow().getData());
            }
        });

        // Or if using event listeners
        this.table.on("tableBuilt", function () {
            console.log("Table built successfully!");
        });

        // Or if using event listeners
        this.table.on("dataLoaded", function () {
            console.log("Table data loaded successfully!");
        });

        bus.on('table:refresh', (value) => {
            console.log('Refreshing table data...', value);
            self.filters.client = value;
            self.data();
        });
    }

    updateSummary() {

        const data = this.table.getData("active");
        const count = data.length;
        let order_total = 0;
        let payment_total = 0;
        let waybill_total = 0;

        data.forEach(row => {
            const amount = parseFloat(row.total) || 0;
            order_total += amount;

            row.payment = row.payment || {};

            if (row.payment.amount && row.payment.date) {
                payment_total += parseFloat(row.payment.amount) || 0;
            }

            if (row.waybill && row.waybill) {
                waybill_total += amount;
            }
        });

        const footerContents = document.querySelector('.tabulator-footer-contents');
        if (footerContents) {
            // Create summary table
            const summaryTable = document.createElement('div');
            summaryTable.className = 'summary-table d-inline-block me-3';
            summaryTable.innerHTML = `
                        <table class="table table-sm table-borderless mb-0 d-inline-block">
                            <tr>
                                <td class="p-1 pe-3"><i class="bi bi-hash"></i> ${count}</td>
                                <td class="p-1 pe-3"><i class="bi bi-currency-euro me-1 d-none"></i> €${order_total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-3"><i class="bi bi-bank me-1"></i> €${payment_total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-3"><i class="bi bi-receipt me-1"></i> €${waybill_total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </table>
                    `;

            // Remove existing summary table if present
            const existingSummary = footerContents.querySelector('.summary-table');
            if (existingSummary) {
                existingSummary.remove();
            }

            // Insert as first element
            footerContents.insertBefore(summaryTable, footerContents.firstChild);
        }
    }
}

new Orders();