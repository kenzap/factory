import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getClientSuggestions = (cb) => {

    // do API query
    fetch(API() + '/api/get-client-suggestions/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {

            }
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