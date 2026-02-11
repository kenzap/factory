import { API, __html, escape } from "../../helpers/global.js";

export class PreviewWorkLog {

    constructor(o, cb) {

        this.id = [o.id];
        this.item_id = o.item_id;
        this.order_id = o.order_id;
        this.product_id = o.product_id;
        this.product_name = o.product_name;
        this.type = o.type;
        this.tag = o?.tag || '';
        this.label = o?.label || '';
        this.color = o.color;
        this.coating = o.coating;
        this.qty = o.qty;
        this.user_id = o.user_id;

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
            <div class="form-cont" style="height: 100vh;">
                <iframe id="workLogPreview" style="width: 100%; height: 100%; border: none;" src="${API() + '/worklog/?type=' + this.type + '&tag=' + this.tag + '&label=' + this.label + '&id=' + escape(this.id + "") + '&item_id=' + this.item_id + '&order_id=' + this.order_id + '&product_id=' + this.product_id + '&product_name=' + escape(this.product_name) + '&color=' + this.color + '&coating=' + this.coating + '&qty=' + this.qty + '&user_id=' + this.user_id + '&mini=true'}"></iframe>
            </div>`;

        this.modal.querySelector(".modal-header").classList.add('bg-light');
        this.modal.querySelector(".modal-footer").classList.add('bg-light');
        this.modal.querySelector(".modal-body").classList.add('p-0');

        this.modal_cont.show();

        // callback to refresh UI asynchronously
        // this.modal.addEventListener('hidden.bs.modal', () => {
        //     this.cb({ success: true });
        // });
    }
}