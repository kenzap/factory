import { saveUser } from "../../api/save_user.js";
import { __html, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";
import { getRights } from "./helpers.js";

/**
 * Class representing a ProductSlug.
 */
export class ManageUserRights {

    constructor(user) {

        this.user = user;

        if (!this.user.rights) this.user.rights = [];

        this.init();

        this.listeners();
    }

    init() {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-title").innerHTML = __html('User Rights');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-save-rights btn-modal">${__html('Update')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont">
                <h3>${this.user.email}</h3>
                <p>${__html('Turn on or off specific user rights.')}</p>
                ${Object.entries(getRights()).map((role, i) => {

            return `
                        <div class="form-check form-switch mb-1">
                            <input class="form-check-input" type="checkbox" id="${role[0]}" ${this.user.rights.includes(role[0]) ? "checked" : ""}>
                            <label class="form-check-label" for="${role[0]}">${role[1].text}</label>
                            <p class="form-text">${role[1].note}</p>
                        </div>
                        `;
        }).join('')
            }

                <p class="form-text">${__html('Ask the user to sign out and sign in for changes to take immediate effect after modifying these settings.')}</p>
            </div>`;

        this.modal_cont.show();

        // setTimeout(() => { this.modal.querySelector('#userEmail').focus() }, 100);
    }

    listeners() {

        let user = { _id: this.user._id, rights: [] };

        // update button listener
        this.modal.querySelector(".btn-save-rights").addEventListener('click', e => {

            let allow = true;

            // still processing
            if (this.modal.querySelector('.btn-save-rights').dataset.loading) return;

            // show loading
            this.modal.querySelector('.btn-save-rights').dataset.loading = true;
            this.modal.querySelector('.btn-save-rights').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

            // get updated user rights
            Object.entries(getRights()).map((right, i) => {

                if (document.querySelector('#' + right[0]).checked) user.rights.push(right[0]);
            });

            if (!allow) return;

            // show loading
            this.modal.querySelector('.btn-save-rights').dataset.loading = true;
            this.modal.querySelector('.btn-save-rights').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

            // send data
            saveUser(user, (response) => {

                // revert show loading
                this.modal.querySelector('.btn-save-rights').dataset.loading = "";
                this.modal.querySelector('.btn-save-rights').innerHTML = __html('Save');

                toast("Changes applied");

                this.modal_cont.hide();

                bus.emit('user-updated', response);
            });
        });
    }
}