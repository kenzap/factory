import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

async function getLocaleById(id) {

    const db = getDbConnection();

    let locale = {};

    // locales query
    const query = `
        SELECT  
                _id,
                js->'data'->'locale' as locale, 
                js->'data'->'content' as content, 
                js->'data'->'ext' as ext, 
                js->'data'->'updated' as updated
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
        LIMIT 1
    `;

    try {

        await db.connect();

        const result = await db.query(query, ['locale', sid, id]);
        if (result.rows.length > 0) {
            locale = result.rows[0];
        }
    } finally {
        await db.end();
    }

    return locale;
}

// API route
function getLocaleByIdApi(app) {

    app.post('/api/get-locale-by-id/', authenticateToken, async (req, res) => {
        try {
            const id = req.body.id || {};
            const locale = await getLocaleById(id);

            res.send({ success: true, locale: locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to get records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getLocaleByIdApi;