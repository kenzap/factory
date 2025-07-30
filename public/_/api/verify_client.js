import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const verifyClient = (reg_number, cb) => {

    // do API query
    fetch(API() + '/api/verify-client/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            reg_number
        })
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