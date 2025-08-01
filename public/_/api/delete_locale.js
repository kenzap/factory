import { API, H, parseApiError } from "../helpers/global.js";

/**
 * Remove locale by ID.
 * 
 * @function apiRemoveLocale
 * @param {Function} c - Callback function toexport const apiGetEventById
 */
export const deleteLocale = (id, c) => {

    fetch(API() + '/api/delete-locale/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ id })
    })
        .then(response => response.json())
        .then(response => c(response))
        .catch(error => { parseApiError(error); });
}