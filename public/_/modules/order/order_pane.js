import { getProductSuggestions } from "../../api/get_product_suggestions.js";
import { __html, FILES, onClick } from "../../helpers/global.js";
import { getCoatings, getColors } from "../../helpers/order.js";
import { calculateItemTotal, getPrice } from "../../helpers/price.js";
import { TabulatorFull } from '../../libs/tabulator_esm.min.mjs';
import { bus } from "../bus.js";

export class OrderPane {

    constructor(settings, order) {

        this.settings = settings;
        this.order = order;
        this.order.items = this.order.items || [];

        // console.log('OrderPane initialized with settings:', this.settings, 'and order:', this.order);

        // check if header is already present
        this.init();
    }

    init = () => {

        // Sample suggestions for different fields
        this.cmSuggestions = [true, false];
        this.coatingSuggestions = getCoatings(this.settings);
        this.colorSuggestions = getColors(this.settings);
        this.discountSuggestions = [5, 7, 10, 15, 20, 25, 30, 50];
        this.productSuggestions = [];

        this.view();

        this.table();

        this.listeners();
    }

    view = () => {

        // Add fade effect to indicate loading/disabled state
        document.querySelector('.right-pane').innerHTML = /*html*/`
            <div class="table-container">
                <button id="add-order-row" class="btn btn-primary btn-sm btn-add-row">
                    <i class="bi bi-plus-circle"></i> ${__html('Add New Row')}
                </button>
                <div id="order-table"></div>
            </div>
        `;

        // // Add event listeners or any additional initialization here
        // this.listeners();
    }

