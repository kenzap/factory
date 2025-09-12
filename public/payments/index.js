import { deleteTransaction } from "../_/api/delete_transaction.js";
import { getTransactions } from "../_/api/get_transactions.js";
import { saveTransaction } from "../_/api/save_transaction.js";
import { ClientSearch } from "../_/components/entity/client_search.js";
import { Locale } from "../_/modules/locale.js";
import { __html, hideLoader, log, priceFormat, toast } from "/_/helpers/global.js";
import { TabulatorFull } from '/_/libs/tabulator_esm.min.mjs';
import { bus } from "/_/modules/bus.js";
import { Footer } from "/_/modules/footer.js";
import { Modal } from "/_/modules/modal.js";
import { Session } from "/_/modules/session.js";

/**
 * Transaction Log
 * 
 * @version 1.0
 */
class Transactions {

    // construct class
    constructor() {

        this.table = null;
        this.firstLoad = true;
        this.selectedRows = [];
        this.filters = {
            client: '',
            dateFrom: '',
            dateTo: '',
            type: ''
        };

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        this.html();

        this.table = new TabulatorFull("#paymentsTable", {
            height: "calc(100vh - 51px)",
            layout: "fitColumns",
            pagination: true, //enable pagination
            paginationMode: "remote", //enable remote pagination
            paginationSize: 250,
            selectableRows: 1,
            selectable: true,
            sortMode: "remote",
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
                        this.filters.sort_by = null;
                        this.filters.sort_dir = null;
                    }

                    // Make API call
                    getTransactions(this.filters, (response) => {

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
                        <!-- Header -->
                        <filters-header></filters-header>
                        <!-- Data Grid -->
                        <div class="card border-0">
                            <div class="card-body p-0">
                                <div id="paymentsTable"></div>
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
                            <option value="paid">${__html('Paid')}</option>
                            <option value="unpaid">${__html('Unpaid')}</option>
                            <option value="transaction">${__html('Transaction')}</option>
                        </select>
                    </div>
                    <div class="col-md-6 d-flex justify-content-end">
                        <label class="form-label d-none">&nbsp;</label>
                        <div class="btn-group d-flex d-flex gap-0" role="group">
                            <button class="btn btn-outline-dark d-flex align-items-center" id="refreshBtn">
                                <i class="bi bi-arrow-repeat d-flex me-1"></i> ${__html('Refresh')}
                            </button>
                            <button class="btn btn-outline-dark d-flex align-items-center" id="saveBtn">
                                <i class="bi bi-check-circle d-flex me-1"></i> ${__html('Save')}
                            </button>
                            <button class="btn btn-outline-dark d-flex align-items-center" id="reportBtn">
                                <i class="bi bi-filetype-pdf d-flex me-1"></i> ${__html('Report')}
                            </button>
                            <button class="btn btn-outline-dark d-flex align-items-center" id="addBtn">
                                <i class="bi bi-plus-circle d-flex me-1"></i> ${__html('Add')}
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
        document.querySelector('#paymentsTable .tabulator-paginator .tabulator-page[data-page="first"]').innerHTML = __html('First page');
        document.querySelector('#paymentsTable .tabulator-paginator .tabulator-page[data-page="last"]').innerHTML = __html('Last page');
        document.querySelector('#paymentsTable .tabulator-paginator .tabulator-page[data-page="prev"]').innerHTML = __html('←');
        document.querySelector('#paymentsTable .tabulator-paginator .tabulator-page[data-page="next"]').innerHTML = __html('→');
    }

    // init page listeners
    listeners = () => {

        if (!this.firstLoad) return;

        // Filter event listeners
        // document.getElementById('clientFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFrom').addEventListener('change', (e) => { this.filters.dateFrom = new Date(e.currentTarget.value + 'T00:00:00').toISOString(); this.table.setPage(1); });
        document.getElementById('dateTo').addEventListener('change', (e) => { this.filters.dateTo = new Date(e.currentTarget.value + 'T23:59:59').toISOString(); this.table.setPage(1); });
        document.getElementById('typeFilter').addEventListener('change', (e) => { this.filters.type = e.currentTarget.value; this.table.setPage(1); });

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

        // Button event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => this.table.setPage(1));
        document.getElementById('saveBtn').addEventListener('click', () => this.save());
        document.getElementById('addBtn').addEventListener('click', () => this.add());
        document.getElementById('reportBtn').addEventListener('click', () => this.generateReport());
        document.getElementById('deleteBtn').addEventListener('click', () => this.delete());

        // Or if using event listeners
        this.table.on("tableBuilt", function () {
            log("Table built successfully!");
        });

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
                width: 100,
                sorter: "number",
                sorterParams: {
                    dir: "desc"
                },
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (!value) return `<span class="item-status status-danger">${__html('transaction')}</span>`;
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
                minWidth: 150,
                formatter: function (cell) {
                    const value = cell.getValue();
                    return `<span class="fw-bold text-dark">${value}</span>`;
                }
            },
            {
                title: __html("Total"),
                field: "total",
                width: 120,
                headerSort: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return `<span>${priceFormat(this.settings, value)}</span>`;
                }
            },
            {
                title: __html("Payment"),
                field: "payment",
                width: 128,
                headerSort: false,
                sorter: (a, b) => {
                    const dateA = a && a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b && b.date ? new Date(b.date).getTime() : 0;
                    return dateA - dateB;
                },
                formatter: (cell) => {
                    const payment = cell.getValue();
                    if (!payment || !payment.date || payment.date === '0000-00-00') return '';
                    const date = new Date(payment.date);
                    return `<span class="item-status status-success">${date.toLocaleDateString()}</span>`;
                },
                cellClick: (e, cell) => {
                    // Create date input element
                    const input = document.createElement('input');
                    input.type = 'date';
                    input.className = 'form-control';
                    const payment = cell.getValue() || {};
                    input.value = payment.date || '';

                    // Position the input over the cell
                    const cellElement = cell.getElement();
                    input.style.position = 'absolute';
                    input.style.width = cellElement.offsetWidth + 'px';
                    input.style.height = cellElement.offsetHeight + 'px';
                    input.style.zIndex = '1000';

                    // Position relative to cell
                    const rect = cellElement.getBoundingClientRect();
                    input.style.left = rect.left + 'px';
                    input.style.top = rect.top + 'px';

                    document.body.appendChild(input);
                    input.focus();
                    input.click(); // Trigger date picker

                    // Handle value change
                    input.addEventListener('change', () => {
                        const currentPayment = cell.getValue() || {};
                        cell.setValue({ ...currentPayment, date: input.value });
                        document.body.removeChild(input);
                    });

                    // Handle blur (click away)
                    input.addEventListener('blur', () => {
                        setTimeout(() => {
                            if (document.body.contains(input)) {
                                document.body.removeChild(input);
                            }
                        }, 100);
                    });
                },
                cellEdited: (cell) => {
                    const rowData = cell.getRow().getData();
                    const rowId = rowData.id;

                    // Initialize editedRows array if it doesn't exist
                    if (!this.editedRows) {
                        this.editedRows = new Set();
                    }

                    // Add row ID to edited rows set
                    this.editedRows.add(rowId);

                    // Add visual indicator to the entire row
                    const rowElement = cell.getRow().getElement();
                    rowElement.classList.add('table-warning');

                    // Refresh the cell to update formatter
                    cell.getRow().reformat();
                }
            },
            {
                title: __html("Amount"),
                field: "payment",
                width: 100,
                headerSort: false,
                sorter: (a, b) => {
                    const dateA = a && a.amount ? a.amount : 0;
                    const dateB = b && b.amount ? b.amount : 0;
                    return dateA - dateB;
                },
                formatter: (cell) => {
                    const payment = cell.getValue() || {};
                    const amount = payment.amount;
                    const rowData = cell.getRow().getData();
                    const isEdited = this.editedRows && this.editedRows.has(rowData.id);
                    const bgClass = isEdited ? 'bg-warning bg-opacity-25' : '';
                    return `<span class="fw-bold- ${amount < 0 ? 'text-danger' : 'text-success-'} ${bgClass}">${amount ? priceFormat(this.settings, amount) : ""}</span>`;
                },
                cellClick: (e, cell) => {

                    // Create date input element
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'form-control';
                    const payment = cell.getValue() || {};
                    input.value = payment.amount || '';

                    // Position the input over the cell
                    const cellElement = cell.getElement();
                    input.style.position = 'absolute';
                    input.style.width = cellElement.offsetWidth + 'px';
                    input.style.height = cellElement.offsetHeight + 'px';
                    input.style.zIndex = '1000';

                    // Position relative to cell
                    const rect = cellElement.getBoundingClientRect();
                    input.style.left = rect.left + 'px';
                    input.style.top = rect.top + 'px';

                    // Handle blur specifically when input is empty to copy from total
                    if (!input.value.trim()) {
                        const rowData = cell.getRow().getData();
                        const totalValue = parseFloat(rowData.total) || 0;
                        input.value = totalValue.toFixed(2);
                        cell.setValue({ ...payment, amount: input.value });
                    }

                    document.body.appendChild(input);
                    input.focus();
                    input.click(); // Trigger date picker

                    // Allow only numbers and decimals
                    input.addEventListener('input', (e) => {
                        let value = e.target.value;
                        // Remove any character that's not a digit, decimal point, or minus sign
                        value = value.replace(/[^0-9.-]/g, '');
                        // Ensure only one decimal point
                        const parts = value.split('.');
                        if (parts.length > 2) {
                            value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        // Ensure minus sign is only at the beginning
                        if (value.includes('-')) {
                            const minusIndex = value.indexOf('-');
                            if (minusIndex > 0) {
                                // Remove minus signs that are not at the beginning
                                value = value.replace(/-/g, '');
                            } else {
                                // Keep only the first minus sign at the beginning
                                value = '-' + value.substring(1).replace(/-/g, '');
                            }
                        }
                        e.target.value = value;
                    });

                    // Handle value change
                    input.addEventListener('change', () => {
                        const currentPayment = cell.getValue() || {};
                        cell.setValue({ ...currentPayment, amount: input.value });
                        document.body.removeChild(input);
                    });

                    // Handle blur (click away)
                    input.addEventListener('blur', () => {
                        setTimeout(() => {
                            if (document.body.contains(input)) {
                                document.body.removeChild(input);
                            }
                        }, 100);
                    });
                },
                cellEdited: (cell) => {
                    const rowData = cell.getRow().getData();
                    const rowId = rowData.id;

                    // Initialize editedRows array if it doesn't exist
                    if (!this.editedRows) {
                        this.editedRows = new Set();
                    }

                    // Add row ID to edited rows set
                    this.editedRows.add(rowId);

                    // Add visual indicator to the entire row
                    const rowElement = cell.getRow().getElement();
                    rowElement.classList.add('table-warning');

                    // Refresh the cell to update formatter
                    cell.getRow().reformat();
                }
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
                    const waybill = cell.getValue();
                    if (!waybill || !waybill.number) return '';
                    return `<span class="item-status status-danger">INV-${waybill.number}</span>`;
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
                    return `<span class="item-status status-danger">${waybill.number}</span>`;
                },
            },
            {
                title: __html("Operator"),
                field: "operator",
                width: 110,
                headerSort: false,
            },
            // {
            //     title: __html("Notes"),
            //     field: "notes",
            //     minWidth: 120,
            //     formatter: (cell) => {
            //         const value = cell.getValue();
            //         return `<span class="fw-bold text-dark" title="${value}">${value}</span>`;
            //     }
            // }
        ]
    }

