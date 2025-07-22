import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getOTP = (email, cb) => {

    // do API query
    fetch(API() + '/api/auth/get-otp', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            email: email
        })
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