    table = () => {

        // Initialize Tabulator
        this.table = new TabulatorFull("#order-table", {
            height: "600px",
            layout: "fitColumns",
            resizableColumns: true,
            movableColumns: true,
            sortable: false,
            sorter: false,
            // keybindings: {
            //     "navNext": "Enter",
            //     "navPrev": "shift+tab",
            //     "navDown": false,
            //     "navUp": false,
            //     "navLeft": false,
            //     "navRight": false,
            // },
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
                    width: 80
                },
                {
                    title: __html("Coating"),
                    field: "coating",
                    editor: this.suggestionEditor,
                    headerSort: false,
                    editorParams: {
                        suggestions: this.coatingSuggestions
                    },
                    width: 100
                },
                {
                    title: __html("Product"),
                    field: "title",
                    editor: this.productEditor,
                    headerSort: false,
                    width: 360,
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
                },
                {
                    title: __html("W (mm)"),
                    field: "formula_width_calc",
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { min: 0, step: 1 },
                    width: 68,
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
                },
                {
                    title: __html("L (mm)"),
                    field: "formula_length_calc",
                    editor: this.numberEditor,
                    headerSort: false,
                    editorParams: { min: 0, step: 1 },
                    width: 68,
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
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
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
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
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
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
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
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
                    // cellEdited: (cell) => {
                    //     this.updateCalculations(cell.getRow());
                    // }
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

            console.log('Loading existing order items into the table:', this.order.items);
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
            this.updateCalculations(cell);
            this.syncItems();
        });

        // this.addRow();
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
            total: 0
        });

        // start editing color cell of the new row
        const newRow = this.table.getRows()[this.table.getRows().length - 1];
        const firstColumn = this.table.getColumns()[1];
        const firstCell = newRow.getCell(firstColumn.getField());
        firstCell.edit();
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

        const currentRow = currentCell.getRow();
        const currentColumn = currentCell.getColumn();
        const columns = this.table.getColumns().filter(col => col.getField() !== 'actions' && col.getField() !== 'area' && col.getField() !== 'total');
        const currentColumnIndex = columns.findIndex(col => col.getField() === currentColumn.getField());

        if (currentColumnIndex < columns.length - 1) {
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

                // this.productSelected(suggestion, cell);

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
                // this.productSelected(suggestion, cell);
                success(input.value);
                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }
                // console.log('Suggestion entered:', input.value);
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

    // Custom editor for product field with search suggestions  
    productEditor = (cell, onRendered, success, cancel, editorParams) => {
        const container = document.createElement("div");
        container.style.position = "relative";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "8px";

        const input = document.createElement("input");
        input.type = "text";
        input.value = cell.getValue() || "";
        input.className = "form-control form-control-sm";
        input.style.flex = "1";

        const imagePreview = document.createElement("img");
        imagePreview.style.width = "32px";
        imagePreview.style.height = "32px";
        imagePreview.style.objectFit = "cover";
        imagePreview.style.border = "1px solid #ddd";
        imagePreview.style.borderRadius = "4px";
        imagePreview.src = "https://cdn.skarda.design/8e0729adbf79275c11a83d69df75f0c09061780a-polyester-2h3-1500.webp"; // Set default image source if needed
        imagePreview.style.display = "none"; // Initially hidden

        const dropdown = document.createElement("div");
        dropdown.style.position = "absolute";
        dropdown.style.top = "100%";
        dropdown.style.left = "0";
        dropdown.style.right = "0";
        dropdown.style.backgroundColor = "white";
        dropdown.style.border = "1px solid var(--bs-border-color);";
        dropdown.style.borderRadius = "4px";
        dropdown.style.maxHeight = "320px";
        dropdown.style.overflowY = "auto";
        dropdown.style.zIndex = "1000";
        dropdown.style.display = "none";

        container.appendChild(input);
        container.appendChild(imagePreview);
        container.appendChild(dropdown);

        let searchTimeout;
        let selectedIndex = -1;
        let options = [];

        const updateSelectedOption = () => {
            options.forEach((option, index) => {
                if (index === selectedIndex) {
                    option.style.backgroundColor = "#007bff";
                    option.style.color = "white";
                    option.scrollIntoView({ block: "nearest" });
                } else {
                    option.style.backgroundColor = "white";
                    option.style.color = "black";
                }
            });
        };

        const updateDropdown = (suggestions) => {
            dropdown.innerHTML = '';
            options = [];
            selectedIndex = -1;

            if (suggestions.length > 0) {
                suggestions.forEach((suggestion, index) => {
                    const option = document.createElement("div");
                    option.style.padding = "8px 12px";
                    option.style.cursor = "pointer";
                    option.style.borderBottom = "1px solid #eee";
                    option.style.backgroundColor = "white";
                    option.style.display = "flex";
                    option.style.alignItems = "center";
                    option.style.gap = "8px";

                    const optionImage = document.createElement("img");
                    optionImage.style.width = "42px";
                    optionImage.style.height = "42px";
                    optionImage.style.objectFit = "cover";
                    optionImage.style.objectPosition = "center";
                    optionImage.style.borderRadius = "4px";
                    optionImage.style.backgroundColor = "#f8f9fa";
                    optionImage.style.transition = "transform 0.2s ease";
                    optionImage.src = FILES + "/" + suggestion._id + "-250.webp";

                    // Add hover effect to scale image
                    optionImage.addEventListener("mouseenter", () => {
                        optionImage.style.transform = "scale(1.2)";
                    });

                    optionImage.addEventListener("mouseleave", () => {
                        optionImage.style.transform = "scale(1)";
                    });

                    // Handle image load errors
                    optionImage.onerror = () => {
                        optionImage.style.display = "none";
                    };

                    const optionText = document.createElement("span");
                    optionText.textContent = suggestion.title + " " + suggestion.sdesc;
                    optionText.style.flex = "1";

                    option.appendChild(optionImage);
                    option.appendChild(optionText);

                    option.addEventListener("mouseenter", (e) => {
                        selectedIndex = index;
                        updateSelectedOption();
                    });

                    option.addEventListener("mouseleave", (e) => {
                        e.preventDefault();
                        selectedIndex = -1;
                        updateSelectedOption();
                    });

                    option.addEventListener("click", () => {
                        // console.log('Suggestion clicked:', suggestion);
                        this.productSelected(suggestion, cell);

                        // input.value = suggestion.title + " " + suggestion.sdesc;
                        // dropdown.style.display = "none";

                        // Immediately update the cell value before navigating
                        success(suggestion.title + " " + suggestion.sdesc);

                        setTimeout(() => {
                            this.navigateToNextCell(cell);
                        }, 10);
                    });

                    dropdown.appendChild(option);
                    options.push(option);
                });
                dropdown.style.display = "block";
            } else {
                dropdown.style.display = "none";
            }
        };

        input.addEventListener("input", (e) => {
            const searchTerm = e.target.value;

            // Clear previous timeout to debounce the search
            clearTimeout(searchTimeout);

            // Debounce search requests (300ms delay)
            searchTimeout = setTimeout(() => {
                if (searchTerm.length >= 1) {
                    this.searchProductSuggestionsFromBackend(searchTerm, cell, (suggestions) => {
                        updateDropdown(suggestions);
                    });
                } else {
                    updateDropdown(this.productSuggestions);
                }
            }, 300);
        });

        input.addEventListener("focus", () => {
            updateDropdown(this.productSuggestions);
        });

        input.addEventListener("blur", (e) => {
            // Delay hiding dropdown to allow clicks on options
            setTimeout(() => {
                if (!dropdown.contains(e.relatedTarget)) {
                    dropdown.style.display = "none";
                    // this.productSuggestions = [];
                    clearTimeout(searchTimeout);
                    success(input.value);
                }
            }, 150);
        });
        input.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                e.stopPropagation(); // Add this to prevent table navigation
                if (dropdown.style.display === "block" && options.length > 0) {
                    selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
                    updateSelectedOption();
                }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation(); // Add this to prevent table navigation
                if (dropdown.style.display === "block" && options.length > 0) {
                    selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
                    updateSelectedOption();
                }
            } else if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation(); // Add this to prevent table navigation
                clearTimeout(searchTimeout);

                if (selectedIndex >= 0 && selectedIndex < options.length) {
                    // Select the highlighted option
                    const selectedSuggestion = options[selectedIndex].textContent;
                    input.value = selectedSuggestion;
                    dropdown.style.display = "none";
                    const suggestion = this.productSuggestions[selectedIndex];
                    this.productSelected(suggestion, cell);
                    success(selectedSuggestion);
                    setTimeout(() => {
                        this.navigateToNextCell(cell);
                    }, 10);
                } else {
                    // No option selected, just accept current input value
                    dropdown.style.display = "none";
                    this.productSuggestions = [];
                    success(input.value);
                    setTimeout(() => {
                        this.navigateToNextCell(cell);
                    }, 10);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation(); // Add this to prevent table navigation
                clearTimeout(searchTimeout);
                dropdown.style.display = "none";
                this.productSuggestions = [];
                cancel();
            }
        });

        onRendered(() => {
            input.focus();
        });

        return container;
    }

    productSelected = (suggestion, cell) => {

        // this.syncItems(suggestion, cell);

        // Map suggestion values to current row
        const rowData = cell.getRow().getData();
        const updatedData = { ...rowData, ...suggestion };

        // Update the row with all suggestion properties
        cell.getRow().update(updatedData);

        // Update calculations after mapping the suggestion data
        this.updateCalculations(cell);
    }

    // New method to search products from backend
    searchProductSuggestionsFromBackend = (s, cell, callback) => {

        // const columns = this.table.getColumns()
        const rowData = cell.getRow().getData();
        const color = rowData.color;
        const coating = rowData.coating;

        // console.log('Searching backend for products with term:', color, coating, s);

        getProductSuggestions({ s, color, coating }, (response) => {

            this.productSuggestions = response.suggestions; // .map(suggestion => suggestion.title + " " + suggestion.sdesc);

            callback(this.productSuggestions);

            // console.log('Product suggestions from backend:', response.suggestions);
        });
    }

    // Helper method to update datalist options
    updateProductDatalist = (datalist, suggestions) => {

        console.log('Updating product datalist with suggestions:', suggestions);

        datalist.innerHTML = '';
        suggestions.forEach(suggestion => {
            const option = document.createElement("option");
            option.value = suggestion;

            // console.log('Adding suggestion to datalist:', suggestion);
            datalist.appendChild(option);
        });
    }

    // Function to calculate square footage
    calculatearea = (width, length) => {
        if (width && length) {
            return ((width * length) / 1000000).toFixed(3); // Convert mm² to m²
        }
        return 0;
    }

    // // Function to calculate total price
    // calculatetotal = (area, qty, price, adj, discount) => {
    //     const basePrice = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
    //     const adjustedPrice = basePrice + (adj || 0);

    //     // Handle discount with % sign - extract numeric value
    //     let discountValue = discount || 0;
    //     if (typeof discountValue === 'string' && discountValue.includes('%')) {
    //         discountValue = parseFloat(discountValue.replace('%', '')) || 0;
    //     }

    //     // console.log('Calculating total with basePrice:', basePrice, 'qty:', qty, 'price:', price, 'adj:', adj, 'discount:', discountValue);

    //     const discountAmount = adjustedPrice * (discountValue / 100);
    //     const finalPrice = adjustedPrice - discountAmount;
    //     return parseFloat(Math.max(0, finalPrice).toFixed(2));
    // }

    // Function to update calculations for a row
    updateCalculations = (cell) => {

        const row = cell.getRow();
        const data = row.getData();
        const cellField = cell.getField();

        let coating = data.coating || "";
        let color = data.color || "";

        let price = { price: 0, formula_width_calc: "", formula_length_calc: "" };

        // update product price in the row
        if (data._id) {

            price = getPrice(this.settings, { ...data, coating: coating, color: color });

            row.update({
                price: price.price,
            });
        }

        // calculate price based on the product's formula
        if (cellField == "title" && data._id) {

            row.update({
                product: data.title,
                width: price.formula_width_calc || "",
                length: price.formula_length_calc || "",
            });
        }

        // Calculate square footage
        const area = this.calculatearea(data.width, data.length);
        row.update({ area: area });

        // Calculate total price
        const total = calculateItemTotal(
            data.qty,
            data.price,
            data.adj,
            data.discount
        );
        row.update({ total: total });

        this.syncItems();

        bus.emit('order:table:refreshed');

        console.log('Updating', row.getData());
    }
}