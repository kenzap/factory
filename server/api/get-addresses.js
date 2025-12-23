import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

/**
 * Get Addresses
 *
 * List addresses
 *
 * @version 1.0
 * @param {string} id - entity ID
 * @returns {Array<Object>} - Array of addresses
*/
async function getAddresses(id) {

    const client = getDbConnection();

    let records = {};

    // Query 
    const query = `
        SELECT js->'data'->'addresses' as addresses, _id
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        LIMIT 1
        `;

    try {

        await client.connect();

        const result = await client.query(query, ['entity', sid, id]);

        records = result.rows;

    } finally {
        await client.end();
    }

    return records[0]?.addresses || [];
}

// API route
function getAddressesApi(app) {

    app.post('/api/get-addresses/', authenticateToken, async (req, res) => {
        try {

            const addresses = await getAddresses(req.body.id);

            res.send({ success: true, addresses, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getAddressesApi;