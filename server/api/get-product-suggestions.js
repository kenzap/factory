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

    // console.log('getProductSuggestions filters:', filters.s);

    const client = getDbConnection();

    let records = {};

    // Get records  '_id', 'id', 'img', 'status', 'cad_files', 'price', 'priority', 'title', 'sdesc', 'updated'
    let query = `
            SELECT
                _id,
                js->'data'->'locales'->$3->>'title' as title,
                js->'data'->'locales'->$3->>'sdesc' as sdesc,
                js->'data'->'formula_width' as formula_width,
                js->'data'->'formula_length' as formula_length,
                js->'data'->'formula_price' as formula_price,
                js->'data'->'formula' as formula,
                js->'data'->'var_price' as var_price,
                js->'data'->'input_fields' as input_fields,
                js->'data'->'calc_price' as calc_price,
                js->'data'->'cad_files' as cad_files,
                js->'data'->'priority' as priority,
                js->'data'->'group' as group,
                js->'data'->'tax_id' as tax_id
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'status' != '0'
        `;

    let params = ['product', sid, locale];

    if (filters.s && filters.s.trim() !== '') {
        const keywords = filters.s.trim().split(/\s+/);
        const conditions = keywords.map((_, index) => {
            params.push(`%${keywords[index]}%`);
            return `unaccent(js->'data'->'locales'->$3->>'title') ILIKE unaccent($${params.length})`;
        });
        query += ` AND (${conditions.join(' AND ')})`;
    }

    query += `
            ORDER BY 
                CASE 
                    WHEN js->'data'->>'priority' = '' OR js->'data'->>'priority' IS NULL THEN 1000000 
                    ELSE CAST(js->'data'->>'priority' AS INTEGER)
                END ASC
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

        const startTime = Date.now();

        try {

            const suggestions = await getProductSuggestions(req.body.filters);

            const processingTime = Date.now() - startTime;

            res.send({ success: true, suggestions, message: '', now: Date.now(), processingTime });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting ${locale} records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductSuggestionsApi;