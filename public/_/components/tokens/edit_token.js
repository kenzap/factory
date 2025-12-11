import { saveToken } from "../../api/save_token.js";
import { __attr, __html, formatTime, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

/**
 * Edit Token Modal
 * Handles editing of existing API tokens
 * 
 * @class EditToken
 */
export class EditToken {

    constructor(tokens, tokenData, callback) {

        this.tokens = tokens;
        this.tokenData = tokenData;
        this.callback = callback;

        this.init();

        this.listeners();
    }

    init() {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // Calculate permission badge
        const permissionBadge = this.tokenData.permission === 'write'
            ? `<span class="badge bg-warning text-dark ms-2" style="font-size: 0.7rem; vertical-align: middle;"><i class="bi bi-pencil-square me-1"></i>${__html('Read & Write')}</span>`
            : `<span class="badge bg-primary ms-2" style="font-size: 0.7rem; vertical-align: middle;"><i class="bi bi-eye me-1"></i>${__html('Read Only')}</span>`;

        // render modal
        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-header").innerHTML = `
            <h5 class="modal-title d-flex align-items-center">
                <span>${__html('Edit Token')}</span>
                ${permissionBadge}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" tabindex="-1"></button>
        `;

        this.modal.querySelector(".modal-footer").innerHTML = `
                <button type="button" class="btn btn-primary btn-update-token btn-modal">${__html('Save Changes')}</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
            `;


        // Calculate status badge
        const statusBadge = this.tokenData.active
            ? `<span class="badge bg-success">${__html('Active')}</span>`
            : `<span class="badge bg-secondary">${__html('Inactive')}</span>`;

        // Token preview
        const tokenPreview = this.tokenData.token
            ? `${this.tokenData.token.substring(0, 12)}...${this.tokenData.token.substring(this.tokenData.token.length - 8)}`
            : __html('Hidden');

        // Last used info
        const lastUsedInfo = this.tokenData.lastUsed
            ? formatTime(this.tokenData.lastUsed)
            : `<span class="text-muted">${__html('Never used')}</span>`;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont edit-token-cont">
                
                <!-- Token Info Card -->
                <div class="card mb-3 border-0 bg-light">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <small class="text-muted d-block">${__html('Token ID')}</small>
                                <code class="font-monospace small">${tokenPreview}</code>
                            </div>
                            <div class="col-md-6 mb-2">
                                <small class="text-muted d-block">${__html('Created')}</small>
                                <span class="small">${formatTime(this.tokenData.created)}</span>
                            </div>
                            <div class="col-md-6 mb-2">
                                <small class="text-muted d-block">${__html('Last Used')}</small>
                                <span class="small">${lastUsedInfo}</span>
                            </div>
                            <div class="col-md-6 mb-2">
                                <small class="text-muted d-block">${__html('Current Status')}</small>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Token Name -->
                <div class="mb-3 form_cont">
                    <label class="form-label" for="tokenName">${__html('Token Name')} <span class="text-danger">*</span></label>
                    <input class="form-control" type="text" id="tokenName" placeholder="${__attr('My Application Token')}" value="${this.tokenData.name}" autocomplete="off" required>  
                    <div class="invalid-feedback tokenName-notice"></div>
                    <p class="form-text">${__html('A descriptive name to identify this token.')}</p>
                </div>

                <!-- Permission Level -->
                <div class="mb-3 form_cont">
                    <label class="form-label" for="tokenPermission">${__html('Permission Level')} <span class="text-danger">*</span></label>
                    <select class="form-select" id="tokenPermission" required>
                        <option value="read" ${this.tokenData.permission === 'read' ? 'selected' : ''}>${__html('Read Only - Can only view data')}</option>
                        <option value="write" ${this.tokenData.permission === 'write' ? 'selected' : ''}>${__html('Read & Write - Can view and modify data')}</option>
                    </select>
                    <div class="invalid-feedback tokenPermission-notice"></div>
                    <p class="form-text">${__html('Changing permissions takes effect immediately.')}</p>
                </div>

                <!-- Description -->
                <div class="mb-3 form_cont">
                    <label class="form-label" for="tokenDescription">${__html('Description')} <span class="text-muted">(Optional)</span></label>
                    <textarea class="form-control" id="tokenDescription" rows="3" placeholder="${__attr('Additional notes about this token...')}" autocomplete="off">${this.tokenData.description || ''}</textarea>
                    <p class="form-text">${__html('Add any additional notes or context about how this token is used.')}</p>
                </div>

                <!-- Active Status -->
                <div class="mb-3 form_cont">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="tokenActive" ${this.tokenData.active ? 'checked' : ''}>
                        <label class="form-check-label" for="tokenActive">
                            ${__html('Token is active')}
                        </label>
                        
                    </div>
                    <p class="form-text">${__html('Inactive tokens cannot be used for API requests.')}</p>
                </div>
            </div>`;

        this.modal_cont.show();

        setTimeout(() => { this.modal.querySelector('#tokenName').focus() }, 100);
    }

    listeners() {

        let token = {};

        // Update button listener
        this.modal.querySelector(".btn-update-token").addEventListener('click', e => {

            let allow = true;

            // still processing
            if (this.modal.querySelector('.btn-update-token').dataset.loading) return;

            // clear previous validation
            [...document.querySelectorAll('.edit-token-cont .invalid-feedback')].forEach(el => {
                el.classList.remove('d-block');
            });
            [...document.querySelectorAll('.edit-token-cont input.form-control, .edit-token-cont select.form-select')].forEach(el => {
                el.setCustomValidity('');
            });

            // get values
            token._id = this.tokenData._id;
            token.name = this.modal.querySelector('#tokenName').value.trim();
            token.permission = this.modal.querySelector('#tokenPermission').value;
            token.description = this.modal.querySelector('#tokenDescription').value.trim();
            token.active = this.modal.querySelector('#tokenActive').checked;

            // validate token name
            if (!token.name || token.name.length < 3) {
                this.modal.querySelector('#tokenName').setCustomValidity(__html('Token name must be at least 3 characters'));
                this.modal.querySelector('.tokenName-notice').innerHTML = __html('Token name must be at least 3 characters');
                this.modal.querySelector('.tokenName-notice').classList.add('d-block');
                allow = false;
            }

            // validate token name length
            if (token.name.length > 100) {
                this.modal.querySelector('#tokenName').setCustomValidity(__html('Token name is too long (max 100 characters)'));
                this.modal.querySelector('.tokenName-notice').innerHTML = __html('Token name is too long (max 100 characters)');
                this.modal.querySelector('.tokenName-notice').classList.add('d-block');
                allow = false;
            }

            // validate permission
            if (!['read', 'write'].includes(token.permission)) {
                this.modal.querySelector('#tokenPermission').setCustomValidity(__html('Please select a valid permission level'));
                this.modal.querySelector('.tokenPermission-notice').innerHTML = __html('Please select a valid permission level');
                this.modal.querySelector('.tokenPermission-notice').classList.add('d-block');
                allow = false;
            }

            this.modal.querySelector('.edit-token-cont').classList.add('was-validated');

            if (!allow) return;

            // show loading
            this.modal.querySelector('.btn-update-token').dataset.loading = true;
            this.modal.querySelector('.btn-update-token').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Saving...');

            saveToken(token, (response) => {

                // revert loading state
                this.modal.querySelector('.btn-update-token').dataset.loading = "";
                this.modal.querySelector('.btn-update-token').innerHTML = __html('Save Changes');

                if (!response.success) {
                    toast(__html('Failed to update token'), 'error');
                    return;
                }

                toast(__html('Token updated successfully'));

                this.modal_cont.hide();

                // emit event for parent to refresh
                bus.emit('token-updated', response);

                // call callback if provided
                if (this.callback) {
                    this.callback(response);
                }
            });
        });

        // Enter key to submit
        this.modal.querySelector('#tokenName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.modal.querySelector('.btn-update-token').click();
            }
        });
    }
}