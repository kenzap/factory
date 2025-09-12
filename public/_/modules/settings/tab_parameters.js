import { GroupsControl } from "../../components/settings/groups_control.js";
import { WorkCategoriesControl } from "../../components/settings/work_categories_control.js";
import { __html } from "../../helpers/global.js";

export class TabParameters {

    constructor(settings) {

        this.tab();

        new GroupsControl(settings);

        new WorkCategoriesControl(settings);
    }

    tab = () => {

        document.querySelector('tab-parameters').innerHTML = /*html*/`
            <div>
                <h4 id="h-parameters" class="card-title mb-4">${__html('Parameters')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Parent')}</label>
                            <div class="col-sm-9">
                                <textarea id="var_parent" class="form-control inp" name="var_parent" rows="6" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                                <p class="form-text">${__html('Provide one coating price variable name per line')}</p>
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
            </div>`;
    }
}