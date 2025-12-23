import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete locale by id
 * 
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteLocale(id) {

    const client = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['locale', sid, id];

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
function deleteLocaleApi(app) {

    app.post('/api/delete-locale/', authenticateToken, async (_req, res) => {

        console.log('/api/delete-locale/ ', _req.body);

        const response = await deleteLocale(_req.body.id);

        res.json({ success: true, response });
    });
}

export default deleteLocaleApi;