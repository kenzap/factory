import { __html, getAPI, getCookie, hideLoader, showLoader, spaceID, toast } from '@kenzap/k-cloud';
import { log, randomString } from "../_/_helpers.js";

/**
* File upload method
* 
* @param int length_
* @return string
*/
export class Upload {

    constructor(parent) {

        // parent state object
        this.parent = parent;

        // state
        this.state = {};

        // init upload scripts
        this.init();

        // drap drop file listener
        this.listeners(document.querySelector('.modal-body'));
    }

    // init all file upload elements
    init = () => {

        let self = this;

        // image preview listener
        let iup = document.querySelectorAll('.file-upload');
        for (const a of iup) {
            if (!a.hasAttribute('data-listener-attached')) {
                a.setAttribute('data-listener-attached', 'true');
                a.addEventListener('change', function (e) {

                    // console.log("file-upload preview");
                    if (this.files && this.files[0]) {

                        // if icon only vector is allowed
                        let fl = this;
                        let reader = new FileReader();
                        reader.onload = function (e) {

                            // make image preview
                            if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/svg'].includes(fl.files[0].type)) {

                                let im = document.querySelector("#" + fl.dataset.id);
                                if (im) im.setAttribute("src", e.target.result);
                            }

                            // file too big
                            if (fl.files[0].size > 100000000) {

                                toast(__html(__("Please provide an image smaller than %1$ MB in size!", 10)));
                                return false;
                            }

                            // upload image
                            // console.log("upload image")
                            self.iu(fl.dataset.id, fl.dataset.sizes, fl.dataset.source, fl.files[0], fl.files[0].name);
                        }
                        reader.readAsDataURL(fl.files[0]);
                    }
                });
            }
        }
    }

    // image upload callback
    iu = (iid, sizes, source, file, name) => {

        console.log(iid, file, name);

        let self = this;
        let fd = new FormData();
        let id = randomString(12);
        let ext = name.split('.'); ext = ext[ext.length - 1];

        fd.append('id', iid);
        fd.append('sid', spaceID());
        fd.append('ext', ext);
        fd.append('pid', 0);
        fd.append('name', name);
        fd.append('key', 'file');
        fd.append('sizes', sizes);
        // fd.append('field', file);
        fd.append('file', file);
        fd.append('slug', id);
        fd.append('token', getCookie('kenzap_token'));

        // init progress bar 
        if (document.querySelector("#p_" + iid)) document.querySelector("#p_" + iid).style.display = "block";
        if (document.querySelector("#p_" + iid)) document.querySelector("#p_" + iid + " > div").style.width = "0%";
        self.state.progress = 0;

        // progress loader
        if (self.state.interval) clearInterval(self.state.interval);
        if (document.querySelector("#p_file > div")) self.state.interval = setInterval(e => { self.state.progress += 1; document.querySelector("#p_file > div").style.width = self.state.progress + '%'; }, 100);

        showLoader();

        // upload to backend
        fetch(getAPI() + "/upload/", {
            body: fd,
            method: "post"
        })
            .then(response => response.json())
            .then(response => {

                hideLoader();

                // this.state.ajaxQueue -= 1;
                if (response.success) {

                    // console.log(response);

                    if (document.querySelector("#p_file > div")) document.querySelector("#p_file > div").style.width = '100%';

                    clearInterval(self.state.interval);

                    toast(__html("File uploaded"));

                    self.handleUI({ "iid": iid, "id": id, "response": response, ext: ext, name: name, source: source, cb: self.parent.cb ? self.parent.cb : () => { } });

                    // hide UI loader
                    hideLoader();
                }
            });
    }

    listeners = zone => {

        let self = this;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            zone.addEventListener(event, self.preventDefaults, false);
            document.body.addEventListener(event, self.preventDefaults, false);
        });

        // Highlighting drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(event => { if (document.querySelector('#file')) { document.querySelector('#file').addEventListener(event, self.highlight, false); } });

        ['dragleave', 'drop'].forEach(event => { if (document.querySelector('#file')) { document.querySelector('#file').addEventListener(event, self.unhighlight, false); } });

        // Handle dropped files
        zone.addEventListener('drop', e => {

            document.querySelector('.file-upload').files = e.dataTransfer.files;
            document.querySelector('.file-upload').dispatchEvent(new Event('change'))

        }, false);
    }

    // prevent defaults triggered by upload events 
    preventDefaults = event => {
        event.preventDefault();
        event.stopPropagation();
    }

    // highlight upload area on dragover event
    highlight = event => event.target.classList.add('highlight');

    // disable upload area highlight after drop event
    unhighlight = event => event.target.classList.remove('highlight');

    // handle ui
    handleUI = (obj) => {

        let self = this;

        log("handleUI", obj);

        switch (obj.source) {
            case 'cad-files':
                setTimeout(e => {

                    if (self.parent.modalCont) self.parent.modalCont.hide();

                    self.parent.product.cad_files.push({ "id": obj.id, "_id": obj.response.id, ext: obj.ext, name: obj.name });

                    self.parent.ProductFiles.refreshList();

                    self.parent.ProductViewer.init();

                    self.parent.ProductSketch.sketchMode();

                    obj.cb();

                }, 500);
                break;
            case 'info-img':

                console.log("handleUI info_img id", obj.id);
                console.log(`#img-${obj.iid.replace('file-', '')}`);

                document.querySelector(`#img-${obj.iid.replace('file-', '')}`).value = obj.id;
                document.querySelector(`#img-${obj.iid.replace('file-', '')}`).dispatchEvent(new Event('change'));

                log("Image uploaded", document.querySelector(`#img-${obj.iid.replace('file-', '')}`).value);

                break;
            case 'gallery':


                break;
        }
    }
}