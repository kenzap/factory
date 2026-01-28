import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const execWriteoffAction = (actions, cb) => {

    // do API query
    fetch(API() + '/api/exec-writeoff-action/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify(actions)
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