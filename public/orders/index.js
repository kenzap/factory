import { getOrders } from "/_/api/get_orders.js";
import { ClientSearch } from "/_/components/entity/client_search.js";
import { __html, hideLoader, priceFormat } from "/_/helpers/global.js";
import { TabulatorFull } from '/_/libs/tabulator_esm.min.mjs';
import { bus } from "/_/modules/bus.js";
import { Footer } from "/_/modules/footer.js";
import { Modal } from "/_/modules/modal.js";
import { Session } from "/_/modules/session.js";

/**
 * Orders Journal
 * 
 * @version 1.0
 */
class Orders {

    // construct class
    constructor() {

        this.table = null;
        this.selectedRows = [];
        this.modal = null;
        this.filters = {
            client: '',
            dateFrom: '',
            dateTo: '',
            type: '2' // Default to 'All'
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
                                <div class="col-md-2">
                                    <label class="form-label d-none">From:</label>
                                    <input type="date" class="form-control" id="dateFrom">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label d-none">To:</label>
                                    <input type="date" class="form-control" id="dateTo">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label d-none">Type:</label>
                                    <select class="form-select" id="typeFilter">
                                    <option value="2">All</option>
                                    <option value="1">Processed</option>
                                    <option value="0">Orders</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex justify-content-end">
                                    <label class="form-label d-none">&nbsp;</label>
                                    <div class="btn-group d-block">
                                        <button class="btn btn-primary" id="refreshBtn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/></svg> ${__html('Refresh')}
                                        </button>
                                        <button class="btn btn-info" id="reportBtn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-filetype-pdf" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM1.6 11.85H0v3.999h.791v-1.342h.803q.43 0 .732-.173.305-.175.463-.474a1.4 1.4 0 0 0 .161-.677q0-.375-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.38.57.57 0 0 1-.238.241.8.8 0 0 1-.375.082H.788V12.48h.66q.327 0 .512.181.185.183.185.522m1.217-1.333v3.999h1.46q.602 0 .998-.237a1.45 1.45 0 0 0 .595-.689q.196-.45.196-1.084 0-.63-.196-1.075a1.43 1.43 0 0 0-.589-.68q-.396-.234-1.005-.234zm.791.645h.563q.371 0 .609.152a.9.9 0 0 1 .354.454q.118.302.118.753a2.3 2.3 0 0 1-.068.592 1.1 1.1 0 0 1-.196.422.8.8 0 0 1-.334.252 1.3 1.3 0 0 1-.483.082h-.563zm3.743 1.763v1.591h-.79V11.85h2.548v.653H7.896v1.117h1.606v.638z"/></svg> ${__html('Report')}
                                        </button>
                                        <button class="btn btn-danger" id="deleteBtn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg> ${__html('Delete')}
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

        // Filter event listeners
        // document.getElementById('clientFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFrom').addEventListener('change', (e) => { this.filters.dateFrom = e.currentTarget.value; this.data() });
        document.getElementById('dateTo').addEventListener('change', (e) => { this.filters.dateTo = e.currentTarget.value; this.data() });
        document.getElementById('typeFilter').addEventListener('change', () => this.data());

        // Button event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => this.data());
        document.getElementById('reportBtn').addEventListener('click', () => this.generateReport());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteSelected());
        // document.getElementById('saveBtn').addEventListener('click', () => this.saveChanges());
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
                        return `<a href="order6.php?id=${value}" target="_blank" class="text-decoration-none fw-bold text-primary">${value}</a>`;
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
                        return `<span class="fw-bold text-danger">${priceFormat(self.settings, value)}</span>`;
                    }
                },
                {
                    title: __html("Due Date & Time"),
                    field: "due_date",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span class="fw-bold text-success">${value}</span>`;
                    }
                },
                {
                    title: "Manufacturing Date",
                    field: "mnf_date",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return value === '0000-00-00' ? '' : `<span class="fw-bold text-success">${value}</span>`;
                    }
                },
                {
                    title: "Dispatch Date",
                    field: "dsp_date",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return value === '0000-00-00' ? '' : `<span class="fw-bold text-success">${value}</span>`;
                    }
                },
                {
                    title: "Invoice Date",
                    field: "inv_date",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return value === '0000-00-00' ? '' : `<span class="text-success">${value}</span>`;
                    }
                },
                {
                    title: "Invoice #",
                    field: "invoice",
                    width: 90,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return value == 0 ? '' : `<span class="fw-bold text-success">${value}</span>`;
                    }
                },
                {
                    title: "Payment Date",
                    field: "pay_date",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return value === '0000-00-00' ? '' : `<span class="text-success">${value}</span>`;
                    }
                },
                {
                    title: "Waybill Date",
                    field: "wbl_date",
                    width: 100,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return value === '0000-00-00' ? '' : `<span class="fw-bold text-success">${value}</span>`;
                    }
                },
                {
                    title: "Waybill #",
                    field: "waybill",
                    width: 90,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span class="fw-bold text-danger">${value}</span>`;
                    }
                },
                { title: __html("Operator"), field: "operator", width: 100 },
                {
                    title: __html("Notes"),
                    field: "notes",
                    minWidth: 120,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span class="fw-bold text-dark" title="${value}">${value}</span>`;
                    }
                }
            ],
            rowSelectionChanged: (data, rows) => {
                this.selectedRows = rows;
                // this.updateSummary();
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
        let totalSum = 0;
        let bankSum = 0;
        let pvdzSum = 0;

        data.forEach(row => {
            const amount = parseFloat(row.total) || 0;
            totalSum += amount;

            if (row.bandat && row.bandat !== '0000-00-00') {
                bankSum += amount;
            }

            if (row.pavdat && row.pavdat !== '0000-00-00') {
                pvdzSum += amount;
            }
        });

        console.log(`Summary - Count: ${count}, Total: ${totalSum}, Bank: ${bankSum}, PVDZ: ${pvdzSum}`);
        const footerContents = document.querySelector('.tabulator-footer-contents');
        if (footerContents) {
            // Create summary table
            const summaryTable = document.createElement('div');
            summaryTable.className = 'summary-table d-inline-block me-3';
            summaryTable.innerHTML = `
                        <table class="table table-sm table-borderless mb-0 d-inline-block">
                            <tr>
                                <td class="p-1 pe-2"><i class="fas fa-hashtag"></i> ${count}</td>
                                <td class="p-1 pe-2"><i class="fas fa-euro-sign me-1 d-none"></i> €${totalSum.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-2"><i class="fas fa-university me-1"></i> €${bankSum.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="p-1 pe-2"><i class="fas fa-receipt me-1"></i> €${pvdzSum.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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