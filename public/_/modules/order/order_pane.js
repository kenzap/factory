// import { getProductSuggestions } from "../../api/get_product_suggestions.js";
import { updateCalculations } from "../../components/order/order_calculations.js";
import { productEditor } from "../../components/order/order_product_editor.js";
import { __html, onClick } from "../../helpers/global.js";
import { getCoatings, getColors } from "../../helpers/order.js";
import { TabulatorFull } from '../../libs/tabulator_esm.min.mjs';
import { bus } from "../bus.js";

export class OrderPane {

    constructor(settings, order) {

        this.settings = settings;
        this.order = order;
        this.order.items = this.order.items || [];

        // check if header is already present
        this.init();
    }

    init = () => {

        // Sample suggestions for different fields
        this.cmSuggestions = [true, false];
        this.coatingSuggestions = getCoatings(this.settings);
        this.colorSuggestions = getColors(this.settings);
        this.discountSuggestions = [5, 7, 10, 15, 20, 25, 30, 50];
        // this.productSuggestions = [];

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

        // Initialize Tabulator
        this.table = new TabulatorFull("#order-table", {
            height: "auto",
            layout: "fitColumns",
            resizableColumns: true,
            movableColumns: true,
            sortable: false,
            sorter: false,
            data: this.order.items,
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
                        settings: this.settings,
                        navigateToNextCell: this.navigateToNextCell
                    },
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
                    formatter: "money",
                    formatterParams: { symbol: "€", precision: 2 },
                },
                {
                    title: __html("Price"),
                    field: "price",
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { min: 0, step: 0.01 },
                    width: 100,
                    formatter: "money",
                    formatterParams: { symbol: "€", precision: 2 },
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
                        return '<span class="calculated-field">€' + (cell.getValue().toFixed(2) || '0.00') + '</span>';
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
                    editor: this.suggestionEditor,
                    editorParams: {
                        suggestions: this.discountSuggestions
                    },
                },
                {
                    title: "",
                    field: "actions",
                    headerSort: false,
                    width: 80,
                    formatter: function (cell, formatterParams, onRendered) {
                        const i = cell.getRow().getPosition();
                        return /*html*/`
                            <div class="dropdown tableActionsCont">
                                <svg id="tableActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                </svg>
                                <ul class="dropdown-menu" aria-labelledby="tableActions${i}">
                                    <li><a class="dropdown-item po set-cm" href="#" data-index="${i}"><i class="bi bi-arrow-return-right"></i> ${__html('CM')}</a></li>
                                    <li><a class="dropdown-item po set-colors" href="#" data-index="${i}"><i class="bi bi-arrow-return-right"></i> ${__html('Colors')}</a></li>
                                    <li><a class="dropdown-item po set-coatings" href="#" data-index="${i}"><i class="bi bi-arrow-return-right"></i> ${__html('Coatings')}</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item po delete-row" href="#" data-type="cancel" data-index="${i}"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                                </ul>
                            </div>`;
                    },
                    cellClick: function (e, cell) {
                        if (e.target.classList.contains('delete-row')) {
                            cell.getRow().delete();
                        }
                    }
                }
            ]
        });

        // Load existing order items into the table
        if (this.order.items && this.order.items.length > 0) {

            // console.log('Loading existing order items into the table:', this.order.items);
            // this.table.setData(this.order.items);
        }

        // Add event listener for row deletion
        this.table.on("rowDeleted", (row) => {
            this.syncItems();
            bus.emit('order:table:refreshed');
        });

        // Add event listener to track any cell value changes
        this.table.on("cellEdited", (cell) => {
            const row = cell.getRow();
            const field = cell.getField();
            const newValue = cell.getValue();
            const rowData = row.getData();

            // Check if this is the last row and automatically add a new one
            if (this.table.getRows().length === 0) {
                this.addRow();
            }

            // You can perform specific actions based on the field or value
            updateCalculations(cell, this.settings);
            this.syncItems();
        });

        if (this.order.items.length === 0) setTimeout(() => { this.addRow() }, 100);
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
        this.order.items = this.table.getData().map(item => {
            return {
                ...item,
                // area: (parseFloat(item.width) * parseFloat(item.length) / 1000000).toFixed(3),
                // total: getPrice(this.settings, item).total.toFixed(2)
            };
        });
    }

    listeners = () => {

        // Add new row button functionality
        onClick('#add-order-row', () => {
            this.addRow();
        });


        bus.on('order:table:sync:items', (id) => {

            this.syncItems();
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
                setTimeout(() => {
                    this.navigateToNextCell(cell);
                }, 10);
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

    // Custom navigation function
    navigateToNextCell = (currentCell) => {

        // console.log('Navigating to next cell from:', currentCell.getField());

        const currentRow = currentCell.getRow();
        const currentColumn = currentCell.getColumn();
        const columns = this.table.getColumns().filter(col => col.getField() !== 'actions' && col.getField() !== 'area' && col.getField() !== 'total');
        const currentColumnIndex = columns.findIndex(col => col.getField() === currentColumn.getField());

        if (currentColumnIndex < columns.length - 2) {
            // Move to next column in same row
            const nextColumn = columns[currentColumnIndex + 1];
            const nextCell = currentRow.getCell(nextColumn.getField());
            nextCell.edit();
        } else {
            // Move to first column of next row, or create new row if at end
            const rows = this.table.getRows();
            const currentRowIndex = rows.findIndex(row => row === currentRow);

            if (currentRowIndex < rows.length - 1) {
                // Move to next row
                const nextRow = rows[currentRowIndex + 1];
                const firstColumn = columns[1];
                const nextCell = nextRow.getCell(firstColumn.getField());
                nextCell.edit();
            } else {

                // Add new row and move to first cell
                console.log('At end of table, adding new row.');
                this.addRow();
            }
        }
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
            // option.style.color = "#fff!important";
            option.style.padding = "4px 8px";

            // console.log('Adding suggestion:', suggestion);
            datalist.appendChild(option);
        });

        input.addEventListener("input", (e) => {
            // This triggers when user selects from datalist
            const selectedValue = e.target.value;
            if (editorParams.suggestions.includes(selectedValue)) {
                // console.log('S:Suggestion selected:', selectedValue);
                // Navigate to next cell after a short delay
                setTimeout(() => {
                    this.navigateToNextCell(cell);
                }, 10);
            }
        });

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
                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }

                // Navigate to next cell after a short delay
                setTimeout(() => {
                    this.navigateToNextCell(cell);
                }, 10);
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

    // // New method to search products from backend
    // searchProductSuggestionsFromBackend = (s, cell, callback) => {

    //     // const columns = this.table.getColumns()
    //     const rowData = cell.getRow().getData();
    //     const color = rowData.color;
    //     const coating = rowData.coating;

    //     // console.log('Searching backend for products with term:', color, coating, s);

    //     getProductSuggestions({ s, color, coating }, (response) => {

    //         this.productSuggestions = response.suggestions; // .map(suggestion => suggestion.title + " " + suggestion.sdesc);

    //         callback(this.productSuggestions);

    //         // console.log('Product suggestions from backend:', response.suggestions);
    //     });
    // }

    // Helper method to update datalist options
    // updateProductDatalist = (datalist, suggestions) => {

    //     console.log('Updating product datalist with suggestions:', suggestions);

    //     datalist.innerHTML = '';
    //     suggestions.forEach(suggestion => {
    //         const option = document.createElement("option");
    //         option.value = suggestion;

    //         // console.log('Adding suggestion to datalist:', suggestion);
    //         datalist.appendChild(option);
    //     });
    // }

    // // Function to calculate square footage
    // calculatearea = (width, length) => {
    //     if (width && length) {
    //         return ((width * length) / 1000000).toFixed(3); // Convert mm² to m²
    //     }
    //     return 0;
    // }

    // // Function to update calculations for a row
    // updateCalculations = (cell) => {

    //     console.log('Updating calculations for cell:', cell.getField());

    //     const row = cell.getRow();
    //     const data = row.getData();
    //     const cellField = cell.getField();

    //     let coating = data.coating || "";
    //     let color = data.color || "";
    //     let price = { price: 0, formula_width_calc: "", formula_length_calc: "" };

    //     // update product price in the row
    //     if (data._id) {

    //         price = getPrice(this.settings, { ...data, coating: coating, color: color });

    //         row.update({
    //             price: price.price,
    //         });
    //     }

    //     // calculate price based on the product's formula
    //     if (cellField == "title" && data._id) {

    //         row.update({
    //             product: data.title,
    //             width: price.formula_width_calc || "",
    //             length: price.formula_length_calc || "",
    //         });
    //     }

    //     // Calculate square footage
    //     const area = this.calculatearea(data.formula_width_calc, data.formula_length_calc);
    //     console.log('Calculated area:', area);

    //     row.update({ area: area });

    //     // Calculate total price
    //     const total = calculateItemTotal(
    //         data.qty,
    //         data.price,
    //         data.adj,
    //         data.discount
    //     );
    //     row.update({ total: total });

    //     this.syncItems();

    //     bus.emit('order:table:refreshed');

    //     console.log('Updating', row.getData());
    // }
}