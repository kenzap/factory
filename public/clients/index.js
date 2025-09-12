import { deleteClient } from "../_/api/delete_client.js";
import { getClients } from "../_/api/get_clients.js";
import { ClientSearch } from "../_/components/entity/client_search.js";
import { __html, attr, hideLoader, log, toast } from "../_/helpers/global.js";
import { TabulatorFull } from '../_/libs/tabulator_esm.min.mjs';
import { bus } from "../_/modules/bus.js";
import { Footer } from "../_/modules/footer.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Clients Journal
 * 
 * @version 1.0
 */
class Clients {

    // construct class
    constructor() {

        this.table = null;
        this.firstLoad = true;
        this.selectedRows = [];
        this.filters = {
            for: "clients",
            client: {},
            type: '', // Default to 'All'
            from: 0,        // Starting record index
            limit: 100      // Records per page
        };

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        this.html();

        this.table = new TabulatorFull("#clientsTable", {
            height: "calc(100vh - 51px)",
            layout: "fitColumns",
            pagination: true, //enable pagination
            paginationMode: "remote", //enable remote pagination
            paginationSize: 100,
            selectableRows: 1,
            selectable: true,
            sortMode: "remote",
            // Handle pagination requests
            ajaxURL: "/clients/",
            ajaxRequestFunc: (url, config, params) => {

                log('Loading data with params:', params, config);

                return new Promise((resolve, reject) => {

                    // Update pagination filters
                    this.filters.offset = params.page ? (params.page - 1) * params.size : 0;
                    this.filters.limit = params.size || 100;

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
                    getClients(this.filters, (response) => {

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

                        this.clients = response.clients;

                        resolve({
                            data: response.clients.records,
                            last_page: Math.ceil(response.clients.total / this.filters.limit),
                            total: response.clients.total
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
            },
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
                                <div id="clientsTable"></div>
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
                <i class="fas fa-clipboard-list"></i> ${__html('Clients Journal')}
            </h2>
            <!-- Toolbar -->
            <div class="toolbar border-0 mb-0">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <client-search></client-search>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label d-none">${__html('Type:')}</label>
                        <select class="form-select border-0" id="typeFilter">
                            <option value="">${__html('All')}</option>
                            <option value="individual">${__html('Individual')}</option>
                            <option value="company">${__html('Company')}</option>
                        </select>
                    </div>
                    <div class="col-md-8 d-flex justify-content-end">
                        <label class="form-label d-none">&nbsp;</label>
                        <div class="btn-group d-flex gap-0" role="group">
                            <button class="btn btn-outline-dark d-flex align-items-center" id="refreshBtn">
                                <i class="bi bi-arrow-repeat d-flex me-1"></i> ${__html('Refresh')}
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
        document.querySelector('#clientsTable .tabulator-paginator .tabulator-page[data-page="first"]').innerHTML = __html('First page');
        document.querySelector('#clientsTable .tabulator-paginator .tabulator-page[data-page="last"]').innerHTML = __html('Last page');
        document.querySelector('#clientsTable .tabulator-paginator .tabulator-page[data-page="prev"]').innerHTML = __html('←');
        document.querySelector('#clientsTable .tabulator-paginator .tabulator-page[data-page="next"]').innerHTML = __html('→');
    }

    // init page listeners
    listeners = () => {

        if (!this.firstLoad) return;

        // Filter event listeners
        document.getElementById('typeFilter').addEventListener('change', (e) => { this.filters.type = e.currentTarget.value; this.table.setPage(1); });

        // Button event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => { this.table.setPage(1); });
        document.getElementById('deleteBtn').addEventListener('click', () => { this.delete(); });

        // Or if using event listeners
        this.table.on("tableBuilt", function () {
            log("Table built successfully!");
        });

        // Or if using event listeners
        this.table.on("dataLoaded", function () {
            log("Table data loaded successfully!");
        });

        // sorting column header clicked
        this.table.on("headerClick", (e, column) => {

            log("Header clicked:", column.getField());

            // only act for sortable columns:
            const def = column.getDefinition();
            if (!def.headerSort && !def.sorter) return;

            // trigger reload for new sort
            this.table.setPage(1);
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
                title: __html("Client"),
                field: "legal_name",
                minWidth: 260,
                sorter: "string",
                headerSort: true,
                formatter: function (cell) {
                    const value = cell.getValue();
                    return `<span class="fw-bold text-dark">${value}</span>`;
                }
            },
            {
                title: __html("Type"),
                field: "entity",
                width: 120,
                headerSort: false,
                // cellAlign: "center",
                formatter: function (cell) {
                    const value = cell.getValue();
                    let badge = '';
                    switch (value) {
                        case 'company': badge = `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-success">${__html('Company')}</span></div>`; break;
                        case 'individual': badge = `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-primary">${__html('Individual')}</span></div>`; break;
                        default: badge = value;
                    }
                    return badge;
                }
            },
            {
                title: __html("Registration Number"),
                field: "reg_number",
                width: 130,
                formatter: function (cell) {
                    const value = cell.getValue();
                    const row = cell.getRow().getData();
                    if (value && row.entity === 'company') {
                        return `<a target="_blank" href="https://company.lursoft.lv/${value}">${value}</a>`;
                    }
                    return value;
                }
            },
            {
                title: __html("VAT"),
                field: "vat_number",
                width: 130,
                headerSort: false,
            },
            {
                title: __html("Status"),
                field: "vat_status",
                width: 110,
                formatter: function (cell) {
                    const value = cell.getValue();
                    if (value === 'active') {
                        return `<div class="d-flex align-items-center justify-content-center h-100"><span class="item-status status-success">${__html('Active')}</span></div>`;
                    }
                    return "";
                }
            },
            {
                title: __html("Address"),
                field: "reg_address",
                width: 190,
                headerSort: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return `<span class="form-text" title="${attr(value)}">${value}</span>`;
                }
            },
            {
                title: __html("Name"),
                field: "contacts",
                width: 180,
                headerSort: false,
                formatter: (cell) => {
                    const contacts = cell.getValue();
                    if (contacts && contacts.length > 0) {
                        const firstContact = contacts[0];
                        const name = firstContact.name || '';
                        return `<div title="${attr(name)}"><div><strong>${name}</strong></div></div>`;
                    }
                    return ``;
                }
            },
            {
                title: __html("Phone number"),
                field: "contacts",
                headerSort: false,
                width: 160,
                formatter: (cell) => {
                    const contacts = cell.getValue();
                    if (contacts && contacts.length > 0) {
                        const firstContact = contacts[0];
                        const phone = firstContact.phone || '';
                        return `<div>${phone}</div>`;
                    }
                    return ``;
                }
            },
            {
                title: __html("Email"),
                field: "contacts",
                headerSort: false,
                width: 190,
                formatter: (cell) => {
                    const contacts = cell.getValue();
                    if (contacts && contacts.length > 0) {
                        const firstContact = contacts[0];
                        const email = firstContact.email || '';
                        return `<span class="form-text">${email}</span>`;
                    }
                    return ``;
                }
            },
            {
                title: __html("Created"),
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
                title: __html("Notes"),
                field: "notes",
                minWidth: 180,
                headerSort: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return `<span title="${value}">${value}</span>`;
                }
            }
        ]
    }

    summary() {
        if (!this.clients?.total) return;

        const { offset, limit } = this.filters;
        const { total } = this.clients;
        const endIndex = Math.min(offset + limit, total);
        const formattedTotal = new Intl.NumberFormat().format(total);

        const footerContents = document.querySelector('.tabulator-footer-contents');
        if (!footerContents) return;

        // Remove existing summary
        footerContents.querySelector('.summary-table')?.remove();

        // Create and insert new summary
        const summaryTable = document.createElement('div');
        summaryTable.className = 'summary-table d-inline-block me-3';
        summaryTable.innerHTML = `
            <table class="table table-sm table-borderless mb-0 d-inline-block">
            <tr>
                <td class="p-1 pe-3">
                ${__html("Showing %1$ to %2$ of %3$ entries", offset + 1, endIndex, formattedTotal)}
                </td>
            </tr>
            </table>
        `;

        footerContents.insertBefore(summaryTable, footerContents.firstChild);
    }

    delete = () => {

        const selectedData = this.table.getSelectedData();
        if (!selectedData || selectedData.length === 0) {
            toast('No rows selected');
            return;
        }

        if (!confirm(__html('Delete record?'))) return;

        const currentPage = this.table.getPage(); // Save current page

        // Send to db
        deleteClient({ id: selectedData[0]._id }, (response) => {

            if (response.success) {

                toast('Successfully removed');

                // Reload current page data
                this.table.setPage(currentPage);

            } else {
                toast('Error deleting rows: ' + response.error);
            }
        });
    }
}

new Clients();