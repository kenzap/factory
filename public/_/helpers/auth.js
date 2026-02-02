import { authLogout } from "../api/auth_logout.js";
import { hideLoader } from "./global.js";

export const signOut = () => {

    authLogout(() => {

        // hide UI loader
        hideLoader();

        // reload page
        location.reload();
    });
}