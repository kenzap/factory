import { authLogout } from "../api/auth_logout.js";
import { __html, hideLoader, onClick } from "../helpers/global.js";

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

        // check if header is already present
        this.init();
    }

    init = () => {

        // load locales if present
        if (this.response.locale) window.i18n = { state: { locale: { values: this.response.locale.values } } };

        // create header
        if (!document.querySelector("#header")) {

            // Insert the header HTML into the document body as the first element
            document.body.insertAdjacentHTML('afterbegin', this.html());

            // Set up event listeners after inserting the header
            this.listeners();
        }
    }

    html = () => {

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
                                <li><a class="dropdown-item" href="/home/">
                                    <i class="bi bi-boxes me-2"></i>${__html('Home')}</a></li>
                                <li><a class="dropdown-item" href="/manufacturing/" >
                                    <i class="bi bi-box me-2"></i>${__html('Manufacturing')}</a></li>
                                <li><a class="dropdown-item" href="/worklog/">
                                    <i class="bi bi-clock-history me-2"></i>${__html('Work Log')}</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#">
                                    <i class="bi bi-person me-2"></i>${__html('My Profile')}</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger sign-out" href="#">
                                    <i class="bi bi-box-arrow-right me-2"></i>${__html('Log out')}</a></li>
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
    }
}