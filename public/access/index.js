import { deleteToken } from "../_/api/delete_token.js";
import { getTokens } from "../_/api/get_tokens.js";
import { saveToken } from "../_/api/save_token.js";
import { AddToken } from "../_/components/tokens/add_token.js";
import { copyToClipboard } from "../_/components/tokens/copy_to_clipboard.js";
import { EditToken } from "../_/components/tokens/edit_token.js";
import { __html, formatTime, hideLoader, initBreadcrumbs, link, onClick, showLoader, toast } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

/**
 * Access module.
 * This class handles the access of entire portal.
 * 
 * @link /access/
 * @since 1.2.0
 *
 * @package Access
 */
class Access {

    constructor() {

        this.locales = [];
        this.settings = {};
        this.state = {
            firstLoad: true,
            html: '',
            data: {},
            ajaxQueue: 0
        }

        this.init();
    }

    init = () => {

        this.data();
    }

    data = () => {

        new Modal();

        // show loader during first load
        if (this.state.firstLoad) showLoader();

        // get locale data
        getTokens({}, response => {

            // hide UI loader
            hideLoader();

            this.tokens = response.tokens;
            this.settings = response.settings;

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'access_management')) return

            // initialize session
            new Session();

            // render header and footer
            new Header({
                hidden: false,
                title: __html('Access'),
                icon: 'shield-lock',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            new Footer();

            // html content 
            this.html();

            // bind frontend data
            this.render();

            // init page listeners
            this.listeners();

            // init footer
            new Footer(response);

            // first load
            this.state.firstLoad = false;

            // title
            document.title = __html('Access');
        });
    }

    /**
     * Renders the page with the provided response data.
     *
     * @param {Object} response - The response data containing locales.
     * @returns {void}
     */
    render = () => {

        // initiate breadcrumbs
        initBreadcrumbs(
            [
                { link: link('/home/'), text: __html('Home') },
                { text: __html('Access') }
            ]
        );

        // init table header
        document.querySelector(".table thead").innerHTML = `
            <tr>
                <th>${__html("Token Name")}</th>
                <th>${__html("Permissions")}</th>
                <th>${__html("Last Used")}</th>
                <th>${__html("Created")}</th>
                <th>${__html("Status")}</th>
                <th>${__html("")}</th>
            </tr>`;

        // render table rows
        // render table rows
        let rows = "";
        this.tokens.forEach((el, i) => {

            const permissionBadge = el.permission === 'write'
                ? `<span class="badge bg-warning text-dark fw-normal"><i class="bi bi-pencil-square me-1"></i>${__html('Read & Write')}</span>`
                : `<span class="badge bg-primary fw-normal"><i class="bi bi-eye me-1"></i>${__html('Read Only')}</span>`;

            const statusBadge = el.active
                ? `<span class="badge bg-success fw-normal">${__html('Active')}</span>`
                : `<span class="badge bg-secondary fw-normal">${__html('Inactive')}</span>`;

            const lastUsed = el.lastUsed
                ? formatTime(el.lastUsed)
                : `<span class="text-muted">${__html('Never')}</span>`;

            const tokenPreview = el.token
                ? `${el.token.substring(0, 12)}...${el.token.substring(el.token.length - 8)}`
                : __html('Hidden');

            rows += `
                <tr>
                    <td class="py-3">
                        <div class="d-flex flex-column">
                            <a href="#" class="edit-token fw-semibold" data-id="${el._id}" data-index="${i}">${el.name}</a>
                            <small class="text-muted font-monospace">${tokenPreview}</small>
                        </div>
                    </td>
                    <td class="py-3">
                        ${permissionBadge}
                    </td>
                    <td class="py-3">
                        ${lastUsed}
                    </td>
                    <td class="py-3">
                        ${formatTime(el.created)}
                    </td>
                    <td class="py-3">
                        ${statusBadge}
                    </td>
                    <td class="text-end position-static">
                        <div class="dropdown tokensActionsCont position-static" data-boundary="viewport" data-bs-boundary="viewport">
                            <svg id="tokensActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" data-bs-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                            </svg>
                            <ul class="dropdown-menu dropdown-menu-end position-fixed" aria-labelledby="tokensActions${i}" style="z-index: 1050;">
                                <li><a href="#" data-id="${el._id}" data-index="${i}" class="dropdown-item po edit-token text-dark d-flex justify-content-between align-items-center">${__html('Edit')}<i class="bi bi-pencil-square"></i></a></li>
                                <li><a href="#" data-token="${el.token}" data-index="${i}" class="dropdown-item po copy-token text-dark d-flex justify-content-between align-items-center">${__html('Copy Token')}<i class="bi bi-clipboard"></i></a></li>
                                <li><a href="#" data-id="${el._id}" data-active="${el.active}" data-index="${i}" class="dropdown-item po toggle-token text-dark d-flex justify-content-between align-items-center">${el.active ? __html('Deactivate') : __html('Activate')}<i class="bi bi-toggle-${el.active ? 'off' : 'on'}"></i></a></li>
                                <li class="d-none"><hr class="dropdown-divider"></li>
                                <li class="d-none"><a href="#" data-id="${el._id}" data-index="${i}" class="dropdown-item po regenerate-token text-warning d-flex justify-content-between align-items-center">${__html('Regenerate')}<i class="bi bi-arrow-clockwise"></i></a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a href="#" data-id="${el._id}" data-index="${i}" class="dropdown-item po remove-token text-danger d-flex justify-content-between align-items-center">${__html('Remove')}<i class="bi bi-trash"></i></a></li>
                            </ul>
                        </div>
                    </td>
                </tr>`;
        });

        if (this.tokens.length) {

            document.querySelector(".table tbody").innerHTML = rows;
        } else {

            document.querySelector(".table tbody").innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-muted">
                            <i class="bi bi-key" style="font-size: 48px;"></i>
                            <p class="mt-3">${__html("No API tokens yet. Create your first token to get started.")}</p>
                        </div>
                    </td>
                </tr>`;
        }

        hideLoader();
    }

    /**
     * Initializes the event listeners for the component.
     */
    listeners = () => {

        // edit token modal
        onClick('.edit-token', (e) => { e.preventDefault(); this.editToken(e); });

        // copy token to clipboard
        onClick('.copy-token', (e) => { e.preventDefault(); this.copyToken(e); });

        // toggle token active status
        onClick('.toggle-token', (e) => { e.preventDefault(); this.toggleToken(e); });

        // remove token
        onClick('.remove-token', (e) => { e.preventDefault(); this.removeToken(e); });

        // prevents listeners to be assigned twice
        if (!this.state.firstLoad) return;

        // add token listener
        onClick('.btn-add', (e) => { e.preventDefault(); new AddToken((response) => { this.data(); }); });
    }

    /**
     * Edits the token.
     * Initialize token editing modal
     *
     * @param {Event} e - The event object.
     * @returns {void}
     */
    editToken = (e) => {

        this.state.currentRow = e.currentTarget;

        const tokenData = this.tokens[e.currentTarget.dataset.index];

        new EditToken(this.tokens, tokenData, (response) => { this.data(); });
    }

    /**
     * Copies token to clipboard
     * @param {Event} e - The event object.
     */
    copyToken = (e) => {

        const token = e.currentTarget.dataset.token;

        if (copyToClipboard(token)) {
            toast(__html('Token copied to clipboard'));
        } else {
            toast(__html('Failed to copy token'), 'error');
        }
    }

    /**
     * Toggles token active status
     * @param {Event} e - The event object.
     */
    toggleToken = (e) => {

        e.preventDefault();

        const isActive = e.currentTarget.dataset.active === 'true';
        const action = isActive ? 'deactivate' : 'activate';

        let c = confirm(__html(`${action.charAt(0).toUpperCase() + action.slice(1)} this token?`));

        if (!c) return;

        // API call to toggle token status
        saveToken({ _id: e.currentTarget.dataset.id, active: !isActive }, (response) => {

            toast(`Changes applied`);

            this.data();
        });
    }

    /**
     * Removes a token
     * @param {Event} e - The event object.
     */
    removeToken = (e) => {

        e.preventDefault();

        let c = confirm(__html('Remove this token? This action cannot be undone.'));

        if (!c) return;

        deleteToken({ id: e.currentTarget.dataset.id }, (response) => {

            toast(__html('Token removed'));

            this.data();
        });
    }

    /**
     * Loads the home structure.
     * 
     * @returns {void}
     */
    html = () => {

        if (!this.state.firstLoad) return;

        // get core html content 
        document.querySelector('#app').innerHTML = `
            <div class="container p-edit">
                <div class="d-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                    <div class="">
                        <button class="btn btn-primary btn-add mt-3 mb-1 mt-md-0 mb-md-0 d-flex align-items-center" type="button">
                            <i class="bi bi-plus-circle me-1"></i>
                            ${__html('Create Token')}
                        </button>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12 grid-margin stretch-card">
                        <div class="card border-white shadow-sm">
                            <div class="card-body">
                                <h4 class="card-title">${__html('API Tokens')}</h4>
                                <p class="form-text">${__html('API tokens allow external applications to access your data. Choose between <strong>Read Only</strong> or <strong>Read & Write</strong> permissions.')}</p>
                                <div class="alert alert-warning d-flex align-items-center" role="alert">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    <div>
                                        ${__html('Keep your tokens secure! Anyone with your token can access your data with the assigned permissions.')}
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-sm-12">
                                        <div class="table-responsive">
                                            <table class="table table-hover table-borderless align-middle table-striped table-p-list" style="min-width: 800px;">
                                                <thead>

                                                </thead>
                                                <tbody>

                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
}

new Access();
