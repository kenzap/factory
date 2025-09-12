import { __html } from "../../helpers/global.js";

export const getHtml = () => {

  return /*html*/`
    <div class="container p-edit">
        <div class="d-md-flex justify-content-between bd-highlight mb-3">
            <nav class="bc" aria-label="breadcrumb"></nav>
            <button class="btn btn-primary btn-save mt-3 mb-1 mt-md-0 mb-md-0" type="button">${__html('Save changes')}</button>
        </div>
        <div class="row">
            <div class="col-md-12 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
              <div class="card border-white shadow-sm p-sm-3 ">
                <nav class="nav tab-content mb-4" role="tablist">
                    <div class="nav nav-tabs" id="nav-tab" role="tablist">
                        <a class="nav-link active" id="nav-general-link" data-bs-toggle="tab" data-bs-target="#nav-general" type="button" role="tab" aria-controls="nav-general" aria-selected="true" href="#">${__html('General')}</a>
                        <a class="nav-link" id="nav-templates-link" data-bs-toggle="tab" data-bs-target="#nav-templates" type="button" role="tab" aria-controls="nav-templates" aria-selected="true" href="#">${__html('Templates')}</a>
                        <a class="nav-link" id="nav-parameters-link" data-bs-toggle="tab" data-bs-target="#nav-parameters" type="button" role="tab" aria-controls="nav-parameters" aria-selected="true" href="#">${__html('Parameters')}</a>
                    </div>
                </nav>
                <div class="card-body tab-content" id="nav-tabContent">
                  <tab-general class="tab-pane fade show active" id="nav-general" role="tabpanel" aria-labelledby="nav-general-link"></tab-general>
                  <tab-templates class="tab-pane fade" id="nav-templates" role="tabpanel" aria-labelledby="nav-templates-link"></tab-templates>
                  <tab-parameters class="tab-pane fade" id="nav-parameters" role="tabpanel" aria-labelledby="nav-parameters-link"></tab-templates>
                </div>
              </div>
            </div>
        </div>
    </div>
    `;
}