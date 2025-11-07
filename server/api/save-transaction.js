import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';

/**
 * Save transaction
 *
 * @version 1.0
 * @param {JSON} data - Transaction data
 * @returns {Array<Object>} - Response
*/
async function saveTransaction(data) {

    const db = getDbConnection();

    let response = null;

    try {

        await db.connect();

        if (!data || !Array.isArray(data) || data.length === 0) {
            return { success: false, error: 'no data provided or data is not an array' };
        }

        const results = [];

        for (const item of data) {

            // Check if this is an insertion (transaction: true)
            if (item.transaction === true) {

                console.log('Inserting new transaction', item);

                // Insert new record
                const query = `
                    INSERT INTO data (_id, pid, ref, sid, js)
                    VALUES ($1, $2, $3, $4, $5::jsonb)
                    RETURNING _id
                `;

                item._id = makeId();
                item.created = Date.now() / 1000;
                item.updated = Date.now() / 1000;
                item.payment = { amount: 0, date: new Date().toISOString() };

                const params = [
                    item._id,
                    0,
                    'ecommerce-order',
                    sid,
                    JSON.stringify({ data: item })
                ];

                const result = await db.query(query, params);
                results.push(result.rows[0] || {});
            } else {

                // Update existing record
                const updateKeys = Object.keys(item);

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
                    item._id,
                    'ecommerce-order',
                    sid,
                    ...updateKeys.map(key => JSON.stringify(item[key]))
                ];

                const result = await db.query(query, params);
                results.push(result.rows[0] || {});
            }
        }

        response = results;

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function saveTransactionApi(app) {

    app.post('/api/save-transaction/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveTransaction(data);

        // console.log('response', response);

        res.json({ success: true, response });
    });
}

export default saveTransactionApi;