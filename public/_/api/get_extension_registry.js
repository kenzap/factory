import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getExtensionRegistry = (cb) => {

    fetch(API() + '/api/get-extension-registry/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({})
    })
        .then(response => response.json())
        .then(response => {
            hideLoader();

            if (response.success) cb(response);
            if (!response.success) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
};
