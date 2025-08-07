import { getProductSuggestions } from "../../api/get_product_suggestions.js";
import { FILES } from "../../helpers/global.js";

export class ProductSearch {

    constructor(selectors, cb) {

        this.selectors = selectors;
        this.cb = cb;

        this.productSuggestions = [];

        this.init();
    }

    init() {

        const input = document.querySelector(this.selectors.name);
        this.coating = document.querySelector(this.selectors.coating);
        this.color = document.querySelector(this.selectors.color);

        const container = document.querySelector(this.selectors.name).parentElement;
        container.style.position = "relative";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "8px";

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

        // container.appendChild(input);
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
                        this.productSelected(suggestion);

                        input.value = suggestion.title + " " + suggestion.sdesc;
                        // dropdown.style.display = "none";

                        // Immediately update the cell value before navigating
                        // success(suggestion.title + " " + suggestion.sdesc);

                        // setTimeout(() => {
                        //     this.navigateToNextCell(cell);
                        // }, 10);
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
                    this.searchProductSuggestionsFromBackend(searchTerm, (suggestions) => {
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
                    // success(input.value);
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
                    this.productSelected(suggestion);
                    // success(selectedSuggestion);

                } else {
                    // No option selected, just accept current input value
                    dropdown.style.display = "none";
                    this.productSuggestions = [];
                    // success(input.value);

                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation(); // Add this to prevent table navigation
                clearTimeout(searchTimeout);
                dropdown.style.display = "none";
                this.productSuggestions = [];
                // cancel();
            }
        });
    }

    productSelected = (suggestion) => {

        this.cb(suggestion);
    }

    // New method to search products from backend
    searchProductSuggestionsFromBackend = (s, callback) => {

        const color = this.color.value;
        const coating = this.coating.value;

        // console.log('Searching backend for products with term:', color, coating, s);

        getProductSuggestions({ s, color, coating }, (response) => {

            this.productSuggestions = response.suggestions; // .map(suggestion => suggestion.title + " " + suggestion.sdesc);

            callback(this.productSuggestions);

            // console.log('Product suggestions from backend:', response.suggestions);
        });
    }
}