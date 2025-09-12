import { __html, slugify } from "../../helpers/global.js";

// ▢ rainwater system
// ◯ rainwater system
// bending
// snow retention
// roofing panel
// complex product
// stock product

export class StockCategoriesControl {

    constructor(settings) {

        this.settings = settings;

        if (!this.settings.stock_categories) this.settings.stock_categories = [];

        this.view();
    }

    view = () => {

        if (!document.querySelector("stock-categories-control")) return;

        document.querySelector("stock-categories-control").innerHTML = `
            <div class="form-group row mb-3 mt-1">
                <label class="col-sm-3 col-form-label">${__html('Stock categories')}</label>
                <div class="col-sm-9">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <p class="form-text m-0">${__html('Manage stock categories')}</p>
                        <button type="button" class="btn btn-sm btn-outline-primary" id="add-stock-categories-btn">
                            <i class="bi bi-plus-circle me-1 add-stock-categories"></i> ${__html('Add category')}
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless" id="stock-categories-table">
                            <thead>
                                <tr>
                                    <th class="form-text">${__html('Title')}</th>
                                    <th width="100" class="form-text text-end">${__html('Action')}</th>
                                </tr>
                            </thead>
                            <tbody id="stock-categories-tbody">
                                <!-- stock categories will be populated here -->
                            </tbody>
                        </table>
                    </div>
                    <input type="hidden" id="stock-categories" name="stock-categories" data-type="json">
                </div>
            </div>`;

        this.populateStockCategories();
        this.listeners();
    }

    populateStockCategories = () => {
        const tbody = document.querySelector("#stock-categories-tbody");
        tbody.innerHTML = "";

        this.settings.stock_categories.forEach((c, index) => {
            tbody.appendChild(this.createStockCategoryRow(c, index));
        });
    }

    createStockCategoryRow = (c, index) => {
        const row = document.createElement("tr");
        row.dataset.index = index;

        row.innerHTML = `
            <td>
                <input type="text" class="form-control form-control-sm stock-categories-name" value="${c.name || ''}" data-index="${index}">
            </td>
            <td class="align-middle text-end">
                <div type="button" class="text-danger remove-stock-categories align-middle text-end" data-index="${index}" style="border: none; background: none;">
                    <i class="bi bi-x-circle"></i>
                </div>
            </td>
            `;

        return row;
    }

    listeners = () => {
        document.querySelector("#add-stock-categories-btn").addEventListener('click', () => {
            const newCat = { id: "", name: "" };
            this.settings.stock_categories.push(newCat);
            this.populateStockCategories();
            this.syncStockCategoriesInput();
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-stock-categories')) {
                const index = parseInt(e.target.closest('.remove-stock-categories').dataset.index);
                this.settings.stock_categories.splice(index, 1);
                this.populateStockCategories();
                this.syncStockCategoriesInput();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('stock-categories-name')) {
                const index = parseInt(e.target.dataset.index);
                this.settings.stock_categories[index].id = this.id(e.target.value);
                this.settings.stock_categories[index].name = e.target.value;
                this.syncStockCategoriesInput();
            }
        });
    }

    syncStockCategoriesInput = () => {

        console.log(this.settings.stock_categories);

        const input = document.querySelector("#stock-categories");
        if (input) {
            input.value = JSON.stringify(this.settings.stock_categories);
        }
    }

    id = (text) => {

        let slug = slugify(text, {
            replacement: '-',  // replace spaces with replacement character, defaults to `-`
            remove: undefined, // remove characters that match regex, defaults to `undefined`
            lower: true,       // convert to lower case, defaults to `false`
            strict: true,      // strip special characters except replacement, defaults to `false`
            locale: "en",     // language code of the locale to use
            trim: true         // trim leading and trailing replacement chars, defaults to `true`
        });

        return slug.trim('/');
    }
}