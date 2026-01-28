import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getCoatings = (cb) => {

    // do API query
    fetch(API() + '/api/get-coatings/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {}
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