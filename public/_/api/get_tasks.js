import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getTasks = (filters, cb) => {
    fetch(API() + '/api/get-tasks/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ filters })
    })
        .then(response => response.json())
        .then(response => {
            hideLoader();
            if (response.success) cb(response);
            if (!response.success) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
};
