import { deleteLocale } from "../_/api/delete_locale.js";
import { getLocaleById } from "../_/api/get_locale_by_id.js";
import { getLocales } from "../_/api/get_locales.js";
import { addLocaleModal } from "../_/components/localization/add_locale.js";
import { EditLocale } from "../_/components/localization/edit_locale.js";
import { __html, countries, formatTime, hideLoader, initBreadcrumbs, languages, link, onClick, parseApiError, showLoader, toast } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Localization module.
 * This class handles the localization of entire portal.
 * 
 * @link /localization/
 * @since 1.2.0
 *
 * @package Localization
 */
class Localization {

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
        getLocales({}, response => {

            // hide UI loader
            hideLoader();

            this.locales = response.locales;
            this.settings = response.settings;

            // init locale
            new Locale(response);

            // initialize session
            new Session();

            // render header and footer
            new Header({
                hidden: false,
                title: __html('Localization'),
                icon: 'translate',
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
        });
    }

    /**
     * Retrieves the default locale data from a github repo.
     * @param {string} locale - The locale to retrieve data for.
     */
    getDefaultLocale = (locale) => {

        // console.log(locale);

        // do API query
        fetch('https://raw.githubusercontent.com/kenzap/' + this.state.ext + '/main/public/locales/' + locale + '.json', {
            method: 'get',
            headers: {}
        })
            .then(response => response.text())
            .then(response => { this.state.locales[locale] = response; this.shouldLocaleModal() })
            .catch(error => { console.error('Error:', error); });
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
                { text: __html('Localization') }
            ]
        );

        // init table header
        document.querySelector(".table thead").innerHTML = `
            <tr>
                <th>${__html("Locale")}</th>
                <th>${__html("Code")}</th>
                <th>${__html("Type")}</th>
                <th>${__html("Updated")}</th>
                <th>${__html("")}</th>
            </tr>`;

        // render table rows
        let rows = "";
        this.locales.forEach((el, i) => {

            let locale = { language: "", country: "" };

            if (el.locale.indexOf('_') === -1) {
                locale.language = el.locale;
            } else {
                locale.language = el.locale.split('_')[0];
                locale.country = el.locale.split('_')[1];
            }

            let l = languages.filter((obj) => { return obj.code === locale.language });
            let c = countries.filter((obj) => { return obj.code.toLocaleUpperCase() === locale.country });
            let localeTitle = __html(l[0].name) + (c[0] ? ' (' + __html(c[0].name) + ')' : '');

            rows += `
                <tr>
                    <td class="py-3">
                        <a href="#" class="edit-locale" data-title="${localeTitle}" data-language="${locale.language}" data-id="${el._id}">${localeTitle}</a> ${locale.country ? '<img class="ms-2 cc-flag" src="https://cdn.kenzap.com/flag/' + locale.country.toLowerCase() + '.svg" alt="location footer flag">' : ''}
                    </td>
                    <td class="py-3">
                        ${el.locale} 
                    </td>
                    <td class="py-3">
                        <span class="badge bg-primary fw-normal">${el.ext === 'dashboard' ? __html('Dashboard') : __html('E-commerce')}</span>
                    </td>
                    <td class="py-3">
                        ${formatTime(el.updated)}
                    </td>
                    <td class="text-end">
                        <div class="dropdown applicationsActionsCont" data-boundary="viewport" data-bs-boundary="viewport">
                            <svg id="applicationsActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" data-bs-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                            </svg>
                            <ul class="dropdown-menu" aria-labelledby="applicationsActions${i}">
                                <li><a href="#" data-title="${localeTitle}" data-language="${el.language}" data-id="${el._id}" data-index="${i}" class="dropdown-item po edit-locale text-dark d-flex justify-content-between align-items-center">${__html('Edit')}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></a></li>
                                <li><a href="#" data-title="${localeTitle}" data-language="${el.language}" data-id="${el._id}" data-index="${i}" class="dropdown-item d-none po sync-locale d-flex justify-content-between align-items-center" >${__html('Sync')}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-translate" viewBox="0 0 16 16"><path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z"/><path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31"/></svg></a></li>
                                <li><hr class="dropdown-divider d-none-"></li>
                                <li><a href="#" data-id="${el._id}" data-index="${i}" class="dropdown-item po remove-locale text-danger d-flex justify-content-between align-items-center">${__html('Remove')}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></a></li>
                            </ul>
                        </div>
                    </td>
                </tr>`;
        });

        if (this.locales.length) {

            document.querySelector(".table tbody").innerHTML = rows;
        } else {

            document.querySelector(".table tbody").innerHTML = `<tr><td colspan="6">${__html("Please add your first locale.")}</td></tr>`;
        }

        hideLoader();
    }

    /**
     * Initializes the event listeners for the component.
     */
    listeners = () => {

        // edit locale modal
        onClick('.edit-locale', (e) => { e.preventDefault(); this.editLocale(e); });

        // edit locale modal
        onClick('.sync-locale', (e) => { e.preventDefault(); this.state.currentRow = e.currentTarget; });

        // rename locale
        onClick('.remove-locale', this.removeLocale);

        // prevents listeners to be assigned twice
        if (!this.state.firstLoad) return;

        // add layout listener
        onClick('.btn-add', (e) => { e.preventDefault(); addLocaleModal((response) => { this.data(); }); });
    }

    /**
     * Edits the locale. load all locale translations from the Kenzap Cloud.
     * Initalise locale editing modal
     *
     * @param {Event} e - The event object.
     * @returns {void}
     */
    editLocale = (e) => {

        this.state.currentRow = e.currentTarget;

        showLoader();

        this.state.ajaxCount = 0;

        getLocaleById(e.currentTarget.dataset.id, (response) => {

            hideLoader();

            if (!response.success) { parseApiError(response); return; }

            response.locale.title = this.state.currentRow.title;

            new EditLocale(this.locales, response.locale, (response) => { this.data(); });
        });
    }

    /**
     * Removes a locale and its translations.
     * @param {Event} e - The event object.
     */
    removeLocale = (e) => {

        e.preventDefault();

        let c = confirm(__html('Remove locale and its translations?'));

        if (!c) return;

        deleteLocale(e.currentTarget.dataset.id, (response) => {

            toast(__html('Locale removed'));

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
                        <a style="margin-right:16px;" class="preview-link nounderline d-none" target="_blank" href="#">${__html('template')}<i class="mdi mdi-monitor"></i></a>
                        <button class="btn btn-primary btn-add mt-3 mb-1 mt-md-0 mb-md-0 d-flex align-items-center" type="button">
                            <i class="bi bi-plus-circle me-1"></i>
                            ${__html('Add locale')}
                        </button>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12 grid-margin stretch-card">
                        <div class="card border-white shadow-sm">
                            <div class="card-body">
                            <h4 class="card-title">${__html('Locales')}</h4>
                            <p class="form-text">${__html('Choose a <a href="#">locale</a></code> from the list to start translating, or click the \'Add Locale\' button.')}</p>
                            <div class="row">
                                <div class="col-sm-12">
                                    <div class="table-responsive">
                                        <table
                                            class="table table-hover table-borderless align-middle table-striped table-p-list" style="min-width: 800px;">
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
            </div> `;
    }
}

new Localization();
