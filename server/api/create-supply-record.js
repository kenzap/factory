import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';

/**
 * Create supply record
 *
 * @version 1.0
 * @param {JSON} data - Supply record data
 * @returns {JSON<Object>} - Response
*/
async function createSupplyRecord(data, user) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        if (!data._id) {

            data._id = makeId();
        }

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
            RETURNING _id, js->'data'->>'id' as "id"`;

        const params = [data._id, 0, 'supplylog', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

        await updateProductStock(db, { coating: data.coating, color: data.color, amount: data.qty, _id: data.product_id }, user);

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function createSupplyRecordApi(app) {

    app.post('/api/create-supply-record/', authenticateToken, async (_req, res) => {

        // console.log('/api/create-worklog-record/ _req.body', _req.body);

        const data = _req.body;
        const supply = await createSupplyRecord(data, user);

        // console.log('/api/create-worklog-record/ response', response);

        res.json({ success: true, supply });
    });
}

export default createSupplyRecordApi;