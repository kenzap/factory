import { authLogout } from "../api/auth_logout.js";
import { __html, hideLoader, onClick } from "../helpers/global.js";


/**
 * Unauthorized access page component that displays an access denied message
 * and provides navigation options for unauthorized users.
 * 
 * @class Unauthorized
 * @description Renders an unauthorized access page with error message, graphics,
 * and action buttons for home navigation and logout functionality.
 */
export class Unauthorized {

    constructor() {

        this.init();
        this.listeners();
    }

    init = () => {
        document.querySelector('#app').innerHTML = `
            <div class="content hentry offset-top mt-12 mb-12 pt-md-4">
            <div class="container">
                <div class="unauthorized-container text-center entry-content">
                <h1 class="mb-4">${__html("Access Denied")}</h1>
                <p class="mb-4">${__html("You are not authorized to view this content")}</p>
                <div class="unauthorized-graphics mb-4">
                    <img width="300" height="300" src="/assets/img/undraw_access_denied.svg">
                </div>
                <div class="mx-5">
                    <a href="/home/" class="btn btn-branded btn-lg w-100 mb-3">${__html("Home")}</a>
                    <a href="/logout/" class="btn btn-outline-secondary btn-lg w-100 sign-out">${__html("Log out")}</a>
                </div>
                <p class="mt-4">${__html("Need help?")} <a href="https://skarda.design/lv/kontakti">${__html("Contact Support")}</a></p>
                </div>
            </div>
            </div>
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

/**
 * Checks if a user is authorized to access manufacturing journal functionality.
 * 
 * @param {Object} response - The response object containing user information
 * @param {Object} response.user - The user object
 * @param {Array<string>} response.user.rights - Array of user rights/permissions
 * @returns {boolean} Returns true if user has manufacturing journal permissions, false otherwise
 * @throws {Unauthorized} Throws Unauthorized error when user lacks required permissions
 */
export const isAuthorized = (response, right) => {

    if (!response?.user?.rights?.includes(right)) {
        new Unauthorized();
        return false;
    }

    return true;
}