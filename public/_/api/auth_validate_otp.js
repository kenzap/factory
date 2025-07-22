import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const validateOTP = (email, otp, nonce, cb) => {

    // do API query
    fetch(API() + '/api/auth/validate-otp', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            email: email,
            otp: otp,
            nonce: nonce
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