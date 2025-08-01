import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const saveLocale = (_id, data, cb) => {

    // do API query
    fetch(API() + '/api/save-locale/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            _id,
            data
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