import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getMetalLog = (filters, cb) => {

    // do API query
    fetch(API() + '/api/get-metal-log/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            filters
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