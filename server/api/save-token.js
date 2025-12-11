import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Save token
 *
 * @version 1.0
 * @param {JSON} data - Token data
 * @returns {Array<Object>} - Response data
*/
async function saveToken(data, user) {

    const db = getDbConnection();

    let response = null, meta = {}, data_new = {};

    try {

        await db.connect();

        if (!data || !data._id) return { success: false, error: 'token ID is required for update' };

        // Validate permission array if present
        if (data.hasOwnProperty('permission') && data.permission !== 'read' && data.permission !== 'write') {
            return { success: false, error: 'permission must be "read" or "write"' };
        }

        // Validate active field is boolean if present
        if (data.hasOwnProperty('active') && typeof data.active !== 'boolean') {
            return { success: false, error: 'active must be a boolean value' };
        }

        // Validate name is not empty if present
        if (data.hasOwnProperty('name') && (!data.name || data.name.trim() === '')) {
            return { success: false, error: 'name is required and cannot be empty' };
        }

        const currentTime = Math.floor(Date.now() / 1000);

        // Check if token exists
        const select = `
            SELECT js->'data' as data
            FROM data
            WHERE ref = $1 AND sid = $2 AND _id = $3 
            LIMIT 1
        `;

        const res = await db.query(select, ['api-key', sid, data._id]);
        const existingData = res.rows?.[0]?.data || null;

        if (!existingData) {
            return { success: false, error: 'token not found' };
        }

        // Update only the fields that are present in data
        data_new = { ...existingData };

        if (data.hasOwnProperty('name')) data_new.name = data.name;
        if (data.hasOwnProperty('permission')) data_new.permission = data.permission;
        if (data.hasOwnProperty('description')) data_new.description = data.description;
        if (data.hasOwnProperty('active')) data_new.active = data.active;

        data_new.updated = currentTime;

        meta = {
            ...existingData.meta,
            updated: currentTime
        };

        // console.log('saveToken data to update', data_new, user);

        // Update existing token
        let query_update = `
            UPDATE data 
            SET js = $1
            WHERE _id = $2 AND ref = $3 AND sid = $4
            RETURNING _id, js->'data'->>'id' as "id"`;

        const result = await db.query(query_update, [JSON.stringify({ data: data_new, meta: meta }), data._id, 'api-key', sid]);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// API route
function saveTokenApi(app) {

    app.post('/api/save-token/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveToken(data, _req.user);

        res.json({ success: true, token: response, message: 'token updated' });
    });
}

export default saveTokenApi;