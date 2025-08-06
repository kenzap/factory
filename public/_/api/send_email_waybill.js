import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const sendEmailWaybill = (data, cb) => {

    // do API query
    fetch(`${API()}/document/waybill/?id=${data.id}&email=${data.email}`, {
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