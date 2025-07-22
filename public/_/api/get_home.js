import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getHome = (cb) => {

    // do API query
    fetch(API() + '/api/home/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {
                // user: {
                //     type: 'authenticate',
                //     fields: ['avatar'],
                //     token: getCookie('kenzap_token')
                // },
                // locale: {
                //     type: 'locale',
                //     source: ['extension'],
                //     key: 'sk',
                // },
                // settings: {
                //     type: 'get',
                //     key: '3dfactory-settings',
                //     fields: '*',
                // }
            }
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