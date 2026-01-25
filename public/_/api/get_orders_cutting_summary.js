import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getOrdersCuttingSummary = (filters, cb) => {

    // do API query
    fetch(API() + '/api/get-orders-cutting-summary/', {
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