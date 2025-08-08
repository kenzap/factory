import { API, __html, escape } from "../../helpers/global.js";

export class PreviewWorkLog {

    constructor(o, cb) {

        this.order_id = o.order_id;
        this.product_id = o.product_id;
        this.product_name = o.product_name;
        this.stage = o.stage;
        this.color = o.color;
        this.coating = o.coating;
        this.qty = o.qty;

        this.cb = cb;

        this.view();
    }

    view = () => {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.add('modal-xl');
        this.modal.querySelector(".modal-title").innerHTML = ""; //__html('Add New User');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont pdf-cont">
                 <iframe id="workLogPreview" style="width: 100%; height: 600px; border: none;" src="${API() + '/worklog/?stage=' + this.stage + '&order_id=' + this.order_id + '&product_id=' + this.product_id + '&product_name=' + escape(this.product_name) + '&color=' + this.color + '&coating=' + this.coating + '&qty=' + this.qty + '&mini=true'}"></iframe>
            </div>`;

        this.modal.querySelector(".modal-header").classList.add('bg-light');
        this.modal.querySelector(".modal-footer").classList.add('bg-light');
        this.modal.querySelector(".modal-body").classList.add('p-0');

        this.modal_cont.show();
    }
}