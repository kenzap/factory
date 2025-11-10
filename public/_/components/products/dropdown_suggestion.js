export class DropdownSuggestion {

    constructor(o, cb) {

        this.suggestions = o.suggestions || [];
        this.input = document.querySelector(o.input);
        this.cb = cb;

        this.init();
    }

    init() {
        this.datalist = null;
        this.createDatalist();

        this.input.addEventListener("focus", () => {
            if (!this.datalist || !this.datalist.parentNode) {
                this.createDatalist();
            }
        });

        this.input.addEventListener("input", (e) => {
            const selectedValue = e.target.value;
            if (this.suggestions.includes(selectedValue)) {
                if (this.cb) this.cb(selectedValue);
            }
        });

        this.input.addEventListener("blur", () => {
            this.cb(this.input.value);
            this.removeDatalist();
        });

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.cb(this.input.value);
                this.removeDatalist();
            } else if (e.key === "Escape") {
                this.removeDatalist();
            }
        });
    }

    createDatalist() {
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
            option.style.padding = "4px 8px";
            datalist.appendChild(option);
        });

        this.input.setAttribute("list", datalist.id);
        document.body.appendChild(datalist);
        this.datalist = datalist;
    }

    removeDatalist() {
        if (this.datalist && this.datalist.parentNode) {
            document.body.removeChild(this.datalist);
            this.datalist = null;
        }
    }
}