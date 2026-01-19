import { getDbConnection, sid } from './index.js';

let settingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Retrieves application settings from the database with caching support.
 * 
 * @async
 * @function getSettings
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache and fetches fresh data from database
 * @returns {Promise<Object>} A promise that resolves to the settings object containing application configuration
 * @throws {Error} Database connection or query errors
 * 
 * @description
 * This function implements a caching mechanism to reduce database calls. It will return cached settings
 * if they exist and haven't exceeded the cache duration, unless forceRefresh is set to true.
 * The settings are stored in the database as JSON data and retrieved using the 'settings' reference
 * and current session ID (sid).
 * 
 * @example
 * // Get cached settings (if available)
 * const settings = await getSettings();
 * 
 * @example
 * // Force refresh from database
 * const freshSettings = await getSettings(true);
 */
export async function getSettings(forceRefresh = false) {
    const now = Date.now();

    // Return cached settings if they exist and are still valid
    if (!forceRefresh && settingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {

        // console.log('Settings cached');
        return settingsCache;
    }

    let storedSettings = {};

    // get database connection
    const db = getDbConnection();

    // settings query
    const query = `
        SELECT js->'data' AS data
        FROM data 
        WHERE ref = $1 AND sid = $2 
        LIMIT 1
    `;

    try {
        await db.connect();

        const result = await db.query(query, ['settings', sid]);
        if (result.rows.length > 0) {
            // get settings from the first row
            const row = result.rows[0];
            storedSettings = row.data ? row.data : {};
        }
    } finally {
        await db.end();
    }

    // Update cache
    settingsCache = storedSettings;
    cacheTimestamp = now;

    return storedSettings;
}

/**
 * Clears the settings cache by resetting both the cache data and timestamp to null.
 * This function invalidates the current cached settings, forcing a fresh reload
 * on the next settings request.
 */
export function clearSettingsCache() {
    settingsCache = null;
    cacheTimestamp = null;
}