import { createToken } from "../../api/create_token.js";
import { __attr, __html, toast } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

/**
 * Class representing Add Token Modal.
 */
export class AddToken {

    constructor(callback) {

        this.callback = callback;

        this.init();

        this.listeners();
    }

    init() {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-title").innerHTML = __html('Create API Token');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-create-token btn-modal">${__html('Create Token')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="form-cont add-token-cont">
                <div class="alert alert-info d-flex align-items-start mb-3" role="alert">
                    <i class="bi bi-info-circle-fill me-2 mt-1"></i>
                    <div>
                        <strong>${__html('Important:')}</strong> ${__html('The token will be shown only once after creation. Make sure to copy it to a secure location.')}
                    </div>
                </div>

                <div class="mb-3 form_cont">
                    <label class="form-label" for="tokenName">${__html('Token Name')} <span class="text-danger">*</span></label>
                    <input class="form-control" type="text" id="tokenName" placeholder="${__attr('My Application Token')}" value="" autocomplete="off" required>  
                    <div class="invalid-feedback tokenName-notice"></div>
                    <p class="form-text">${__html('A descriptive name to identify this token (e.g., "Mobile App", "Integration Service").')}</p>
                </div>

                <div class="mb-3 form_cont">
                    <label class="form-label" for="tokenPermission">${__html('Permission Level')} <span class="text-danger">*</span></label>
                    <select class="form-select" id="tokenPermission" required>
                        <option value="read" selected>${__html('Read Only - Can only view data')}</option>
                        <option value="write">${__html('Read & Write - Can view and modify data')}</option>
                    </select>
                    <div class="invalid-feedback tokenPermission-notice"></div>
                    <p class="form-text">${__html('Choose the appropriate permission level based on your needs. Read Only is recommended for most integrations.')}</p>
                </div>

                <div class="mb-3 form_cont">
                    <label class="form-label" for="tokenDescription">${__html('Description')} <span class="text-muted">(Optional)</span></label>
                    <textarea class="form-control" id="tokenDescription" rows="3" placeholder="${__attr('Additional notes about this token...')}" autocomplete="off"></textarea>
                    <p class="form-text">${__html('Add any additional notes or context about how this token will be used.')}</p>
                </div>

                <div class="mb-3 form_cont">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="tokenActive" checked>
                        <label class="form-check-label" for="tokenActive">
                            ${__html('Activate token immediately')}
                        </label>
                    </div>
                    <p class="form-text">${__html('You can activate or deactivate the token later from the token list.')}</p>
                </div>
            </div>`;

        this.modal_cont.show();

        setTimeout(() => { this.modal.querySelector('#tokenName').focus() }, 100);
    }

    listeners() {

        let token = {};

        // create button listener
        this.modal.querySelector(".btn-create-token").addEventListener('click', e => {

            let allow = true;

            // still processing
            if (this.modal.querySelector('.btn-create-token').dataset.loading) return;

            // clear previous validation
            [...document.querySelectorAll('.add-token-cont .invalid-feedback')].forEach(el => {
                el.classList.remove('d-block');
            });
            [...document.querySelectorAll('.add-token-cont input.form-control, .add-token-cont select.form-select')].forEach(el => {
                el.setCustomValidity('');
            });

            // get values
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

            this.modal.querySelector('.add-token-cont').classList.add('was-validated');

            if (!allow) return;

            // show loading
            this.modal.querySelector('.btn-create-token').dataset.loading = true;
            this.modal.querySelector('.btn-create-token').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Creating...');

            createToken(token, (response) => {

                // revert loading state
                this.modal.querySelector('.btn-create-token').dataset.loading = "";
                this.modal.querySelector('.btn-create-token').innerHTML = __html('Create Token');

                if (!response.success) {
                    toast(__html('Failed to create token'), 'error');
                    return;
                }

                console.log('Token created:', response);

                // show success message with token
                this.showTokenCreated(response);

                // emit event for parent to refresh
                bus.emit('token-created', response);

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
                this.modal.querySelector('.btn-create-token').click();
            }
        });
    }

    /**
     * Show the created token with copy functionality
     * This is important as tokens are only shown once
     */
    showTokenCreated(tokenData) {

        this.modal.querySelector(".modal-title").innerHTML = __html('Token Created Successfully');
        this.modal.querySelector(".modal-footer").innerHTML = `
            <button type="button" class="btn btn-primary btn-copy-token" data-token="${tokenData.token}">${__html('Copy Token')}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
        `;

        this.modal.querySelector(".modal-body").innerHTML = `
            <div class="token-created-cont">
                <div class="alert alert-success d-flex align-items-start mb-3" role="alert">
                    <i class="bi bi-check-circle-fill me-2 mt-0"></i>
                    <div>
                        <strong>${__html('Token created successfully!')}</strong>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">${__html('Your API Token:')}</label>
                    <div class="input-group">
                        <input type="text" class="form-control font-monospace" id="generatedToken" value="${tokenData.token}" readonly>
                        <button class="btn btn-outline-secondary btn-copy-inline" type="button" data-token="${tokenData.token}">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                </div>

                <div class="mb-3">
                    <p class="mb-2"><strong>${__html('Token Details:')}</strong></p>
                    <ul class="list-unstyled">
                        <li><i class="bi bi-tag me-2"></i><strong>${__html('Name:')}</strong> ${tokenData.name}</li>
                        <li><i class="bi bi-shield-check me-2"></i><strong>${__html('Permission:')}</strong> ${tokenData.permission === 'write' ? __html('Read & Write') : __html('Read Only')}</li>
                        <li><i class="bi bi-calendar me-2"></i><strong>${__html('Created:')}</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                </div>

                <div class="bg-light p-3 rounded">
                    <p class="mb-2 fw-bold">${__html('Next Steps:')}</p>
                    <ol class="mb-0">
                        <li>${__html('Copy the token using the button above')}</li>
                        <li>${__html('Store it in a secure location (password manager, environment variables, etc.)')}</li>
                        <li>${__html('Use it in your application\'s API requests')}</li>
                    </ol>
                </div>
            </div>`;

        // Add copy button listeners
        this.modal.querySelector('.btn-copy-token').addEventListener('click', (e) => {
            this.copyToClipboard(e.currentTarget.dataset.token);
        });

        this.modal.querySelector('.btn-copy-inline').addEventListener('click', (e) => {
            this.copyToClipboard(e.currentTarget.dataset.token);
        });

        // Select token text on click
        this.modal.querySelector('#generatedToken').addEventListener('click', (e) => {
            e.target.select();
        });
    }

    /**
     * Copy token to clipboard
     */
    copyToClipboard(token) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(token).then(() => {
                toast(__html('Token copied to clipboard!'));

                // Visual feedback
                const btn = this.modal.querySelector('.btn-copy-token');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>' + __html('Copied!');
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-primary');
                }, 2000);
            }).catch(() => {
                this.fallbackCopy(token);
            });
        } else {
            this.fallbackCopy(token);
        }
    }

    /**
     * Fallback copy method for older browsers
     */
    fallbackCopy(token) {
        const textArea = document.createElement('textarea');
        textArea.value = token;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            toast(__html('Token copied to clipboard!'));
        } catch (err) {
            toast(__html('Failed to copy. Please copy manually.'), 'error');
        }

        document.body.removeChild(textArea);
    }
}