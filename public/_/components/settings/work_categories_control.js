import { __html, slugify } from "../../helpers/global.js";

// ▢ rainwater system
// ◯ rainwater system
// bending
// snow retention
// roofing panel
// complex product
// stock product

export class WorkCategoriesControl {

    constructor(settings) {

        this.settings = settings;

        if (!this.settings.work_categories) this.settings.work_categories = [];

        this.view();
    }

    view = () => {

        if (!document.querySelector("work-categories-control")) return;

        document.querySelector("work-categories-control").innerHTML = `
            <div class="form-group row mb-3 mt-1">
                <label class="col-sm-3 col-form-label">${__html('Work categories')}</label>
                <div class="col-sm-9">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <p class="form-text m-0">${__html('Manage work categories')}</p>
                        <button type="button" class="btn btn-sm btn-outline-primary" id="add-work-categories-btn">
                            <i class="bi bi-plus-circle me-1 add-work-categories"></i> ${__html('Add category')}
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless" id="work-categories-table">
                            <thead>
                                <tr>
                                    <th class="form-text">${__html('Title')}</th>
                                    <th width="100" class="form-text text-end">${__html('Action')}</th>
                                </tr>
                            </thead>
                            <tbody id="work-categories-tbody">
                                <!-- work categories will be populated here -->
                            </tbody>
                        </table>
                    </div>
                    <input type="hidden" id="work-categories" name="work-categories" data-type="json">
                </div>
            </div>`;

        this.populateWorkCategories();
        this.listeners();
    }

    populateWorkCategories = () => {
        const tbody = document.querySelector("#work-categories-tbody");
        tbody.innerHTML = "";

        this.settings.work_categories.forEach((c, index) => {
            tbody.appendChild(this.createWorkCategoryRow(c, index));
        });
    }

    createWorkCategoryRow = (c, index) => {
        const row = document.createElement("tr");
        row.dataset.index = index;

        row.innerHTML = `
            <td>
                <input type="text" class="form-control form-control-sm work-categories-name" value="${c.name || ''}" data-index="${index}">
            </td>
            <td class="align-middle text-end">
                <div type="button" class="text-danger remove-work-categories align-middle text-end" data-index="${index}" style="border: none; background: none;">
                    <i class="bi bi-x-circle"></i>
                </div>
            </td>
            `;

        return row;
    }

    listeners = () => {
        document.querySelector("#add-work-categories-btn").addEventListener('click', () => {
            const newCat = { id: "", name: "" };
            this.settings.work_categories.push(newCat);
            this.populateWorkCategories();
            this.syncWorkCategoriesInput();
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-work-categories')) {
                const index = parseInt(e.target.closest('.remove-work-categories').dataset.index);
                this.settings.work_categories.splice(index, 1);
                this.populateWorkCategories();
                this.syncWorkCategoriesInput();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('work-categories-name')) {
                const index = parseInt(e.target.dataset.index);
                this.settings.work_categories[index].id = this.id(e.target.value);
                this.settings.work_categories[index].name = e.target.value;
                this.syncWorkCategoriesInput();
            }
        });
    }

    syncWorkCategoriesInput = () => {

        console.log(this.settings.work_categories);

        const input = document.querySelector("#work-categories");
        if (input) {
            input.value = JSON.stringify(this.settings.work_categories);
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