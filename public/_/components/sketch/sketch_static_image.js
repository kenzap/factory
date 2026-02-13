import { onClick, simulateClick } from "../../helpers/global.js";
import { hasRenderFiles } from "./helpers.js";

export class SketchStaticImage {

    constructor(product, settings, sketchMode) {

        this.product = product;
        this.settings = settings;
        this.sketchMode = sketchMode;

        this.init();

        this.listeneres();
    }

    init() {

        this.view();
    }

    view() {

        let i = 0, img = '/assets/img/placeholder.jpg';

        document.querySelector('sketch-static-image').innerHTML = `
            <div class="sketch-upload-cont">
                <img class="p-img po images-sketch${i}" data-index="sketch${i}" src="${img}" style="width:500px;height:500px;"/>
                <button type="button" class="btn-close pt-3 btn btn-close-sm remove" tabindex="-1"></button>
                <input type="file" name="sketchfile" data-source="sketch" data-sizes="1500|100x100|250x250|500x500" data-type="search" data-index="sketch${i}" class="file file-upload sketch-upload aif-sketch${i} d-none">
            </div>
            `;
    }

    openImage(e) {

        e.preventDefault();

        console.log(".aif-" + e.currentTarget.dataset.index);

        simulateClick(document.querySelector(".aif-" + e.currentTarget.dataset.index));
    }

    removeImage(e) {

        document.querySelector('.aif-sketch0').value = '';
        document.querySelectorAll('.images-sketch0').forEach(el => el.setAttribute('src', '/assets/img/placeholder.jpg'));

        this.product.sketch.img = [];
        this.state.ProductSketch.sketchMode(hasRenderFiles(this.state) ? 'preview' : 'upload');
    }

    listeneres() {

        let self = this;

        // new image listener
        onClick('sketch-static-image img', e => { self.openImage(e); });

        // new remove listener
        onClick('sketch-static-image .remove', e => { self.removeImage(e); });
    }
}