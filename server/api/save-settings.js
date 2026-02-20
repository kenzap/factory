import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { clearSettingsCache } from '../_/helpers/settings.js';
import { normalizeTimezoneOrUtc } from '../_/helpers/timezone.js';

/**
 * Save settings
 *
 * @version 1.0
 * @param {JSON} data - Settings data
 * @returns {Array<Object>} - Orders
*/
async function saveSettings(data) {

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!data) return { success: false, error: 'no data provided' };

        if (Object.prototype.hasOwnProperty.call(data, 'default_timezone')) {
            data.default_timezone = normalizeTimezoneOrUtc(data.default_timezone);
        }

        // Prepare update for only provided keys in data
        const updateKeys = Object.keys(data);

        // Chain jsonb_set calls to update multiple keys in one assignment
        const setClause = `js = ${updateKeys.reduce(
            (acc, key, idx) => `jsonb_set(${acc}, '{data,${key}}', $${idx + 3}::jsonb, true)`,
            'js'
        )}`;

        // Build dynamic query
        const query = `
            UPDATE data
            SET
            ${setClause}
            WHERE ref = $1 AND sid = $2
            RETURNING _id
        `;

        // Prepare params: first 3 are as before, then each value for update
        const params = [
            'settings',
            sid,
            ...updateKeys.map(key => JSON.stringify(data[key]))
        ];

        // console.log('Executing query:', query, 'with params:', params);

        const result = await client.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function saveSettingsApi(app) {

    app.post('/api/save-settings/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveSettings(data);

        // Clear settings cache
        clearSettingsCache();

        res.json({ success: true, product: response });
    });
}

export default saveSettingsApi;
