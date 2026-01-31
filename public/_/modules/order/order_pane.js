import { refreshRowCalculations } from "../../components/order/order_calculations.js";
import { numberEditor } from "../../components/order/order_number_editor.js";
import { productEditor } from "../../components/order/order_product_editor.js";
import { sketchEditor } from "../../components/order/order_sketch_editor.js";
import { suggestionEditor } from "../../components/order/order_suggestion_editor.js";
import { textEditor } from "../../components/order/order_text_editor.js";
import { __html, onClick, priceFormat, toast } from "../../helpers/global.js";
import { getCoatings, getColors, isAllowedToEdit } from "../../helpers/order.js";
import { addRow, navigateToNextCell, navigateToPreviousCell } from "../../helpers/order_table.js";
import { TabulatorFull } from '../../libs/tabulator_esm.min.mjs';
import { state } from "../../modules/order/state.js";
import { bus } from "../bus.js";

/**
 * OrderPane class manages the order table interface for handling product orders.
 * Provides functionality for creating, editing, and managing order items in a tabulator table.
 * 
 * @class OrderPane
 * 
 * @description
 * This class initializes and manages an interactive order table with the following features:
 * - Editable cells for product details (color, coating, dimensions, quantity, etc.)
 * - Auto-suggestions for color, coating, product and discount fields
 * - Product sketch editor integration
 * - Automatic calculations for area, pricing, and totals
 * - Row operations (add, delete, bulk update)
 * - Real-time synchronization with global state
 * 
 * @example
 * // Initialize the order pane
 * const orderPane = new OrderPane();
 * 
 * @requires TabulatorFull - External table library for data grid functionality
 * @requires state - Global state object containing order data and settings
 * @requires bus - Event bus for component communication
 * 
 * @since 1.0.0
 */
export class OrderPane {

    constructor() {

        console.log('Initializing OrderPane with order:', state.order, state.settings);

        // check if header is already present
        this.init();
    }

    init = () => {

        // Sample suggestions for different fields
        this.cmSuggestions = [true, false];
        this.coatingSuggestions = getCoatings(state.settings);
        this.colorSuggestions = getColors(state.settings);
        this.discountSuggestions = [5, 7, 10, 15, 20, 25, 30, 50];

        this.view();

        this.table();

        this.listeners();
    }

    view = () => {

        // Add fade effect to indicate loading/disabled state
        document.querySelector('.right-pane').innerHTML = /*html*/`
            <div class="table-container">
                <div class="btn-group mb-2" role="group">
                    <button id="add-order-row" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-plus-circle"></i> ${__html('Add New Row')}
                    </button>
                    <a href="/manufacturing/?id=${state.order.id}" target="_blank" class="btn btn-outline-primary btn-sm d-flex align-items-center">
                        <i class="bi bi-box-arrow-up-right me-2"></i>
                        ${__html('Manufacturing')}
                    </a>
                </div>
                <div id="order-table"></div>
            </div>`;
    }

