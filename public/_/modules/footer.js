import { __html } from "/_/helpers/global.js";

export class Footer {

    constructor(response) {

        this.response = response;

        // check if header is already present
        this.init();
    }

    init = () => {

        // Check if footer already exists
        if (!document.querySelector("footer")) {
            // Try to find app container
            let appContainer = document.querySelector("#app");

            // If app container exists, insert footer after it
            if (!appContainer) return;

            appContainer.insertAdjacentHTML('afterend', `
                <footer class="container bg-light mt-5 mb-5">
                    <div class="row">
                        <div class="d-sm-flex justify-content-center justify-content-sm-between">
                            <span class="text-muted text-center text-sm-left d-block d-sm-inline-block">${__html('%1$Kenzap Factory%2$ 3.0.0. ❤️ Licensed %3$GPLv3%4$.', '<a class="text-muted" href="https://factory.kenzap.cloud/" target="_blank">', '</a>', '<a class="text-muted" href="https://github.com/kenzap/events" target="_blank">', '</a>')}</span>
                            <span class="float-none float-sm-right d-block mt-1 mt-sm-0 text-center text-muted"></span>
                        </div>
                    </div>
                </footer>
            `);
        }
    }
}

