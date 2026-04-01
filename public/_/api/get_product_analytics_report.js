import { API, H, hideLoader, parseApiError } from "../helpers/global.js";

export const getProductAnalyticsReport = (filters, cb) => {
    fetch(API() + '/api/get-product-analytics-report/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ filters })
    })
        .then(response => response.json())
        .then(response => {
            hideLoader();
            if (response.success) cb(response);
            if (!response.success) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
};

export const getProductAnalyticsDetail = (filters, cb) => {
    fetch(API() + '/api/get-product-analytics-detail/', {
        method: 'post',
        headers: H(),
        body: JSON.stringify({ filters })
    })
        .then(response => response.json())
        .then(response => {
            hideLoader();
            if (response.success) cb(response);
            if (!response.success) parseApiError(response);
        })
        .catch(error => { parseApiError(error); });
};
