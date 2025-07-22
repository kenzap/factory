import { __, __html } from '@kenzap/k-cloud';

// html product list loader
export const HTMLContent = () => {

return `
  <div class="container p-sk-edit mt-4">
    <div class="row">
        <div class="col-lg-9 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
            <div class="sections" id="sections" role="tablist" style="width:100%;">

                <div class="row">
                    <div class="col-12 grid-margin stretch-card">
                        <div class="card border-white shadow-sm p-sm-3">
                            <div class="card-body">

                                <div class="landing_status"></div>
                                <input type="hidden" class="form-control" id="landing-slug" value="">

                                <h4 id="sketch-h" class="card-title mb-4">${ __html('Sketch') }</h4>

                                <div id="placeholders">

                                    <div class="mb-3">
                                        <label class="banner-descshort-l form-label d-none" for="desc">${ __html('Drawing') }</label>
                                        <div class="btn-group mb-3" role="group" aria-label="Basic radio toggle button group">
                                            <input type="radio" class="btn-check" name="sketchmode" id="preview" autocomplete="off" checked>
                                            <label class="btn btn-outline-primary" for="preview">${ __html('Upload') }</label>

                                            <input type="radio" class="btn-check" name="sketchmode" id="drawing" autocomplete="off">
                                            <label class="btn btn-outline-primary" for="drawing">${ __html('Drawing') }</label>

                                            <input type="radio" class="btn-check" name="sketchmode" id="editing" autocomplete="off">
                                            <label class="btn btn-outline-primary" for="editing">${ __html('Editing') }</label>
                                        </div>
                                        <div class="drawing"></div>
                                        <div class="clearfix"></div>
                                    </div>

                                    <div class="mb-3 " style="max-width:600px;overflow:scroll;">
                                        <label class="banner-title-l form-label" for="p-test">${ __html('Input fields') }</label>
                                        <div class="input-fields">

                                        </div>
                                        <p class="form-text"> </p>
                                    </div>

                                    <div class="mb-3 mw">
                                        <label class="form-label" for="calc_price">${ __html('Calculate price') }</label>
                                        <select id="calc_price" class="form-select inp" >
                                            <option value="default">${ __html('Default price') }</option>
                                            <option value="variable">${ __html('Variable') }</option>
                                            <option value="sketch">${ __html('By sketch') }</option>
                                            <option value="formula">${ __html('By formula') }</option>
                                            <option value="complex">${ __html('Complex product') }</option>
                                        </select>
                                        <p class="form-text"> </p>
                                    </div>

                                    <div class="mb-3 mw variable_prices_cont">
                                        <input type="hidden" id="price" value="" />
                                        <button class="btn btn-sm btn-outline-primary btn-view-variations mb-2" type="button">${ __html('View variations') }</button>
                                        <p class="form-text">${ __html('Override default prices by clicking on the button above.') }</p>
                                    </div>

                                    <div class="mb-3 mw formula_cont d-none">
                                        <label class="form-label" for="formula">${ __html('Formula footage') }</label>
                                        <input id="formula" type="text" class="form-control inp" placeholder="${ __html('(A + B) * L') }">
                                        <p class="form-text formula-hint">${ __html('Square formula to calculate price.') }</p>
                                    </div>

                                    <div class="mb-3 mw fwl_cont">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <label class="form-label" for="formula">${ __html('Formula width') }</label>
                                                <input id="formula_width" type="text" class="form-control inp" placeholder="${ __html('A + B + C') }">
                                                <p class="form-text formula_width-hint">${ __html('Product width in mm.') }</p>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label" for="formula">${ __html('Formula length') }</label>
                                                <input id="formula_length" type="text" class="form-control inp" placeholder="${ __html('L') }">
                                                <p class="form-text formula_length-hint">${ __html('Product length in mm.') }</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mb-3 mw formula_price_cont d-none">
                                        <label class="form-label" for="formula_price">${ __html('Formula price') }</label>
                                        <input id="formula_price" type="text" class="form-control inp" placeholder="${ __html('B>1000?1.80:0.90') }">
                                        <p class="form-text formula_price-hint">${ __html('Final price = Formula footage + Price formula.') }</p>
                                    </div>

                                    <div class="mb-3 mw parts_cont d-none">
                                        <h4 id="parts-h" class="card-title mb-3">${ __html('Parts') }</h4>
                                        <textarea id="parts" class="form-control mw" name="parts" rows="6" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                                        <p class="form-text formula_price-hint">${ __html('Provide one product ID per line.') }</p>
                                    </div>

                                    <div class="mb-3 mw ">
                                        <input id="modelling" class="form-check-input inp modelling" name="modelling" type="checkbox" value="0" data-type="checkbox">
                                        <label class="form-check-label" for="modelling">
                                            ${ __html('3D Modelling') }
                                        </label>
                                        <p class="form-text">${ __html('Enable 3D modelling options when product is previewed.') }</p>
                                    </div>

                                    <div class="mb-3 mw ">
                                        <div class="d-flex align-items-center justify-content-between">
                                            <label class="form-label" for="tax_id">${ __html('Supporting Files') }</label>
                                            <input id="cad_files" class="form-control inp cad_files" name="cad_files" type="hidden" value="0" data-type="text">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle text-primary btn-add-file po" viewBox="0 0 16 16">
                                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                                            </svg>
                                        </div>
                                        <div class="cad_files_cont d-flex align-items-start">

                                        </div>
                                        <p class="form-text">${ __html('2D and 3D rendering files.') }</p>
                                    </div>

                                    <div class="mb-3 mw ">
                                        <label class="form-label" for="tax_id">${ __html('Linked Products') }</label>
                                        <textarea id="linked_products" class="form-control inp mw" name="linked_products" rows="6" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                                        <p class="form-text">${ __html('Provide one product ID per line.') }</p>
                                    </div>

                                    <div class="mb-3 mw ">
                                        <label class="form-label" for="tax_id">${ __html('Tax ID') }</label>
                                        <input id="tax_id" class="form-control inp tax_id" name="tax_id" type="text" value="0" data-type="text">
                                        <p class="form-text">${ __html('Tax code for 0 VAT rates.') }</p>
                                    </div>

                                    <div class="mb-3 mw">
                                        <div class="list-wrapper">
                                            <ul class="d-flex flex-column-reverse"> </ul>
                                        </div>
                                        <p class="form-text"> </p>
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
    </div>
  </div>

  `;
}