import { H, __html, parseApiError } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class PreviewReport {

    constructor(url) {

        this.url = url;

        this.init();
    }

    init = () => {

        // do API query
        fetch(this.url, {
            method: 'get',
            headers: H(),
        })
            .then(response => response.blob())
            .then(blob => {

                this.documentBlob = blob;

                // Ensure the iframe is loaded before showing the modal
                this.view();

                const pdfPreview = document.getElementById('pdfPreview');
                const pdfUrl = URL.createObjectURL(blob);
                pdfPreview.src = pdfUrl + '#toolbar=1&navpanes=1&scrollbar=1';
                pdfPreview.onload = () => {

                    bus.emit('report:loaded', this.url);
                };
            })
            .catch(error => { parseApiError(error); });
    }

    view = () => {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.add('modal-xl');
        this.modal.querySelector(".modal-title").innerHTML = "";
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-outline-dark btn-print-pdf d-none btn-modal">
                <i class="bi bi-printer me-1"></i> ${__html('Print')}
            </button>
            <button type="button" class="btn btn-outline-dark btn-download-pdf d-none btn-modal">
                <i class="bi bi-download me-1"></i> ${__html('Download PDF')}
            </button>
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont pdf-cont">
                 <iframe id="pdfPreview" style="width: 100%; height: 600px; border: none;"></iframe>
            </div>`;

        this.modal_cont.show();

        // bind events
        // this.modal.querySelector('.btn-document-send-email').addEventListener('click', () => this.sendEmail());
        // this.modal.querySelector('.btn-document-annul').addEventListener('click', () => this.annul());
    }
}