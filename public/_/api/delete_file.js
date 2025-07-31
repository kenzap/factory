import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const deleteFile = (id, cb) => {

    // do API query
    fetch(API() + '/api/delete-file/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ id })
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