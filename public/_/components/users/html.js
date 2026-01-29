import { __attr, __html } from "../../helpers/global.js";

export const getHtml = () => {

    return `
    <div class="container p-edit">
        <div class="d-md-flex justify-content-between bd-highlight mb-3">
            <nav class="bc" aria-label="breadcrumb"></nav>
            <div>
                <a class="preview-link nounderline btn-view-events d-md-inline-block- d-none me-3 d-flex align-items-center" target="_blank" href="">${__html('Activity logs')}<i class="mdi mdi-monitor ms-1"></i></a>
                <button class="btn btn-primary btn-add-user-dialog mt-3 mb-1 mt-md-0 mb-md-0 d-flex align-items-center" type="button"><i class="bi bi-plus-circle me-1"></i>${__html('Add user')}</button>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">

                <div class="card border-white shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="no-footer">
                            <div class="row">
                                <div class="col-sm-12">
                                    <div class="table-responsive">
                                        <table class="table table-hover table-borderless align-middle table-striped table-p-list mb-0" style="min-width: 800px;">
                                            <thead>
                                                <tr>
                                                    <th class="align-middle">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#212529" class="bi justify-content-end bi-search align-middle" viewBox="0 0 16 16" >
                                                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"></path>
                                                        </svg>
                                                    </th>
                                                    <th class="align-middle">
                                                        <div class="search-cont input-group input-group-sm mb-0 justify-content-start">     
                                                            <input type="text" placeholder="${__html('Search user')}" class="form-control form-control-sm border-top-0 border-start-0 border-end-0 rounded-0" aria-label="${__attr('Search user')}" aria-describedby="inputGroup-sizing-sm" style="max-width: 200px;">
                                                        </div>
                                                        <span>${__html("Name")}</span>
                                                    </th>
                                                    <th class="align-middle">${__html("Email")}</th>
                                                    <th class="align-middle">
                                                        <div class="position-relative d-flex flex-column">
                                                            <select class="form-select portal-filter ms-0 form-select-sm text-start fs-6 fw-bold border-0 bg-transparent ms-0 ps-0 py-0" style="max-width: 150px;">
                                                                <option value="">${__html('Portal')}</option>
                                                                <option value="no-access">${__html('No access')}</option>
                                                                <option value="access">${__html('With access')}</option>
                                                            </select>
                                                        </div>
                                                    </th>
                                                    <th class="align-middle">${__html("Rights")}</th>
                                                    <th class="align-middle">${__html("Notes")}</th>
                                                    <th class="align-middle"></th>
                                                </tr>
                                            </thead>
                                            <tbody>

                                            
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="row my-2">
                                <div class="col-sm-12 col-md-5 d-flex align-items-center">
                                    <div class="dataTables_info mx-2 text-secondary fw-lighter " id="listing_info"
                                        role="status" aria-live="polite">&nbsp;</div>
                                </div>
                                <div class="col-sm-12 col-md-7">
                                    <div class="dataTables_paginate paging_simple_numbers m-2" id="listing_paginate">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `;

}