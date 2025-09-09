import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

/**
 * Kenzap Factory Get Clients
 *
 * List clients
 *
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Array of clients
*/
async function getClientSuggestions(filters) {

    console.log('filters', filters);

    const client = getDbConnection();

    let clients = {};

    // Get clients 
    let query = `
        SELECT COALESCE(js->'data'->>'legal_name', '') as name, COALESCE(js->'data'->>'reg_address', '') as address, _id
        FROM data 
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'legal_name' IS NOT NULL AND js->'data'->>'legal_name' != ''
        `;

    let params = ['3dfactory-entity', sid];

    try {

        await client.connect();

        if (filters.s && filters.s.trim() !== '') {

            console.log('Search string:', filters.s);

            query += ` AND unaccent(js->'data'->>'legal_name') ILIKE unaccent($3)`;
            params.push(`%${filters.s}%`);
        }

        // ORDER BY name
        query += `
            ORDER BY js->'data'->'legal_name' ASC
            LIMIT 100`;

        const result = await client.query(query, params);

        clients = result.rows;

    } finally {
        await client.end();
    }

    return clients;
}

// API route
function getClientSuggestionsApi(app) {

    console.log('getClientSuggestionsApi loaded');

    app.post('/api/get-client-suggestions/', authenticateToken, async (req, res) => {
        try {

            const clients = await getClientSuggestions(req.body.filters);

            res.send({ success: true, clients, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getClientSuggestionsApi;