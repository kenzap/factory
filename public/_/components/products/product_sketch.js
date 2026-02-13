import { FileUpload } from "../../components/products/upload.js";
import { Arc } from "../../components/sketch/2d_arc.js";
import { Polyline } from "../../components/sketch/2d_polyline.js";
import { SketchControls } from "../../components/sketch/controls.js";
import { degToRad, hasRenderFiles } from "../../components/sketch/helpers.js";
import { renderPreview } from "../../components/sketch/rendering.js";
import { SketchStaticImage } from "../../components/sketch/sketch_static_image.js";
import { __html, getProductId, log, onChange, onClick, onlyNumbers, spaceID, unescape } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class ProductSketch {

    constructor(product, settings) {

        this.product = product;
        this.settings = settings;

        this.state = { sketch: product.sketch };

        this.annotation = 'line'; // current draw mode

        this.init();
    }

    init() {

        this.view();

        // sketch controls
        this.SketchStaticImage = new SketchStaticImage(this.product, this.settings, this.sketchMode);

        this.SketchControls = new SketchControls(this.product, this.settings);

        this.loadSketch();

        this.loadFields();

        this.listeners();
    }

    view() {

        let i = 0, img = '/assets/img/placeholder.jpg';

        document.querySelector('product-sketch').innerHTML = `
            <h4 id="sketch-h" class="card-title pt-4 mb-4">${__html('Sketch')}</h4>
            <div id="product-sketch">
                <div class="mb-3">
                    <div class="sketch-mode-buttons btn-group mb-3" role="group" aria-label="Sketch mode switch"></div>
                    <div class="sketch">
                        <div class="p-img-cont sketch-cont float-start" data-mode="preview" style="max-width:100%;">
                            <div data-index="sketch${i}" class="pe-0 border border-secondary-" style="position: relative;">
                                <sketch-loader class="sketch_loader d-none spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></sketch-loader>
                                <sketch-controls class="d-none"></sketch-controls>
                                <sketch-viewer-controls class="d-none"></sketch-viewer-controls>
                                <sketch-static-image class=""></sketch-static-image>
                                <sketch-viewer class="d-none-viewer"></sketch-viewer>
                                <sketch-render class="d-none">
                                    <img class="p-img images-sketch${i}" data-index="sketch${i}" src="${img}" style="width:500px;height:500px;"/>
                                    <svg id="svg" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;display: block; position: absolute; top: 0; left: 0; z-index: -2;"></svg>
                                    <div class="labels"></div>
                                    <input class="camera-view form-text text-end d-none-" value="${this.product.sketch.camera.p1 + ',' + this.product.sketch.camera.p2 + ',' + this.product.sketch.camera.p3}">
                                    <div class="progress" style="height: 1px;"><div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div></div>
                                </sketch-render>
                            </div>
                            <input type="file" name="img[]" data-type="search" data-index="sketch${i}" class="sketchfile aif-sketch${i} d-none">
                        </div>    
                    </div>
                    <div class="clearfix"></div>
                    <p class="form-text pb-3">${__html('Press \'A\' for angle, \'Q\' for arrow or \'I\' for info note.')}</p>
                </div>
                <div class="mb-3 mws" style="">
                    <label class="banner-title-l form-label" for="p-test">${__html('Input fields')}</label>
                    <div class="input-fields">

                    </div>
                    <p class="form-text"> </p>
                </div>
                <div class="mb-3 mw d-none">
                    <input id="modelling" class="form-check-input inp modelling" name="modelling" type="checkbox" value="0" data-type="checkbox">
                    <label class="form-check-label" for="modelling">
                        ${__html('3D Modelling')}
                    </label>
                    <p class="form-text">${__html('Enable 3D modelling options when product is previewed.')}</p>
                </div>
            </div>
            `;
    }

    listeners() {

        let self = this, d = document;

        self.sketchMode();

        // reset annotation mode
        self.polyline = null;
        self.arc = null;

        // update camera view
        onChange('.camera-view', e => { renderPreview(self.product, e, "cam"); });

        // line draw listener start
        d.querySelector("#svg").addEventListener('mousedown', function (e) {

            e.preventDefault();

            self.product.sketch.mousedown = true;

            // console.log("mousedown: " + self.mode);

            if (self.mode == 'annotate' && self.annotation == 'arc-angle') { self.arc = new Arc({ params: { x: e.offsetX, y: e.offsetY, radius: 25, startAngle: 60, endAngle: 170 }, mode: 'annotate', annotation: 'arc-angle' }); self.type = "arc"; return; }

            if (self.mode == 'annotate' && self.annotation == 'arrow-angle') { self.polyline = new Polyline({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'annotate', annotation: 'arrow-angle' }); self.type = "polyline"; return; }

            if (self.mode == 'annotate' && self.annotation == 'arrow-info') { self.polyline = new Polyline({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'annotate', annotation: 'arrow-info' }); self.type = "polyline"; return; }

            if (self.mode == 'annotate' && self.annotation == 'line') { self.polyline = new Polyline({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'annotate', annotation: 'line' }); self.type = "polyline"; }

            if (self.mode == 'editing' && self.type == "polyline") { self.polyline = new Polyline({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'editing', id: self.product.sketch.last.id, rect: self.product.sketch.rect, annotation: document.querySelector('#svg g[data-id="' + self.product.sketch.last.id + '"]') ? document.querySelector('#svg g[data-id="' + self.state.sketch.last.id + '"]').dataset.annotation : 'line' }); self.type = "polyline"; }

            if (self.mode == 'editing' && self.type == "arc") { self.arc = new Arc({ params: { x: e.offsetX, y: e.offsetY, radius: 25, startAngle: 60, endAngle: 170 }, mode: 'editing', id: self.product.sketch.last.id, rect: self.product.sketch.rect, annotation: document.querySelector('#svg g[data-id="' + self.product.sketch.last.id + '"]') ? document.querySelector('#svg g[data-id="' + self.product.sketch.last.id + '"]').dataset.annotation : 'line' }); self.type = "arc"; }
        });

        // line draw listener move
        d.querySelector("#svg").addEventListener('mousemove', function (e) {

            e.preventDefault();

            if (self.polyline && self.mode == 'annotate' && self.type == "polyline") self.polyline.setCoords({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'annotate' });

            if (self.polyline && self.mode == 'editing' && self.type == "polyline") self.polyline.setCoords({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'editing' });

            if (self.arc && self.mode == 'editing' && self.type == "arc") { self.arc = new Arc({ params: { x: e.offsetX, y: e.offsetY, radius: 25, startAngle: 60, endAngle: 170 }, mode: 'editing', id: self.product.sketch.last.id, rect: self.product.sketch.rect }); self.type = "arc"; }

            // if(self.state.sketch.arrow && self.mode == 'editing' && self.type == "arrow"){ self.state.sketch.arrow = new Arrow({ params: { x: e.offsetX, y: e.offsetY, radius: 25, startAngle: 60, endAngle: 170 }, mode: 'editing', id: self.state.sketch.last.id, rect: self.state.sketch.rect }); self.type = "arrow"; }
        });

        // line draw listener end
        d.querySelector("#svg").addEventListener('mouseup', function (e) {

            e.preventDefault();

            self.product.sketch.mousedown = false;

            if (self.polyline && self.mode == 'annotate') {

                self.polyline.setEndCoords({ points: [{ x: e.offsetX, y: e.offsetY }], mode: 'annotate' });
            }

            if ((self.polyline || self.arc || self.product.sketch.arrow) && (self.mode == 'annotate' || self.mode == 'editing')) {
                self.loadFields();
            }

            self.polyline = null;
            self.arc = null;

            // circle mouse in out listener
            if (document.querySelector('#svg rect')) for (let el of document.querySelectorAll('#svg rect')) {

                el.onmouseover = (e) => {

                    if (self.product.sketch.mousedown) return;

                    self.product.sketch.rect = e.currentTarget.dataset.rect;
                    self.product.sketch.last.id = e.currentTarget.dataset.id.replace('start', '').replace('end', '');
                    self.type = e.currentTarget.dataset.type;
                };

                el.onmouseleave = (e) => {

                    if (self.product.sketch.mousedown) return;

                    self.product.sketch.rect = null;
                };
            }

            // line mouse in out listener
            if (document.querySelector('#svg polyline')) for (let el of document.querySelectorAll('#svg polyline')) {

                el.onmouseover = (e) => {

                    if (self.product.sketch.mousedown) return;

                    self.product.sketch.last.id = e.currentTarget.dataset.id;
                };
            }

            // path arc mouse in out listener
            if (document.querySelector('#svg path')) for (let el of document.querySelectorAll('#svg path')) {

                el.onmouseover = (e) => {

                    if (self.product.sketch.mousedown) return;

                    // console.log("over " + e.currentTarget.dataset.id);
                    self.product.sketch.last.id = e.currentTarget.dataset.id;
                };
            }
        });

        document.querySelector('#svg').onmouseover = (e) => {

            self.product.sketch.hover = true;
        };

        document.querySelector('#svg').onmouseleave = (e) => {

            self.product.sketch.hover = false;
        };

        // remove listener
        let keypress = (e) => {

            // log("keypress: " + e.which);

            // request angle annotate 'Q' key pressed
            if (e.which == 65 && self.mode == 'annotate') { self.annotation = 'arc-angle'; log('REQUESTING angl arc'); }

            // request arrow annotate 'A' key pressed
            if (e.which == 81 && self.mode == 'annotate') { self.annotation = 'arrow-angle'; log('REQUESTING angle arrow'); }

            // request arrow annotate 'I' key pressed
            if (e.which == 73 && self.mode == 'annotate') { self.annotation = 'arrow-info'; log('REQUESTING info arrow'); }

            // cancel annotate on del or ESC buttons
            if ((e.which == 8 || e.which == 27) && self.mode == 'annotate' && self.polyline) { console.log('removing'); document.querySelector('#svg g[data-id="' + self.polyline.getID() + '"]').remove(); }

            // cancel timer requests
            if (self.request) clearTimeout(self.request);
            self.request = setTimeout(() => { self.annotation = 'line'; log("cancel annotation request " + self.annotation) }, 2000);

            if (e.which != 8 || self.mode != 'editing' || !self.product.sketch.hover) return;

            // delete lines
            if (document.querySelector('#svg g[data-id="' + self.product.sketch.last.id + '"]')) document.querySelector('#svg g[data-id="' + self.product.sketch.last.id + '"]').remove();
            if (document.querySelector('.input-fields #field' + self.product.sketch.last.id)) document.querySelector('.input-fields #field' + self.product.sketch.last.id).remove();
            if (document.querySelector('.svg-input[data-id="' + self.product.sketch.last.id + '"]')) document.querySelector('.svg-input[data-id="' + self.product.sketch.last.id + '"]').remove();

            let id = self.product.sketch.last.id;

            self.product.input_fields = self.product.input_fields.filter(obj => obj.id != id);

            // log("annotation" + self.annotation);
        }

        document.removeEventListener('keydown', keypress, true);
        document.addEventListener('keydown', keypress, true);

        // update sketch data
        bus.on('file:uploaded', (data) => {

            console.log("file:uploaded received", data);

            // add new file to the product
            self.product.sketch.img = [];
            if (data.source == 'sketch') self.product.sketch.img.push({ id: data._id, sizes: data.sizes, ext: data.ext, name: data.name });

            self.loadSketch();
        });
    }

    // load sketch image asynchronously
    loadSketch() {

        let self = this;
        self.mode = 'annotate';

        let d = document;
        let id = getProductId();
        let sid = spaceID();

        // check for legacy jpeg and webp images
        // let image_url = [getStorage() + '/S' + sid + '/sketch-' + id + '-1-500x500.webp?' + this.product.updated, getStorage() + '/S' + sid + '/sketch-' + id + '-1-500x500.jpeg?' + this.product.updated];

        let image_url = [];

        if (self.product.sketch.img && self.product.sketch.img.length && self.product.sketch.img[0]?.id) image_url = ['https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com/S' + sid + '/sketch-' + self.product.sketch.img[0].id + '-1-500x500.webp?' + this.product.updated];

        console.log("checking sketch images", image_url);

        // if 3d files provided try to load auto generated render instead 'https://render.factory.app.kenzap.cloud/'+id+'-polyester-rr20-1500.webp', 
        if (hasRenderFiles(this.product)) image_url = ['https://render.factory.app.kenzap.cloud/' + id + '-polyester-2h3-1500.webp'];

        // sketch image
        image_url.forEach((img, fi) => {

            // async load image to verify if it exists 
            setTimeout(() => {
                let i = new Image();
                i.onload = () => {

                    // console.log('loaded', img);

                    document.querySelectorAll('.images-sketch0').forEach(el => el.src = img);
                };
                i.src = img;
            }, 300);
        });

        // console.log(self.state.product.input_fields);
        if (self.product.input_fields) {

            self.sketchMode('editing');

            self.product.input_fields.forEach(obj => {

                if (!document.querySelector('#svg g[data-id="' + obj.id + '"]')) {

                    switch (obj.type) {

                        case 'polyline':

                            let points_arr = obj.points.split(' ');
                            self.polyline = new Polyline({ points: [{ x: points_arr[0], y: points_arr[1] }], mode: 'annotate', annotation: obj.annotation, id: obj.id });
                            self.polyline.setCoords({ points: [{ x: points_arr[2], y: points_arr[3] }], mode: 'annotate' });
                            self.polyline.setEndCoords({ points: [{ x: points_arr[2], y: points_arr[3] }], mode: 'annotate' });
                            break;
                        case 'arc':

                            obj.params = typeof (obj.params) == 'string' ? {} : obj.params;
                            self.arc = new Arc({ params: { x: obj.params.x, y: obj.params.y, radius: obj.params.radius, startAngle: obj.params.startAngle, endAngle: obj.params.endAngle }, mode: 'annotate', id: obj.id });
                            break;
                    }
                }
            });
        }
    }

    // sync html lines with HTML fields
    loadFields() {

        // log('loadFields');

        let self = this;

        let htmlLabels = "";

        document.querySelector('.input-fields').innerHTML = "";

        // console.log(self.state.product.input_fields);
        if (!self.product.input_fields) self.product.input_fields = [];

        // get all lines
        if (document.querySelector('#svg g')) for (let el of document.querySelectorAll('#svg g')) {

            let id = el.dataset.id, obj = {}, xCenter, yCenter, xLabel, yLabel, deg;
            let label = document.querySelector('#field' + id + ' .field-label') ? document.querySelector('#field' + id + ' .field-label').value : self.getNextLabel(el.dataset.annotation ? el.dataset.annotation : el.dataset.type)[0];
            let obju = self.product.input_fields ? self.product.input_fields.filter(o => o.id == id)[0] : "";
            if (!obju) obju = { label: label, label_pos: "left", default: 0, min: 0, max: 0, type: el.dataset.type, params: {}, annotation: el.dataset.annotation, note: "", img: "", arrow: el.dataset.arrow == "true" ? true : false }

            // log(obju);

            // pixel offset for label
            let offset = 20;

            switch (el.dataset.type) {

                case 'polyline':

                    obj = { id: id, label: obju.label, label_pos: obju.label_pos, default: obju.default, min: obju.min, max: obju.max, type: obju.type, params: obju.params, annotation: obju.annotation, note: obju.note, img: obju.img, arrow: obju.arrow, points: el.querySelector('polyline').getAttribute('points') };

                    let points = obj.points.split(' ');

                    // get center of the polygon line
                    xCenter = (parseFloat(points[0]) + parseFloat(points[2])) / 2;
                    yCenter = (parseFloat(points[1]) + parseFloat(points[3])) / 2;

                    // get polygon degree to calc perfect label position
                    deg = Math.atan2(parseFloat(points[3]) - parseFloat(points[1]), parseFloat(points[2]) - parseFloat(points[0])) * 180 / Math.PI;

                    // calc offset label position
                    xLabel = xCenter + offset * Math.cos(degToRad(deg));
                    yLabel = yCenter + offset * Math.sin(degToRad(deg));

                    if (obju.arrow) {

                        // calc offset label position
                        xLabel = parseFloat(points[0]) + 30 * Math.cos(degToRad(deg));
                        yLabel = parseFloat(points[1]) + 30 * Math.sin(degToRad(deg));

                        htmlLabels += `
                        <div class="svg-input lable-line" style="text-align:center;left:${xLabel}px;top:${yLabel}px;" data-id="${obj.id}">
                            <label data-deg="${Math.round(deg)}" for="input${obj.label}" class="d-none" style="font-size:0.6rem;width:100%;height:100%;">${__html('press')}</label>
                        </div>
                        `;

                    } else {

                        htmlLabels += `
                        <div class="svg-input lable-line" style="text-align:center;left:${xLabel}px;top:${yLabel}px;" data-id="${obj.id}">
                            <label data-deg="${Math.round(deg)}" for="input${obj.label}">${obj.label}</label>
                        </div>
                        `;
                    }

                    break;
                case 'arc':

                    obj = { id: id, label: obju.label, label_pos: obju.label_pos, default: obju.default, min: obju.min, max: obju.max, type: obju.type, annotation: obju.annotation, note: obju.note, img: obju.img, params: JSON.parse(unescape(el.dataset.params ? el.dataset.params : "")), points: el.querySelector('path').getAttribute('d') };

                    // get polygon degree to calc perfect label position
                    if (obj.params.startAngle > obj.params.endAngle) obj.params.endAngle += 360;
                    deg = obj.params.startAngle + (obj.params.endAngle - obj.params.startAngle) / 2;

                    xCenter = obj.params.x;// + obj.params.radius / 2 + (((obj.params.radius*2) * Math.cos(degToRad(newDeg)))) + 5;
                    yCenter = obj.params.y;//  + obj.params.radius / 2 + (((obj.params.radius*2) * Math.sin(degToRad(newDeg)))) - 5;

                    // calc offset label position
                    xLabel = xCenter + (offset + obj.params.radius) * Math.cos(degToRad(deg));
                    yLabel = yCenter + (offset + obj.params.radius) * Math.sin(degToRad(deg));

                    htmlLabels += `
                    <div class="svg-input lable-angle" style="left:${xLabel}px;top:${yLabel}px;" data-id="${obj.id}">
                        <label for="input${obj.label}">${obj.label}°</label>
                    </div>
                    `;

                    break;
            }

            // sync obj for newly added sketch annotate
            if (!obju.id) {

                // console.log(obj);

                self.product.input_fields.push(obj);

                // update params and points for previously created annotates
            } else {

                self.product.input_fields = self.product.input_fields.map(o => o.id == obj.id ? obj : o);
            }

            // struct input field row
            let html = self.structInputRow(obj);

            // add to html
            document.querySelector('.input-fields').insertAdjacentHTML('beforeend', html);
        }

        document.querySelector('.labels').innerHTML = htmlLabels;

        onClick('.remove-input-field', e => { self.removeInputFields(e) });
        onChange('.input-field', e => { self.saveState(e); });
        onChange('.field-label', e => { self.updateSketchLabel(e); });
        onlyNumbers('.field-default', [8, 46]);
        onlyNumbers('.field-min', [8, 46]);
        onlyNumbers('.field-max', [8, 46]);
        onClick('.btn-add-info-img', e => {

            e.preventDefault();

            document.querySelector('#' + e.currentTarget.dataset.id).click();
        });

        self.Upload = new FileUpload(self.state);

        // console.log(self.state.product.input_fields) 
    }

    // cache state of input fields
    saveState(e) {

        // log('saveState', e.currentTarget.dataset.id, e.currentTarget.dataset.key, e.currentTarget.value);

        let self = this;

        if (e) e.preventDefault();

        // clear empty fields
        self.product.input_fields = self.product.input_fields.filter(obj => obj.id);

        // update state, same values from html input fields to array
        self.product.input_fields.forEach(obj => { if (obj.id == e.currentTarget.dataset.id) { obj[e.currentTarget.dataset.key] = e.currentTarget.value; } });
    }

    // sync select field label update with sketch labels 
    updateSketchLabel(e) {

        let id = e.currentTarget.parentElement.parentElement.id.replace('field', '');

        document.querySelector('.svg-input[data-id="' + id + '"] > label').innerHTML = e.currentTarget.value;
    }

    removeInputFields(e) {

        let c = confirm(__html('Remove row?'));

        if (!c) return;

        let id = e.currentTarget.dataset.id;

        if (document.querySelector('#svg g[data-id="' + id + '"]')) document.querySelector('#svg g[data-id="' + id + '"]').remove();
        if (document.querySelector('.input-fields #field' + id)) document.querySelector('.input-fields #field' + id).remove();
        if (document.querySelector('.svg-input[data-id="' + id + '"]')) document.querySelector('.svg-input[data-id="' + id + '"]').remove();

        this.product.input_fields = this.product.input_fields.filter(obj => obj.id != id);
    }

    sketchMode(mode) {

        let self = this;

        // TODO check if obj and mtl removed
        if (!mode) mode = hasRenderFiles(this.product) ? 'annotate' : 'upload';

        this.mode = mode;

        [...document.querySelectorAll(".svg-input")].forEach(el => el.style.zIndex = '-2')
        document.querySelector("#svg").style.zIndex = '-2';
        document.querySelector(".sketch_loader").style.zIndex = '-2';
        document.querySelector("sketch-static-image").classList.add('d-none');
        document.querySelector("sketch-viewer").classList.add('d-none-viewer');
        document.querySelector("sketch-controls").classList.add('d-none');
        document.querySelector("sketch-viewer-controls").classList.add('d-none');
        document.querySelector("sketch-render").classList.add('d-none');
        document.querySelector("sketch-static-image .remove").classList.add('d-none');

        let html = ``;

        // previoew or upload mode
        if (mode == 'upload') {

            document.querySelector("sketch-viewer").classList.add('d-none-viewer');
            document.querySelector("sketch-static-image").classList.remove('d-none');
            document.querySelector("sketch-static-image .remove").classList.remove('d-none');

            html = `
                <input id="sketch-mode-upload" type="radio" class="btn-check" name="sketchmode" data-mode="upload" autocomplete="off" ${this.mode == "upload" ? "checked" : ""} >
                <label id="sketch-mode-upload-label" class="btn btn-outline-primary" for="sketch-mode-upload">${__html('Upload')}</label>
                `;
        }

        // previoew or upload mode
        if (mode == 'preview') {

            document.querySelector("sketch-viewer").classList.remove('d-none-viewer');
            document.querySelector("sketch-viewer-controls").classList.remove('d-none');

            html = `
                <input id="sketch-mode-preview" type="radio" class="btn-check d-none" name="sketchmode" data-mode="preview" autocomplete="off" ${this.mode == "preview" ? "checked" : ""} >
                <label id="sketch-mode-preview-label" class="btn btn-outline-primary d-none" for="sketch-mode-preview">${__html('Preview')}</label>
                `;
        }

        // annotation mode
        if (mode == 'annotate') {

            document.querySelector("sketch-render").classList.remove('d-none');
            document.querySelector("sketch-controls").classList.remove('d-none');
            document.querySelector("sketch-viewer-controls").classList.add('d-none');
            document.querySelector("#svg").style.zIndex = '2';
            document.querySelector(".sketch_loader").style.zIndex = '2';
            [...document.querySelectorAll(".svg-input")].forEach(el => el.style.zIndex = '3');

            this.SketchControls.init("");
        }

        // editing mode
        if (mode == 'editing') {

            document.querySelector("sketch-render").classList.remove('d-none');
            document.querySelector("sketch-controls").classList.remove('d-none');
            document.querySelector("sketch-viewer-controls").classList.add('d-none');
            document.querySelector("#svg").style.zIndex = '2';
            document.querySelector(".sketch_loader").style.zIndex = '2';
            [...document.querySelectorAll(".svg-input")].forEach(el => el.style.zIndex = '3');

            this.SketchControls.init("");
        }

        if (!this.product.sketch.img) this.product.sketch.img = [];

        // hide image remove button if no files
        if (!hasRenderFiles(this.product) && !this.product.sketch.img[0]) {

            document.querySelector(".sketch-upload-cont .remove").classList.add('d-none');
        }

        // preview button visibility
        if (hasRenderFiles(this.product)) {

            html = `
                <input id="sketch-mode-preview" type="radio" class="btn-check" name="sketchmode" data-mode="preview" autocomplete="off" ${this.mode == "preview" ? "checked" : ""} >
                <label id="sketch-mode-preview-label" class="btn btn-outline-primary" for="sketch-mode-preview">${__html('Preview')}</label>
                `;

            // document.querySelector("sketch-viewer").classList.remove('d-none-viewer');
        }

        // upload button visibility
        if (!hasRenderFiles(this.product) && this.product.sketch.img[0]) {

            html = `
                <input id="sketch-mode-upload" type="radio" class="btn-check" name="sketchmode" data-mode="upload" autocomplete="off" ${this.mode == "upload" ? "checked" : ""} >
                <label id="sketch-mode-upload-label" class="btn btn-outline-primary" for="sketch-mode-upload">${__html('Upload')}</label>
                `;
        }

        // annotate and edit buttons visibility
        if (hasRenderFiles(this.product) || this.product.sketch.img[0]) {

            html += `
                <input id="sketch-mode-annotate" type="radio" class="btn-check" name="sketchmode" data-mode="annotate" autocomplete="off" ${this.mode == "annotate" ? "checked" : ""} >
                <label id="sketch-mode-annotate-label" class="btn btn-outline-primary" for="sketch-mode-annotate">${__html('Annotate')}</label>
                <input id="sketch-mode-edit" type="radio" class="btn-check" name="sketchmode" data-mode="editing" autocomplete="off" ${this.mode == "editing" ? "checked" : ""} >
                <label id="sketch-mode-edit-label" class="btn btn-outline-primary" for="sketch-mode-edit">${__html('Edit')}</label>
                `;

            // document.querySelector("sketch-viewer").classList.add('d-none-viewer');
        }

        document.querySelector(".sketch-mode-buttons").innerHTML = html;
        document.querySelector(".sketch-cont").dataset.mode = mode;

        // sketch mode 
        onClick('[name="sketchmode"]', e => { self.sketchMode(e.currentTarget.dataset.mode); });
    }

    // get next available label number
    getNextLabel(type) {

        let alphabet_lines = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
        let alphabet_angles = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ"];

        // prevent same label used twice
        for (let label of document.querySelectorAll('.input-fields > div .field-label')) { alphabet_lines = alphabet_lines.filter(function (el) { return el !== label.value }); alphabet_angles = alphabet_angles.filter(function (el) { return el !== label.value }) }

        if (type.includes('angle')) return alphabet_angles;

        return alphabet_lines;
        // return type == "polyline" ? alphabet_lines : alphabet_angles;
    }

    getFields() {

        return this.product.input_fields;
    }

    getSketchData() {

        return this.product.sketch;
    }

    structInputRow(obj) {

        // available labels
        let alphabet = this.getNextLabel(obj.annotation ? obj.annotation : obj.type);

        // labels select
        let options = ''; alphabet.forEach((el) => { options += '<option value="' + el + '" ' + (obj.label == el ? 'selected' : '') + '>' + el + '</option>'; });

        return `
                <div id="field${obj.id}" class="d-flex flex-row bd-highlight mb-0" data-type="${obj.type}"  data-points="${obj.points}" data-params="${escape(JSON.stringify(obj.params ? obj.params : {}))}">
                    <div class="me-3" >
                        <select class="form-select form-select-sm field-label input-field" style="width:64px" data-key="label" data-type="${obj.type}" data-annotation="${obj.annotation}" data-id="${obj.id}">
                            ${options}
                        </select>
                        <p class="form-text">${__html('label')}</p>
                    </div>
                    <div class="me-3" >
                        <select class="form-select form-select-sm field-label-pos input-field" style="width:150px" data-key="label_pos" data-type="${obj.type}" data-id="${obj.id}">
                            <option value="bottom_right" ${(obj.label_pos == 'bottom_right' || !obj.label_pos ? 'selected' : '')}>${__html('Bottom right')}</option>
                            <option value="bottom_left" ${(obj.label_pos == 'bottom_left' ? 'selected' : '')}>${__html('Bottom left')}</option>
                            <option value="top_right" ${(obj.label_pos == 'top_right' ? 'selected' : '')}>${__html('Top right')}</option>
                            <option value="top_left" ${(obj.label_pos == 'top_left' ? 'selected' : '')}>${__html('Top left')}</option>
                            <option value="left" ${(obj.label_pos == 'left' ? 'selected' : '')}>${__html('Left')}</option>
                            <option value="right" ${(obj.label_pos == 'right' ? 'selected' : '')}>${__html('Right')}</option>
                        </select>
                        <p class="form-text">${__html('label position')}</p>
                    </div>
                    ${obj.annotation && obj.annotation.includes('arrow-info') ? `
                        <div class="me-3">
                            <input type="text" class="form-control form-control-sm field-info input-field" placeholder="${__html('Info note goes here')}" value="${obj.note ? obj.note : ""}" data-key="note" data-id="${obj.id}" style="width:398px;"></input>
                            <p class="form-text">${__html('default value')}</p>
                        </div>
                        <div class="me-3 d-none">
                            <input id="${obj.id}" type="file" data-id="${obj.id}" data-key="file" data-source="info-img" class="form-control form-control-sm field-file input-field file-upload" name="info_file_upload" accept="image/*" data-sizes="250" data-key="file" style="width:185px;">
                            <input id="img-${obj.id}" type="text" data-id="${obj.id}" data-key="img" class="form-control form-control-sm field-img input-field" value="${obj.img ? obj.img : ""}"></input>
                            <p class="form-text">${__html('attach file')}</p>
                        </div>
                        <a href="javascript:void(0);" onclick="javascript:;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" data-id="${obj.id}" fill="currentColor" class="bi bi-plus-circle text-primary mt-1 me-2 btn-add-info-img po" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path>
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"></path>
                            </svg>
                        </a>
                        <input type="hidden" class="form-control form-control-sm field-default input-field" placeholder="${__html('0')}" value="${obj.default}" data-key="default" data-id="${obj.id}"></input>
                        <input type="hidden" class="form-control form-control-sm field-min input-field" placeholder="${__html('0')}" value="${obj.min}" data-key="min" data-id="${obj.id}"></input>
                        <input type="hidden" class="form-control form-control-sm field-max input-field" placeholder="${__html('1000')}" value="${obj.max}" data-key="max" data-id="${obj.id}"></input>

                        ` : `

                        <div class="me-3">
                            <input type="text" class="form-control form-control-sm field-default input-field" placeholder="${__html('0')}" value="${obj.default}" data-key="default" data-id="${obj.id}"></input>
                            <p class="form-text">${__html('default value')}</p>
                        </div>
                        <div class="me-3">
                            <input type="text" class="form-control form-control-sm field-min input-field" placeholder="${__html('0')}" value="${obj.min}" data-key="min" data-id="${obj.id}"></input>
                            <p class="form-text">${__html('min value')}</p>
                        </div>
                        <div class="me-3">
                            <input type="text" class="form-control form-control-sm field-max input-field" placeholder="${__html('1000')}" value="${obj.max}" data-key="max" data-id="${obj.id}"></input>
                            <p class="form-text">${__html('max value')}</p>
                        </div>`}
                        <a href="javascript:void(0);" onclick="javascript:;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff0079" class="remove-input-field bi bi-x-circle mt-1" data-id="${obj.id}" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path>
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path>
                            </svg>
                        </a>
                </div>
            `;
    }

    // checks if curent procuts relies on static sketch image or renders from provided 3d files
    isStaticImage() {

        if (!hasRenderFiles(this.product) && document.querySelector(".images-sketch0").src.indexOf('placeholder') != -1) return false;
    }
}