import { randomString, spaceID } from "../../../_/helpers/global.js";

/**
 * Custom module for quilljs to allow user to drag images from their file system into the editor
 * and paste images from clipboard (Works on Chrome, Firefox, Edge, not on Safari)
 * @see https://quilljs.com/blog/building-a-custom-module/
 */
export class ImageDrop {

    /**
     * Instantiate the module given a quill instance and any options
     * @param {Quill} quill
     * @param {Object} options
     */
    constructor(quill, options = {}) {
        // save the quill reference
        this.quill = quill;

        // TODO copy from https://github.com/NoelOConnell/quill-image-uploader/blob/master/src/quill.imageUploader.js
        // var toolbar = this.quill.getModule("toolbar");
        // toolbar.addHandler("image", this.selectLocalImage.bind(this));

        // bind handlers to this instance
        this.handleDrop = this.handleDrop.bind(this);
        this.handlePaste = this.handlePaste.bind(this);

        // listen for drop and paste events
        this.quill.root.addEventListener('drop', this.handleDrop, false);
        this.quill.root.addEventListener('paste', this.handlePaste, false);
    }

    /**
     * Handler for drop event to read dropped files from evt.dataTransfer
     * @param {Event} evt
     */
    handleDrop(evt) {
        evt.preventDefault();
        if (evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files.length) {

            console.log('handleDrop');

            if (document.caretRangeFromPoint) {
                const selection = document.getSelection();
                const range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
                if (selection && range) {
                    selection.setBaseAndExtent(range.startContainer, range.startOffset, range.startContainer, range.startOffset);
                }
            }
            this.readFiles(evt.dataTransfer.files, this.insert.bind(this));
        }
    }

    /**
     * Handler for paste event to read pasted files from evt.clipboardData
     * @param {Event} evt
     */
    handlePaste(evt) {
        if (evt.clipboardData && evt.clipboardData.items && evt.clipboardData.items.length) {
            this.readFiles(evt.clipboardData.items, dataUrl => {
                const selection = this.quill.getSelection();

                console.log('handlePaste');

                if (selection) {
                    // we must be in a browser that supports pasting (like Firefox)
                    // so it has already been placed into the editor
                } else {
                    // otherwise we wait until after the paste when this.quill.getSelection()
                    // will return a valid index
                    setTimeout(() => this.insert(dataUrl), 0);
                }
            });
        }
    }

    /**
     * Insert the image into the document at the current cursor position
     * @param {String} dataUrl  The base64-encoded image URI
     */
    insert(dataUrl) {

        // showLoader();

        console.log("insert");
        console.log(dataUrl);

        // handle file upload
        let id = randomString(24);
        let sid = spaceID();

        // console.log(file);
        // let file = fileEl.files[0];
        // if(typeof(file) === "undefined") continue;

        let file = this.dataURLtoFile(dataUrl, id);

        // TODO add global sizes setting 
        let fd = new FormData();
        // let sizes = document.querySelector("body").dataset.sizes;
        let sizes = '1200|720|100';

        fd.append('id', id);
        fd.append('sid', sid);
        fd.append('pid', 0);
        fd.append('key', 'image');
        fd.append('sizes', sizes);
        // fd.append('field', file);
        fd.append('file', file);
        fd.append('slug', 'post-' + id);
        // fd.append('token', getCookie('kenzap_token'));

        // clear input file so that its not updated again
        // file.value = '';
        // _this.state.ajaxQueue+=1;

        fetch("https://api-v1.kenzap.cloud/upload/", {
            body: fd,
            method: "post"
        })
            .then(response => response.json())
            .then(response => {

                hideLoader();

                //  _this.state.ajaxQueue -= 1;
                if (response.success) {

                    let img = CDN + '/S' + sid + '/post-' + id + '-720.webp';

                    // dataUrl = 'https://cdn4.buysellads.net/uu/1/41334/1550855401-cc_light.png';
                    const index = (this.quill.getSelection() || {}).index || this.quill.getLength();
                    this.quill.insertEmbed(index, 'image', img, 'user');


                    // let toast = new bootstrap.Toast(document.querySelector('.toast'));
                    // document.querySelector('.toast .toast-body').innerHTML = __('Order updated');  
                    // toast.show();

                    // // hide UI loader
                    // hideLoader();
                }
            });
    }

    dataURLtoFile(dataurl, filename) {

        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, { type: mime });
    }

    /**
     * Extract image URIs a list of files from evt.dataTransfer or evt.clipboardData
     * @param {File[]} files  One or more File objects
     * @param {Function} callback  A function to send each data URI to
     */
    readFiles(files, callback) {

        // check each file for an image
        [].forEach.call(files, file => {
            if (!file.type.match(/^image\/(gif|jpe?g|a?png|svg|webp|bmp|vnd\.microsoft\.icon)/i)) {
                // file is not an image
                // Note that some file formats such as psd start with image/* but are not readable
                return;
            }
            // set up file reader
            const reader = new FileReader();
            reader.onload = (evt) => {

                console.log("readFiles");
                console.log(evt.target.result);
                callback(evt.target.result);
            };
            // read the clipboard item or file
            const blob = file.getAsFile ? file.getAsFile() : file;
            if (blob instanceof Blob) {
                reader.readAsDataURL(blob);
            }
        });
    }
}