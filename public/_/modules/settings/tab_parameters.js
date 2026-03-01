import { GroupsControl } from "../../components/settings/groups_control.js";
import { StockCategoriesControl } from "../../components/settings/stock_categories_control.js";
import { WorkCategoriesControl } from "../../components/settings/work_categories_control.js";
import { __html } from "../../helpers/global.js";

export class TabParameters {

    constructor(settings) {
        this.settings = settings || {};

        this.tab();

        new GroupsControl(settings);

        new WorkCategoriesControl(settings);

        new StockCategoriesControl(settings);
    }

    tab = () => {
        const dimensionCount = Number(this.settings.variation_dims_count || 2);
        const dim1 = this.settings.variation_dim_1_name || __html('Coating');
        const dim2 = this.settings.variation_dim_2_name || __html('Color');
        const dim3 = this.settings.variation_dim_3_name || __html('Size');

        document.querySelector('tab-parameters').innerHTML = /*html*/`
            <div>
                <h4 id="h-parameters" class="card-title mb-4">${__html('Parameters')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Variation dimensions')}</label>
                            <div class="col-sm-9">
                                <select id="variation_dims_count" class="form-select inp" name="variation_dims_count" data-type="select">
                                    <option value="1" ${dimensionCount === 1 ? 'selected' : ''}>1</option>
                                    <option value="2" ${dimensionCount === 2 ? 'selected' : ''}>2</option>
                                    <option value="3" ${dimensionCount === 3 ? 'selected' : ''}>3</option>
                                </select>
                                <p class="form-text">${__html('How many variation dimensions are used in product variations (1 to 3).')}</p>
                            </div>
                        </div>
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Dimension 1')}</label>
                            <div class="col-sm-9">
                                <input id="variation_dim_1_name" type="text" class="form-control inp" name="variation_dim_1_name" value="${dim1}" data-type="text">
                            </div>
                        </div>
                        <div class="form-group row mb-3 mt-1 variation-dim-row variation-dim-2">
                            <label class="col-sm-3 col-form-label">${__html('Dimension 2')}</label>
                            <div class="col-sm-9">
                                <input id="variation_dim_2_name" type="text" class="form-control inp" name="variation_dim_2_name" value="${dim2}" data-type="text">
                            </div>
                        </div>
                        <div class="form-group row mb-3 mt-1 variation-dim-row variation-dim-3">
                            <label class="col-sm-3 col-form-label">${__html('Dimension 3')}</label>
                            <div class="col-sm-9">
                                <input id="variation_dim_3_name" type="text" class="form-control inp" name="variation_dim_3_name" value="${dim3}" data-type="text">
                            </div>
                        </div>
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label parameter-parent-label">${__html(dim1)}</label>
                            <div class="col-sm-9">
                                <textarea id="var_parent" class="form-control inp" name="var_parent" rows="6" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                                <p class="form-text parameter-parent-help">${__html('Provide one %1$ value per line', dim1)}</p>
                            </div>
                        </div>
                    </div>
        
                    <div class="col-lg-6">
                  
                    </div>
                </div>
                <h4 id="h-categories" class="card-title mb-4">${__html('Categories')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <work-categories-control></work-categories-control>
                    </div>
                    <div class="col-lg-6">
                        <groups-control></groups-control>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-6">
                        <stock-categories-control></stock-categories-control>
                    </div>
                    <div class="col-lg-6">
                        <groups-control></groups-control>
                    </div>
                </div>
            </div>`;

        this.bindDimensionControls();
    }

    bindDimensionControls = () => {
        const updateDimensionUI = () => {
            const count = Number(document.querySelector('#variation_dims_count')?.value || 2);
            const dim1Name = document.querySelector('#variation_dim_1_name')?.value?.trim() || __html('Coating');

            const row2 = document.querySelector('.variation-dim-2');
            const row3 = document.querySelector('.variation-dim-3');
            if (row2) row2.classList.toggle('d-none', count < 2);
            if (row3) row3.classList.toggle('d-none', count < 3);

            const parentLabel = document.querySelector('.parameter-parent-label');
            const parentHelp = document.querySelector('.parameter-parent-help');
            if (parentLabel) parentLabel.textContent = dim1Name;
            if (parentHelp) parentHelp.textContent = __html('Provide one %1$ value per line', dim1Name);
        };

        document.querySelector('#variation_dims_count')?.addEventListener('change', updateDimensionUI);
        document.querySelector('#variation_dim_1_name')?.addEventListener('input', updateDimensionUI);

        // Run after settings page hydrates values from DB.
        setTimeout(updateDimensionUI, 0);
    }
}
