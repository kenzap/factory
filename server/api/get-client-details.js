import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

/**
 * Get Clients
 *
 * List clients
 *
 * @version 1.0
 * @param {string} id - entity ID of the client
 * @returns {Array<Object>} - Array of clients
*/
async function getClientDetails(id) {

    const client = getDbConnection();

    let data = {};

    // Querry 
    const query = `
        SELECT 
            _id,
            js->'data'->>'name' as name,
            js->'data'->>'email' as email,
            js->'data'->>'type' as "type",
            js->'data'->>'entity' as entity,
            js->'data'->>'fname' as "fname",
            js->'data'->>'lname' as "lname",
            js->'data'->>'legal_name' as "legal_name",
            js->'data'->>'bank_name' as "bank_name",
            js->'data'->>'bank_acc' as "bank_acc",
            js->'data'->>'reg_address' as "reg_address",
            js->'data'->>'reg_number' as "reg_number",
            js->'data'->>'reg_num' as reg_num,
            js->'data'->>'vat_number' as "vat_number",
            js->'data'->>'vat_status' as "vat_status",
            js->'data'->>'notes' as "notes",
            js->'data'->>'phone' as phone,
            js->'data'->'contacts' as contacts,
            js->'data'->'drivers' as drivers,
            js->'data'->'addresses' as addresses,
            js->'data'->'discounts' as discounts
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['entity', sid, id]);

        if (result.rows) data = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return data;
}

// API route
function getClientDetailsApi(app) {

    app.post('/api/get-client-details/', authenticateToken, async (req, res) => {
        try {
            const data = await getClientDetails(req.body.id);

            console.log('getClientDetailsApi data', data);

            res.send({ success: true, data, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getClientDetailsApi;