import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create bundle record
 *
 * @version 1.0
 * @param {JSON} data - Bundle record data, example: {"product_id":"e440dce02c04e62e10bed94443c1721795326d9e","product_color":"Zinc","product_coating":"Zinc","bundle_id":"8sgr31mh7x74qz29xtoma26xzr6h11s8xh88ryfc","bundle_color":"Zinc","bundle_coating":"Zinc","bundle_qty":1}
 * @returns {JSON<Object>} - Response
*/
async function createProductBundle(data) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        let _id = makeId();

        data.created = Math.floor(Date.now() / 1000);
        data.updated = Math.floor(Date.now() / 1000);
        data.date = new Date().toISOString();

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id`;

        const params = [_id, 0, 'product-bundle', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function createProductBundleApi(app) {

    app.post('/api/create-product-bundle/', authenticateToken, async (_req, res) => {

        console.log('/api/create-product-bundle/ _req.body', _req.body);

        const data = _req.body;
        const response = await createProductBundle(data);

        // console.log('/api/create-worklog-record/ response', response);

        res.json({ success: true, response });
    });
}

export default createProductBundleApi;