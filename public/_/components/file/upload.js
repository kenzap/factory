import { uploadFile } from "../../api/upload_file.js";
import { __html, hideLoader, showLoader, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

/**
* File upload method
* 
* @param int length_
* @return string
*/
export class FileUpload {

    constructor(product) {

        // parent state object
        this.parent = {};
        this.product = product;

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
                            if (fl.files[0].size > 200000000) {

                                toast(__html(__("Please provide file smaller than %1$ MB in size!", 20)));
                                return false;
                            }

                            // upload image
                            // console.log("upload image")
                            self.iu(fl.dataset.sizes, fl.dataset.source, fl.files[0], fl.files[0].name);
                        }
                        reader.readAsDataURL(fl.files[0]);
                    }
                });
            }
        }
    }

    // Updated image upload callback with better error handling
    iu = (sizes, source, file, name) => {

        // console.log(iid, file, name);

        let self = this;
        let fd = new FormData();

        let ext = name.split('.');
        ext = ext[ext.length - 1];

        // Validate file before upload
        if (!file) {
            toast(__html("No file selected"));
            return;
        }

        // Check file size (e.g., 10MB limit)
        const maxSize = 20 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast(__html("File too large. Maximum size is 20MB"));
            return;
        }

        // Check file type
        const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mtl', 'obj'];
        if (!allowedTypes.includes(ext.toLowerCase())) {
            toast(__html("Invalid file type"));
            return;
        }

        // Build FormData
        fd.append('ext', ext);
        fd.append('name', name);
        fd.append('sizes', sizes);
        fd.append('file', file);

        // Init progress bar 
        // if (document.querySelector("#p_" + iid)) {
        //     document.querySelector("#p_" + iid).style.display = "block";
        //     document.querySelector("#p_" + iid + " > div").style.width = "0%";
        // }

        self.state.progress = 0;

        // Progress loader
        if (self.state.interval) clearInterval(self.state.interval);

        if (document.querySelector("#p_file > div")) {
            self.state.interval = setInterval(() => {
                self.state.progress += 1;
                if (self.state.progress <= 90) { // Don't go to 100% until upload is complete
                    document.querySelector("#p_file > div").style.width = self.state.progress + '%';
                }
            }, 100);
        }

        showLoader();

        // Call upload function with error handling
        uploadFile(fd, (response) => {

            console.log('Upload successful:', response);

            clearInterval(self.state.interval);

            hideLoader();

            if (document.querySelector("#p_file > div")) {
                document.querySelector("#p_file > div").style.width = '100%';
            }

            toast(__html("File uploaded successfully"));

            bus.emit('file:uploaded', { source: source, name: name, _id: response.upload._id, ext: ext, sizes: sizes });

        }, (error) => {

            clearInterval(self.state.interval);

            hideLoader();

            // Hide progress bar on error
            // if (document.querySelector("#p_" + iid)) {
            //     document.querySelector("#p_" + iid).style.display = "none";
            // }

            console.error('Upload failed:', error);

            toast(__html("Upload failed: " + error.message));
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
}