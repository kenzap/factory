import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, sid } from '../_/helpers/index.js';


async function revertCuttingAction(db, data) {

    let response = [], res;

    if (!data || data.length == "0") return;

    // revert length to original coil
    let query = `
        UPDATE data
        SET js = jsonb_set(js, '{data,length}', to_jsonb((js->'data'->>'length')::int + $4::int))
        WHERE ref = $1 AND sid = $2 AND _id = $3 AND js->'data'->>'type' = 'metal'
        RETURNING _id`;

    let params = ['supplylog', sid, data.coil_id, data.qty];

    console.log('Updating coil:', data.coil_id, 'by length:', data.qty);

    // remove stock sheets added during cutting
    if (data.sheets) data.sheets.forEach(async (sheet) => {

        if (sheet.type != "stock") return;

        // Delete supply log record
        let query = `
            DELETE FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'parent_coil_id' = $3 AND js->'data'->>'length' = $4 AND js->'data'->>'width' = $5
            RETURNING _id`;

        const params = ['supplylog', sid, data.coil_id, sheet.length, sheet.width];

        const result = await db.query(query, params);

        console.log('Removing sheet from stock:', data.coil_id, sheet.length, sheet.width, result.rows[0] || {});
    });

    if (data.sheets) res = await db.query(query, params);

    // clear order item statuses
    if (data.items) data.items.forEach(async (item) => {

        // Querry 
        let query = `
            SELECT _id, js->'data'->'id' as "id", js->'data'->'items' as "items"
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
            LIMIT 1
        `;

        let params = ['ecommerce-order', sid, item.order_id];

        const result = await db.query(query, params);

        let order = result.rows[0] || null;

        console.log('Updating order items for order_id:', item.order_id, 'order found:', order._id);

        // stop here if order not found
        if (!order) return;

        let items_db = order.items || [];
        let updated = false;

        console.log('Comparing:', items_db, 'order to:', item);

        // update items
        items_db.forEach((itm, index) => {

            if (item.index === index && order.id === item.order_id) {
                delete items_db[index].inventory.wrt_date;
                delete items_db[index].inventory.wrt_user;
                items_db[index].length_writeoff = 0;
                items_db[index].width_writeoff = 0;
                updated = true;
            }
        });

        if (updated) {

            // update order in DB
            let updateQuery = `
                UPDATE data
                SET js = jsonb_set(js, '{data,items}', $4::jsonb)
                WHERE ref = $1 AND sid = $2 AND _id = $3
                RETURNING _id
            `;

            let updateParams = ['ecommerce-order', sid, order._id, JSON.stringify(items_db)];

            const updateResult = await db.query(updateQuery, updateParams);

            console.log('Reverted order item statuses for order_id:', item.order_id, 'order updated:', updateResult.rows[0] || {});
        }
    });

    if (res) response.push(res.rows[0] || {});
}

/**
 * Delete product by id
 *
 * List orders
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteWorklogRecord(id) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null;

    try {
        await db.connect();

        // First, check if the worklog record exists
        let selectQuery = `
            SELECT _id, js FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3`;

        const checkParams = ['worklog', sid, id];

        const checkResult = await db.query(selectQuery, checkParams);

        if (checkResult.rows.length === 0) {
            return { success: false, error: 'worklog record not found' };
        }

        const worklogRecord = checkResult.rows[0];

        // console.log("worklogRecord type", worklogRecord.js.data.type);

        if (worklogRecord.js.data.type === 'cutting') await revertCuttingAction(db, worklogRecord.js.data);

        // Delete worklog record
        let query = `
            DELETE FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3
            RETURNING _id`;

        const params = ['worklog', sid, id];

        const result = await db.query(query, params);

        response = result.rows;

    } catch (error) {
        await db.end();
        return { success: false, error: 'failed to check worklog record ' + error.message };
    }

    return response;
}

// API route
function deleteWorklogRecordApi(app) {

    app.post('/api/delete-worklog-record/', authenticateToken, async (_req, res) => {

        const response = await deleteWorklogRecord(_req.body.id);

        // console.log('delete response', response);

        res.json({ success: true, response });
    });
}

export default deleteWorklogRecordApi;