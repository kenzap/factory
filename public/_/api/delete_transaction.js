import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const deleteTransaction = (data, cb) => {

    // do API query
    fetch(API() + '/api/delete-transaction/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ data })
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