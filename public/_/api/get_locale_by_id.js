import { API, H, parseApiError } from "../helpers/global.js";

/**
 * Retrieves locale translations.
 * 
 * @function getLocaleById
 * @param {Function} c - Callback function
 */
export const getLocaleById = (id, c) => {

    fetch(API() + '/api/get-locale-by-id/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ id })
    })
        .then(response => response.json())
        .then(response => c(response))
        .catch(error => { parseApiError(error); });
}