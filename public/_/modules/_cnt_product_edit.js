// html product list loader
export const HTMLContent = (__) => {

return `
  <div class="container p-edit">
    <div class="d-flex justify-content-between bd-highlight mb-3">
        <nav class="bc" aria-label="breadcrumb"></nav>
        
    </div>
    <div class="row">
        <div class="col-lg-9 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
            <div class="sections" id="sections" role="tablist" style="width:100%;">

                <div class="row">
                    <div class="col-12 grid-margin stretch-card">
                        <div class="card border-white shadow-sm p-sm-3">
                            <div class="card-body">

                                <div class="landing_status"></div>
                                <input type="hidden" class="form-control" id="landing-slug" value="">

                                <h4 id="elan" class="card-title mb-4">${ __('Description') }</h4>

                                <div id="placeholders">

                                    <div class="mb-3">
                                        <label class="banner-title-l form-label" for="p-title">${ __('Title') }</label>
                                        <input type="text" class="form-control inp" id="p-title" placeholder="${ __('Sushi set..') }">
                                        <p class="form-text"> </p>
                                    </div>

                                    <div class="mb-3">
                                        <label class="banner-descshort-l form-label" for="p-sdesc">${ __('Short Description') }</label>
                                        <textarea class="form-control inp" id="p-sdesc" placeholder="  " maxlength="120" rows="2"></textarea>
                                    </div>

                                    <div class="mb-3 d-none">
                                        <label class="banner-descshort-l form-label" for="desc">${ __('Images') }</label>
                                        <div class="clearfix"></div>
                                        <div class="ic"></div>
                                        <div class="clearfix"></div>
                                    </div>

                                    <div class="mb-3">
                                        <div class="clearfix"></div>
                                        <div style="clear:both;margin-top:16px;"></div>
                                        <label class="banner-descshort-l form-label" for="p-desc">${ __('Description') }</label>
                                        <textarea class="form-control inp" id="p-ldesc" placeholder=" " maxlength="2000" rows="10"></textarea>
                                    </div>

                                    <div class="mb-3 mw">
                                        <div class="list-wrapper">
                                            <ul class="d-flex flex-column-reverse features"> </ul>
                                        </div>
                                        <p class="form-text"> </p>
                                    </div>

                                    <div class="price_group mt-3 mb-3">
                                        <h4 class="card-title mb-3">${ __('Price') }</h4>
                                        <div class="price_group_base">
                                            <div class="mb-3">
                                                <div class="input-group">
                                                    <div id="p-price-c">
                                                        <label for="p-price" class="form-label">${ __('Default') } <span class="lang"></span></label>
                                                        <div class="input-group pe-3 mb-3">
                                                            <span id="p-price-symb" class="input-group-text">$</span>
                                                            <input id="p-price" type="text" class="form-control inp" placeholder="55.00" autocomplete="off">
                                                        </div>
                                                    </div>
                                                    <div id="p-priced-c" class="d-flex align-content-end flex-wrap">
                                                        <a class="btn btn-outline-secondary mb-3 add-discount" href="#" role="button" id="btn-discount" >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                                                            ${ __('discount') }
                                                        </a>
                                                        <div class="d-none">
                                                            <label for="p-priced pe-3 mb-3" class="form-label">${ __('Discounted') } <span class="lang"></span></label>
                                                            <input id="p-priced" type="text" class="form-control" placeholder="45.00" autocomplete="off">
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="discount-blocks mw">
                                                    <label class="discount-list form-label" for="discount-list ">${ __('Discount list') }</label>
                                                    <ul class="mb-4">
                                               
                                                    </ul>
                                                </div>
                                                <div class="add-mix-ctn text-left mt-3 mb-2 d-none"><a class="add-mix-block" href="#" data-action="add">${ __('+ add variation') }</a></div>
                                            </div>

                                            <div class="variation-blocks">
                        
                                            </div>

                                            <div style='margin:24px 0 48px;border-bottom:0px solid #ccc;'></div>

                                            <div class="mb-3 mw">
                                                <h4 id="elan" class="card-title">${ __('Inventory') }</h4>
                                                <div class="input-group">
                                                    <input id="stock_sku" type="text" style="width:100%;" class="form-control" placeholder="" maxlength="200">
                                                    <p class="form-text">${ __('Product stock unit identification number or SKU.') }</p>
                                                </div>
                                            </div>

                                            <div class="mb-3 mw">
                                                <div class="form-check">
                                                    <input id="stock_management" class="form-check-input stock-management" name="stock_management" type="checkbox" value="0" data-type="checkbox">
                                                    <label class="form-check-label" for="stock_management">
                                                        ${ __('Stock management') }
                                                    </label>
                                                </div>
                                                <p class="form-text">${ __('Enable stock management.') }</p>
                                            </div>

                                            <div class="mb-3 mw stock-cont">
                                                <label class="form-label" for="stock_quantity">${ __('Stock quantity') }</label>
                                                <input id="stock_quantity" type="text" class="form-control" placeholder="0">
                                                <p class="form-text">${ __('Total number of products left.') }</p>
                                            </div>

                                            <div class="mb-3 mw stock-cont">
                                                <label class="form-label" for="stock_low_threshold">${ __('Low stock') }</label>
                                                <input id="stock_low_threshold" type="text" class="form-control" placeholder="0">
                                                <p class="form-text">${ __('Low stock threshold.') }</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="desc-repeater-cont">

                                </div>

                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
        <div class="col-lg-3 mt-3 mt-lg-0 grid-margin grid-margin-lg-0 grid-margin-md-0">

            <div class="row">
                <div class="col-12 grid-margin stretch-card">
                    <div class="card border-white shadow-sm p-sm-3">
                        <div class="card-body">

                            <h4 class="card-title" style="display:none;">${ __('General') }</h4>
                            <div class="landing_status"></div>
                            <input type="hidden" class="form-control" id="landing-slug" value="">

                            <h4 id="elan" class="card-title mb-4">${ __('Status') }</h4>
                            <div id="status-cont" class="mb-3">
                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-publish form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status1" value="1">
                                            ${ __('Published') }
                                        </label>
                                    </div>
                                </div>

                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-private form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status2" value="2">
                                            ${ __('Private') }
                                        </label>
                                    </div>
                                </div>

                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-draft form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status0" value="0">
                                            ${ __('Draft') }
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <h4 id="elan" class="card-title mb-4">${ __('Categories') }</h4>
                            <div id="p-cats" class="simple-tags mb-4" data-simple-tags=""></div>
                            <div class="clearfix"> </div>

                            <div class="d-grid gap-2">
                                <button class="btn btn-primary btn-save" type="button">${ __('Save') }</button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  </div>

  <div class="modal p-modal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-modal"></button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"></button>
            </div>
        </div>
    </div>
  </div>

  <div class="position-fixed bottom-0 p-2 m-4 end-0 align-items-center">
    <div class="toast hide align-items-center text-white bg-dark border-0" role="alert" aria-live="assertive"
        aria-atomic="true" data-bs-delay="3000">
        <div class="d-flex">
            <div class="toast-body"></div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    </div>
  </div>
  `;
}