import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';
import { getNextOrderId } from '../_/helpers/order.js';

/**
 * Save order
 *
 * List orders
 *
 * @version 1.0
 * @param {JSON} data - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function saveOrder(data) {

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!data) return { success: false, error: 'no data provided' };

        if (!data._id) {

            data.id = await getNextOrderId(client);
            data._id = makeId();
        }

        // Get orders
        let query = `
        INSERT INTO data (_id, pid, ref, sid, js)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (_id)
        DO UPDATE SET
            js = EXCLUDED.js
        RETURNING _id, js->'data'->>'id' as "id"`;

        const params = [data._id, 0, 'ecommerce-order', sid, JSON.stringify({ data: data, meta: { created: Date.now(), updated: Date.now() } })];

        const result = await client.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function saveOrderApi(app) {

    app.post('/api/save-order/', authenticateToken, async (_req, res) => {

        console.log('saveClientApi _req.body', _req.body);

        const data = _req.body;
        const response = await saveOrder(data);

        console.log('saveClient response', response);

        res.json({ success: true, order: response, message: 'client saved' });
    });
}

export default saveOrderApi;