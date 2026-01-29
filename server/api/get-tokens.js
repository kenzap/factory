import { authenticateToken, getUserById } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';

async function getTokens() {

    const client = getDbConnection();

    let locales = [];

    // locales query
    const query = `
        SELECT  
                _id,
                js->'data'->'token' as token, 
                js->'data'->'name' as name, 
                js->'data'->'description' as description, 
                js->'data'->'permission' as permission, 
                js->'data'->'active' as active, 
                js->'data'->'last_used' as last_used, 
                js->'data'->'status' as status, 
                js->'data'->'user_id' as user_id,
                js->'data'->'created' as created
        FROM data 
        WHERE ref = $1 AND sid = $2 
        LIMIT 50
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['api-key', sid]);
        if (result.rows.length > 0) {
            locales = result.rows;
        }
    } finally {
        await client.end();
    }

    return locales;
}

// API route for product export
function getTokensApi(app, logger) {

    app.post('/api/get-tokens/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body.filters || {};
            const user = await getUserById(req.user.id);

            // Check if user has api_keys_management permission
            if (!user.rights || !user.rights.includes('api_keys_management')) {
                return res.status(401).json({ error: 'Unauthorized: api_keys_management permission required' });
            }

            const tokens = await getTokens(filters);
            const locale = await getLocale(req.headers);

            logger.info('!Registering /api/get-tokens/ route', user.rights);

            res.send({ success: true, user: req?.user, tokens, locale });
        } catch (err) {

            logger.error(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
            res.status(500).json({ error: 'failed to get tokens' });
        }
    });
}

export default getTokensApi;