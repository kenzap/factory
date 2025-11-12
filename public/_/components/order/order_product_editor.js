import { getProductSuggestions } from "../../api/get_product_suggestions.js";
import { updateCalculations } from "../../components/order/order_calculations.js";
import { FILES } from "../../helpers/global.js";

let productSuggestions = [];

/**
 * A client search component that provides autocomplete functionality for searching clients.
 * Example, in the orders journal.
 * 
 * @class ClientSearch 
 */
export const productEditor = (cell, onRendered, success, cancel, editorParams) => {

    // console.log('editorParams.settings:', editorParams.settings);

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
    imagePreview.src = "https://cdn.skarda.design/8e0729adbf79275c11a83d69df75f0c09061780a-polyester-2h3-polyester-2h3-1500.webp"; // Set default image source if needed
    imagePreview.style.display = "none"; // Initially hidden

    // Create large preview image overlay
    const largePreview = document.createElement("div");
    largePreview.style.position = "fixed";
    largePreview.style.top = "20px";
    largePreview.style.right = "20px";
    largePreview.style.width = "400px";
    largePreview.style.height = "400px";
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
                    largeImage.onerror = null; // Prevent infinite loop
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

                    // Show large preview image
                    largeImage.src = FILES + "/" + suggestion._id + "-polyester-2h3-1500.webp";
                    largeImage.onerror = () => {
                        largeImage.onerror = null; // Prevent infinite loop
                        largeImage.src = FILES + "/" + suggestion._id + "-250.webp";
                    };
                    largePreview.style.display = "block";
                });

                option.addEventListener("mouseleave", (e) => {
                    e.preventDefault();
                    selectedIndex = -1;
                    updateSelectedOption();

                    // Hide large preview image
                    largePreview.style.display = "none";
                });

                option.addEventListener("click", () => {
                    // console.log('Suggestion clicked:', suggestion);
                    productSelected(suggestion, cell, editorParams.settings);

                    // input.value = suggestion.title + " " + suggestion.sdesc;
                    // dropdown.style.display = "none";

                    // Hide large preview on click
                    largePreview.style.display = "none";

                    // Immediately update the cell value before navigating
                    success(suggestion.title + " " + suggestion.sdesc);

                    setTimeout(() => {
                        editorParams.navigateToNextCell(cell);
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
                dropdown.style.display = "none";
                largePreview.style.display = "none"; // Hide large preview on blur
                // productSuggestions = [];
                clearTimeout(searchTimeout);
                success(input.value);

                // Clean up large preview from DOM
                if (largePreview.parentNode) {
                    document.body.removeChild(largePreview);
                }
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
                    largeImage.src = FILES + "/" + suggestion._id + "-polyester-2h3-1500.webp";
                    largeImage.onerror = () => {
                        largeImage.onerror = null; // Prevent infinite loop
                        largeImage.src = FILES + "/" + suggestion._id + "-250.webp";
                    };
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
                    largeImage.src = FILES + "/" + suggestion._id + "-polyester-2h3-1500.webp";
                    largeImage.onerror = () => {
                        largeImage.onerror = null; // Prevent infinite loop
                        largeImage.src = FILES + "/" + suggestion._id + "-250.webp";
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
                const selectedSuggestion = options[selectedIndex].textContent;
                input.value = selectedSuggestion;
                dropdown.style.display = "none";
                largePreview.style.display = "none";
                const suggestion = productSuggestions[selectedIndex];
                productSelected(suggestion, cell, editorParams.settings);
                success(selectedSuggestion);
                setTimeout(() => {
                    editorParams.navigateToNextCell(cell);
                }, 10);
            } else {

                // No option selected, just accept current input value
                dropdown.style.display = "none";
                largePreview.style.display = "none";
                productSuggestions = [];
                success(input.value);
                setTimeout(() => {
                    editorParams.navigateToNextCell(cell);
                }, 10);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation(); // Add this to prevent table navigation
            clearTimeout(searchTimeout);
            dropdown.style.display = "none";
            largePreview.style.display = "none";
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

    // const columns = this.table.getColumns()
    const rowData = cell.getRow().getData();
    const color = rowData.color;
    const coating = rowData.coating;

    // console.log('Searching backend for products with term:', color, coating, s);

    getProductSuggestions({ s, color, coating }, (response) => {

        productSuggestions = response.suggestions; // .map(suggestion => suggestion.title + " " + suggestion.sdesc);

        callback(productSuggestions);

        // console.log('Product suggestions from backend:', response.suggestions);
    });
}

const productSelected = (suggestion, cell, settings) => {

    // this.syncItems(suggestion, cell);

    // Map suggestion values to current row
    const rowData = cell.getRow().getData();
    let updatedData = { ...rowData, ...suggestion };

    updatedData.title = updatedData.title.trim();

    // console.log('updateCalculations settings:', settings);

    // Update the row with all suggestion properties
    cell.getRow().update(updatedData);

    // Update calculations after mapping the suggestion data
    updateCalculations(cell, settings);
}