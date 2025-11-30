import { deleteTransaction } from "../_/api/delete_transaction.js";
import { getOrders } from "../_/api/get_orders.js";
import { ClientSearch } from "../_/components/entity/client_search.js";
import { __html, hideLoader, log, priceFormat, toast } from "../_/helpers/global.js";
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
        this.filters = {
            for: "orders",
            client: {},
            dateFrom: new Date(Date.UTC(new Date().getFullYear(), 0, 1, 0, 0, 0)).toISOString(),
            dateTo: '',
            type: '', // Default to 'All'
            sort_by: 'id',
            sort_dir: 'desc',
        };

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        this.html();

        this.table = new TabulatorFull("#ordersTable", {
            height: "calc(100vh - 51px)",
            layout: "fitColumns",
            pagination: true, //enable pagination
            paginationMode: "remote", //enable remote pagination
            paginationSize: 250,
            selectableRows: 1,
            selectable: true,
            // initialSort: [{ column: "id", dir: "desc" }],
            sortMode: "remote",
            initialHeaderSortDirection: "desc",
            // Handle pagination requests
            ajaxURL: "/orders/",
            ajaxRequestFunc: (url, config, params) => {

                log('Loading data with params:', params, config);

                return new Promise((resolve, reject) => {

                    // Update pagination filters
                    this.filters.offset = params.page ? (params.page - 1) * params.size : 0;
                    this.filters.limit = params.size || 250;

                    // Sorting (Tabulator may send multiple, take first one)
                    let sorters = this.table.getSorters();
                    if (sorters && sorters.length > 0) {
                        this.filters.sort_by = sorters[0].field; // column name
                        this.filters.sort_dir = sorters[0].dir;  // "asc" or "desc"
                    } else {
                        this.filters.sort_by = 'id';
                        this.filters.sort_dir = 'desc';
                    }

                    // Make API call
                    getOrders(this.filters, (response) => {

                        if (!response.success) {
                            reject(response.error);
                            return;
                        }

                        // First load → also init localization/session/footer
                        if (this.firstLoad) {
                            this.settings = response.settings;
                            new Locale(response);
                            new Session();
                            new Footer(response);
                            this.header();
                            this.listeners();
                            this.table.setColumns(this.columns()); // Reapply columns to fix any localization
                            this.firstLoad = false;
                        }

                        this.orders = response.orders;

                        resolve({
                            data: response.orders.records,
                            last_page: Math.ceil(response.orders.total / this.filters.limit),
                            total: response.orders.total
                        });

                        this.summary();

                        hideLoader();
                    });
                });
            },
            rowSelectionChanged: (data, rows) => {
                this.selectedRows = rows;
            },
            cellDblClick: (e, cell) => {
                this.editRow(cell.getRow().getData());
            }
        });
    }

    // load page
    html = () => {

        if (!this.firstLoad) return;

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12 my-0">
                        <!-- Page Header -->
                        <filters-header></filters-header>
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
    }

    header = () => {

        document.querySelector('filters-header').innerHTML = /*html*/`
            <h2 class="mb-4 d-none">
                <i class="fas fa-clipboard-list"></i> ${__html('Orders Journal')}
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
                            <option value="draft">${__html('Estimates')}</option>
                            <option value="manufacturing">${__html('Manufacturing')}</option>
                            <option value="ready">${__html('Ready')}</option>
                            <option value="issued">${__html('Issued')}</option>
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
            </div>`;

        // Initialize client search component
        new ClientSearch();

        // Localize pagination
        document.querySelector('#ordersTable .tabulator-paginator .tabulator-page[data-page="first"]').innerHTML = __html('First page');
        document.querySelector('#ordersTable .tabulator-paginator .tabulator-page[data-page="last"]').innerHTML = __html('Last page');
        document.querySelector('#ordersTable .tabulator-paginator .tabulator-page[data-page="prev"]').innerHTML = __html('←');
        document.querySelector('#ordersTable .tabulator-paginator .tabulator-page[data-page="next"]').innerHTML = __html('→');
    }

    // init page listeners
    listeners = () => {

        if (!this.firstLoad) return;

        // Filter event listeners
        document.getElementById('dateFrom').addEventListener('change', (e) => { this.filters.dateFrom = e.currentTarget.value ? new Date(e.currentTarget.value + 'T00:00:00').toISOString() : ''; this.table.setPage(1); });
        document.getElementById('dateTo').addEventListener('change', (e) => { this.filters.dateTo = e.currentTarget.value ? new Date(e.currentTarget.value + 'T23:59:59').toISOString() : ''; this.table.setPage(1); });
        document.getElementById('typeFilter').addEventListener('change', (e) => { this.filters.type = e.currentTarget.value; this.table.setPage(1); });

        // Button event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => { this.table.setPage(1); });
        document.getElementById('reportBtn').addEventListener('click', () => this.generateReport());
        document.getElementById('deleteBtn').addEventListener('click', () => this.delete());

        // Clear date input on backspace
        document.getElementById('dateFrom').addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                e.target.value = '';
                this.filters.dateFrom = '';
                this.table.setPage(1);
            }
        });

        document.getElementById('dateTo').addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                e.target.value = '';
                this.filters.dateTo = '';
                this.table.setPage(1);
            }
        });

        // Or if using event listeners
        // this.table.on("tableBuilt", () => {
        //     log("Table built successfully!");
        //     // Set initial sort to show correct visual state
        //     this.table.setSort("id", "desc");
        // });

        // Or if using event listeners
        this.table.on("dataLoaded", function () {
            log("Table data loaded successfully!");
        });

        bus.on('table:refresh', (value) => {
            log('Refreshing table data...', value);
            this.filters.client = { name: value.name, eid: value._id };
            this.table.setPage(1);
        });

        this.firstLoad = false;
    }

    columns = () => {
        return [
            {
                title: "ID",
                field: "id",
                width: 80,
                sorter: "number",
                headerSortStartingDir: "desc",
                sorterParams: {
                    dir: "desc"
                },
                formatter: (cell) => {
                    const value = cell.getValue();
                    return `<a href="/order/?id=${value}" target="_blank" class="text-decoration-none fw-bold text-primary">${value}</a>`;
                }
            },
            {
                title: __html("Date"),
                field: "date",
                width: 120,
                formatter: (cell) => {
                    const value = cell.getValue();
                    // const row = cell.getRow().getData();
                    // const timestamp = value || row.date;
                    const date = new Date(value);
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
                title: __html("Estimate"),
                field: "draft",
                width: 110,
                headerSort: false,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (value === true) {
                        return `<div class="d-flex align-items-center justify-content-start h-100"><span class="item-status status-warning">${__html('Estimate')}</span></div>`;
                    }
                    return "";
                }
            },
            {
                title: __html("Total"),
                field: "total",
                width: 110,
                headerSort: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return `<span>${priceFormat(this.settings, value)}</span>`;
                }
            },
            {
                title: __html("Due Date"),
                field: "due_date",
                width: 110,
                headerSort: false,
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
                headerSort: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (!value) return '';
                    const date = new Date(value);
                    return `<span class="fw-bold- text-success-">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
                }
            },
            {
                title: __html("Ready Date"),
                field: "items",
                width: 110,
                headerSort: false,
                formatter: (cell) => {
                    const items = cell.getValue();
                    if (!items || !Array.isArray(items) || items.length === 0) return '';

                    // Check if all items have rdy_date
                    const allHaveRdyDate = items.every(item =>
                        item?.inventory?.rdy_date && item?.inventory?.rdy_date !== ''
                    );

                    if (!allHaveRdyDate) return '';

                    // Find the latest rdy_date
                    const latestDate = items.reduce((latest, item) => {
                        const itemDate = new Date(item?.inventory?.rdy_date);
                        return itemDate > latest ? itemDate : latest;
                    }, new Date(0));

                    return `<span class="fw-bold text-primary">${latestDate.toLocaleDateString()}</span>`;
                },
            },
            {
                title: __html("Issue Date"),
                field: "items",
                width: 110,
                headerSort: false,
                formatter: (cell) => {
                    const items = cell.getValue();

                    if (!items || !Array.isArray(items) || items.length === 0) return '';

                    // Check if all items have rdy_date
                    const allHaveRdyDate = items.every(item =>
                        item?.inventory?.isu_date && item?.inventory?.isu_date !== ''
                    );

                    if (!allHaveRdyDate) return '';

                    // Find the latest isu_date
                    const latestDate = items.reduce((latest, item) => {
                        const itemDate = new Date(item?.inventory?.isu_date);
                        return itemDate > latest ? itemDate : latest;
                    }, new Date(0));

                    return `<span class="fw-bold text-success">${latestDate.toLocaleDateString()}</span>`;
                },
            },
            {
                title: __html("Invoice"),
                field: "invoice",
                width: 120,
                headerSort: false,
                formatter: (cell) => {
                    const waybill = cell.getValue();
                    if (!waybill || !waybill.date || waybill.date === '0000-00-00') return '';
                    const date = new Date(waybill.date);
                    return `<span>${date.toLocaleDateString()}</span>`;
                },
            },
            {
                title: __html("Invoice #"),
                field: "invoice",
                width: 110,
                headerSort: false,
                formatter: (cell) => {
                    const invoice = cell.getValue();
                    if (!invoice || !invoice.number) return '';
                    return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-danger">${__html('INV-%1$', invoice?.number)}</span></div>`;
                },
            },
            {
                title: __html("Waybill"),
                field: "waybill",
                width: 120,
                headerSort: false,
                formatter: (cell) => {
                    const waybill = cell.getValue();
                    if (!waybill || !waybill.date || waybill.date === '0000-00-00') return '';
                    const date = new Date(waybill.date);
                    return `<span>${date.toLocaleDateString()}</span>`;
                },
            },
            {
                title: __html("Waybill #"),
                field: "waybill",
                width: 130,
                headerSort: false,
                formatter: (cell) => {
                    const waybill = cell.getValue();
                    if (!waybill || !waybill.number) return '';
                    return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-danger">${waybill.number}</span></div>`;
                },
            },
            {
                title: __html("Payment"),
                field: "payment",
                width: 128,
                headerSort: false,
                formatter: (cell) => {
                    const payment = cell.getValue();
                    if (!payment || !payment.date || payment.date === '0000-00-00') return '';
                    const date = new Date(payment.date);
                    return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-success">${date.toLocaleDateString()}</span></div>`;
                },
            },
            {
                title: __html("Operator"),
                field: "operator",
                width: 110,
                headerSort: false
            },
            {
                title: __html("Notes"),
                field: "notes",
                headerSort: false,
                minWidth: 180,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return `<span title="${value}">${value}</span>`;
                }
            }
        ];
    }

    delete = () => {

        const selectedData = this.table.getSelectedData();
        if (!selectedData || selectedData.length === 0) {
            toast('No rows selected');
            return;
        }

        if (!confirm(__html('Delete record?'))) return;

        const currentPage = this.table.getPage();

        // Send to db
        deleteTransaction(selectedData, (response) => {

            if (response.success) {

                toast('Successfully removed');

                // Reload current page data
                this.table.setPage(currentPage);

            } else {
                toast('Error deleting rows: ' + response.error);
            }
        });
    }

    summary() {

        const footerContents = document.querySelector('.tabulator-footer-contents');
        if (footerContents) {
            // Create summary table
            const summaryTable = document.createElement('div');
            summaryTable.className = 'summary-table d-inline-block me-3';
            summaryTable.innerHTML = `
                        <table class="table table-sm table-borderless mb-0 d-inline-block">
                            <tr>
                                <td class="p-1 pe-3"><i class="bi bi-hash"></i> ${this.orders.total}</td>
                                <td class="p-1 pe-3"><i class="bi bi-currency-euro me-1 d-none"></i>${priceFormat(this.settings, this.orders.summary.total)} </td>
                                <td class="p-1 pe-3"><i class="bi bi-bank me-1"></i>${priceFormat(this.settings, this.orders.summary.paid)}</td>
                                <td class="p-1 pe-3"><i class="bi bi-receipt me-1"></i>${priceFormat(this.settings, this.orders.summary.waybill)}</td>
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