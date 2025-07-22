import { H, getAPI, parseApiError } from "/_/helpers/global.js";

export const saveSettings = (cb) => {

    // send data
    fetch(getAPI(), {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {
                settings: {
                    type: 'set',
                    key: '3dfactory-settings',
                    data: data
                }
            }
        })
    })
        .then(response => response.json())
        .then(response => {

            if (response.success) {

                cb(response)

            } else {

                parseApiError(response);
            }

        })
        .catch(error => { parseApiError(error); });
}