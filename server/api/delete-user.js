import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete user by id
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteUser(_id) {

    const client = getDbConnection();

    if (!_id) return { success: false, error: 'no id provided' };

    let response = null;

    // Get orders
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['user', sid, _id];

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
function deleteUserApi(app) {

    app.post('/api/delete-user/', authenticateToken, async (_req, res) => {

        const response = await deleteUser(_req.body._id);

        // console.log('deleteClient response', response);

        res.json({ success: true, response });
    });
}

export default deleteUserApi;