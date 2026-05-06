import { getProductSuggestions } from "../../api/get_product_suggestions.js";
import { refreshRowCalculations } from "../../components/order/order_calculations.js";
import { toast } from "../../helpers/global.js";
import { isAllowedToEdit } from "../../helpers/order.js";
import { calculate } from "../../helpers/price.js";
import { Product } from "../products/product.js";

let productSuggestions = [];

/**
 * A client search component that provides autocomplete functionality for searching clients.
 * Example, in the orders journal.
 * 
 * @class ClientSearch 
 */
export const productEditor = (cell, onRendered, success, cancel, editorParams) => {

    // Check if editing is allowed for this row
    const rowData = cell.getRow().getData();
    const is = isAllowedToEdit(rowData);
    if (!is.allow) {
        toast(is.reason || 'You are not allowed to edit this row.');
        cancel();
        return;
    }

    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "8px";
    container.style.zIndex = "2100";

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
    imagePreview.src = "/assets/img/placeholder.jpg";
    imagePreview.style.display = "none"; // Initially hidden

    // Create large preview image overlay
    const largePreview = document.createElement("div");
    largePreview.style.position = "fixed";
    largePreview.style.top = "20px";
    largePreview.style.right = "20px";
    largePreview.style.width = "450px";
    largePreview.style.height = "450px";
    largePreview.style.backgroundColor = "white";
    largePreview.style.border = "2px solid #ddd";
    largePreview.style.borderRadius = "8px";
    largePreview.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
    largePreview.style.zIndex = "9999";
    largePreview.style.display = "none";
    largePreview.style.overflow = "hidden";

    const largeImage = document.createElement("img");
    largeImage.style.width = "100%";
    largeImage.style.height = "100%";
    largeImage.style.objectFit = "cover";
    largeImage.style.objectPosition = "center";

    largePreview.appendChild(largeImage);
    document.body.appendChild(largePreview);

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
    dropdown.style.zIndex = "2200";
    dropdown.style.display = "none";

    container.appendChild(input);
    container.appendChild(imagePreview);
    container.appendChild(dropdown);

    let searchTimeout;
    let selectedIndex = -1;
    let options = [];
    const rowElement = cell.getRow()?.getElement?.() || null;

    const setRowDropdownState = (isOpen) => {
        if (!rowElement) return;
        rowElement.classList.toggle("editor-open-row", Boolean(isOpen));
    };

    const cleanupEditorChrome = ({ removePreview = false } = {}) => {
        dropdown.style.display = "none";
        largePreview.style.display = "none";
        setRowDropdownState(false);

        if (removePreview && largePreview.parentNode) {
            document.body.removeChild(largePreview);
        }
    };

    const updateSelectedOption = () => {
        options.forEach((option, index) => {
            if (index === selectedIndex) {
                option.style.backgroundColor = "#007bff";
                option.style.color = "white";
                option.querySelector(".text-sdesc").style.color = "white";
                option.scrollIntoView({ block: "nearest" });
            } else {
                option.style.backgroundColor = "white";
                option.querySelector(".text-sdesc").style.color = 'var(--gray-color)';
                option.style.color = "black";
            }
        });
    };

    const updateDropdown = (suggestions) => {
        // Preserve selectedIndex when dropdown is being refreshed
        const currentSelectedIndex = selectedIndex;

        dropdown.innerHTML = '';
        options = [];

        if (suggestions.length > 0) {
            suggestions.forEach((suggestion, index) => {

                const product = new Product(suggestion);

                console.log('Suggestion:', suggestion);
                console.log('Product image URL:', product.imageUrl);

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
                optionImage.src = product.imageUrl;

                // Add hover effect to scale image
                optionImage.addEventListener("mouseenter", () => {
                    optionImage.style.transform = "scale(1.2)";
                });

                optionImage.addEventListener("mouseleave", () => {
                    optionImage.style.transform = "scale(1)";
                });

                // Handle image load errors
                optionImage.onerror = () => {
                    optionImage.onerror = null; // Prevent infinite loop
                    optionImage.style.display = "none";
                };
                optionImage.style.display = "block";

                const optionText = document.createElement("div");
                optionText.style.flex = "1";
                optionText.style.display = "flex";
                optionText.style.flexDirection = "column";

                const titleSpan = document.createElement("span");
                titleSpan.textContent = suggestion.title;
                titleSpan.style.fontWeight = "500";
                titleSpan.style.fontSize = "14px";

                const sdescSpan = document.createElement("span");
                sdescSpan.classList.add("text-sdesc");
                sdescSpan.textContent = suggestion.sdesc;
                sdescSpan.style.fontSize = "12px";
                sdescSpan.style.color = 'var(--gray-color)';
                sdescSpan.style.marginTop = "2px";

                optionText.appendChild(titleSpan);
                optionText.appendChild(sdescSpan);

                const stock = getStockAmount(cell, suggestion);
                const stockSpan = document.createElement("span");
                stockSpan.textContent = stock;
                stockSpan.style.padding = "2px 6px";
                stockSpan.style.borderRadius = "12px";
                stockSpan.classList.add("status-secondary");
                stockSpan.style.fontSize = "12px";
                stockSpan.style.fontWeight = "600";
                stockSpan.style.visibility = stock > 0 ? "visible" : "hidden"; // Hide stock badge for now, can be toggled on if needed
                stockSpan.style.marginLeft = "auto";
                stockSpan.style.alignSelf = "flex-start";

                option.appendChild(optionImage);
                option.appendChild(optionText);
                option.appendChild(stockSpan);

                option.addEventListener("mouseenter", (e) => {

                    // Show large preview image
                    largeImage.src = product.imageLargeUrl;
                    largeImage.onerror = () => {
                        largeImage.onerror = null; // Prevent infinite loop
                        largeImage.style.display = "none";
                    };
                    largeImage.style.display = "block";
                    largePreview.style.display = "block";
                });

                option.addEventListener("mouseleave", (e) => {
                    e.preventDefault();

                    // Hide large preview image
                    largePreview.style.display = "none";
                });

                option.addEventListener("click", () => {

                    productSelected(suggestion, cell, editorParams.settings, editorParams.discounts);

                    // Hide large preview on click
                    largePreview.style.display = "none";

                    // Immediately update the cell value before navigating
                    success(suggestion.title);

                    setTimeout(() => {
                        editorParams.navigateToNextCell(cell);
                    }, 10);
                });

                dropdown.appendChild(option);
                options.push(option);
            });

            // Restore selectedIndex if it's still valid
            if (currentSelectedIndex >= 0 && currentSelectedIndex < options.length) {
                selectedIndex = currentSelectedIndex;
            } else {
                selectedIndex = -1;
            }

            updateSelectedOption();
            dropdown.style.display = "block";
            setRowDropdownState(true);
        } else {
            selectedIndex = -1;
            cleanupEditorChrome();
        }
    };

    input.addEventListener("input", (e) => {
        const searchTerm = e.target.value.trim();

        // Clear previous timeout to debounce the search
        clearTimeout(searchTimeout);

        // Debounce search requests (300ms delay)
        searchTimeout = setTimeout(() => {
            if (searchTerm.length >= 1) {
                searchProductSuggestionsFromBackend(searchTerm, cell, (suggestions) => {
                    updateDropdown(suggestions);
                });
            } else {
                updateDropdown(productSuggestions);
            }
        }, 300);
    });

    input.addEventListener("focus", () => {
        updateDropdown(productSuggestions);
    });

    input.addEventListener("blur", (e) => {
        // Delay hiding dropdown to allow clicks on options
        setTimeout(() => {
            if (!dropdown.contains(e.relatedTarget)) {
                cleanupEditorChrome({ removePreview: true });
                // productSuggestions = [];
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

                // Show large preview for keyboard navigation
                const suggestion = productSuggestions[selectedIndex];
                if (suggestion) {
                    const product = new Product(suggestion);
                    largeImage.src = product.imageLargeUrl;
                    largeImage.onerror = () => {
                        largeImage.onerror = null; // Prevent infinite loop
                        largeImage.style.display = "none";
                    };
                    largeImage.style.display = "block";
                    largePreview.style.display = "block";
                }
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation(); // Add this to prevent table navigation
            if (dropdown.style.display === "block" && options.length > 0) {
                selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
                updateSelectedOption();

                // Show large preview for keyboard navigation
                const suggestion = productSuggestions[selectedIndex];
                if (suggestion) {
                    const product = new Product(suggestion);
                    largeImage.src = product.imageLargeUrl;
                    largeImage.onerror = () => {
                        largeImage.onerror = null; // Prevent infinite loop
                        largeImage.style.display = "none";
                    };
                    largePreview.style.display = "block";
                }
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation(); // Add this to prevent table navigation
            clearTimeout(searchTimeout);

            if (selectedIndex >= 0 && selectedIndex < options.length) {

                // Select the highlighted option
                const suggestion = productSuggestions[selectedIndex];

                const selectedSuggestion = suggestion.title;
                input.value = selectedSuggestion;
                cleanupEditorChrome({ removePreview: true });

                productSelected(suggestion, cell, editorParams.settings, editorParams.discounts);
                success(selectedSuggestion);
                setTimeout(() => {
                    if (e.shiftKey) {
                        editorParams.navigateToPreviousCell(cell);
                    } else {
                        editorParams.navigateToNextCell(cell);
                    }
                }, 10);
            } else {

                // No option selected, just accept current input value
                cleanupEditorChrome({ removePreview: true });
                productSuggestions = [];
                success(input.value);
                setTimeout(() => {
                    if (e.shiftKey) {
                        editorParams.navigateToPreviousCell(cell);
                    } else {
                        editorParams.navigateToNextCell(cell);
                    }
                }, 10);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation(); // Add this to prevent table navigation
            clearTimeout(searchTimeout);
            cleanupEditorChrome({ removePreview: true });
            productSuggestions = [];
            cancel();
        }
    });

    onRendered(() => {
        input.focus();
    });

    return container;
}

// New method to search products from backend
const searchProductSuggestionsFromBackend = (s, cell, callback) => {

    const rowData = cell.getRow().getData();
    const color = rowData.color;
    const coating = rowData.coating;

    getProductSuggestions({ s, color, coating }, (response) => {

        productSuggestions = response.suggestions;

        callback(productSuggestions);
    });
}

const getStockAmount = (cell, suggestion) => {

    let stock = 0;

    const rowData = cell.getRow().getData();
    const color = rowData.color;
    const coating = rowData.coating;

    suggestion.var_price?.forEach(variant => {

        if (variant.parent === coating && variant.title === color) {
            stock = parseFloat(variant.stock);
        }
    });

    return stock !== undefined ? stock : 0;
}

const productSelected = (suggestion, cell, settings, discounts) => {

    // Map suggestion values to current row
    const rowData = cell.getRow().getData();
    let updatedData = { ...rowData, ...suggestion };

    updatedData.title = updatedData.title.trim();
    updatedData.formula_width_calc = updatedData.formula_width || "";
    updatedData.formula_length_calc = updatedData.formula_length || "";
    updatedData.discount = discounts[updatedData.group] || 0;
    updatedData.input_fields = updatedData.input_fields || [];
    updatedData.input_fields_values = updatedData.input_fields_values || {};
    updatedData = calcWidthLength(settings, updatedData);

    // Update the row with all suggestion properties
    cell.getRow().update(updatedData);

    // Update calculations after mapping the suggestion data
    refreshRowCalculations(cell, settings);
}

const calcWidthLength = (settings, updatedData) => {

    updatedData.input_fields.forEach(field => {

        updatedData.formula_width_calc = updatedData.formula_width_calc.replace(field.label, updatedData.input_fields_values[field.label] || field.default || "");
        updatedData.formula_length_calc = updatedData.formula_length_calc.replace(field.label, updatedData.input_fields_values[field.label] || field.default || "");
    });

    updatedData.formula_width_calc = calculate(updatedData.formula_width_calc);
    updatedData.formula_length_calc = calculate(updatedData.formula_length_calc);
    updatedData.width = isNaN(updatedData.formula_width_calc) ? "" : updatedData.formula_width_calc;
    updatedData.length = isNaN(updatedData.formula_length_calc) ? "" : updatedData.formula_length_calc;

    console.log('Calculating width/length for:', updatedData);

    return updatedData;
}
