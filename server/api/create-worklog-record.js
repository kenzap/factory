import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { updateProductStock } from '../_/helpers/product.js';

/**
 * Create worklog record
 *
 * @version 1.0
 * @param {JSON} data - Worklog record data
 * @returns {JSON<Object>} - Response
*/
async function createWorkLog(data) {

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

        const params = [data._id, 0, 'worklog', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

        // if origin set to w = warehouse, update inventory stock accordingly
        if (data.type && data.type === 'stock-replenishment') {

            console.log('Creating stock replenishment action for worklog record:', data);

            await updateProductStock(db, {
                _id: data.product_id,
                coating: data.coating,
                color: data.color,
                amount: data.qty
            }, data.user_id);
        }

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function createWorkLogApi(app) {

    app.post('/api/create-worklog-record/', authenticateToken, async (_req, res) => {

        // console.log('/api/create-worklog-record/ _req.body', _req.body);

        const data = _req.body;
        const response = await createWorkLog(data);

        // console.log('/api/create-worklog-record/ response', response);

        res.json({ success: true, response });
    });
}

export default createWorkLogApi;