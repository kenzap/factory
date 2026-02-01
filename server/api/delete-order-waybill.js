import { authenticateToken } from '../_/helpers/auth.js';
import { updateWaybillNumber } from '../_/helpers/document/index.js';
import { getDbConnection, sid } from '../_/helpers/index.js';
import { clearSettingsCache } from '../_/helpers/settings.js';

/**
 * Delete waybill
 *
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function deleteOrderWaybill(id, user, logger) {

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

            const query_waybill_anulled_list = `
                SELECT js->'data'->>'waybill_anulled_list' as waybill_anulled_list
                FROM data
                WHERE ref = 'settings' AND sid = $1
                LIMIT 1
                `;

            const result_anulled = await db.query(query_waybill_anulled_list, [sid]);
            let waybill_anulled_list = '';
            if (result_anulled.rows.length > 0) {
                waybill_anulled_list = result_anulled.rows[0].waybill_anulled_list || '';
            }

            // Add waybill number to the list separated by new lines
            waybill_anulled_list = waybill_anulled_list
                ? waybill_anulled_list + '\n' + waybill.number
                : waybill.number;

            const update_query = `
                UPDATE data
                SET js = jsonb_set(js, '{data,waybill_anulled_list}', $1::jsonb)
                WHERE ref = 'settings' AND sid = $2
                `;

            await db.query(update_query, [JSON.stringify(waybill_anulled_list), sid]);
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

        // Clear settings cache
        clearSettingsCache();

    } finally {
        await db.end();
    }

    return response;
}

// API route
function deleteOrderWaybillApi(app, logger) {

    app.post('/api/delete-order-waybill/', authenticateToken, async (_req, res) => {

        logger.info('delete-order-waybill user ', _req.user);

        const response = await deleteOrderWaybill(_req.body.id, _req.user, logger);

        /// console.log('delete response', response);

        res.json({ success: true, response });
    });
}

export default deleteOrderWaybillApi;