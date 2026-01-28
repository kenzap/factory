import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const sendEmailDocument = (data, cb) => {

    // do API query
    fetch(`${API()}/document/${data.type}/?id=${data.id}&email=${data.email}`, {
        method: 'get',
        headers: H()
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