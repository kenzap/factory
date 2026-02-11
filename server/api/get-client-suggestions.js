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

    const client = getDbConnection();

    let clients = {};

    let query = `
    SELECT 
        COALESCE(d.js->'data'->>'legal_name', '') as name, 
        COALESCE(d.js->'data'->>'fname', '') as fname, 
        COALESCE(d.js->'data'->>'lname', '') as lname, 
        COALESCE(d.js->'data'->>'entity', '') as entity, 
        COALESCE(d.js->'data'->>'reg_address', '') as address, 
        d._id,
        COALESCE(order_counts.order_count, 0) as order_count
    FROM data d
    LEFT JOIN (
        SELECT 
            js->'data'->>'eid' as eid,
            COUNT(*) as order_count
        FROM data 
        WHERE ref = 'order' 
            AND sid = $2 
            AND (js->'data'->>'date')::timestamp >= NOW() - INTERVAL '1 year'
        GROUP BY js->'data'->>'eid'
    ) order_counts ON d._id = order_counts.eid
    WHERE d.ref = $1 
        AND d.sid = $2 
        AND d.js->'data'->>'legal_name' IS NOT NULL 
        AND d.js->'data'->>'legal_name' != ''`;

    let params = ['entity', sid];

    try {

        await client.connect();

        if (filters.s && filters.s.trim() !== '') {

            // console.log('Search string:', filters.s);

            query += ` AND unaccent(js->'data'->>'legal_name') ILIKE unaccent($3)`;
            params.push(`%${filters.s}%`);
        }

        // ORDER BY name
        query += `
            ORDER BY order_count DESC, js->'data'->'legal_name' ASC
            LIMIT 50`;

        const result = await client.query(query, params);

        clients = result.rows;

    } finally {
        await client.end();
    }

    return clients;
}

// API route
function getClientSuggestionsApi(app) {

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