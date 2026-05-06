import { authLogout } from "../api/auth_logout.js";
import { __html, hideLoader, onClick } from "../helpers/global.js";
import { Modal } from "./modal.js";

/**
 * Class representing the Header component.
 * Manages header initialization, authentication, and localization.
 * 
 * @class Header
 * @export
 */
export class Header {

    constructor(response) {

        this.response = response;

        // init modal
        new Modal();

        // check if header is already present
        this.init();
    }

    init = () => {

        // load locales if present
        if (this.response.locale) window.i18n = { state: { locale: { values: this.response.locale.values } } };

        // create header
        if (!document.querySelector("#header") && !this.response.hidden) {

            // Insert the header HTML into the document body as the first element
            document.body.insertAdjacentHTML('afterbegin', this.html());

            // Set up event listeners after inserting the header
            this.listeners();
        }
    }

    html = () => {
        const taskMenuItem = this.response?.user?.rights?.includes('tasks_journal')
            ? `<li><a class="dropdown-item" href="/tasks/" target="_self"><i class="bi bi-check2-square me-2"></i>${__html('Tasks')}</a></li>`
            : '';

        return `
            <!-- Navigation -->
            <nav class="header px-3 navbar navbar-expand-lg ${this.response.style || 'navbar-light'} fixed-top ${this.response.hidden ? 'd-none' : ''}" id="header">
                <div class="container-fluid">
                    <a class="navbar-brand fw-bold" href="${this.response.home || '/home/'}">
                        <i class="bi bi-${this.response.icon || 'boxes'} me-2"></i>${this.response.title || __html('Dashboard')}
                    </a>
                    
                    <div id="header-controls" class="d-flex align-items-center">
                        ${this.response.controls || ''}
                    </div>

                    <!-- User Menu -->
                    <div class="navbar-nav ms-auto">
                        <div class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle fw-bold" href="#" role="button" data-bs-toggle="dropdown">
                                <i class="bi bi-person-circle me-2"></i>
                                ${this.response?.user?.fname ? this.response?.user?.fname : ""}${this.response?.user?.lname ? ' ' + this.response.user.lname.charAt(0) + '.' : ''}
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="/home/" target="_self"><i class="bi bi-grid me-2"></i>${__html('Home')}</a></li>
                                <li><a class="dropdown-item" href="/manufacturing/" target="_self"><i class="bi bi-box me-2"></i>${__html('Manufacturing')}</a></li>
                                <li><a class="dropdown-item" href="/worklog/" target="_self"><i class="bi bi-journal-text me-2"></i>${__html('Work Log')}</a></li>
                                <li><a class="dropdown-item" href="/worklog-launcher/" target="_self"><i class="bi bi-journal-check me-2"></i>${__html('Work Report')}</a></li>
                                ${taskMenuItem}
                                <li><hr class="dropdown-divider"></li> 
                                <li><a class="dropdown-item language-picker" href="#"><i class="bi bi-translate me-2"></i>${__html('Language')}</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger sign-out" href="#"><i class="bi bi-box-arrow-right me-2"></i>${__html('Log out')}</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    listeners = () => {

        // sign out listener
        onClick('.sign-out', (e) => {

            e.preventDefault();

            authLogout(() => {

                // hide UI loader
                hideLoader();

                // reload page
                location.reload();
            });
        });

        onClick('.language-picker', (e) => {

            e.preventDefault();

            if (!document.querySelector(".modal")) return;

            // init variables
            this.modal = document.querySelector(".modal");
            this.modal_cont = new bootstrap.Modal(this.modal);

            // large modal
            this.modal.querySelector(".modal-dialog").classList.add('modal-xl');

            // header
            this.modal.querySelector(".modal-header").innerHTML = `
                <h5 class="modal-title">${__html('Language')}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" tabindex="-1"></button>
                `;

            // Create language modal content
            const languageOptions = [
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'es', name: 'Español', flag: '🇪🇸' },
                { code: 'fr', name: 'Français', flag: '🇫🇷' },
                { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                { code: 'it', name: 'Italiano', flag: '🇮🇹' },
                { code: 'pt', name: 'Português', flag: '🇵🇹' },
                { code: 'ru', name: 'Русский', flag: '🇷🇺' },
                { code: 'zh', name: '中文', flag: '🇨🇳' },
                { code: 'ja', name: '日本語', flag: '🇯🇵' },
                // { code: 'ko', name: '한국어', flag: '🇰🇷' },
                // { code: 'ar', name: 'العربية', flag: '🇸🇦' },
                { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
                { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
                { code: 'pl', name: 'Polski', flag: '🇵🇱' },
                { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
                { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
                { code: 'no', name: 'Norsk', flag: '🇳🇴' },
                { code: 'da', name: 'Dansk', flag: '🇩🇰' },
                { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
                { code: 'is', name: 'Íslenska', flag: '🇮🇸' },
                { code: 'et', name: 'Eesti', flag: '🇪🇪' },
                { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
                { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' }
            ];

            const currentLocale = localStorage.getItem("locale") || 'en';

            const languageList = `
                            <div class="row g-2">
                                ${languageOptions.map(lang =>
                `<div class="col-6 col-md-4">
                                        <button type="button" class="btn border-0 w-100 text-start d-flex align-items-center p-3 border rounded ${lang.code === currentLocale ? 'text-dark' : 'text-dark'}" data-language="${lang.code}">
                                            <span class="me-2">${lang.flag}</span>
                                            <span class="flex-grow-1 ${lang.code === currentLocale ? "" : "btn-link"}">${lang.name}</span>
                                        </button>
                                    </div>`
            ).join('')}
                            </div>
                        `;


            this.modal.querySelector(".modal-body").innerHTML = `
                    <div class="list-group">
                        ${languageList}
                    </div>
            `;

            // show language modal
            this.modal_cont.show();

            // Show modal and set up language selection handlers
            document.querySelectorAll('[data-language]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedLang = e.currentTarget.dataset.language;

                    localStorage.setItem('locale', selectedLang);
                    location.reload();
                });
            });
        });
    }
}
