import { uploadFile } from "../../api/upload_file.js";
import { hideLoader, randomString, showLoader, toast } from "../../helpers/global.js";
import { getStorage } from "../../helpers/index.js";

const BLOG_IMAGE_SIZES = '1200|720|100';

const getFileExtensionFromMime = (mime = '') => {
    const extByMime = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico'
    };

    return extByMime[mime] || 'png';
};

const ensureUploadName = (file) => {
    const originalName = String(file?.name || '').trim();
    if (originalName) return originalName;

    const safeName = randomString(24);
    return `${safeName}.${getFileExtensionFromMime(file?.type || '')}`;
};

const resolveStorageRoot = (uploadUrl = '') => {
    const configuredStorage = String(getStorage() || '').replace(/\/+$/, '');
    if (configuredStorage && configuredStorage !== '/files') {
        return configuredStorage.replace(/\/files$/, '');
    }

    if (/^https?:\/\//i.test(uploadUrl)) {
        try {
            const parsed = new URL(uploadUrl);
            return `${parsed.origin}${parsed.pathname.replace(/\/files\/[^/]+$/, '')}`.replace(/\/+$/, '');
        } catch (_err) {
            // Fall through to empty storage root.
        }
    }

    return '';
};

export const resolveBlogUploadedImageUrl = (response = {}) => {
    const upload = response?.upload || {};
    const variantName = upload?._id ? `blog-image-${upload._id}-1-720.webp` : '';
    const uploadUrl = typeof upload.url === 'string' ? upload.url.trim() : '';
    const storageBase = resolveStorageRoot(uploadUrl);
    const hasAbsoluteStorageBase = /^https?:\/\//i.test(storageBase);
    const hasAbsoluteUploadUrl = /^https?:\/\//i.test(uploadUrl);

    if (variantName && storageBase && hasAbsoluteStorageBase) {
        return `${storageBase}/${encodeURIComponent(variantName)}`;
    }

    if (hasAbsoluteUploadUrl) {
        return uploadUrl;
    }

    if (variantName && storageBase) {
        return `${storageBase}/${encodeURIComponent(variantName)}`;
    }

    if (uploadUrl) {
        return uploadUrl;
    }

    return '';
};

export const uploadBlogImageFile = (file, { onSuccess, onError } = {}) => {
    if (!file) {
        toast('Upload failed: no image file selected', 'error');
        return;
    }

    const fd = new FormData();

    fd.append('name', ensureUploadName(file));
    fd.append('sizes', BLOG_IMAGE_SIZES);
    fd.append('source', 'blog-image');
    fd.append('file', file);

    showLoader();

    uploadFile(fd, (response) => {
        hideLoader();

        const uploadedUrl = resolveBlogUploadedImageUrl(response);
        if (!uploadedUrl) {
            toast('Upload failed: missing uploaded image URL', 'error');
            if (typeof onError === 'function') onError(new Error('Missing uploaded image URL'));
            return;
        }

        if (typeof onSuccess === 'function') {
            onSuccess(uploadedUrl, response);
        }
    }, (error) => {
        hideLoader();
        console.error('Blog image upload failed:', error);
        toast(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
        if (typeof onError === 'function') onError(error);
    });
};

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
        this.options = options || {};

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
        const id = randomString(24);
        const file = this.dataURLtoFile(dataUrl, id);
        uploadBlogImageFile(file, {
            onSuccess: (uploadedUrl) => {
            if (!uploadedUrl) {
                toast('Upload failed: missing uploaded image URL', 'error');
                return;
            }

            const index = (this.quill.getSelection() || {}).index || this.quill.getLength();
            this.quill.insertEmbed(index, 'image', uploadedUrl, 'user');
            this.quill.setSelection(index + 1, 0, 'silent');
            this.notifyUploadComplete();
            }
        });
    }

    notifyUploadComplete() {
        if (typeof this.options?.onUploadComplete === 'function') {
            setTimeout(() => {
                this.options.onUploadComplete(this.quill.root.innerHTML);
            }, 0);
        }
    }

    dataURLtoFile(dataurl, filename) {

        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);

        const extension = getFileExtensionFromMime(mime);
        const safeName = String(filename || randomString(16)).replace(/\.[a-z0-9]+$/i, '');

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], `${safeName}.${extension}`, { type: mime });
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
