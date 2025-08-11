import { deleteTransaction } from "../_/api/delete_transaction.js";
import { getTransactions } from "../_/api/get_transactions.js";
import { saveTransaction } from "../_/api/save_transaction.js";
import { ClientSearch } from "../_/components/entity/client_search.js";
import { __html, hideLoader, priceFormat, toast } from "/_/helpers/global.js";
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
        this.modal = null;
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

        this.setupTable();

        this.data();
    }

    data = () => {

        getTransactions(this.filters, (response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.orders = response.orders;

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
                                    <input type="date" class="form-control" id="dateFrom">
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label d-none">${__html('To:')}</label>
                                    <input type="date" class="form-control" id="dateTo">
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label d-none">${__html('Type:')}</label>
                                    <select class="form-select" id="typeFilter">
                                    <option value="">${__html('All')}</option>
                                    <option value="paid">${__html('Paid')}</option>
                                    <option value="unpaid">${__html('Unpaid')}</option>
                                    <option value="transaction">${__html('Transaction')}</option>
                                    </select>
                                </div>
                                <div class="col-md-6 d-flex justify-content-end">
                                    <label class="form-label d-none">&nbsp;</label>
                                    <div class="btn-group d-flex">
                                        <button class="btn btn-outline-primary d-flex align-items-center" id="refreshBtn">
                                            <i class="bi bi-arrow-repeat d-flex me-1"></i> ${__html('Refresh')}
                                        </button>
                                        <button class="btn btn-outline-primary d-flex align-items-center" id="saveBtn">
                                            <i class="bi bi-check-circle d-flex me-1"></i> ${__html('Save')}
                                        </button>
                                        <button class="btn btn-outline-primary d-flex align-items-center" id="reportBtn">
                                            <i class="bi bi-filetype-pdf d-flex me-1"></i> ${__html('Report')}
                                        </button>
                                        <button class="btn btn-outline-danger d-flex align-items-center" id="addBtn">
                                            <i class="bi bi-plus-circle d-flex me-1"></i> ${__html('Add')}
                                        </button>
                                        <button class="btn btn-outline-danger d-flex align-items-center" id="deleteBtn">
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
        // document.getElementById('clientFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFrom').addEventListener('change', (e) => { this.filters.dateFrom = new Date(e.currentTarget.value + 'T00:00:00').toISOString(); this.data(); });
        document.getElementById('dateTo').addEventListener('change', (e) => { this.filters.dateTo = new Date(e.currentTarget.value + 'T23:59:59').toISOString(); this.data(); });
        document.getElementById('typeFilter').addEventListener('change', (e) => { this.filters.type = e.currentTarget.value; this.data(); });

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

        // Button event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => this.data());
        document.getElementById('saveBtn').addEventListener('click', () => this.save());
        document.getElementById('addBtn').addEventListener('click', () => this.add());
        document.getElementById('reportBtn').addEventListener('click', () => this.generateReport());
        document.getElementById('deleteBtn').addEventListener('click', () => this.delete());

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
            selectableRows: 1,
            sortable: true,
            sortOrderReverse: true,
            columns: [
                {
                    title: "ID",
                    field: "id",
                    width: 80,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<a href="/order-edit/?id=${value}" target="_blank" class="text-decoration-none fw-bold text-primary">${value}</a>`;
                    }
                },
                {
                    title: __html("Date"),
                    field: "created",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        const date = new Date(value * 1000);
                        return `<span class="fw-bold text-success">${date.toLocaleDateString()}</span>`;
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
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span class="fw-bold text-danger">${priceFormat(self.settings, value)}</span>`;
                    }
                },
                {
                    title: __html("Payment"),
                    field: "payment",
                    width: 160,
                    sorter: (a, b) => {
                        const dateA = a && a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b && b.date ? new Date(b.date).getTime() : 0;
                        return dateA - dateB;
                    },
                    formatter: (cell) => {
                        const payment = cell.getValue();
                        if (!payment || !payment.date || payment.date === '0000-00-00') return '';
                        const date = new Date(payment.date);
                        return `<span class="fw-bold text-success">${date.toLocaleDateString()}</span>`;
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
                        return `<span class="fw-bold ${amount < 0 ? 'text-danger' : 'text-success'} ${bgClass}">${amount || ""}</span>`;
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
                    title: "Invoice",
                    field: "invoice",
                    width: 100,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.date || waybill.date === '0000-00-00') return '';
                        const date = new Date(waybill.date);
                        return `<span class="fw-bold text-success">${date.toLocaleDateString()}</span>`;
                    },
                },
                {
                    title: "Invoice #",
                    field: "invoice",
                    width: 110,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.number) return '';
                        return `<span class="fw-bold text-danger">${waybill.number}</span>`;
                    },
                },
                {
                    title: "Waybill",
                    field: "waybill",
                    width: 100,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.date || waybill.date === '0000-00-00') return '';
                        const date = new Date(waybill.date);
                        return `<span class="fw-bold text-success">${date.toLocaleDateString()}</span>`;
                    },
                },
                {
                    title: "Waybill #",
                    field: "waybill",
                    width: 110,
                    formatter: (cell) => {
                        const waybill = cell.getValue();
                        if (!waybill || !waybill.number) return '';
                        return `<span class="fw-bold text-danger">${waybill.number}</span>`;
                    },
                },
                { title: __html("Operator"), field: "operator", width: 100 },
                // {
                //     title: __html("Notes"),
                //     field: "notes",
                //     minWidth: 120,
                //     formatter: (cell) => {
                //         const value = cell.getValue();
                //         return `<span class="fw-bold text-dark" title="${value}">${value}</span>`;
                //     }
                // }
            ],
            rowSelectionChanged: (data, rows) => {
                this.selectedRows = rows;
                // console.log('Selected rows:', this.selectedRows);
                // this.updateSummary();
            },
            cellDblClick: (e, cell) => {
                this.editRow(cell.getRow().getData());
            }
        });

        // Or if using event listeners
        this.table.on("tableBuilt", function () {
            // console.log("Table built successfully!");
        });

        // Or if using event listeners
        this.table.on("dataLoaded", function () {
            // console.log("Table data loaded successfully!");
        });

        bus.on('table:refresh', (value) => {
            console.log('Refreshing table data...', value);
            self.filters.client = value;
            self.data();
        });
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
        this.data();

        // send to db
        saveTransaction([newRow], (response) => {

            if (response.success) {

                toast('Changes applied');
                this.table.redraw(); // Redraw table to reflect changes
                this.editedRows.clear(); // Clear edited rows after saving
                this.data(); // Refresh data after saving
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

        console.log('Saving data:', saveData);


        // send to db
        saveTransaction(saveData, (response) => {

            if (response.success) {

                toast('Changes applied');
                this.table.redraw(); // Redraw table to reflect changes
                this.editedRows.clear(); // Clear edited rows after saving
                this.data(); // Refresh data after saving
            } else {
                toast('Error saving data: ' + response.error);
            }
        });
    }

    delete = () => {

        const selectedData = this.table.getSelectedData();
        if (!selectedData || selectedData.length === 0) {
            toast('No rows selected for deletion.');
            return;
        }

        console.log('Deleting rows:', selectedData);

        // Send to db
        deleteTransaction(selectedData, (response) => {

            if (response.success) {

                toast('Selected rows deleted successfully.');
                this.table.redraw(); // Redraw table to reflect changes
                this.editedRows.clear(); // Clear edited rows after saving
                this.data(); // Refresh data after saving
            } else {
                toast('Error deleting rows: ' + response.error);
            }
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

        // console.log(`Summary - Count: ${count}, Total: ${order_total}, Bank: ${payment_total.toFixed(2)}, PVDZ: ${waybill_total}`);
        const footerContents = document.querySelector('.tabulator-footer-contents');
        if (footerContents) {
            // Create summary table
            const summaryTable = document.createElement('div');
            summaryTable.className = 'summary-table d-inline-block me-3';
            summaryTable.innerHTML = `
                        <table class="table table-sm table-borderless mb-0 d-inline-block">
                            <tr>
                                <td class="p-1 pe-2"><i class="bi bi-hash"></i> ${count}</td>
                                <td class="p-1 pe-2"><i class="bi bi-currency-euro me-1 d-none"></i> €${order_total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-2"><i class="bi bi-bank me-1"></i> €${payment_total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-2"><i class="bi bi-receipt me-1"></i> €${waybill_total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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