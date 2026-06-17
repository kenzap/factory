const LOCAL_NESTING_API = 'http://127.0.0.1:3100';
const PUBLIC_NESTING_API = 'https://disband-enamel-cascade.ngrok-free.dev';

const normalizeBaseUrl = (input) => String(input || '').trim().replace(/\/+$/, '');
const normalizeFolderPath = (input) => String(input || '').trim();
const normalizeToken = (input) => String(input || '').trim();

export const getNestingApiBaseUrl = (settings = null) => {
    if (typeof window === 'undefined') return LOCAL_NESTING_API;

    const configured = normalizeBaseUrl(
        settings?.['nesting:NESTING_API_URL']
        || settings?.nesting?.NESTING_API_URL
        || 
        window.localStorage?.getItem('nesting_api_url')
        || window.NESTING_API_URL
        || ''
    );
    if (configured) return configured;

    const host = String(window.location.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
        return LOCAL_NESTING_API;
    }

    return PUBLIC_NESTING_API;
}

export const getSketchOrdersBasePath = (settings = null) => {
    const configured = normalizeFolderPath(
        settings?.['nesting:SKETCH_ORDERS_PATH']
        || settings?.nesting?.SKETCH_ORDERS_PATH
        || ''
    );

    return configured || '/Users/pavel/Desktop/Cutting/Pasutijumi/';
}

const buildNestingApiHeaders = (baseUrl, settings = null, { withJsonBody = false } = {}) => {
    const headers = {
        'Accept': 'application/json'
    };

    if (withJsonBody) {
        headers['Content-Type'] = 'application/json';
    }

    if (String(baseUrl || '').includes('.ngrok-free.dev')) {
        headers['ngrok-skip-browser-warning'] = 'true';
    }

    const bearerToken = normalizeToken(
        settings?.['nesting:NESTING_API_BEARER_TOKEN']
        || settings?.nesting?.NESTING_API_BEARER_TOKEN
        || ''
    );
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    return headers;
}

const parseJsonResponse = async (response, { allowJobPayload = false } = {}) => {
    const data = await response.json().catch(() => null);
    if (!response.ok || (data?.error && !(allowJobPayload && data?.job))) {
        throw new Error(data?.description || `Nesting API request failed (${response.status})`);
    }
    return data;
}

export const createNestingJob = async (payload, settings = null) => {
    const baseUrl = getNestingApiBaseUrl(settings);
    const response = await fetch(`${baseUrl}/jobs`, {
        method: 'POST',
        headers: buildNestingApiHeaders(baseUrl, settings, { withJsonBody: true }),
        body: JSON.stringify(payload)
    });

    return parseJsonResponse(response);
}

export const stopNestingJob = async (jobId, settings = null) => {
    const baseUrl = getNestingApiBaseUrl(settings);
    const response = await fetch(`${baseUrl}/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: buildNestingApiHeaders(baseUrl, settings)
    });

    return parseJsonResponse(response);
}

export const exportNestingJob = async (jobId, settings = null) => {
    const baseUrl = getNestingApiBaseUrl(settings);
    const response = await fetch(`${baseUrl}/jobs/${encodeURIComponent(jobId)}/export`, {
        method: 'POST',
        headers: buildNestingApiHeaders(baseUrl, settings, { withJsonBody: true }),
        body: JSON.stringify({})
    });

    const data = await parseJsonResponse(response, { allowJobPayload: true });
    return data.job || null;
}

export const getNestingJob = async (jobId, settings = null) => {
    const baseUrl = getNestingApiBaseUrl(settings);
    const response = await fetch(`${baseUrl}/jobs/${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: buildNestingApiHeaders(baseUrl, settings)
    });

    const data = await parseJsonResponse(response, { allowJobPayload: true });
    return data.job || null;
}
