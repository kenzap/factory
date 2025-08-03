import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const execOrderItemAction = (actions, cb) => {

    // do API query
    fetch(API() + '/api/exec-order-item-action/', {
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