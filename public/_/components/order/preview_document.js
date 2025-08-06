import { deleteOrderWaybill } from "../../api/delete_order_waybill.js";
import { sendEmailWaybill } from "../../api/send_email_waybill.js";
import { API, H, __html, parseApiError, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class PreviewDocument {

    constructor(type, order) {

        this.order = order;

        this.init();
    }

    init = () => {

        // do API query
        fetch(API() + '/document/waybill/?id=' + this.order.id, {
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
        this.modal.querySelector(".modal-title").innerHTML = "";//__html('Add New User');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-outline-dark btn-document-send-email btn-modal">
                <i class="bi bi-envelope me-1"></i> ${__html('Send Email')}
            </button>
            <button type="button" class="btn btn-outline-dark btn-document-annul btn-modal">
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
        this.modal.querySelector('.btn-document-send-email').addEventListener('click', () => this.sendEmail());
        this.modal.querySelector('.btn-document-annul').addEventListener('click', () => this.annul());
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

    sendEmail() {

        if (!confirm(__html('Send email to %1$?', this.order.email))) return;

        const button = this.modal.querySelector('.btn-document-send-email');
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

        sendEmailWaybill({ id: this.order.id, email: this.order.email }, (response) => {

            if (response.success) {

                // bus.emit('order:updated', this.order.id);
                this.modal_cont.hide();
                let msg = __html('Waybill sent to %1$', this.order.email);
                toast(msg);
            }
        });
    }
}