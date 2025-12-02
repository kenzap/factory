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
        .catch(error => {

            console.log('Error validating OTP:', error);

            cb({ success: false, error: 'error getting otp' });

            parseApiError(error);
        });
}