import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create locale
 *
 * @version 1.0
 * @param {JSON} data - Locale data
 * @returns {Array<Object>} - Response
 */
async function createLocale(data) {

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!data) return { success: false, error: 'no data provided' };

        const timestamp = Math.floor(Date.now() / 1000);

        let _id = makeId();
        data.created = timestamp;
        data.updated = timestamp;

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id`;

        const params = [_id, 0, 'locale-ecommerce', sid, JSON.stringify({ data: data, meta: { created: timestamp, updated: timestamp } })];

        const result = await client.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return response;
}

// API route
function createLocaleApi(app) {

    app.post('/api/create-locale/', authenticateToken, async (_req, res) => {

        console.log('/api/create-locale/ _req.body', _req.body);

        const data = _req.body;
        const response = await createLocale(data);

        res.json({ success: true, locale: response });
    });
}

export default createLocaleApi;