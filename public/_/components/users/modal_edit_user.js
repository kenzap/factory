import { saveUser } from "../../api/save_user.js";
import { __attr, __html, toast } from "../../helpers/global.js";
import { isEmail, isPhone } from "../../helpers/validation.js";
import { bus } from "../../modules/bus.js";

/**
 * Class representing a EditUser.
 * This class is used to edit user details in a modal.
 * Called from the Users dashboard page.
 */
export class EditUser {

    constructor(user) {

        this.user = user;

        this.init();

        this.listeners();
    }

    init() {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-title").innerHTML = __html('Edit');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-save-user btn-modal">${__html('Save')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont add-user-cont">
                <img style="width:100%;max-height:180px;" src="/assets/img/undraw_under_construction.svg">
                <p class="d-none">${__html('Manually add users to the database. You can update user rights after adding them.')}</p>
                <div class="mb-3 form_cont">
                    <label class="form-label" for="userFname">${__html('First name')}</label>
                    <input class="form-control" type="text" id="userFname" placeholder="${__attr('Alex')}" value="${this.user.fname || ""}" autocomplete="off">  
                </div>
                <div class="mb-3 form_cont">
                    <label class="form-label" for="userLname">${__html('Last name')}</label>
                    <input class="form-control" type="text" id="userLname" placeholder="${__attr('Smith')}" value="${this.user.lname || ""}" autocomplete="off">  
                </div>
                <div class="mb-3 form_cont">
                    <label class="form-label" for="userEmail">${__html('Email')}</label>
                    <input class="form-control" type="text" id="userEmail" placeholder="${__attr('name@example.com')}" value="${this.user.email || ""}" autocomplete="off">  
                    <div class="invalid-feedback userEmail-notice"></div>
                </div>
                <div class="mb-3 form_cont">
                    <label class="form-label" for="userPhone">${__html('Phone number')}</label>
                    <input class="form-control" type="text" id="userPhone" placeholder="${__attr('1234000000')}" value="${this.user.phone || ""}" autocomplete="off">  
                    <div class="invalid-feedback userPhone-notice"></div>
                </div>
                <div class="mb-3 form_cont">
                    <label class="form-label" for="userNotes">${__html('Notes')}</label>
                    <input class="form-control" type="text" id="userNotes" placeholder="" value="${this.user.notes || ""}" autocomplete="off">  
                    <div class="invalid-feedback userNotes-notice"></div>
                </div>
                <div class="mb-3 form_cont">
                    <label class="form-label" for="userPortal">${__html('Portal')}</label>
                    <select class="form-control" type="select" id="userPortal" autocomplete="off">  
                        <option value="" ${this.user.portal == "" ? "selected" : ""}>${__html('No access')}</option>
                        <option value="home" ${this.user.portal == "home" ? "selected" : ""}>${__html('Home')}</option>
                        <option value="manufacturing" ${this.user.portal == "manufacturing" ? "selected" : ""}>${__html('Manufacturing')}</option>
                        <option value="cutting" ${this.user.portal == "cutting" ? "selected" : ""}>${__html('Cutting')}</option>
                        <option value="stock" ${this.user.portal == "stock" ? "selected" : ""}>${__html('Inventory')}</option>
                        <option value="product-list" ${this.user.portal == "product-list" ? "selected" : ""}>${__html('Products')}</option>
                    </select>
                    <p class="form-text">${__html('Redirects the user to their default page after successful sign-in.')}</p>
                </div>
                <div class="mb-3 form_cont">
                    <label class="form-label
                    <div class="invalid-feedback userEmail-notice"></div>
                </div>
            </div>`;

        this.modal_cont.show();

        setTimeout(() => { this.modal.querySelector('#userEmail').focus() }, 100);
    }

    listeners() {

        let user = { _id: this.user._id };

        // phone input listener to allow only digits
        this.modal.querySelector('#userPhone').addEventListener('keypress', e => {
            if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // update button listener
        this.modal.querySelector(".btn-save-user").addEventListener('click', e => {

            let allow = true;

            // still processing
            if (this.modal.querySelector('.btn-save-user').dataset.loading) return;

            [...document.querySelectorAll('.add-user-cont .invalid-feedback')].forEach(el => { el.classList.remove('d-block'); });
            [...document.querySelectorAll('.add-user-cont input.form-control')].forEach(el => { el.setCustomValidity(''); });

            // first name
            user.fname = this.modal.querySelector('#userFname').value;

            // last name
            user.lname = this.modal.querySelector('#userLname').value;

            // email
            user.email = this.modal.querySelector('#userEmail').value;

            // always validate email
            if (!isEmail(user.email)) {

                this.modal.querySelector('#userEmail').setCustomValidity(__html('*wrong email format'));
                this.modal.querySelector('.userEmail-notice').innerHTML = __html('*wrong email format');
                this.modal.querySelector('.userEmail-notice').classList.add('d-block');
                allow = false;
            }

            // phone
            user.phone = this.modal.querySelector('#userPhone').value;

            // validate if phone is provided
            if (user.phone.length && !isPhone(user.phone)) {
                this.modal.querySelector('#userPhone').setCustomValidity(__html('*wrong phone format'));
                this.modal.querySelector('.userPhone-notice').innerHTML = __html('*wrong phone format');
                this.modal.querySelector('.userPhone-notice').classList.add('d-block');
                allow = false;
            }

            // notes
            user.notes = this.modal.querySelector('#userNotes').value;

            // portal
            user.portal = this.modal.querySelector('#userPortal').value;

            // lower down case
            user.email = user.email.toLowerCase();

            this.modal.querySelector('.add-user-cont').classList.add('was-validated');

            if (!allow) return;

            // show loading
            this.modal.querySelector('.btn-save-user').dataset.loading = true;
            this.modal.querySelector('.btn-save-user').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

            // send data
            saveUser(user, (response) => {

                // revert show loading
                this.modal.querySelector('.btn-save-user').dataset.loading = "";
                this.modal.querySelector('.btn-save-user').innerHTML = __html('Save');

                toast("Changes applied");

                this.modal_cont.hide();

                bus.emit('user-updated', response);
            });
        });
    }
}