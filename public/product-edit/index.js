import { deleteFile } from "../_/api/delete_file.js";
import { getProduct } from "../_/api/get_product.js";
import { saveProduct } from "../_/api/save_product.js";
import { FileUpload } from "../_/components/file/upload.js";
import { ProductFiles } from "../_/components/products/product_files.js";
import { ProductImages } from "../_/components/products/product_images.js";
import { ProductMeta } from "../_/components/products/product_meta.js";
import { ProductPrice } from "../_/components/products/product_price.js";
import { ProductSidebar } from "../_/components/products/product_sidebar.js";
import { ProductSketch } from "../_/components/products/product_sketch.js";
import { setTextureDefaults } from "../_/components/sketch/helpers.js";
import { ProductViewer } from "../_/components/sketch/viewer.js";
import { __html, hideLoader, initBreadcrumbs, link, log, onClick, parseApiError, showLoader, toast } from "../_/helpers/global.js";
import { bus } from "../_/modules/bus.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Product editing page.
 * Allows user to change title, decription, status of the product.
 * Upload images and define price estimating formulas.
 *
 * @link https://kenzap.com/3d-factory-pre-manufacturing-visualisation-and-cnc-automation-solution-1018418/
 * @since 1.0.0
 *
 * @package 3D Factory
 */
class ProductEdit {

    constructor() {

        this.ajaxQueue = 0;

        this.data();
    }

