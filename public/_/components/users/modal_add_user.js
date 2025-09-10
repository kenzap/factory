import { createUser } from "../../api/create_user.js";
import { __attr, __html, toast } from "../../helpers/global.js";
import { isEmail } from "../../helpers/validation.js";
import { bus } from "../../modules/bus.js";

/**
 * Class representing a ProductSlug.
 */
export class AddUser {

    constructor() {

        this.init();

        this.listeners();
    }

    init() {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-title").innerHTML = __html('Add New User');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-create-user btn-modal">${__html('Add')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont add-user-cont">
                <img style="width:100%;max-height:100px;" src="/assets/img/verification-1.svg">
                <div class="mb-1 form_cont">
                    <label class="form-label" for="userEmail">${__html('Email')}</label>
                    <input class="form-control" type="input" id="userEmail" placeholder="${__attr('name@example.com')}" value="" autocomplete="off">  
                    <div class="invalid-feedback userEmail-notice"></div>
                    <p class="form-text">${__html('Add new user to the portal. You can update user rights after adding them.')}</p>
                </div>
            </div>`;

        this.modal_cont.show();

        setTimeout(() => { this.modal.querySelector('#userEmail').focus() }, 100);
    }

    listeners() {

        let user = {};

        // update button listener
        this.modal.querySelector(".btn-create-user").addEventListener('click', e => {

            let allow = true;

            // still processing
            if (this.modal.querySelector('.btn-create-user').dataset.loading) return;

            [...document.querySelectorAll('.add-user-cont .invalid-feedback')].forEach(el => { el.classList.remove('d-block'); });
            [...document.querySelectorAll('.add-user-cont input.form-control')].forEach(el => { el.setCustomValidity(''); });

            user.email = this.modal.querySelector('#userEmail').value;

            if (!isEmail(user.email)) {

                this.modal.querySelector('#userEmail').setCustomValidity(__html('*wrong email format'));
                this.modal.querySelector('.userEmail-notice').innerHTML = __html('*wrong email format');
                this.modal.querySelector('.userEmail-notice').classList.add('d-block');
                allow = false;
            }

            // lower down case
            user.email = user.email.toLowerCase();

            this.modal.querySelector('.add-user-cont').classList.add('was-validated');

            if (!allow) return;

            // show loading
            this.modal.querySelector('.btn-create-user').dataset.loading = true;
            this.modal.querySelector('.btn-create-user').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

            createUser(user, (response) => {

                // revert show loading
                this.modal.querySelector('.btn-create-user').dataset.loading = "";
                this.modal.querySelector('.btn-create-user').innerHTML = __html('Add');

                toast("Changes applied");

                this.modal_cont.hide();

                bus.emit('user-updated', response);
            });
        });
    }
}