import { API, H, hideLoader, parseApiError } from "../../_/helpers/global.js";

export const createWorklogRecord = (data, cb) => {

    // do API query
    fetch(API() + '/api/create-worklog-record/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(response => {

            // hide UI loader
            hideLoader();

            if (typeof cb === 'function') cb(response);
            if (!response.success) parseApiError(response);
        })
        .catch(error => {
            if (typeof cb === 'function') cb({ success: false, error: error?.message || 'Network error' });
            parseApiError(error);
        });
}