    data = () => {

        new Modal();

        // get product id from url
        const urlParams = new URLSearchParams(window.location.search);
        this.id = urlParams.get('id') ? urlParams.get('id') : null;

        if (!this.id) {
            toast(__html('Product ID is missing.'));
            return;
        }

        // block ui during load
        showLoader();

        let self = this;

        // get product data
        getProduct(this.id, (response) => {
            hideLoader();

            console.log(response);

            if (!response.success) {
                toast({ type: 'error', text: parseApiError(response.error) });
                return;
            }

            // set product data
            this.product = response.product;
            this.settings = response.settings;
            this.locales = response.locales;

            this.defaults();

            // init locale
            new Locale(response);

            // initialize session
            new Session();

            // render header and footer
            new Header({
                hidden: false,
                title: __html('Product Edit'),
                icon: 'box',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            new Footer();

            this.view();

            // product meta description and inventory
            self.ProductMeta = new ProductMeta(this.product, this.locales, this.settings);

            // product images
            self.ProductImages = new ProductImages(this.product, this.settings);

            // product sidebar
            self.ProductSidebar = new ProductSidebar(this.product);

            // product sketch
            self.ProductSketch = new ProductSketch(this.product, this.settings);

            // product images
            self.ProductFiles = new ProductFiles(this.product, this.settings);

            // init viewer
            self.ProductViewer = new ProductViewer(this.product, this.settings);

            // file uplaod management
            self.FileUpload = new FileUpload(this.product);

            // product price
            self.ProductPrice = new ProductPrice(this.product, this.settings);

            // render breadcrumbs
            initBreadcrumbs([
                { link: link('/home/'), text: __html('Home') },
                { link: link('/product-list/'), text: __html('Products') },
                { text: __html('Product Edit') }
            ]);

            // bind listeners
            self.listeners();
        });
    }

    view() {

        document.querySelector('#app').innerHTML = `
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
                                            <product-meta></product-meta>
                                            <div class="desc-repeater-cont"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12 grid-margin stretch-card mt-4">
                                    <div class="sections" id="sections-2" role="tablist" style="width:100%;">
                                        <div class="row">
                                            <div class="col-12 grid-margin stretch-card">
                                                <div class="card border-white shadow-sm p-sm-3">
                                                    <div class="card-body">
                                                        <product-images></product-images>
                                                        <product-files></product-files>
                                                        <product-viewer></product-viewer>
                                                        <product-sketch></product-sketch>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12 grid-margin stretch-card mt-4">
                                    <div class="sections" id="sections-2" role="tablist" style="width:100%;">
                                        <div class="row">
                                            <div class="col-12 grid-margin stretch-card">
                                                <div class="card border-white shadow-sm p-sm-3">
                                                    <div class="card-body">
                                                        <product-price></product-price>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 mt-3 mt-lg-0 grid-margin grid-margin-lg-0 grid-margin-md-0">
                        <product-sidebar></product-sidebar>
                    </div>
                </div>
            </div>`;
    }

    listeners() {

        let self = this;

        onClick('.btn-save', e => { e.preventDefault(); self.save() });

        bus.on('file:uploaded', (data) => {

            console.log("file:uploaded received", data);

            self.ProductSketch.init();

            // refresh viewer
            self.ProductViewer.init();
        });
    }

    save() {

        let data = {
            _id: this.id,
        }, self = this;

        // iterate through input fields
        for (let inp of document.querySelectorAll('.inp')) {

            data[inp.id.replace("p-", "")] = inp.value.trim();
        }

        // map categories
        data["cats"] = [];
        for (let cat of document.querySelectorAll('#p-cats ul li')) {

            let category = cat.innerHTML.replace('<a>×</a>', '').trim();
            if (!data["cats"].includes(category)) data["cats"].push(category);
        }

        // todo:
        // upload gallery images
        // self.ProductImages.uploadImages();

        // upload sketch image if any
        // self.SketchUpload.uploadImages();

        // link uploaded images
        data["img"] = [];
        for (let img of document.querySelectorAll('.p-img')) {

            let tf = !img.getAttribute('src').includes("placeholder") ? true : false;
            data["img"].push(tf);
        }

        // discount list
        // data["discounts"] = JSON.parse(decodeURIComponent(document.querySelector('.discount-blocks').dataset.data));

        // inventory
        data["stock"] = {};
        data['stock']['sku'] = document.querySelector('#sku_number').value;
        data['stock']['gtin'] = document.querySelector('#gtin_number').value;
        data['stock']['mpn'] = document.querySelector('#mpn_number').value;
        data['stock']['management'] = document.querySelector('#stock_management').checked;
        data['stock']['qty'] = document.querySelector('#stock_quantity').value;
        data['stock']['low_threshold'] = document.querySelector('#stock_low_threshold').value;
        data['stock']['category'] = Array.from(document.querySelector('#stock-category').selectedOptions).map(option => option.value);

        // status
        data["status"] = document.querySelector('input[name="p-status"]:checked').value;

        // sketch
        data['sketch'] = self.ProductSketch.getSketchData();
        data['input_fields'] = self.ProductSketch.getFields();
        data['sketch']['viewer'] = self.ProductViewer.getViewerData();
        data['sketch']['img'] = [self.ProductSketch.isStaticImage()];

        this.settings.textures = setTextureDefaults(this.product, this.settings);

        // price
        data['var_price'] = this.product.var_price;
        data['calc_price'] = document.querySelector('#calc_price').value;
        data['formula'] = document.querySelector('#formula').value.trim();
        data['formula_price'] = document.querySelector('#formula_price').value.trim();
        data['formula_width'] = document.querySelector('#formula_width').value.trim();
        data['formula_length'] = document.querySelector('#formula_length').value.trim();
        data['linked_products'] = document.querySelector('#linked_products').value.trim();
        data['cad_files'] = self.product.cad_files;
        data['slugs'] = self.product.slugs;
        data['modelling'] = document.querySelector('#modelling').checked ? 1 : 0;
        data['tax_id'] = document.querySelector('#tax_id').value;
        data['parts'] = [];
        data['keywords'] = [];

        // locales
        data['locales'] = {};
        this.locales.forEach(locale => {

            let slug = '-' + locale.locale;

            if (locale.locale == 'default') slug = '';

            if (!data['locales'][locale.locale]) data['locales'][locale.locale] = {};

            data['locales'][locale.locale]['title'] = document.querySelector('#p-title' + slug).value.trim();
            data['locales'][locale.locale]['sdesc'] = document.querySelector('#p-sdesc' + slug).value.trim();
            data['locales'][locale.locale]['ldesc'] = document.querySelector('#r-ldesc' + slug + " .ql-editor").innerHTML.trim();
            data['locales'][locale.locale]['keyword'] = document.querySelector('#p-keywords' + slug).value.trim();

            log("locale", locale.locale);
        });

        // complex product parts
        document.querySelector("#parts").value.trim().split('\n').forEach(el => {

            data['parts'].push({ id: el });
        });

        // keywords
        document.querySelector("#p-keywords").value.trim().split('\n').forEach(el => {

            if (!data["keywords"].includes(el)) data["keywords"].push(el);
        });

        // remove files if any
        if (self.product.filesToRemove) self.product.filesToRemove.forEach(id => deleteFile(id, (response) => { }));

        delete data[''];

        log(data);
        // return;

        showLoader();

        saveProduct(data, (response) => {

            hideLoader();

            if (!response.success) {
                toast({ type: 'error', text: parseApiError(response.error) });
                return;
            }

            // show success message
            toast(__html("Product updated"));
        });
    }

    defaults() {

        if (this.product.slugs == null) this.product.slugs = {};
        if (this.product.keywords == null) this.product.keywords = [];
        if (this.product.discounts == null) this.product.discounts = "";
        if (this.product.variations == null) this.product.variations = "";
        if (this.product.cad_files == null) this.product.cad_files = [];
        if (this.product.input_fields == null) this.product.input_fields = [];
        if (this.product.sketch == null) this.product.sketch = { mode: 'upload', type: '', mousedown: false, img: [], last: { id: null }, angle: false, polyline: null, swap: 0, camera: { p1: 7, p2: 65, p3: -45 }, offset: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 40, textures: [] };
        if (this.product.sketch.position == null) this.product.sketch.position = { x: 0, y: 0, z: 0 };
        if (this.product.sketch.rotation == null) this.product.sketch.rotation = { x: 0, y: 0, z: 0 };
        if (this.product.sketch.fov == null) this.product.sketch.fov = 40;
        if (this.product.sketch.textures == null) this.product.sketch.textures = [];
        if (this.product.sketch.camera == null) this.product.sketch.camera = { p1: 0, p2: 0, p3: 0 };
        if (this.product.sketch.offset == null) this.product.sketch.offset = { x: 0, y: 0, z: 0 };
        if (this.settings.textures == null) this.settings.textures = [];

        // temp sketch storage
        // this.sketch = this.product.sketch;

        delete this.product.sketch.camera.fov;

        if (!Array.isArray(this.product.sketch.textures)) this.product.sketch.textures = [];
        if (!Array.isArray(this.settings.textures)) this.settings.textures = [];
    }
}

new ProductEdit();