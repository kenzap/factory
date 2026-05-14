import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getOrderEltEstimate = (filters, cb) => {
    const request = fetch(API() + '/api/get-order-elt-estimate/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ filters })
    })
        .then(response => response.json())
        .then(response => {
            hideLoader();
            if (!response.success) {
                parseApiError(response);
                return response;
            }

            if (typeof cb === 'function') cb(response);
            return response;
        })
        .catch(error => {
            parseApiError(error);
            throw error;
        });

    return request;
};
