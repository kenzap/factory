import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection } from '../_/helpers/index.js';
import { setProductStock } from '../_/helpers/product.js';

/**
 * Save stock amount
 *
 * @version 1.0
 * @param {JSON} data - Stock data
 * @returns {Array<Object>} - Orders
*/
async function saveStockAmount(data) {

    const client = getDbConnection();

    let response = null;

    try {

        await client.connect();

        if (!data) return { success: false, error: 'no data provided' };

        response = await setProductStock(client, data, data.user_id)

    } finally {
        await client.end();
    }

    return response;
}

// Simple API route
function saveStockAmountApi(app) {

    app.post('/api/save-stock-amount/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveStockAmount(data);

        res.json({ success: true, response });
    });
}

export default saveStockAmountApi;