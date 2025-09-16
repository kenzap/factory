import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Create product
 *
 * @version 1.0
 * @param {JSON} data - Product data
 * @returns {Array<Object>} - Orders
*/
async function createProduct(data) {

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!data) return { success: false, error: 'no data provided' };

        if (!data._id) {

            data._id = makeId();
            data.created = Math.floor(new Date().getTime() / 1000);
            data.updated = Math.floor(new Date().getTime() / 1000);
        }

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id, js->'data'->>'id' as "id"`;

        const params = [data._id, 0, 'ecommerce-product', sid, JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await client.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function createProductApi(app) {

    app.post('/api/create-product/', authenticateToken, async (_req, res) => {

        console.log('/api/create-product/ _req.body', _req.body);

        const data = _req.body;
        const response = await createProduct(data);

        console.log('/api/create-product/ response', response);

        res.json({ success: true, product: response, message: 'client saved' });
    });
}

export default createProductApi;