import { H, getAPI, getCookie, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getSettings = (cb) => {

    // do API query
    fetch(getAPI(), {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {
                user: {
                    type: 'authenticate',
                    fields: ['avatar'],
                    token: getCookie('kenzap_token')
                },
                locale: {
                    type: 'locale',
                    source: ['extension'],
                    key: 'sk',
                },
                settings: {
                    type: 'get',
                    key: '3dfactory-settings',
                    fields: '*',
                }
            }
        })
    })
        .then(response => response.json())
        .then(response => {

            // hide UI loader
            hideLoader();

            if (response.success) {

                cb(response);

            } else {

                parseApiError(response);
            }
        })
        .catch(error => { parseApiError(error); });
}