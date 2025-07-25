import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete client by id
 *
 * List orders
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteClient(id) {

    const client = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['3dfactory-entity', sid, id];

    try {

        await client.connect();

        const result = await client.query(query, params);

        response = result.rows;

    } finally {
        await client.end();
    }

    return response;
}

// API route
function deleteClientApi(app) {

    app.post('/api/delete-client/', authenticateToken, async (_req, res) => {

        console.log('deleteClientApi _req.body', _req.body.id);

        const response = await deleteClient(_req.body.id);

        console.log('deleteClient response', response);

        res.json({ success: true, response, message: 'client saved' });
    });
}

export default deleteClientApi;