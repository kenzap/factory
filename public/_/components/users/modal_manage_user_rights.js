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

    getCategorizedRights() {
        const allRights = getRights();
        const categories = {
            'orders': [],
            'factory': [],
            'finance': [],
            'clients': [],
            'warehouse': [],
            'settings': [],
            'analytics': [],
            'portal': [],
            'localization': [],
            'files': [],
            'access': [],
            'users': []
        };

        Object.entries(allRights).forEach(([key, value]) => {

            if (categories[value.category]) {
                categories[value.category].push([key, value]);
            } else {
                categories.settings.push([key, value]);
            }
        });

        return categories;
    }

    renderCategorySection(categoryName, rights) {
        if (rights.length === 0) return '';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card- h-100 border-0">
                    <div class="card-header- mb-3">
                        <h5 class="card-title mb-0">${categoryName}</h5>
                    </div>
                    <div class="card-body- mb-3">
                        ${rights.map(([key, value]) => `
                            <div class="form-check form-switch mb-2">
                                <input class="form-check-input" type="checkbox" id="${key}" ${this.user.rights.includes(key) ? "checked" : ""}>
                                <label class="form-check-label" for="${key}">${value.text}</label>
                                ${value.note ? `<div class="form-text small">${value.note}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    init() {
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // Make modal fullscreen
        this.modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');
        this.modal.querySelector(".modal-header").innerHTML = `
            <div class="d-flex w-100 justify-content-between align-items-start">
                <div>
                    <h5 class="modal-title mb-0">${(this.user?.fname && this.user?.lname) ? this.user.fname + " " + this.user.lname : this.user.email}</h5>
                    <p class="text-muted mb-0">${__html('Turn specific user rights on or off.')}</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" tabindex="-1"></button>
            </div>
        `;

        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-save-rights btn-modal">${__html('Update')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
        `;

        const categorizedRights = this.getCategorizedRights();

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="container-fluid">
                <div class="row mb-4 d-none">
                    <div class="col-12">
                        <h3>${(this.user?.fname && this.user?.lname) ? this.user.fname + " " + this.user.lname : this.user.email}</h3>
                        <p class="text-muted">${__html('Turn specific user rights on or off.')}</p>
                    </div>
                </div>
                <div class="row">
                    ${Object.entries(categorizedRights).map(([category, rights]) =>
            this.renderCategorySection(category, rights)
        ).join('')}
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            ${__html('Users must sign out and back in for changes to apply immediately.')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.modal_cont.show();
    }

    listeners() {
        let user = { _id: this.user._id, rights: [] };

        this.modal.querySelector(".btn-save-rights").addEventListener('click', () => {
            if (this.modal.querySelector('.btn-save-rights').dataset.loading) return;

            this.modal.querySelector('.btn-save-rights').dataset.loading = true;
            this.modal.querySelector('.btn-save-rights').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

            Object.entries(getRights()).forEach(([rightKey]) => {
                if (document.querySelector('#' + rightKey).checked) {
                    user.rights.push(rightKey);
                }
            });

            saveUser(user, (response) => {
                this.modal.querySelector('.btn-save-rights').dataset.loading = "";
                this.modal.querySelector('.btn-save-rights').innerHTML = __html('Update');

                toast("Changes applied");
                this.modal_cont.hide();
                bus.emit('user-updated', response);
            });
        });
    }
}