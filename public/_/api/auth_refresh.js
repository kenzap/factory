import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const authRefresh = (cb) => {

    // do API query
    fetch(API() + '/api/auth/refresh', {
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