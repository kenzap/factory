import { __html, onClick, simulateClick } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class ProductFiles {

    constructor(product, settings) {

        this.product = product;
        this.settings = settings;
        this.state = {};

        this.init();
    }

    init() {

        this.view();

        document.querySelector("#cad_files").value = this.product.cad_files;

        this.listeners();

        this.refreshList();
    }

    view() {

        document.querySelector('product-files').innerHTML = `
            <h4 id="elan" class="card-title pt-4 mb-3">${__html('Files')}</h4>
            <div class="sketch_upload_cont mb-3 mw">
                <div class="d-flex align-items-center justify-content-between">
                    <label class="form-label" for="cad_files">${__html('Supporting Files')}</label>
                    <input id="cad_files" class="form-control inp cad_files" name="cad_files" type="hidden" value="0" data-type="text">
                    <input id="u_file_upload" data-id="file" type="file" name="img[]" data-key="file" data-type="type" data-id="#file" data-source="cad-files" name="u_file_upload" class="file-upload form-control d-none"></input>
                    <input id="file_upload" type="hidden" data-key="file_upload" data-sizes="" data-type="file_upload" data-source="cad-files" class="image-input image-val inps" value="file_upload"></input>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle text-primary btn-add-file po" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                    </svg>
                </div>
                <div class="cad_files_cont d-flex align-items-start">

                </div>
                <p class="form-text">${__html('2D and 3D rendering files.')}</p>
            </div>
            `;
    }

    listeners() {

        let self = this;

        onClick('.btn-add-file', e => {

            e.preventDefault();

            simulateClick(document.querySelector('#u_file_upload'));
        });

        bus.on('file:uploaded', (data) => {

            console.log("file:uploaded received", data);

            // add new file to the product
            if (data.source == 'cad-files') self.product.cad_files.push({ id: data._id, ext: data.ext, name: data.name });

            // refresh the list
            self.refreshList();
        });
    }

    // refresh uploaded file list and add it to the view
    refreshList() {

        // console.log('refreshList');

        let self = this;

        if (!self.product.cad_files) self.product.cad_files = [];
        if (!self.product.cad_files.length) { document.querySelector('.cad_files_cont').innerHTML = '<div class="fst-italic>' + __html("No files uploaded yet.") + '</div>'; return; }

        document.querySelector('.cad_files_cont').innerHTML = self.product.cad_files.map(cad => {

            // console.log(cad);
            return `
                <div class="d-flex align-items-center flex-column border-1 bd-highlight border border-secondary border-dashed rounded p-2 mb-2 me-3">
                    <div class="d-block">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" fill="currentColor" class="bi bi-file-earmark text-secondary po" viewBox="0 0 16 16">
                            <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
                        </svg>
                        <span class="remove po" title="${__html('Remove')}" data-id="${cad.id}">×</span>
                    </div>
                    <div class="d-block file-title text-truncate">${__html(cad.name)}</div>
                </div>`;

        }).join('');

        onClick(".cad_files_cont .remove", e => {

            console.log("remove file", e.currentTarget.dataset.id);

            self.product.cad_files = self.product.cad_files.filter(cad => cad.id != e.currentTarget.dataset.id);

            // todo
            if (!self.product.filesToRemove) self.product.filesToRemove = [];

            self.product.filesToRemove.push(e.currentTarget.dataset.id);

            bus.emit('product:files:removed', self.product.filesToRemove);

            self.refreshList();
        });
    }
}