    add = () => {

        let self = this;

        if (!self.filters.client?.name) {
            toast('Please select a client first');
            return;
        }

        // Create a new empty row
        const newRow = {
            id: '',
            name: self.filters.client?.name || '',
            eid: self.filters.client?._id || '',
            total: 0,
            transaction: true,
            payment: {
                date: '',
                amount: 0
            },
            invoice: {
                date: '',
                number: ''
            },
            waybill: {
                date: '',
                number: ''
            },
            operator: ''
        };

        // Redraw the table to show the new row
        this.table.setPage(1)

        // send to db
        saveTransaction([newRow], (response) => {

            if (response.success) {

                toast('Changes applied');
                this.table.redraw(); // Redraw table to reflect changes
                this.editedRows.clear(); // Clear edited rows after saving
                this.table.setPage(1)
            } else {
                toast('Error saving data: ' + response.error);
            }
        });
    }

    save = () => {

        // Get only the edited rows for saving
        if (!this.editedRows || this.editedRows.size === 0) {

            toast('No data to save.');
            return;
        }

        // Filter data to only include edited rows
        const editedData = this.table.getData("active").filter(row => this.editedRows.has(row.id));
        if (editedData.length === 0) {

            toast('No data to save.');
            return;
        }

        // Prepare data for saving
        const saveData = editedData.map(row => ({
            _id: row._id,
            payment: row.payment,
        }));

        log('Saving data:', saveData);

        // send to db
        saveTransaction(saveData, (response) => {

            if (response.success) {

                toast('Changes applied');
                this.table.redraw(); // Redraw table to reflect changes
                this.editedRows.clear(); // Clear edited rows after saving
                this.table.setPage(1);
            } else {
                toast('Error saving data: ' + response.error);
            }
        });
    }

    delete = () => {

        const selectedData = this.table.getSelectedData();
        if (!selectedData || selectedData.length === 0) {
            toast('No rows selected');
            return;
        }

        log('Deleting rows:', selectedData);

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
                                <td class="p-1 pe-3"><i class="bi bi-currency-euro me-1 d-none"></i> €${this.orders.summary.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-3"><i class="bi bi-bank me-1"></i> €${this.orders.summary.paid.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-3"><i class="bi bi-receipt me-1"></i> €${this.orders.summary.waybill.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

new Transactions();