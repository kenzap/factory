import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection } from '../_/helpers/index.js';
import { broadcastSupplylogUpdate, getSupplylogSnapshot } from '../_/helpers/supplylog-live-update.js';

/**
 * Save supplylog value
 *
 * @version 1.0
 * @param {JSON} data - Supplylog data
 * @returns {Object} - Database response
*/
async function saveSupplylogValue(data, user) {

    const db = getDbConnection();

    let response, result, query;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        data.updated = Math.floor(Date.now() / 1000);

        const updatedFields = [];

        if (data.notes !== undefined) {
            query = `UPDATE data SET js = jsonb_set(jsonb_set(js, '{data,notes}', $1), '{data,updated}', $2) WHERE _id = $3 AND ref = $4 RETURNING _id`;
            result = await db.query(query, [JSON.stringify(data.notes), JSON.stringify(data.updated), data._id, 'supplylog']);
            response = result.rows[0] || {};
            updatedFields.push('notes');
        }

        if (data.supplier !== undefined) {
            query = `UPDATE data SET js = jsonb_set(jsonb_set(js, '{data,supplier}', $1), '{data,updated}', $2) WHERE _id = $3 AND ref = $4 RETURNING _id`;
            result = await db.query(query, [JSON.stringify(data.supplier), JSON.stringify(data.updated), data._id, 'supplylog']);
            response = result.rows[0] || {};
            updatedFields.push('supplier');
        }

        if (data.status !== undefined) {
            query = `UPDATE data SET js = jsonb_set(jsonb_set(js, '{data,status}', $1), '{data,updated}', $2) WHERE _id = $3 AND ref = $4 RETURNING _id`;
            result = await db.query(query, [JSON.stringify(data.status), JSON.stringify(data.updated), data._id, 'supplylog']);
            response = result.rows[0] || {};
            updatedFields.push('status');
        }

        if (data.sofftness !== undefined) {

            console.log('Saving sofftness value:', data.sofftness, data._id);

            query = `UPDATE data SET js = jsonb_set(
                CASE 
                    WHEN js->'data' ? 'parameters' 
                    THEN js 
                    ELSE jsonb_set(js, '{data,parameters}', '{}') 
                END, 
                '{data,parameters,softness}', $1
            ) WHERE _id = $2 AND ref = $3 RETURNING _id`;
            result = await db.query(query, [JSON.stringify(data.sofftness), data._id, 'supplylog']);
            response = result.rows[0] || {};
            updatedFields.push('parameters.softness');
        }

        if (response?._id) {
            const snapshot = await getSupplylogSnapshot(db, data._id);
            if (snapshot) {
                broadcastSupplylogUpdate({
                    ...snapshot,
                    action: 'updated',
                    updated_fields: updatedFields
                }, user);
            }
        }

    } finally {
        await db.end();
    }

    return response;
}

// Simple API route
function saveSupplylogValueApi(app) {

    app.post('/api/save-supplylog-value/', authenticateToken, async (_req, res) => {

        const data = _req.body;
        const response = await saveSupplylogValue(data, _req.user);

        res.json({ success: true, response });
    });
}

export default saveSupplylogValueApi;
