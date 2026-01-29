import { createClient } from 'redis';
import { getArrayChecksum } from './checksum.js';
import { getDbConnection, sid } from './index.js';

/**
 * Retrieves locale data from cache or database based on provided headers
 * @async
 * @function getLocale
 * @param {Object} headers - Request headers containing locale information
 * @param {string} [headers.locale] - The locale identifier (defaults to process.env.LOCALE or 'en')
 * @param {string} [headers['locale-checksum']] - Client-side checksum for cache validation
 * @returns {Promise<Object>} Response object containing locale values
 * @returns {Object} response.values - Object containing localized strings/content
 * @description 
 * This function implements a caching strategy for locale data:
 * 1. First checks Redis cache using locale and checksum validation
 * 2. If cache miss or checksum mismatch, queries the database
 * 3. Stores the result in Redis cache with 30-day TTL
 * 4. Returns locale data for dashboard extension
 * @throws {Error} Database connection or query errors
 * @example
 * const localeData = await getLocale({ locale: 'es', 'locale-checksum': 'abc123' });
 * console.log(localeData.values); // { "hello": "hola", "goodbye": "adiós" }
 */
export const getLocale = async (headers) => {

    let response = { values: {} };

    let locale = headers?.['locale'] || process.env.LOCALE || 'en'; // Default to 'en' if not set
    let checksum = headers?.['locale-checksum'] || '';

    // clear locale cache
    const key = `locale_values:${sid}:${locale}:dashboard`;
    const checksumKey = `${key}:checksum`;

    const redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();

    let checksum_cached = await redisClient.get(checksumKey);

    // console.log('Locale checksums (client/server):', checksum_cached, checksum);

    // return empty if checksums match
    if (checksum_cached && checksum_cached === checksum) {

        await redisClient.quit();
        return response;
    }

    // if checksums don't match, try to get from cache
    if (checksum_cached && checksum_cached !== checksum) {

        response.values = JSON.parse(await redisClient.get(key)) || {};
    }

    // if not in cache, get from DB
    if (!response.values || Object.keys(response.values).length === 0) {

        const db = getDbConnection();
        await db.connect();

        try {

            // Get locales
            const query = `
                SELECT 
                    js->'data'->'content' as locale
                FROM data 
                WHERE ref = $1 AND sid = $2 AND js->'data'->>'locale' = $3 AND js->'data'->>'ext' = 'dashboard'
                LIMIT 1`;

            const result = await db.query(query, ['locale', sid, locale]);
            if (result.rows.length > 0) {

                response.values = result.rows[0].locale || {};
            }

            // cache locales
            const ttl = 86400 * 30; // 30 days in seconds
            await redisClient.setEx(key, ttl, JSON.stringify(response.values));
            await redisClient.setEx(checksumKey, ttl, getArrayChecksum(response.values));
            await redisClient.quit();

        } finally {
            await db.end();
        }
    }

    return response;
}
