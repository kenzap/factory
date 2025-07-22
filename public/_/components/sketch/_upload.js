import { onChange, onClick, simulateClick, spaceID, hideLoader, toast, attr, __html, html, getAPI, getCookie, getStorage } from '@kenzap/k-cloud';
import { hasRenderFiles } from "./_helpers.js"
import { getProductId } from "../../_/_helpers.js"

export class SketchUpload{

    constructor(state){

        this.state = state;

        this.init();

        this.listeneres();
    }

    init(){

        this.view();  
    }

    view(){

        let i = 0, img = '/assets/img/placeholder.jpg';

        document.querySelector('sketch-upload').innerHTML = `
            <div class="sketch-upload-cont">
                <img class="p-img po images-sketch${i}" data-index="sketch${i}" src="${ img }" style="width:500px;height:500px;"/>
                <button type="button" class="btn-close pt-3 btn btn-close-sm remove" tabindex="-1"></button>
                <input type="file" name="sketchfile" data-type="search" data-index="sketch${i}" class="file sketch-upload aif-sketch${i} d-none">
            </div>
            `;
    }

    openImage(e){

        e.preventDefault();

        console.log(".aif-"+e.currentTarget.dataset.index);

        simulateClick(document.querySelector(".aif-"+e.currentTarget.dataset.index));
    }

    previewImage(e){

        let self = this;

        console.log("previewImage:" + e.currentTarget);

        e.preventDefault();

        let input = e.currentTarget;

        if (input.files && input.files[0]) {

            // check image type
            if(input.files[0].type != 'image/jpeg' && input.files[0].type != 'image/jpg' && input.files[0].type != 'image/png'){

                toast( __("Please provide image in JPEG format") );
                return;
            }
      
            // check image size
            if(input.files[0].size > 5000000){

                toast( __("Please provide an image smaller than %1$ MB in size!", 10) );
                return;
            }

            let index = input.dataset.index;

            // console.log("index" + index);

            let reader = new FileReader();
            reader.onload = function(e) {
              
                self.state.product.sketch.img = [true];
                self.state.ProductSketch.sketchMode(hasRenderFiles(self.state) ? 'preview' : 'upload');
                [...document.querySelectorAll('.images-'+index)].forEach(el => el.setAttribute('src', e.currentTarget.result));
            }
            reader.readAsDataURL(input.files[0]);

            e.currentTarget.parentElement.querySelector('.remove').classList.remove("hd");
        }
    }

    removeImage(e){

        // let index = e.currentTarget.parentElement.dataset.index;
        document.querySelector('.aif-sketch0').value = '';
        document.querySelectorAll('.images-sketch0').forEach(el => el.setAttribute('src', '/assets/img/placeholder.jpg'));
        // document.querySelector('.sketch-upload-cont .remove').classList.add("d-none");
        // e.currentTarget.classList.add("d-none");

        this.state.product.sketch.img = [];
        this.state.ProductSketch.sketchMode(hasRenderFiles(this.state) ? 'preview' : 'upload');
    }

    // general method for image upload
    uploadImages(){

        let self = this;

        if( document.querySelector(".imgupnote") ) document.querySelector(".imgupnote").remove();

        console.log("SketchUpload.uploadImages");

        let fi = 0;
        for(let fileEl of document.querySelectorAll(".sketch-upload")){

            fi += 1;

            let id = getProductId();
            let sid = spaceID();
            let file = fileEl.files[0];

            // console.log(file);

            if(typeof(file) === "undefined") continue;

            // console.log(file);

            // TODO add global sizes setting 
            let fd = new FormData();
            // let sizes = document.querySelector("body").dataset.sizes;
            let sizes = '1000|500x500|250x250|100x100';

            fd.append('id', id);
            fd.append('sid', sid);
            fd.append('pid', id);
            fd.append('key', 'image');
            fd.append('sizes', sizes);
            fd.append('file', file);
            fd.append('slug', 'sketch-'+id+'-'+fi);
            fd.append('token', getCookie('kenzap_token'));

            // clear input file so that its not updated again
            file.value = '';

            self.state.ajaxQueue+=1;

            fetch(getAPI() + "/upload/",{
                body: fd,
                method: "post"
            })
            .then(response => response.json())
            .then(response => {

                self.state.ajaxQueue -= 1;
                if(response.success && self.state.ajaxQueue == 0){

                    toast( __("Sketch updated") );

                    document.querySelectorAll('.images-sketch0').forEach(el => el.src = `${ getStorage() }/S${ sid }/sketch-${ id }-1-500x500.jpeg`);

                    // hide UI loader
                    hideLoader();
                }
            });
        }
        
        // image upload notice
        if(self.state.ajaxQueue == 0){

            toast( __("Product updated") );

            hideLoader();
        }
    }

    listeneres(){

        let self = this;

        // new image listener
        onClick('sketch-upload img', e => { self.openImage(e); });

        // new remove listener
        onClick('sketch-upload .remove', e => { self.removeImage(e); });

        // image preview listener
        onChange('sketch-upload .sketch-upload', e => { self.previewImage(e); });
                
        // let self = this;

        // onChange('.controls input', e => { renderPreview(self, e, "cnt"); });

        // onChange('.controls select', e => { renderPreview(self, e, "cnt"); });
    }
}