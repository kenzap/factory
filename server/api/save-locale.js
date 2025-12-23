import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Save locale data
 *
 * @version 1.0
 * @param {JSON} data - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function saveLocale(_id, data) {

    const client = getDbConnection();

    if (!data) return { success: false, error: 'no data provided' };

    let response = null;

    // Update only keys of js that are present in data object
    let params = ['ecommerce', sid, _id];
    let paramIndex = 4;

    let keys = Object.keys(data);

    if (keys.length === 0) {
        return { success: false, error: 'no keys to update' };
    }

    // Build nested jsonb_set calls for js->'data'->key
    let jsExpr = "js";
    for (const key of keys) {
        jsExpr = `jsonb_set(${jsExpr}, '{data,${key}}', $${paramIndex}::jsonb, true)`;
        params.push(JSON.stringify(data[key]));
        paramIndex++;
    }

    let query = `
        UPDATE data
        SET js = ${jsExpr}
        WHERE ref = $1 AND sid = $2 AND _id = $3
        RETURNING _id
    `;

    console.log('saveLocale params:', params);
    console.log('saveLocale query:', query);

    try {

        await client.connect();

        const result = await client.query(query, params);

        response = result.rows;

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function saveLocaleApi(app) {

    app.post('/api/save-locale/', authenticateToken, async (_req, res) => {

        console.log('/api/save-locale/ ', _req.body);

        const _id = _req.body._id || null;
        const data = _req.body.data || {};

        const response = await saveLocale(_id, data);

        res.json({ success: true, response });
    });
}

export default saveLocaleApi;