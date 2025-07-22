import { HTMLContent } from "/_/_cnt_settings.js";
import { hideLoader } from '/_/k-cloud/index.js';

// export function renderSettingsPage() {
//     const app = document.getElementById('app');
//     app.innerHTML = `
//     <h1>Settings</h1>
//     <p>This is your settings page.</p>
//   `;
// }

// import { HTMLContent } from "../_/_cnt_settings.js";

/**
 * Settings page of the dashboard.
 * Loads HTMLContent from _cnt_settings.js file.
 * Renders settings options in tabbed view.
 * 
 * @version 1.0
 */
class Settings {

    constructor() {
        this.state = {
            firstLoad: true,
            response: null,
            settings: null,
            editors: {},
            limit: 10, // number of records to load per table
        }
        this.init();
    }
    init() {

        // document.querySelector('#app').innerHTML = HTMLContent();

        document.querySelector('#app').innerHTML = "brilliant";

        document.querySelector('#app').innerHTML = HTMLContent();

        hideLoader();

        // console.log("Settings page initialized");
    }
}

new Settings();