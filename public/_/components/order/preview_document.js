import { deleteOrderWaybill } from "../../api/delete_order_waybill.js";
import { sendEmailDocument } from "../../api/send_email_document.js";
import { API, H, __html, parseApiError, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class PreviewDocument {

    constructor(type, order) {

        this.type = type;
        this.order = order;

        this.init();
    }

    init = () => {

        // do API query
        fetch(API() + '/document/' + this.type + '/?id=' + this.order.id, {
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

                    bus.emit('order:updated', this.order.id);
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
            <button type="button" class="btn btn-outline-dark btn-document-send-email btn-modal">
                <i class="bi bi-envelope me-1"></i> ${__html('Email')}
            </button>
            <button type="button" class="btn btn-outline-dark btn-document-annul btn-modal ${this.type !== 'waybill' ? 'd-none' : ''}">
                <i class="bi bi-x-circle me-1"></i> ${__html('Annul')}
            </button>
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
        this.modal.querySelector('.btn-document-send-email').addEventListener('click', (e) => this.sendEmail(e));
        this.modal.querySelector('.btn-document-annul').addEventListener('click', (e) => this.annul(e));
    }

    annul() {

        if (!confirm(__html('Annul waybill?'))) return;

        const button = this.modal.querySelector('.btn-document-annul');
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

        deleteOrderWaybill({ id: this.order.id }, (response) => {

            if (response.success) {
                bus.emit('order:updated', this.order.id);
                this.modal_cont.hide();
                toast('Waybill annulled successfully');
            }
        });
    }

    sendEmail(e) {

        e.preventDefault();

        const button = this.modal.querySelector('.btn-document-send-email');
        if (button.disabled) return;

        if (!confirm(__html('Send email to %1$?', this.order.email))) return;

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

        sendEmailDocument({ id: this.order.id, type: this.type, email: this.order.email }, (response) => {

            if (response.success) {

                // bus.emit('order:updated', this.order.id);
                this.modal_cont.hide();
                let msg = __html('Document sent to %1$', this.order.email);
                toast(msg);
            }
        });
    }
}