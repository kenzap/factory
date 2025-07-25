import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

/**
 * Get Contacts
 *
 * List contacts
 *
 * @version 1.0
 * @param {string} id - entity ID of the contact
 * @returns {Array<Object>} - Array of clients
*/
async function getContacts(id) {

    const client = getDbConnection();

    let records = {};

    // Query 
    const query = `
        SELECT js->'data'->'contacts' as contacts, _id
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        LIMIT 1
        `;

    try {

        await client.connect();

        const result = await client.query(query, ['3dfactory-entity', sid, id]);

        records = result.rows;

    } finally {
        await client.end();
    }

    return records[0]?.contacts || [];
}

// API route
function getContactsApi(app) {

    app.post('/api/get-contacts/', authenticateToken, async (req, res) => {
        try {

            const contacts = await getContacts(req.body.id);

            res.send({ success: true, contacts, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getContactsApi;