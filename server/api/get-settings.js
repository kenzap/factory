import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, log, sid } from '../_/helpers/index.js';

async function getSettings() {

    let settings = {};

    // get database connection
    const client = getDbConnection();

    // settings query
    const query = `
        SELECT js->'data' AS data
        FROM data 
        WHERE ref = $1 AND sid = $2 
        LIMIT 1
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['3dfactory-settings', sid]);
        if (result.rows.length > 0) {

            // get settings from the first row
            const row = result.rows[0];
            settings = row.data ? row.data : {};
        }
    } finally {
        await client.end();
    }

    return settings;
}

// API route
function getSettingsApi(app) {

    app.post('/api/get-settings/', authenticateToken, async (req, res) => {
        try {

            const locale = await getLocale(req.headers.locale);
            const settings = await getSettings();

            res.send({ success: true, settings, locale, sid: 0, user: req.user, });
        } catch (err) {

            res.status(500).json({ error: 'failed to get settings' });
            log(`Error getting settings: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getSettingsApi;