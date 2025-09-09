import { productTags } from "../../components/products/product_tags.js";
import { __html } from "../../helpers/global.js";

export class ProductSidebar {

    constructor(product) {

        this.product = product;

        // this.product.keywords = this.state.product.keywords || [];

        // console.log(this.state.product);

        this.view();

        this.bind();
    }

    view() {

        document.querySelector('product-sidebar').innerHTML = `
            <div class="row">
                <div class="col-12 grid-margin stretch-card">
                    <div class="card border-white shadow-sm p-sm-3">
                        <div class="card-body">

                            <h4 class="card-title" style="display:none;">${__html('General')}</h4>
                            <div class="landing_status"></div>
                            <input type="hidden" class="form-control" id="landing-slug" value="">

                            <h4 id="elan" class="card-title mb-4 d-none-">${__html('Product')}</h4>
                            <div id="status-cont" class="mb-3">
                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-publish form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status1" value="1">
                                            ${__html('Published (primary)')}
                                        </label>
                                    </div>
                                </div>

                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-private form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status2" value="2">
                                            ${__html('Published')}
                                        </label>
                                    </div>
                                </div>

                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-private form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status3" value="3">
                                            ${__html('Private')}
                                        </label>
                                    </div>
                                </div>

                                <div class="col-sm-12">
                                    <div class="form-check">
                                        <label class="form-check-label status-draft form-label">
                                            <input type="radio" class="form-check-input" name="p-status" id="p-status0" value="0">
                                            ${__html('Draft')}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <h4 id="elan" class="card-title mb-4 d-none">${__html('Categories')}</h4>
                            <div id="p-cats" class="simple-tags mb-4" data-simple-tags=""></div>
                            <div class="clearfix"> </div>

                            <div class="d-grid gap-2">
                                <button class="btn btn-primary btn-save" type="button">${__html('Save')}</button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>`;
    }

    bind() {

        const d = document, self = this;

        // init categories
        let pcats = d.querySelector('#p-cats');
        if (self.product.cats) pcats.setAttribute('data-simple-tags', self.product.cats);

        const tags = productTags(pcats);

        // set product status
        document.querySelector('#p-status' + self.product.status).checked = true;

        // set product keywords
        document.querySelector('#p-keywords').value = self.product.keywords.length ? self.product.keywords.map(kw => kw).join('\n') : "";

        // adjust keyword textarea height
        document.querySelector('#p-keywords').setAttribute('rows', self.product.keywords.length ? self.product.keywords.length + 2 : 2);
    }
}