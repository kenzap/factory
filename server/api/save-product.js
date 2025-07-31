import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Save product
 *
 * @version 1.0
 * @param {JSON} data - Product data
 * @returns {Array<Object>} - Orders
*/
async function saveProduct(data) {

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!data) return { success: false, error: 'no data provided' };

        // Prepare update for only provided keys in data
        const updateKeys = Object.keys(data);

        // Chain jsonb_set calls to update multiple keys in one assignment
        const setClause = `js = ${updateKeys.reduce(
            (acc, key, idx) => `jsonb_set(${acc}, '{data,${key}}', $${idx + 4}::jsonb, true)`,
            'js'
        )}`;

        // Build dynamic query
        const query = `
            UPDATE data
            SET
            ${setClause}
            WHERE _id = $1 AND ref = $2 AND sid = $3
            RETURNING _id
        `;

        // Prepare params: first 3 are as before, then each value for update
        const params = [
            data._id,
            'ecommerce-product',
            sid,
            ...updateKeys.map(key => JSON.stringify(data[key]))
        ];

        // console.log('saveProduct query', query, params);

        // return;

        const result = await client.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function saveProductApi(app) {

    app.post('/api/save-product/', authenticateToken, async (_req, res) => {

        // console.log('/api/save-product/', _req.body);

        const data = _req.body;
        const response = await saveProduct(data);

        // console.log('response', response);

        res.json({ success: true, product: response, message: 'client saved' });
    });
}

export default saveProductApi;