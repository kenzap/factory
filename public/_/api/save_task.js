import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const saveTask = (data, cb) => {
    fetch(API() + '/api/save-task/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(response => {
            hideLoader();
            if (response.success) cb(response);
            if (!response.success) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
};
