import { API, __html } from "../../helpers/global.js";

export class AddStockSupply {

    constructor(o, cb) {

        this.product_id = o.product_id;
        this.product_name = o.product_name;
        this.coating = o.coating;

        this.cb = cb;

        this.view();
    }

    view = () => {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');
        this.modal.querySelector(".modal-title").innerHTML = ""; //__html('Add New User');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                ${__html('Close')}
            </button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont pdf-cont">
                 <iframe id="suppliesPreview" style="width: 100%; height: 600px; border: none;" src="${API() + '/supplies/?product_id=' + this.product_id + '&product_name=' + this.product_name + '&coating=' + this.coating + '&mini=true'}"></iframe>
            </div>`;

        this.modal.querySelector(".modal-header").classList.add('bg-light');
        this.modal.querySelector(".modal-footer").classList.add('bg-light');
        this.modal.querySelector(".modal-body").classList.add('p-0');

        this.modal_cont.show();
    }
} 