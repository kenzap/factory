import { authenticateToken, getUserById } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';


/**
 * Deletes an API token from the database
 * @async
 * @function deleteToken
 * @param {Object} data - The data object containing token information
 * @param {string} data.id - The unique identifier of the token to delete
 * @returns {Promise<Array|Object>} Returns array of deleted rows on success, or error object on failure
 * @throws {Error} Database connection or query errors
 * @example
 * const result = await deleteToken({ id: 'token123' });
 */
async function deleteToken(data) {

    const db = getDbConnection();

    if (!data || !data.id) return { success: false, error: 'no data provided' };

    let response = null;

    // Delete token
    let query = `
        DELETE FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id`;

    const params = ['api-key', sid, data.id];

    try {

        await db.connect();

        const result = await db.query(query, params);

        response = result.rows;

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function deleteTokenApi(app) {

    app.post('/api/delete-token/', authenticateToken, async (_req, res) => {

        const user = await getUserById(_req.user.id);

        // Check if user has manage_api_keys permission
        if (!user.rights || !user.rights.includes('manage_api_keys')) {
            return res.status(401).json({ error: 'Unauthorized: manage_api_keys permission required' });
        }

        const data = _req.body;
        const response = await deleteToken(data);

        res.json({ success: true, token: response.token, permission: response.permission, name: response.name });
    });
}

export default deleteTokenApi;