import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create or save client data
 *
 * List orders
 *
 * @version 1.0
 * @param {JSON} data - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function saveClient(data) {

    const db = getDbConnection();

    if (!data) return { success: false, error: 'no data provided' };

    // fac3f1a7e335d4fd27b0c20910e37157a234f3ed
    if (!data._id) data._id = makeId();

    let response = null;
    const now = Math.floor(Date.now() / 1000);

    let existingJs = {};

    const selectQuery = `
        SELECT js
        FROM data
        WHERE _id = $1 AND ref = $2 AND sid = $3
        LIMIT 1
    `;

    // Get orders
    let query = `
        INSERT INTO data (_id, pid, ref, sid, js)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (_id)
        DO UPDATE SET
            js = EXCLUDED.js
        RETURNING _id`;

    try {

        await db.connect();

        const existingResult = await db.query(selectQuery, [data._id, 'entity', sid]);
        existingJs = existingResult.rows?.[0]?.js || {};

        const mergedData = {
            ...(existingJs.data || {}),
            ...data
        };

        const mergedMeta = {
            ...(existingJs.meta || {}),
            created: existingJs.meta?.created || now,
            updated: now
        };

        // Preserve unknown top-level keys (e.g. extensions.moneo) on update.
        const mergedJs = {
            ...existingJs,
            data: mergedData,
            meta: mergedMeta
        };

        const params = [data._id, 0, 'entity', sid, JSON.stringify(mergedJs)];

        const result = await db.query(query, params);

        response = result.rows[0];

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function saveClientApi(app) {

    app.post('/api/save-client/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveClient(data);

        res.json({ success: true, data: response });
    });
}

export default saveClientApi;
