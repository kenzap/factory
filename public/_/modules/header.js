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
            <nav id="header" class="navbar navbar-expand-md navbar-light fixed-top bg-white shadow-sm">
                <div class="container">
                    <div class="d-flex align-items-center">
                        <a class="navbar-brand nav-back d-flex align-items-center me-sm-2 me-1" href="/home/">
                            <img style="max-height: 23px;" src="${this.response.settings ? this.response.settings.logo || "https://cdn.kenzap.com/logo.svg" : "https://cdn.kenzap.com/logo.svg"}" alt="Kenzap Factory Logo">
                        </a>
                    </div>
                    <div class="d-flex flex-column align-items-end" id="navbarCollapse">
                        <ul class="navbar-nav me-auto mb-0 mb-md-0">
                            <li class="nav-item dropdown">
                                <a id="nav-account" class="" href="https://account.kenzap.com/profile/" data-bs-toggle="dropdown" aria-expanded="false"><img src="https://account.kenzap.com/images/default_avatar.jpg" style="height:40px;width:40px;border-radius:50%;" alt="profile"></a>
                                <ul class="dropdown-menu dropdown-menu-end pe-auto" data-popper-placement="left-start" aria-labelledby="nav-account" style="position: absolute;">
                                    <li><a class="dropdown-item" href="/home/">${__html('Dashboard')}</a></li>
                                    <li><a class="dropdown-item" href="/profile/">${__html('My profile')}</a></li>
                                    <li><a class="dropdown-item choose-lang" href="#">${__html('Language')}</a></li>
                                    <li><a class="dropdown-item sign-out" href="#">${__html('Sign out')}</a></li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
                <div id="klang" class="lang-holder two d-none" style="display:inline-block;">
                    <div class="lang-drop one">
                        <a href="javascript:void(0);" class="lang-c bt lang-close language-close"></a>
                        <h2>${__html('Choose Language')}</h2>
                        <ul class="lang-post">
                            <li data-lp="es"><a chref="#">Español</a></li>
                            <li data-lp="da"><a href="#">Dansk</a></li>
                            <li data-lp="vn"><a href="#">Tiếng Việt</a></li>
                            <li data-lp="en"><a href="#">English</a></li>
                            <li data-lp="de"><a href="#">Deutsch</a></li>
                            <li data-lp="pl"><a href="#">Polski</a></li>
                            <li data-lp="he"><a href="#">Ελληνικά</a></li>
                            <li data-lp="fr"><a href="#">Français</a></li>
                            <li data-lp="zh"><a href="#">简体中文</a></li>
                            <li data-lp="th"><a href="#">हिंदी</a></li>
                            <li data-lp="fi"><a href="#">Suomi</a></li>
                            <li data-lp="ru"><a href="#">Русский</a></li>
                            <li data-lp="nl"><a href="#">Nederlands</a></li>
                            <li data-lp="id"><a href="#">Bahasa Indonesia</a></li>
                            <li data-lp="se"><a href="#">Svenska</a></li>
                            <li data-lp="uk"><a href="#">Українська</a></li>
                            <li data-lp="pt"><a href="#">Português</a></li>
                            <li data-lp="it"><a href="#">Italiano</a></li>
                            <li data-lp="tr"><a href="#">Türkçe</a></li>
                            <li data-lp="jp"><a href="#">繁體中文</a></li>
                            <li data-lp="et"><a href="#">Eesti</a></li>
                            <li data-lp="lv"><a href="#">Latviešu</a></li>
                            <li data-lp="lt"><a href="#">Lietuvių</a></li>
                            <li data-lp="af"><a href="#">Afrikaans</a></li>
                            <li data-lp="fl"><a href="#">Filipino</a></li>
                            <li data-lp="no"><a href="#">Bokmål</a></li>
                            <li data-lp="sv"><a href="#">Svenska</a></li>
                            <li data-lp="hu"><a href="#">Magyar</a></li>
                            <li data-lp="ms"><a href="#">Melayu</a></li>
                            <li data-lp="hi"><a href="#">हिन्दी</a></li>
                            <li data-lp="mr"><a href="#">मराठी</a></li>
                            <li data-lp="ko"><a href="#">한국인</a></li>
                            <li data-lp="jw"><a href="#">Basa jawa</a></li>
                        </ul>
                        <div class="selected-country"></div>
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