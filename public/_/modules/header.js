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
                                Operators
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('nol1', '/ATS/noliktava2?ats=1')">
                                    <i class="bi bi-box me-2"></i>Noliktava 1</a></li>
                                <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('nol2', '/ATS/noliktava2?ats=2')">
                                    <i class="bi bi-box me-2"></i>Noliktava 2</a></li>
                                <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('nol3', '/ATS/noliktava2?ats=3')">
                                    <i class="bi bi-box me-2"></i>Noliktava 3</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="manufacturing.openWindow('darbs', '/ATS/darbs')">
                                    <i class="bi bi-tools me-2"></i>Darbs: Viss</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="/logout.php">
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

            authLogout(() => {

                // hide UI loader
                hideLoader();

                // reload page
                location.reload();
            });
        });
    }
}