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
async function saveOrder(data, user) {

    const db = getDbConnection();

    let response = null, meta = {}, data_new = {};

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        const currentTime = Math.floor(Date.now() / 1000);
        const currentDate = new Date().toISOString();

        if (!data._id) {

            // Creating new order
            const [orderId] = await Promise.all([
                getNextOrderId(db)
            ]);

            data_new = {
                ...data,
                id: orderId,
                _id: makeId(),
                date: data.date || currentDate,
                created: currentTime,
                updated: currentTime,
                operator: data.operator || user.fname || ''
            };

            meta = {
                created: currentTime,
                updated: currentTime
            };
        } else {

            // Updating existing order
            const select = `
                SELECT js->'data' as data
                FROM data
                WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
                LIMIT 1
            `;

            const res = await db.query(select, ['ecommerce-order', sid, data.id]);
            const existingData = res.rows?.[0]?.data || {};

            data_new = {
                ...existingData,
                ...data,
                date: existingData.date || currentDate,
                operator: existingData.operator || user.fname || '',
                created: existingData.created || currentTime,
                updated: currentTime
            };

            meta.updated = currentTime;

            // console.log('saveOrder existing data', data.id);
        }

        data_new.operator = user.fname;

        console.log('saveOrder data to save', data_new, user);
        // return;

        // Get orders
        let query_update = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (_id)
            DO UPDATE SET
                js = EXCLUDED.js
            RETURNING _id, js->'data'->>'id' as "id"`;

        const result = await db.query(query_update, [data_new._id, 0, 'ecommerce-order', sid, JSON.stringify({ data: data_new, meta: meta })]);

        response = result.rows[0] || {};

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function saveOrderApi(app) {

    app.post('/api/save-order/', authenticateToken, async (_req, res) => {

        // console.log('saveClientApi _req.body', _req.body);

        const data = _req.body;
        const response = await saveOrder(data, _req.user);

        // console.log('saveClient response', response);

        res.json({ success: true, order: response, message: 'client saved' });
    });
}

export default saveOrderApi;