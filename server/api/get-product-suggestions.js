import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, locale, log, sid } from '../_/helpers/index.js';



/**
 * Get Product Suggestions.
 * Called from order edit page
 *
 * @version 1.0
 * @param {Object} filters - Search string, color, coating, etc.
 * @returns {Array<Object>} - Array of clients
*/
async function getProductSuggestions(filters) {

    console.log('getProductSuggestions filters:', filters.s);

    const client = getDbConnection();

    let records = {};

    // Get records 
    let query = `
            SELECT 
                js->'data'->'locales'->$3->>'title' as title,
                js->'data'->'locales'->$3->>'sdesc' as sdesc
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'status' != '0'
        `;

    let params = ['ecommerce-product', sid, locale];

    if (filters.s && filters.s.trim() !== '') {
        query += ` AND unaccent(js->'data'->'locales'->$3->>'title') ILIKE unaccent($4)`;
        params.push(`%${filters.s}%`);
    }

    query += `
            ORDER BY js->'data'->'priority' ASC
            LIMIT 50`;

    // ORDER BY name ASC
    try {

        await client.connect();

        const result = await client.query(query, params);

        records = result.rows;

    } finally {
        await client.end();
    }

    return records;
}

// API route
function getProductSuggestionsApi(app) {

    app.post('/api/get-product-suggestions/', authenticateToken, async (req, res) => {
        try {

            const suggestions = await getProductSuggestions(req.body.filters);

            res.send({ success: true, suggestions, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting ${locale} records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductSuggestionsApi;