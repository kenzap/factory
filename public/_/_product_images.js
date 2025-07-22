import { __html, getCookie, hideLoader, onChange, onClick, simulateClick, spaceID, toast } from '@kenzap/k-cloud';
import { getAPI, getProductId, getStorage } from "../_/_helpers.js";

export class ProductImages {

    constructor(state) {

        this.state = state;

        this.view();
    }

    view() {

        document.querySelector('product-images').innerHTML = `
            <h4 id="elan" class="card-title pt-0 mb-3">${__html('Images')}</h4>
            <div>
                <div class="mb-3">
                <label class="banner-descshort-l form-label d-none-" for="desc">${__('Gallery images')}</label>
                <div class="clearfix"></div>
                <div class="ic"></div>
                <div class="clearfix"></div>
            </div>
            `;

        this.loadImages();
    }

    loadImages() {

        let self = this;
        let product = this.state.product;
        let d = document;
        let lang = 'en';
        let offer_id = '0';
        let id = getProductId();
        let sid = spaceID();
        let t = '';
        for (let i = 0; i < 5; i++) {

            let img = (product.img !== undefined && product.img[i] == 'true') ? 'https://preview.kenzap.cloud/S' + spaceID() + '/_site/images/product-' + product.id + '-' + (i + 1) + '-100x100.webp?' + product.updated : 'https://account.kenzap.com/images/placeholder.jpg';

            t += `\
            <div class="p-img-cont float-start">\
                <p data-index="${i}">\
                <img class="p-img images-${i}" data-index="${i}" width="100" height="100" src="${img}" />\
                <span class="remove hd" title="${__html('Remove')}">×</span>\
                </p>\
                <input type="file" name="img[]" data-type="search" data-index="${i}" data-source="gallery" class="file p-img-file aif-${i} d-none">\
            </div>`;
        }

        d.querySelector(".ic").innerHTML = t;

        // new image listener
        onClick('.p-img-cont img', e => { self.openImage(e); });

        // new remove listener
        onClick('.p-img-cont .remove', e => { self.removeImage(e); });

        // image preview listener
        onChange('.p-img-cont .file', e => { self.previewImage(e); });

        // iterate all images
        for (let fi = 0; fi < 5; fi++) {

            // async load image to verify if it exists on CDN 
            let image_url = getStorage() + '/S' + sid + '/product-' + id + '-' + (parseInt(fi) + 1) + '-250.webp?' + product.updated;
            setTimeout(function (img, sel, _fi) {

                let allow = true;
                if (typeof (product.img) !== "undefined") { if (!product.img[_fi]) allow = false; }
                if (allow) {

                    let i = new Image();
                    i.onload = function () {
                        d.querySelector(sel + _fi).setAttribute('src', img);
                        d.querySelector(sel + _fi).parentElement.querySelector('.remove').classList.remove('hd');
                    };
                    i.src = img;
                }
            }, 300, image_url, ".images-", fi);

            // async load image to verify if it exists on CDN 
            let image_url_jpeg = getStorage() + '/S' + sid + '/product-' + id + '-' + (parseInt(fi) + 1) + '-250.jpeg?' + product.updated;
            setTimeout(function (img, sel, _fi) {

                let allow = true;
                if (typeof (product.img) !== "undefined") { if (!product.img[_fi]) allow = false; }
                if (allow) {

                    let i = new Image();
                    i.onload = function () {
                        d.querySelector(sel + _fi).setAttribute('src', img);
                        d.querySelector(sel + _fi).parentElement.querySelector('.remove').classList.remove('hd');
                    };
                    i.src = img;
                }
            }, 300, image_url_jpeg, ".images-", fi);
        }
    }

    // general method for image upload
    uploadImages() {

        let self = this;

        if (document.querySelector(".imgupnote")) document.querySelector(".imgupnote").remove();

        let fi = 0;
        for (let fileEl of document.querySelectorAll(".p-img-file")) {

            fi += 1;

            let id = getProductId();
            let sid = spaceID();

            // console.log(file);
            let file = fileEl.files[0];
            if (typeof (file) === "undefined") continue;

            // TODO add global sizes setting 
            let fd = new FormData();
            // let sizes = document.querySelector("body").dataset.sizes;
            let sizes = '1000|500|250|100x100';

            fd.append('id', id);
            fd.append('sid', sid);
            fd.append('pid', id);
            fd.append('key', 'image');
            fd.append('sizes', sizes);
            // fd.append('field', file);
            fd.append('file', file);
            fd.append('slug', 'product-' + id + '-' + fi);
            fd.append('token', getCookie('kenzap_token'));

            // clear input file so that its not updated again
            file.value = '';

            self.state.ajaxQueue += 1;

            fetch(getAPI() + "/upload/", {
                body: fd,
                method: "post"
            })
                .then(response => response.json())
                .then(response => {

                    self.state.ajaxQueue -= 1;
                    if (response.success && _this.state.ajaxQueue == 0) {

                        toast(__("Product updated"));

                        // hide UI loader
                        hideLoader();
                    }
                });
        }

        // image upload notice
        if (self.state.ajaxQueue == 0) {

            toast(__("Product updated"));

            hideLoader();
        }
    }

    openImage(e) {

        e.preventDefault();

        simulateClick(document.querySelector(".aif-" + e.currentTarget.dataset.index));
    }

    previewImage(e) {

        e.preventDefault();

        let input = e.currentTarget;

        if (input.files && input.files[0]) {

            // check image type
            if (input.files[0].type != 'image/jpeg' && input.files[0].type != 'image/jpg' && input.files[0].type != 'image/png') {

                toast(__("Please provide image in JPEG format"));
                return;
            }

            // check image size
            if (input.files[0].size > 5000000) {

                toast(__("Please provide image less than 5 MB in size!"));
                return;
            }

            let index = input.dataset.index;
            let reader = new FileReader();
            reader.onload = function (e) {

                // console.log('target '+e.currentTarget.result);
                document.querySelector('.images-' + index).setAttribute('src', e.currentTarget.result);
            }
            reader.readAsDataURL(input.files[0]);

            e.currentTarget.parentElement.querySelector('.remove').classList.remove("hd");
        }
    }

    removeImage(e) {

        let index = e.currentTarget.parentElement.dataset.index;
        document.querySelector('.aif-' + index).value = '';
        document.querySelector('.images-' + index).setAttribute('src', 'https://account.kenzap.com/images/placeholder.jpg');
        e.currentTarget.classList.add("hd");

        // $(this).addClass("hd");
        // $(".aif-"+$(this).parent().data("index")).val('');
        // $(".images-"+$(this).parent().data("index")).attr('src','https://account.kenzap.com/images/placeholder.jpg');
        // $(this).addClass("hd");
    }
}