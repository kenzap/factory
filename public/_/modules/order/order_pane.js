import { updateCalculations } from "../../components/order/order_calculations.js";
import { productEditor } from "../../components/order/order_product_editor.js";
import { sketchEditor } from "../../components/order/order_sketch_editor.js";
import { __html, onClick, priceFormat } from "../../helpers/global.js";
import { getCoatings, getColors } from "../../helpers/order.js";
import { TabulatorFull } from '../../libs/tabulator_esm.min.mjs';
import { state } from "../../modules/order/state.js";
import { bus } from "../bus.js";

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
                <button id="add-order-row" class="btn btn-outline-primary btn-sm btn-add-row">
                    <i class="bi bi-plus-circle"></i> ${__html('Add New Row')}
                </button>
                <div id="order-table"></div>
            </div>
        `;
    }

    table = () => {

        let self = this;

        // Initialize Tabulator
        this.table = new TabulatorFull("#order-table", {
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
                    editor: "tickCross",
                    headerSort: false,
                    formatter: "tickCross",
                    width: 40
                },
                {
                    title: __html("Color"),
                    field: "color",
                    editor: this.suggestionEditor,
                    headerSort: false,
                    editorParams: {
                        suggestions: this.colorSuggestions
                    },
                    width: 80,
                    cellEdited: (cell) => {

                        // Match entered value with suggestions (case-insensitive)
                        const enteredValue = cell.getValue();
                        if (enteredValue) {

                            const matchedSuggestion = this.colorSuggestions.find(suggestion =>
                                suggestion.toLowerCase() === enteredValue.toLowerCase()
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
                    editor: this.suggestionEditor,
                    headerSort: false,
                    editorParams: {
                        suggestions: this.coatingSuggestions
                    },
                    width: 100,
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
                    editor: productEditor,
                    headerSort: false,
                    width: 400,
                    editorParams: {
                        settings: state.settings,
                        discounts: state.order.discounts || {},
                        navigateToNextCell: this.navigateToNextCell
                    },
                },
                {
                    title: "",
                    field: "sketch",
                    headerSort: false,
                    width: 40,
                    formatter: function (cell) {
                        const value = cell.getValue() || '';
                        const row = cell.getRow().getData();
                        if (row.sketch_attached) return /*html*/`
                            <div class="d-flex align-items-center">
                                <span class="flex-grow-1">${value}</span>
                                <i class="bi bi-link-45deg text-primary fs-5 po product-edit-icon" 
                                   style="cursor:pointer;z-index:10;" 
                                   data-row-index="${cell.getRow().getPosition()}"></i>
                            </div>
                        `;

                        if (!row.sketch_attached) return value;
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
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { min: 0, step: 1 },
                    width: 68,
                },
                {
                    title: __html("L (mm)"),
                    field: "formula_length_calc",
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { min: 0, step: 1 },
                    width: 68,
                },
                {
                    title: __html("F (m²)"),
                    field: "area",
                    headerSort: false,
                    width: 68,
                    formatter: function (cell) {
                        return '<span class="calculated-field">' + (cell.getValue() || '0.000') + '</span>';
                    }
                },
                {
                    title: __html("Qty"),
                    field: "qty",
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { min: 0, step: 1 },
                    width: 60,
                },
                {
                    title: __html("Adj"),
                    field: "adj",
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { step: 0.01 },
                    width: 80,
                    formatter: function (cell) {
                        return cell.getValue() ? '<span class="calculated-field">' + priceFormat(state.settings, cell.getValue()) + '</span>' : '';
                    }
                },
                {
                    title: __html("Price"),
                    field: "price",
                    headerSort: false,
                    width: 100,
                    formatter: function (cell) {
                        const row = cell.getRow().getData();
                        const price = parseFloat(row.price) || 0;
                        // const adj = parseFloat(row.adj) || 0;
                        // const length = parseFloat(row.formula_length_calc) || 0;
                        // const total = length ? price + (adj * (length / 1000)) : price + adj;
                        return '<span class="calculated-field">' + priceFormat(state.settings, price) + '</span>';
                    },
                },
                {
                    title: __html("Discount"),
                    field: "discount",
                    editor: this.numberEditor,
                    width: 100,
                    formatter: function (cell) {
                        const value = cell.getValue() || 0;
                        return value + "%";
                    },
                    editor: this.suggestionEditor,
                    headerSort: false,
                    editorParams: {
                        suggestions: this.discountSuggestions
                    },
                },
                {
                    title: __html("Total"),
                    field: "total",
                    headerSort: false,
                    width: 100,
                    formatter: function (cell) {
                        return '<span class="calculated-field">' + priceFormat(state.settings, cell.getValue()) + '</span>';
                    }
                },
                {
                    title: __html("Note"),
                    field: "note",
                    headerSort: false,
                    width: 200,
                    formatter: function (cell) {
                        return '<span class="form-text">' + cell.getValue() + '</span>';
                    },
                    editor: this.textEditor,
                },
                {
                    title: "",
                    field: "actions",
                    headerSort: false,
                    width: 80,
                    formatter: function (cell) {
                        const i = cell.getRow().getPosition();
                        const currentRowData = cell.getRow().getData();
                        const currentCoating = currentRowData.coating || '';
                        const currentColor = currentRowData.color || '';

                        return /*html*/`
                            <div class="dropdown tableActionsCont">
                                <svg id="tableActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                </svg>
                                <ul class="dropdown-menu" aria-labelledby="tableActions${i}">
                                    <li><a class="dropdown-item po update-cm" href="#" data-index="${i}"><i class="bi bi-arrow-return-right"></i> ${__html('CM')}</a></li>
                                    <li><a class="dropdown-item po update-color" href="#" data-index="${i}"><i class="bi bi-arrow-return-right"></i> ${currentColor}</a></li>
                                    <li><a class="dropdown-item po update-coating" href="#" data-index="${i}"><i class="bi bi-arrow-return-right"></i> ${currentCoating}</a></li>
                                    <li><a class="dropdown-item po view-sketch" href="#" data-index="${i}"><i class="bi bi-link-45deg"></i> ${__html('Sketch')}</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item po delete-row" href="#" data-type="cancel" data-index="${i}"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                                </ul>
                            </div>`;
                    },
                    cellClick: function (e, cell) {

                        if (e.target.classList.contains('delete-row')) {
                            cell.getRow().delete();
                        }

                        if (e.target.classList.contains('update-cm')) {
                            e.preventDefault();
                            const currentRowData = cell.getRow().getData();
                            const currentCM = currentRowData.cm;
                            if (currentCM !== null && currentCM !== undefined) {
                                // Update CM for all rows
                                const allRows = self.table.getRows();
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
                                const allRows = self.table.getRows();
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
                                    updateCalculations(firstCell, state.settings, state.order);
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
                                const allRows = self.table.getRows();
                                allRows.forEach(row => {
                                    const rowData = row.getData();
                                    if (rowData.color !== '-') {
                                        row.update({ color: currentColor });
                                    }
                                });

                                // Sync items after update
                                self.syncItems();
                                self.refreshTable();
                                // self.table.redraw(true);

                                bus.emit('order:table:refreshed', state.order);
                            }
                        }

                        if (e.target.classList.contains('view-sketch')) {

                            console.log('View sketch for row:', cell.getRow().getData());

                            sketchEditor(cell, state.settings, state.order, (data) => {

                                // Sync items and trigger refresh
                                self.syncItems();
                                self.refreshTable();
                                // self.table.redraw(true);

                                bus.emit('order:table:refreshed', state.order);
                                // {"cmd":"confirm","inputs":{},"note":"","inputs_label":{},"input_fields":[{"id":"VusmaG","max":"6000","min":300,"type":"polyline","label":"L","params":[],"points":"352 426 82 269","default":"1000","label_pos":"left","ext":"","note":""}],"input_fields_values":{"inputL":"3000"},"formula_width":"300","formula_length":"L","viewpoint":null,"id":"42519-","_id":"f9f720eda2b5e4ea03d8b4cc5f947534bb5ea3bd","qty":"25","price":"11.78","total":"294.5","color":"RR32","coating":"Polyester","discounts":[{"note":"","type":"manager","percent":"20","availability":"always"}]}
                                console.log('Updated sketch from editor:', data);
                            });
                        }
                    }
                }
            ]
        });

        // Load existing order items into the table
        if (state.order.items && state.order.items.length > 0) {

            // console.log('Loading existing order items into the table:', state.order.items);
            // this.table.setData(state.order.items);
        }

        // Add event listener for row deletion
        this.table.on("rowDeleted", (row) => {
            this.syncItems();
            bus.emit('order:table:refreshed', state.order);
        });

        // Add event listener to track any cell value changes
        this.table.on("cellEdited", (cell) => {
            const row = cell.getRow();

            // Check if this is the last row and automatically add a new one
            if (this.table.getRows().length === 0) {
                this.addRow();
            }

            // You can perform specific actions based on the field or value
            updateCalculations(cell, state.settings, state.order);

            this.syncItems();
            this.refreshTable();
        });

        if (state.order?.items?.length === 0) setTimeout(() => { this.addRow() }, 100);
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
        state.order.items = this.table.getData().map(item => {
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
        this.table.redraw(true);
        setTimeout(() => {
            const scrollElementAfter = document.querySelector('#order-table .tabulator-tableholder');
            if (scrollElementAfter) {
                scrollElementAfter.scrollLeft = scrollLeft;
            }
        }, 0);

        bus.emit('order:table:refreshed', state.order);

        // // Force a redraw of the table to reflect any changes
        // this.table.redraw(true);
    }

    listeners = () => {

        // Add new row button functionality
        onClick('#add-order-row', () => {
            this.addRow();
        });

        bus.on('order:table:sync:items', (id) => {

            this.syncItems();
        });

        bus.on('client:updated', (client) => {

            console.log('Client updated:', client);

            // state.order.discounts = client.discounts || [];

            this.refreshTable();
        });
    }

    addRow = () => {

        // Get coating and color from previous row if it exists
        const rows = this.table.getRows();
        let previousRowData = {};

        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            previousRowData = lastRow.getData();
        }

        this.table.addRow({
            cm: previousRowData.cm || "",
            coating: previousRowData.coating || "",
            color: previousRowData.color || "",
            title: "",
            formula_width_calc: "",
            formula_length_calc: "",
            area: 0,
            qty: 1,
            adj: 0,
            price: 0,
            discount: 0,
            note: "",
            total: 0
        });

        // start editing color cell of the new row
        setTimeout(() => {
            const newRow = this.table.getRows()[this.table.getRows().length - 1];
            const firstColumn = this.table.getColumns()[1];
            const firstCell = newRow.getCell(firstColumn.getField());
            firstCell.edit();
        }, 50);
    }

    // Custom navigation function
    navigateToNextCell = (currentCell) => {

        // console.log('Navigating to next cell from:', currentCell.getField());

        const currentRow = currentCell.getRow();
        const currentColumn = currentCell.getColumn();
        const columns = this.table.getColumns().filter(col => col.getField() !== 'actions');
        const editableColumns = columns.filter(col => {
            // Check if column has an editor (is editable)
            const colDef = col.getDefinition();
            return colDef.editor && colDef.field !== 'area' && colDef.field !== 'total' && colDef.field !== 'price';
        });
        const currentColumnIndex = editableColumns.findIndex(col => col.getField() === currentColumn.getField());
        const currentRowIndex = this.table.getRows().findIndex(row => row === currentRow);

        // console.log('Current column index:', currentColumnIndex, ' row index', currentRowIndex);

        if (currentColumnIndex < editableColumns.length - 1) {
            // Move to next editable column in same row
            const nextColumn = editableColumns[currentColumnIndex + 1];
            // Refresh row reference to avoid stale references
            const freshRows = this.table.getRows();
            const freshRow = freshRows[currentRowIndex];

            // console.log('Moving to next column:', nextColumn.getField(), ' freshRow:', freshRow);

            // const nextCell = freshRow.getCell(nextColumn);

            if (freshRow) {
                const nextCell = freshRow.getCell(nextColumn.getField());
                if (nextCell) {
                    try {
                        nextCell.edit();
                    } catch (error) {
                        console.warn('Cannot edit cell:', nextColumn.getField(), error);
                    }
                }
            }
        } else {
            // Move to first editable column of next row, or create new row if at end
            const rows = this.table.getRows();
            const currentRowIndex = rows.findIndex(row => row === currentRow);

            if (currentRowIndex < rows.length - 1) {
                // Move to next row
                const nextRow = rows[currentRowIndex + 1];
                const firstEditableColumn = editableColumns[1];
                if (firstEditableColumn && nextRow) {
                    const nextCell = nextRow.getCell(firstEditableColumn.getField());
                    if (nextCell) {
                        try {
                            nextCell.edit();
                        } catch (error) {
                            console.warn('Cannot edit cell:', firstEditableColumn.getField(), error);
                        }
                    }
                }
            } else {

                // Add new row and move to first cell
                console.log('At end of table, adding new row.');
                this.addRow();
            }
        }
    }

    textEditor = (cell, onRendered, success, cancel, editorParams) => {

        const input = document.createElement("input");
        input.type = "text";
        input.value = cell.getValue() || "";
        input.className = "form-control form-control-sm";

        input.addEventListener("blur", () => {
            success(input.value);
        }
        );

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                success(input.value);
                // Navigate to next cell after a short delay
                // setTimeout(() => {
                this.navigateToNextCell(cell);
                // }, 25);
            } else if (e.key === "Escape") {
                cancel();
            } else if (e.key === "Tab") {
                success(input.value);
            }
        });

        onRendered(() => {
            input.focus();
            input.select();
        });

        return input;
    }

    // Enhanced number editor with Enter key handling
    numberEditor = (cell, onRendered, success, cancel, editorParams) => {

        const input = document.createElement("input");
        input.type = "number";
        input.value = cell.getValue() ? parseFloat(cell.getValue()) : "";
        input.className = "form-control form-control-sm";

        // Apply editor params
        if (editorParams.min !== undefined) input.min = editorParams.min;
        if (editorParams.max !== undefined) input.max = editorParams.max;
        if (editorParams.step !== undefined) input.step = editorParams.step;

        input.addEventListener("blur", () => {
            success(input.value ? parseFloat(input.value) : "");
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                success(input.value ? parseFloat(input.value) : "");
                // Navigate to next cell after a short delay
                // setTimeout(() => {
                this.navigateToNextCell(cell);
                // }, 25);
            } else if (e.key === "Escape") {
                cancel();
            } else if (e.key === "Tab") {
                success(input.value ? parseFloat(input.value) : "");
            }
        });

        onRendered(() => {
            input.focus();
            input.select();
        });

        return input;
    }

    // Generic editor for suggestion fields
    suggestionEditor = (cell, onRendered, success, cancel, editorParams) => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = cell.getValue() || "";
        input.className = "form-control form-control-sm";

        const datalist = document.createElement("datalist");
        datalist.id = "suggestions-" + Math.random().toString(36).substring(2, 11);
        datalist.style.backgroundColor = "beige";
        datalist.style.border = "var(--bs-border-width) solid var(--bs-border-color)!important;";
        datalist.style.borderRadius = "4px";
        datalist.style.minWidth = "200px";

        editorParams.suggestions.forEach(suggestion => {
            const option = document.createElement("option");
            option.value = suggestion;
            option.style.backgroundColor = "beige";
            option.style.padding = "4px 8px";
            datalist.appendChild(option);
        });


        let lastKeyPressed = '';

        input.addEventListener("keydown", (e) => {
            lastKeyPressed = e.key;

            console.log('Key pressed in suggestion editor:', lastKeyPressed);
        });

        // Detect when user selects from datalist
        input.addEventListener("input", (e) => {
            const selectedValue = e.target.value;
            if (editorParams.suggestions.includes(selectedValue) && lastKeyPressed !== 'Backspace' && lastKeyPressed !== 'Delete') {
                console.log('User selected from datalist:', selectedValue);
                // Handle the selection here
                success(selectedValue);
                this.navigateToNextCell(cell);
                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }
            }
        });

        // input.addEventListener("input", (e) => {
        //     // This triggers when user selects from datalist

        //     const selectedValue = e.target.value;
        //     if (editorParams.suggestions.includes(selectedValue)) {
        //         // console.log('S:Suggestion selected:', selectedValue);
        //         // Don't navigate if user pressed backspace or delete
        //         if (lastKeyPressed !== 'Backspace' && lastKeyPressed !== 'Delete') {
        //             // Navigate to next cell after a short delay
        //             // setTimeout(() => {
        //             // this.navigateToNextCell(cell);
        //             // }, 25);
        //         }
        //     }
        // });

        input.setAttribute("list", datalist.id);
        document.body.appendChild(datalist);

        input.addEventListener("blur", () => {
            success(input.value);
            if (datalist.parentNode) {
                document.body.removeChild(datalist);
            }
        });

        input.addEventListener("keydown", (e) => {

            if (e.key === "Enter") {

                success(input.value);

                // e.preventDefault();

                this.navigateToNextCell(cell);

                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }

                // Navigate to next cell after a short delay
                // setTimeout(() => {

                // }, 25);
            } else if (e.key === "Escape") {
                cancel();
                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }
            }
        });

        onRendered(() => {
            input.focus();
        });

        return input;
    }
}