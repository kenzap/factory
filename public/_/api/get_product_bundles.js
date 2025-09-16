import { API, H, hideLoader, parseApiError } from "/_/helpers/global.js";

export const getProductBundles = (products, cb) => {

    // do API query
    fetch(API() + '/api/get-product-bundles/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            products
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