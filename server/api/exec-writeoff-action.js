import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * execWriteoffAction
 * Executes an action on an order item.
 * This function updates the order item in the database based on the provided actions.
 * 
 * @version 1.0
 * @param {JSON} actions - Object containing actions to perform on the order item.
 * @returns {Array<Object>} - Response
*/

// {
//   "data": {
//     "_id": "w73moc5fn4ncneahmnfkglvfoa1y5qm9c4rec3bi",
//     "qty": 1,
//     "date": "2025-10-27T16:48:41.696Z",
//     "type": "metal",
//     "color": "RR20",
//     "notes": "",
//     "price": 5,
//     "width": 1250,
//     "length": 80000,
//     "status": "available",
//     "coating": "Polyester",
//     "created": 1761583721,
//     "updated": 1761583721,
//     "user_id": "001ff236dfc8c086c7083e98b9e947bfaf8caf51",
//     "document": {
//       "id": "INV-113000",
//       "date": "2025-10-27T00:00:00.000Z"
//     },
//     "supplier": "SSAB AB",
//     "thickness": 0.5,
//     "product_id": "40fdac3283e4f447a5f10d8c29a157b492c1e347",
//     "product_name": "Skārds ruļļos"
//   },
//   "meta": {
//     "created": 1761583721,
//     "updated": 1761583721
//   }
// }
async function execWriteoffAction(data) {

    const db = getDbConnection();

    let response = [];

    let record = JSON.parse(JSON.stringify(data));

    try {

        await db.connect();

        // validate update item data
        // if (actions.update_item.order_id === undefined || actions.update_item.index === undefined || actions.update_item.item === undefined) {
        //     return { success: false, error: 'no update item data provided' };
        // }

        const sheets = data.sheets || [];
        const items = data.items || [];

        // console.log('A execWriteoffAction data:', data);

        record.created = Math.floor(Date.now() / 1000);
        record.updated = Math.floor(Date.now() / 1000);
        record.date = new Date().toISOString();

        delete record.sheets;
        delete record.items;

        // top up supply log for each sheet that was written off to stock
        for (let sheet of sheets) {

            record._id = makeId();
            // record.sheet = sheet;

            if (sheet.type != "stock") continue;

            console.log('Adding sheet to stock:', sheet);

            record._width = sheet.width; // original width
            record._length = sheet.length; // original length
            record.width = sheet.width; // current width that can be written off
            record.length = sheet.length; // current length that can be written off
            record.price = sheet.price;
            record.parent_coil_id = record.coil_id;
            record.qty = 1;
            record.status = "available";
            record.type = "metal";
            record.notes = `${record.coil_id.substr(0, 3)}`.trim();

            // Get orders 
            let query = `
                INSERT INTO data (_id, pid, ref, sid, js)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (_id)
                DO UPDATE SET
                    js = EXCLUDED.js
                RETURNING _id`;

            let params = [record._id, 0, 'supplylog', sid, JSON.stringify({ data: record, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

            let res = await db.query(query, params);

            response.push(res.rows[0] || {});
        }

        // write-off length from coil
        const groupLengths = {};

        // Group sheets by group and sum lengths
        for (let sheet of sheets) {
            if (!groupLengths[sheet.group]) {
                groupLengths[sheet.group] = sheet.length;
            }
        }

        // Process each group
        for (let [group, totalLength] of Object.entries(groupLengths)) {

            // TODO: Implement write-off logic for each group
            console.log(`Group ${group}: Total length to write-off: ${totalLength}`);

            // Here you would typically update the coil record in the database to reduce its length by totalLength.
            let query = `
                UPDATE data
                SET js = jsonb_set(js, '{data,length}', to_jsonb((js->'data'->>'length')::int - $4::int))
                WHERE ref = $1 AND sid = $2 AND _id = $3 AND js->'data'->>'type' = 'metal'
                RETURNING _id`;

            let params = ['supplylog', sid, record.coil_id, totalLength];

            console.log('Updating coil:', record.coil_id, 'by length:', totalLength);

            let res = await db.query(query, params);

            response.push(res.rows[0] || {});
        }

        console.log('record.order_ids', record.order_ids);

        // update order items status if needed
        for (let order_id of record.order_ids) {

            // Querry 
            let query = `
                SELECT _id, js->'data'->'items' as "items"
                FROM data
                WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
                LIMIT 1
            `;

            let params = ['order', sid, order_id];

            const result = await db.query(query, params);

            let order = result.rows[0] || null;

            console.log('Updating order items for order_id:', order_id, 'order found:', order._id);

            // stop here if order not found
            if (!order) continue;

            let items_db = order.items || [];
            let updated = false;

            // update items
            items_db.forEach((item, index) => {

                // Find the corresponding item in the order by order_id and index
                console.log('Checking item: ', item, 'index:', index);

                let itemUpdated = items.find(itm =>
                    // itm.order_id === order_id && itm.index === index
                    item.id === itm.id
                );

                console.log('itemUpdated:', itemUpdated);

                if (itemUpdated) {

                    if (!items_db[index].inventory) { items_db[index].inventory = {}; }

                    items_db[index].inventory.wrt_date = new Date().toISOString();
                    items_db[index].inventory.wrt_user = data.user_id;
                    items_db[index].inventory.coil_id = record.coil_id;

                    // items_db[index].formula_width_calc = itemUpdated.formula_width_calc
                    // items_db[index].formula_length_calc = itemUpdated.formula_length_calc;
                    items_db[index].width_writeoff = itemUpdated.formula_width_calc
                    items_db[index].length_writeoff = itemUpdated.formula_length_calc;
                    updated = true;
                }
            });

            // console.log('Updated items:', items_db, 'was updated:', updated, 'id:', order._id);

            if (updated) {

                // update order items
                query = `UPDATE data SET js = jsonb_set(js, '{data,items}', $1) WHERE _id = $2 AND ref = $3 RETURNING _id`;

                params = [JSON.stringify(items_db), order._id, 'order'];

                const updateResult = await db.query(query, params);

                response.push(updateResult.rows[0] || {});

                console.log('UPDATE data:', updateResult.rows[0]);
            }
        }

    } finally {
        await db.end();
    }

    return response;
}

/**
 * Create worklog record
 *
 * @version 1.0
 * @param {JSON} data - Worklog record data
 * @returns {JSON<Object>} - Response
*/
async function createWorkLog(data) {

    const db = getDbConnection();

    let response;

    let record = JSON.parse(JSON.stringify(data));

    try {

        await db.connect();

        if (!record) return { success: false, error: 'no data provided' };
        if (!record.type) return { success: false, error: 'no worklog type provided' };

        if (!record._id) {

            record._id = makeId();
        }

        record.created = Math.floor(Date.now() / 1000);
        record.updated = Math.floor(Date.now() / 1000);
        record.date = new Date().toISOString();

        // Get orders
        let query = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id`;

        const params = [record._id, 0, 'worklog', sid, JSON.stringify({ data: record, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })];

        const result = await db.query(query, params);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function execWriteoffActionApi(app) {

    app.post('/api/exec-writeoff-action/', authenticateToken, async (_req, res) => {

        // console.log('/api/exec-order-item-action/', _req.body);
        // console.log('/api/exec-order-item-action/', _req.user);

        const data = _req.body;
        data.user_id = _req.user.id;

        // add record to worklog
        const worklog = await createWorkLog(data);

        console.log('worklog', worklog);

        const writeoffAction = await execWriteoffAction(data);

        console.log('writeoffAction', writeoffAction);

        res.json({ success: true });
    });
}

export default execWriteoffActionApi;