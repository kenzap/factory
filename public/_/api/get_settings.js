import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getSettings = (cb) => {

    // do API query
    fetch(API() + '/api/get-settings/', {
        method: 'post',
        headers: H()
    })
        .then(response => response.json())
        .then(response => {

            // hide UI loader
            hideLoader();

            if (response.success) cb(response);

            if (!response.success) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
}