import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const validateOTP = (email_or_phone, otp, nonce, cb) => {

    // do API query
    fetch(API() + '/api/auth/validate-otp', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            email_or_phone: email_or_phone,
            otp: otp,
            nonce: nonce
        })
    })
        .then(response => response.json())
        .then(response => {

            // hide UI loader
            hideLoader();

            if (response) cb(response);

            if (!response) parseApiError(response);
        })
        .catch(error => {

            console.log('Error validating OTP:', error);

            cb({ success: false, error: 'error validating otp' });

            parseApiError(error);
        });
}