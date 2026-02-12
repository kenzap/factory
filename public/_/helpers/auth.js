import { authLogout } from "../api/auth_logout.js";
import { hideLoader } from "./global.js";

export const signOut = (e) => {

    if (e) e.preventDefault();

    authLogout(() => {

        // hide UI loader
        hideLoader();

        // reload page
        location.reload();
    });
}

export const getAuthToken = () => {

    // Get token from localStorage, sessionStorage, or cookie
    return localStorage.getItem('token');
}