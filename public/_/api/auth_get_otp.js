import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getOTP = (email_or_phone, cb) => {

    // do API query
    fetch(API() + '/api/auth/get-otp', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            email_or_phone: email_or_phone
        })
    })
        .then(response => response.json())
        .then(response => {

            // hide UI loader
            hideLoader();

            if (response) cb(response);

            if (!response) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
}