    table = () => {

        let self = this;

        // Initialize Tabulator
        state.table = new TabulatorFull("#order-table", {
            height: "auto",
            layout: "fitColumns",
            resizableColumns: true,
            movableColumns: true,
            sortable: false,
            sorter: false,
            data: state.order.items || [],
            rowHeight: 28, // Reduce row height from default 38px
            headerHeight: 30, // Optionally reduce header height too
            columns: [
                {
                    title: __html("CM"),
                    field: "cm",
                    width: 40,
                    headerSort: false,
                    editor: "tickCross",
                    formatter: "tickCross"

                },
                {
                    title: __html("Color"),
                    field: "color",
                    width: 80,
                    headerSort: false,
                    editor: suggestionEditor,
                    editorParams: {
                        suggestions: this.colorSuggestions,
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    },
                    cellEdited: (cell) => {

                        // Match entered value with suggestions (case-insensitive)
                        const enteredValue = cell.getValue();
                        if (enteredValue) {

                            const matchedSuggestion = this.colorSuggestions.find(suggestion =>
                                suggestion.toLowerCase() === enteredValue.toLowerCase() || (suggestion.includes(enteredValue) && !isNaN(enteredValue))
                            );

                            if (matchedSuggestion && matchedSuggestion !== enteredValue) {
                                cell.setValue(matchedSuggestion);
                            }
                        }
                    }
                },
                {
                    title: __html("Coating"),
                    field: "coating",
                    width: 100,
                    headerSort: false,
                    editor: suggestionEditor,
                    editorParams: {
                        suggestions: this.coatingSuggestions,
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    },
                    cellEdited: (cell) => {
                        // Match entered value with suggestions (case-insensitive)
                        const enteredValue = cell.getValue();
                        if (enteredValue) {

                            const matchedSuggestion = this.coatingSuggestions.find(suggestion =>
                                suggestion.toLowerCase() === enteredValue.toLowerCase()
                            );

                            if (matchedSuggestion && matchedSuggestion !== enteredValue) {
                                cell.setValue(matchedSuggestion);
                            }
                        }
                    }
                },
                {
                    title: __html("Product"),
                    field: "title",
                    width: 400,
                    headerSort: false,
                    editor: productEditor,
                    editorParams: {
                        settings: state.settings,
                        discounts: state.order.discounts || {},
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    },
                    formatter: function (cell) {
                        const value = cell.getValue() || '';
                        const row = cell.getRow().getData();
                        return /*html*/`
                            <div class="d-flex justify-content-start flex-row align-items-center">
                                <strong>${value}</strong>
                                <div class="form-text ms-1 m-0" style="color:var(--gray-color);">${row.sdesc ? ' - ' + row.sdesc : ''}</div>
                            </div>
                        `;
                    }
                },
                {
                    title: "",
                    field: "sketch_attached",
                    width: 40,
                    headerSort: false,
                    formatter: function (cell) {
                        const value = cell.getValue() || '';
                        const row = cell.getRow().getData();

                        // row.sketch_attached = true;

                        console.log('sketch_attached:', row.sketch_attached);

                        return /*html*/`
                            <div class="d-flex align-items-center">
                                <i class="bi bi-link-45deg ${row.sketch_attached == true ? 'text-primary' : 'text-dark'} fs-5 po product-edit-icon" 
                                   style="cursor:pointer;z-index:10;" 
                                   data-row-index="${cell.getRow().getPosition()}"></i>
                            </div>
                        `;

                        // if (!row.sketch_attached) return value;
                    },
                    cellClick: function (e, cell) {
                        if (e.target.classList.contains('product-edit-icon')) {
                            e.preventDefault();

                            console.log('Edit sketch icon clicked for row:', cell.getRow().getData());
                            // cell.edit();
                            sketchEditor(cell, state.settings, state.order, (data) => {

                                // Sync items and trigger refresh
                                self.syncItems();
                                self.refreshTable();
                                // self.table.redraw(true);

                                refreshRowCalculations(cell, state.settings);

                                bus.emit('order:table:refreshed', state.order);
                                // {"cmd":"confirm","inputs":{},"note":"","inputs_label":{},"input_fields":[{"id":"VusmaG","max":"6000","min":300,"type":"polyline","label":"L","params":[],"points":"352 426 82 269","default":"1000","label_pos":"left","ext":"","note":""}],"input_fields_values":{"inputL":"3000"},"formula_width":"300","formula_length":"L","viewpoint":null,"id":"42519-","_id":"f9f720eda2b5e4ea03d8b4cc5f947534bb5ea3bd","qty":"25","price":"11.78","total":"294.5","color":"RR32","coating":"Polyester","discounts":[{"note":"","type":"manager","percent":"20","availability":"always"}]}
                                console.log('Updated sketch from editor:', data);
                            });
                        }
                    }
                },
                {
                    title: __html("W (mm)"),
                    field: "formula_width_calc",
                    width: 68,
                    headerSort: false,
                    editor: numberEditor,
                    editorParams: {
                        min: 0,
                        step: 1,
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    }
                },
                {
                    title: __html("L (mm)"),
                    field: "formula_length_calc",
                    width: 68,
                    headerSort: false,
                    editor: numberEditor,
                    editorParams: {
                        min: 0,
                        step: 1,
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    }
                },
                {
                    title: __html("F (m²)"),
                    field: "area",
                    width: 68,
                    headerSort: false,
                    formatter: function (cell) {
                        return '<span>' + (cell.getValue() || '0.000') + '</span>';
                    }
                },
                {
                    title: __html("%1$ (t/m)", state.settings.currency_symb),
                    field: "price_length",
                    headerSort: false,
                    width: 68,
                    formatter: function (cell) {
                        return cell.getValue() ? '<span class="calculated-field">' + priceFormat(state.settings, cell.getValue()) + '</span>' : '';
                    }
                },
                {
                    title: __html("Qty"),
                    field: "qty",
                    width: 54,
                    headerSort: false,
                    editor: numberEditor,
                    editorParams: {
                        min: 0,
                        step: 1,
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    }
                },
                {
                    title: __html("Adj"),
                    field: "adj",
                    width: 70,
                    headerSort: false,
                    editor: numberEditor,
                    editorParams: {
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell,
                        step: 0.01
                    },
                    formatter: function (cell) {
                        return cell.getValue() ? '<span class="calculated-field">' + priceFormat(state.settings, cell.getValue()) + '</span>' : '';
                    }
                },
                {
                    title: __html("Discount"),
                    field: "discount",
                    width: 70,
                    headerSort: false,
                    editor: suggestionEditor,
                    editorParams: {
                        suggestions: this.discountSuggestions,
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    },
                    formatter: function (cell) {
                        const value = cell.getValue() || 0;
                        return value + "%";
                    }
                },
                {
                    title: __html("Price"),
                    field: "price",
                    width: 90,
                    headerSort: false,
                    formatter: function (cell) {
                        const row = cell.getRow().getData();
                        const price = parseFloat(row.price) || 0;
                        return '<span class="calculated-field">' + priceFormat(state.settings, price) + '</span>';
                    }
                },
                {
                    title: __html("Total"),
                    field: "total",
                    width: 100,
                    headerSort: false,
                    formatter: function (cell) {
                        return '<span class="calculated-field">' + priceFormat(state.settings, cell.getValue()) + '</span>';
                    }
                },
                {
                    title: __html("Note"),
                    field: "note",
                    width: 140,
                    headerSort: false,
                    editor: textEditor,
                    editorParams: {
                        navigateToNextCell: navigateToNextCell,
                        navigateToPreviousCell: navigateToPreviousCell
                    },
                    formatter: function (cell) {
                        return '<span class="form-text">' + cell.getValue() + '</span>';
                    }
                },
                {
                    title: "",
                    field: "actions",
                    width: 20,
                    headerSort: false,
                    formatter: function (cell) {
                        const i = cell.getRow().getPosition();

                        return /*html*/`
                            <div class="dropdown tableActionsCont">
                                <svg id="tableActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                </svg>
                                <ul class="dropdown-menu" aria-labelledby="tableActions${i}">
                                    <li><a class="dropdown-item po update-cm" href="#" data-index="${i}"><i class="bi bi-check2-square"></i> ${__html('CM')}</a></li>
                                    <li><a class="dropdown-item po update-color" href="#" data-index="${i}"><i class="bi bi-palette"></i> ${__html('Color')}</a></li>
                                    <li><a class="dropdown-item po update-coating" href="#" data-index="${i}"><i class="bi bi-droplet"></i> ${__html('Coating')}</a></li>
                                    <li><a class="dropdown-item po update-discount" href="#" data-index="${i}"><i class="bi bi-percent"></i> ${__html('Discount')}</a></li>
                                    <li><a class="dropdown-item po view-sketch" href="#" data-index="${i}"><i class="bi bi-pencil-square"></i> ${__html('Sketch')}</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item po delete-row" href="#" data-type="cancel" data-index="${i}"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                                </ul>
                            </div>`;
                    },
                    cellClick: function (e, cell) {

                        if (e.target.classList.contains('delete-row')) {

                            const rowData = cell.getRow().getData();

                            console.log('Deleting row:', rowData);

                            const is = isAllowedToEdit(rowData);
                            if (!is.allow) {

                                toast(is.reason || 'You are not allowed to edit this row.');
                                return;
                            }

                            cell.getRow().delete();
                        }

                        if (e.target.classList.contains('update-cm')) {
                            e.preventDefault();
                            const currentRowData = cell.getRow().getData();
                            const currentCM = currentRowData.cm;
                            if (currentCM !== null && currentCM !== undefined) {

                                // Update CM for all rows
                                const allRows = state.table.getRows();
                                allRows.forEach(row => {
                                    row.update({ cm: currentCM });
                                });
                                // Sync items after update
                                self.syncItems();

                                self.refreshTable();

                                bus.emit('order:table:refreshed', state.order);
                            }
                        }

                        if (e.target.classList.contains('update-coating')) {

                            e.preventDefault();
                            const currentRowData = cell.getRow().getData();
                            const currentCoating = currentRowData.coating;

                            if (currentCoating && currentCoating !== '-') {

                                // Update coating for all rows except those with '-'
                                const allRows = state.table.getRows();
                                allRows.forEach(row => {
                                    const rowData = row.getData();
                                    if (rowData.coating !== '-') {
                                        row.update({ coating: currentCoating });
                                    }
                                });

                                // Sync items after update
                                self.syncItems();

                                allRows.forEach(row => {
                                    const firstCell = row.getCells()[2]; // Get any cell from the row
                                    refreshRowCalculations(firstCell, state.settings);
                                });

                                self.syncItems();
                                self.refreshTable();
                            }
                        }

                        if (e.target.classList.contains('update-color')) {

                            e.preventDefault();
                            const currentRowData = cell.getRow().getData();
                            const currentColor = currentRowData.color;
                            if (currentColor && currentColor !== '-') {

                                // Update color for all rows except those with '-'
                                const allRows = state.table.getRows();
                                allRows.forEach(row => {
                                    const rowData = row.getData();
                                    if (rowData.color !== '-') {
                                        row.update({ color: currentColor });
                                    }

                                    const firstCell = row.getCells()[2]; // Get any cell from the row
                                    refreshRowCalculations(firstCell, state.settings);
                                });

                                // Sync items after update
                                self.syncItems();
                                self.refreshTable();
                                // state.table.redraw(true);

                                bus.emit('order:table:refreshed', state.order);
                            }
                        }

                        if (e.target.classList.contains('update-discount')) {

                            e.preventDefault();
                            const currentRowData = cell.getRow().getData();
                            const currentDiscount = currentRowData.discount;
                            if (currentDiscount !== null && currentDiscount !== undefined) {

                                // Update discount for all rows
                                const allRows = state.table.getRows();
                                allRows.forEach(row => {
                                    row.update({ discount: currentDiscount });

                                    const firstCell = row.getCells()[2]; // Get any cell from the row
                                    refreshRowCalculations(firstCell, state.settings);
                                });

                                // Sync items after update
                                self.syncItems();
                                self.refreshTable();
                                // state.table.redraw(true);

                                bus.emit('order:table:refreshed', state.order);
                            }
                        }

                        if (e.target.classList.contains('view-sketch')) {

                            console.log('View sketch for row:', cell.getRow().getData());

                            sketchEditor(cell, state.settings, state.order, (data) => {

                                // Sync items and trigger refresh
                                self.syncItems();
                                self.refreshTable();

                                bus.emit('order:table:refreshed', state.order);
                                // {"cmd":"confirm","inputs":{},"note":"","inputs_label":{},"input_fields":[{"id":"VusmaG","max":"6000","min":300,"type":"polyline","label":"L","params":[],"points":"352 426 82 269","default":"1000","label_pos":"left","ext":"","note":""}],"input_fields_values":{"inputL":"3000"},"formula_width":"300","formula_length":"L","viewpoint":null,"id":"42519-","_id":"f9f720eda2b5e4ea03d8b4cc5f947534bb5ea3bd","qty":"25","price":"11.78","total":"294.5","color":"RR32","coating":"Polyester","discounts":[{"note":"","type":"manager","percent":"20","availability":"always"}]}
                                console.log('Updated sketch from editor:', data);
                            });
                        }
                    }
                }
            ]
        });

        // Add event listener for row deletion
        state.table.on("rowDeleted", (row) => {
            this.syncItems();
            bus.emit('order:table:refreshed', state.order);
        });

        // Add event listener to track any cell value changes
        state.table.on("cellEdited", (cell) => {

            // Check if this is the last row and automatically add a new one
            if (state.table.getRows().length === 0) {
                addRow();
            }

            console.log('Cell edited:', cell.getField(), cell.getValue());

            // You can perform specific actions based on the field or value
            refreshRowCalculations(cell, state.settings);

            this.syncItems();
            this.refreshTable();
        });

        if (state.order?.items?.length === 0) setTimeout(() => { addRow() }, 100);
    }

