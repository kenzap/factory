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
async function getClients() {

    const client = getDbConnection();

    let clients = {};

    // Get clients 
    // const query = `
    //     SELECT DISTINCT COALESCE(js->'data'->>'name', '') as name
    //     FROM data 
    //     WHERE ref = $1 AND sid = $2 AND js->'data'->>'name' IS NOT NULL AND js->'data'->>'name' != ''
    //     ORDER BY name ASC
    //     LIMIT 1000
    //     `;

    // Get clients 
    const query = `
        SELECT COALESCE(js->'data'->>'name', '') as name, _id
        FROM data 
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'name' IS NOT NULL AND js->'data'->>'name' != ''
        ORDER BY name ASC
        LIMIT 1000
        `;

    try {

        await client.connect();

        const result = await client.query(query, ['3dfactory-entity', sid]);

        clients = result.rows;

    } finally {
        await client.end();
    }

    return clients;
}

// API route
function getClientsApi(app) {

    app.post('/api/get-clients/', authenticateToken, async (req, res) => {
        try {

            const clients = await getClients();

            res.send({ success: true, clients, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getClientsApi;