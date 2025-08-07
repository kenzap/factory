export class DropdownSuggestion {

    constructor(o, cb) {

        this.suggestions = o.suggestions || [];
        this.input = document.querySelector(o.input);
        this.cb = cb;

        this.init();
    }

    init() {

        const datalist = document.createElement("datalist");
        datalist.id = "suggestions-" + Math.random().toString(36).substring(2, 11);
        datalist.style.backgroundColor = "beige";
        datalist.style.border = "var(--bs-border-width) solid var(--bs-border-color)!important;";
        datalist.style.borderRadius = "4px";
        datalist.style.minWidth = "200px";

        this.suggestions.forEach(suggestion => {
            const option = document.createElement("option");
            option.value = suggestion;
            option.style.backgroundColor = "beige";
            // option.style.color = "#fff!important";
            option.style.padding = "4px 8px";

            // console.log('Adding suggestion:', suggestion);
            datalist.appendChild(option);
        });

        this.input.addEventListener("input", (e) => {
            // This triggers when user selects from datalist
            const selectedValue = e.target.value;
            if (this.suggestions.includes(selectedValue)) {

                // this.productSelected(suggestion, cell);
                if (this.cb) this.cb(selectedValue);
            }
        });

        this.input.setAttribute("list", datalist.id);
        document.body.appendChild(datalist);

        this.input.addEventListener("blur", () => {
            this.cb(this.input.value);
            if (datalist.parentNode) {
                document.body.removeChild(datalist);
            }
        });

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                // this.productSelected(suggestion, cell);
                this.cb(this.input.value);
                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }

            } else if (e.key === "Escape") {

                if (datalist.parentNode) {
                    document.body.removeChild(datalist);
                }
            }
        });
    }
}