    syncItems = () => {

        // {
        //     "_id": "c95858c9d98f1020557c33b4e778972ea7ea9b97",
        //     "cid": "uUmEklwEOGxk",
        //     "qty": "1",
        //     "area": "",
        //     "note": "",
        //     "color": "RR887",
        //     "price": "10.16",
        //     "sdesc": "",
        //     "title": "Teknes stūris, ārējais Ø125",
        //     "total": 10.16,
        //     "priced": 10.16,
        //     "tax_id": "",
        //     "coating": "Matt Pural",
        //     "created": 1753734362,
        //     "formula": "250*500",
        //     "discount": 1,
        //     "cad_files": [],
        //     "discounts": [
        //         {
        //         "note": "",
        //         "type": "manager",
        //         "percent": "20",
        //         "availability": "always"
        //         }
        //     ],
        //     "var_price": [
        //         {
        //         "id": "ZN",
        //         "unit": "pc",
        //         "price": "8.83",
        //         "title": "*",
        //         "parent": "Zinc",
        //         "public": true
        //         },
        //         ...
        //     ],
        //     "calc_price": "variable",
        //     "variations": [],
        //     "input_fields": [],
        //     "formula_price": "",
        //     "formula_width": "",
        //     "formula_length": "",
        //     "formula_width_calc": "0",
        //     "formula_length_calc": "0",
        //     "input_fields_values": []
        // },

        // Sync the order items with the table data
        state.order.items = state.table.getData().map(item => {
            return {
                ...item,
                // area: (parseFloat(item.width) * parseFloat(item.length) / 1000000).toFixed(3),
                // total: getPrice(state.settings, item).total.toFixed(2)
            };
        });
    }

    refreshTable = () => {

        // Preserve scroll position during redraw
        const scrollElement = document.querySelector('#order-table .tabulator-tableholder');
        const scrollLeft = scrollElement ? scrollElement.scrollLeft : 0;
        state.table.redraw(false);
        // setTimeout(() => {
        //     const scrollElementAfter = document.querySelector('#order-table .tabulator-tableholder');
        //     if (scrollElementAfter) {
        //         scrollElementAfter.scrollLeft = scrollLeft;
        //     }
        // }, 0);

        bus.emit('order:table:refreshed');
    }

    listeners = () => {

        // Add new row button functionality
        onClick('#add-order-row', () => {
            addRow();
        });

        bus.on('order:table:sync:items', (id) => {

            console.log('Syncing items from bus event:', id);

            this.syncItems();
            this.refreshTable();
        });

        bus.on('client:updated', (client) => {

            console.log('Client updated:', client);

            this.refreshTable();
        });
    }
}