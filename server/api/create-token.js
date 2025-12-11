import { authenticateToken, getUserById } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create API token
 *
 * Creates a new API token with specified permissions and metadata
 *
 * @version 1.0
 * @param {Object} data - Token data containing name, permission, description, and active status
 * @param {string} data.name - Token name
 * @param {string} data.permission - Token permission level
 * @param {string} data.description - Token description
 * @param {boolean} data.active - Token active status
 * @returns {Array<Object>} - Created token data
*/
async function createToken(data) {

    const client = getDbConnection();

    if (!data) return { success: false, error: 'no data provided' };

    // Generate unique token ID and token value
    if (!data._id) data._id = makeId();
    const tokenValue = makeId() + makeId(); // Generate secure token

    let response = null;

    // Insert API token
    let query = `
        INSERT INTO data (_id, pid, ref, sid, js)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (_id)
        DO UPDATE SET
            js = EXCLUDED.js
        RETURNING _id`;

    const tokenData = {
        name: data.name,
        permission: data.permission,
        description: data.description,
        active: data.active,
        created: new Date().toISOString(),
        token: tokenValue
    };

    const params = [
        data._id,
        0,
        'api-key',
        sid,
        JSON.stringify({
            data: tokenData,
            meta: {
                created: Math.floor(Date.now() / 1000),
                updated: Math.floor(Date.now() / 1000)
            }
        })
    ];

    try {

        await client.connect();

        const result = await client.query(query, params);

        response = result.rows.length > 0 ? tokenData : null;

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function createTokenApi(app) {

    app.post('/api/create-token/', authenticateToken, async (_req, res) => {

        const user = await getUserById(_req.user.id);

        // Check if user has manage_api_keys permission
        if (!user.rights || !user.rights.includes('manage_api_keys')) {
            return res.status(401).json({ error: 'Unauthorized: manage_api_keys permission required' });
        }

        const data = _req.body;
        const response = await createToken(data);

        res.json({ success: true, token: response.token, permission: response.permission, name: response.name });
    });
}

export default createTokenApi;