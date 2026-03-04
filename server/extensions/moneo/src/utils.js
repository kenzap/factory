/**
 * Makes an authenticated request to the Moneo API
 * @async
 * @param {string} endpoint - The API endpoint path (e.g., '/api/v1/resource')
 * @param {Object} config - Configuration object with get() method
 * @param {string} config.MONEO_API_BASE - Base URL for the Moneo API
 * @param {string} config.MONEO_AUTH_TOKEN - Authentication token for Moneo API
 * @param {string} config.COMPANY_UID - Company UID for Moneo API
 * @param {Object} payload - Request payload to send to the API
 * @returns {Promise<Object>} Parsed JSON response from the API
 * @throws {Error} When required config values are missing (MONEO_API_BASE, MONEO_AUTH_TOKEN, COMPANY_UID)
 * @throws {Error} When the API response status is not ok (response.ok === false)
 */
export const makeMoneoRequest = async (endpoint, config, payload) => {

    if (!config.get("MONEO_API_BASE") || !config.get("MONEO_AUTH_TOKEN") || !config.get("COMPANY_UID")) {
        throw new Error('Missing Moneo config. Ensure MONEO_API_BASE, MONEO_AUTH_TOKEN and COMPANY_UID are set.');
    }

    const url = `${config.get("MONEO_API_BASE").replace(/\/$/, '')}${endpoint}`;

    // console.log(`[moneo] TLS mode insecure=${insecureTls} servername=${tlsServername || '(default)'} timeoutMs=${requestTimeoutMs}`);
    console.log(`Making Moneo API request to ${url} with payload:`);
    console.log(JSON.stringify(payload, null, 2));

    const headers = {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*/*'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseJson = {};

    console.log(`Received response with status ${response.status}:`, responseText);

    try {
        responseJson = responseText ? JSON.parse(responseText) : {};
    } catch (_err) {
        responseJson = { raw: responseText };
    }

    if (!response.ok) {
        throw new Error(`Moneo API error ${response.status}: ${responseText}`);
    }

    return responseJson;
}

/**
 * Rounds a number to two decimal places and returns it as a string with exactly two decimal places.
 * 
 * @param {number|string} num - The number to round. Can be a number or a string representation of a number.
 * @returns {string} The rounded number as a string with exactly two decimal places (e.g., "3.14", "5.00").
 * 
 * @example
 * roundToTwoDecimals(3.14159) // returns "3.14"
 * roundToTwoDecimals("2.567") // returns "2.57"
 * roundToTwoDecimals(5) // returns "5.00"
 */
export const roundToTwoDecimals = (num) => {

    return (Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * Converts a date input to a formatted date string in YYYY-MM-DD format.
 * 
 * @param {string|number|Date} date - The date to convert. Can be a Date object, timestamp, or date string.
 * @returns {string} A formatted date string in YYYY-MM-DD format, or '0000-00-00' if the input is invalid.
 * 
 * @example
 * convertToDateString('2023-12-25') // Returns '2023-12-25'
 * convertToDateString(new Date(2023, 11, 25)) // Returns '2023-12-25'
 * convertToDateString('invalid') // Returns '0000-00-00'
 */
export const convertToDateString = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return '0000-00-00';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}