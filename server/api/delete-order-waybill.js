import { authenticateToken } from '../_/helpers/auth.js';
import { updateWaybillNumber } from '../_/helpers/document.js';
import { getDbConnection, sid } from '../_/helpers/index.js';

/**
 * Delete waybill
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteOrderWaybill(id, user) {

    const db = getDbConnection();

    if (!id) return { success: false, error: 'no id provided' };

    let response = null, waybill = {};

    try {

        // Get current waybill number
        const query = `
            SELECT js->'data'->'waybill' as waybill
            FROM data
            WHERE ref = 'order' AND sid = $1 AND js->'data'->>'id' = $2
            LIMIT 1
        `;

        await db.connect();

        const result = await db.query(query, [sid, id]);
        if (result.rows.length > 0) {
            waybill = result.rows[0].waybill || waybill;
        }

        // Append waybill number to anulled list in settings
        if (waybill && waybill.number) {
            const updateSettingsQuery = `
            UPDATE data 
            SET js = jsonb_set(
                js, 
                '{data,waybill_anulled_list}', 
                to_jsonb(COALESCE(js->'data'->>'waybill_anulled_list', '') || CASE WHEN js->'data'->>'waybill_anulled_list' IS NULL OR js->'data'->>'waybill_anulled_list' = '' THEN $1 ELSE E'\n' || $1 END)
            )
            WHERE ref = 'settings' AND sid = $2
            `;
            await db.query(updateSettingsQuery, [waybill.number, sid]);

            // await db.query(updateSettingsQuery, [JSON.stringify([waybill.number]), sid]);
        }

        // Update waybill number to null
        response = await updateWaybillNumber(db, {
            id, waybill: {
                date: null,
                number: null,
                user_id: null,
                user_id_del: user.user_id
            }
        });

    } finally {
        await db.end();
    }

    return response;
}

// API route
function deleteOrderWaybillApi(app) {

    app.post('/api/delete-order-waybill/', authenticateToken, async (_req, res) => {

        console.log('delete ', _req.body);

        const response = await deleteOrderWaybill(_req.body.id, _req.user);

        /// console.log('delete response', response);

        res.json({ success: true, response });
    });
}

export default deleteOrderWaybillApi;