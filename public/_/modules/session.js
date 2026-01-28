import { authRefresh } from "../api/auth_refresh.js";

/**
 * Class representing the Session module.
 * Manages accessToken and user session.
 * 
 * @class Session
 * @export
 */
export class Session {

    constructor() {

        // check if header is already present
        this.init();

        // console.log("Session initialized");
    }

    init = () => {

        if (window.session) return;

        window.session = setInterval(() => {

            authRefresh(response => {

                if (response.accessToken) localStorage.setItem('token', response.accessToken);

                console.log("Session refreshed:", response.accessToken);
            });

        }, 1000 * 60 * 1); // every 10 minutes
    }
}