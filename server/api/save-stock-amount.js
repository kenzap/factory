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
async function saveStockAmount(data, user) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        response = await setProductStock(db, data, user)

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function saveStockAmountApi(app) {

    app.post('/api/save-stock-amount/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveStockAmount(data, _req.user);

        res.json({ success: true, response });
    });
}

export default saveStockAmountApi;