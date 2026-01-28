import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getClients = (filters, cb) => {

    // do API query
    fetch(API() + '/api/get-clients/', {
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