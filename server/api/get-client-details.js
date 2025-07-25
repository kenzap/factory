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
            js->'data'->>'clientType' as "clientType",
            js->'data'->>'entity' as entity,
            js->'data'->>'companyName' as "companyName",
            js->'data'->>'bankName' as "bankName",
            js->'data'->>'bankAccount' as "bankAccount",
            js->'data'->>'regAddress' as "regAddress",
            js->'data'->>'regNumber' as "regNumber",
            js->'data'->>'reg_num' as reg_num,
            js->'data'->>'vatNumber' as "vatNumber",
            js->'data'->>'internalNote' as "internalNote",
            js->'data'->>'phone' as phone,
            js->'data'->'contacts' as contacts,
            js->'data'->'drivers' as drivers,
            js->'data'->'addresses' as addresses
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
    `;

    try {

        await client.connect();

        // const result = await client.query(query, ['ecommerce-order', sid]);
        const result = await client.query(query, ['3dfactory-entity', sid, id]);

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