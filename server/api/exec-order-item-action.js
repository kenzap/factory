import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection } from '../_/helpers/index.js';
import { issueItem } from '../_/helpers/inventory/issue-item.js';
import { updateItem } from '../_/helpers/inventory/update-item.js';
import { updateStock } from '../_/helpers/inventory/update-stock.js';

/**
 * execOrderItemAction
 * Executes an action on an order item.
 * This function updates the order item in the database based on the provided actions.
 *   
 * @version 1.0
 * @param {JSON} actions - Object containing actions to perform on the order item.
 * @returns {Array<Object>} - Response
*/
async function execOrderItemAction(actions, user) {

    const db = getDbConnection();

    let response = { issue: null, update_item: null, update_stock: null };

    try {

        await db.connect();

        if (!actions) return { success: false, error: 'no data provided' };

        response.update_item = await updateItem(db, actions.update_item, user);

        response.update_stock = await updateStock(db, actions.update_stock, user);

        response.issue = await issueItem(db, actions.issue)

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function execOrderItemActionApi(app) {

    app.post('/api/exec-order-item-action/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        data.user_id = _req.user.id;
        const response = await execOrderItemAction(data, _req.user);

        // console.log('response', response);

        res.json({ success: true, status: response });
    });
}

export default execOrderItemActionApi;