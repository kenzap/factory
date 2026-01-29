import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, log, sid } from '../_/helpers/index.js';

async function getLocales() {

    const client = getDbConnection();

    let locales = [];

    // locales query
    const query = `
        SELECT  
                _id,
                js->'data'->'locale' as locale, 
                js->'data'->'ext' as ext, 
                js->'data'->'updated' as updated
        FROM data 
        WHERE ref = $1 AND sid = $2 
        LIMIT 50
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['locale', sid]);
        if (result.rows.length > 0) {
            locales = result.rows;
        }
    } finally {
        await client.end();
    }

    return locales;
}

// API route for product export
function getLocalesApi(app) {

    app.post('/api/get-locales/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body.filters || {};
            const locales = await getLocales(filters);
            const locale = await getLocale(req.headers.locale);

            res.send({ success: true, locales, locale, user: req?.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getLocalesApi;