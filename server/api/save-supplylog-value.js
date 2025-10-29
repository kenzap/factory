import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection } from '../_/helpers/index.js';

/**
 * Save supplylog value
 *
 * @version 1.0
 * @param {JSON} data - Supplylog data
 * @returns {Object} - Database response
*/
async function saveSupplylogValue(data) {

    const db = getDbConnection();

    let response, result, query;

    try {

        await db.connect();

        if (!data) return { success: false, error: 'no data provided' };

        data.updated = Math.floor(Date.now() / 1000);

        if (data.notes !== undefined) {
            query = `UPDATE data SET js = jsonb_set(jsonb_set(js, '{data,notes}', $1), '{data,updated}', $2) WHERE _id = $3 AND ref = $4 RETURNING _id`;
            result = await db.query(query, [JSON.stringify(data.notes), JSON.stringify(data.updated), data._id, 'supplylog']);
            response = result.rows[0] || {};
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
        const response = await saveSupplylogValue(data);

        res.json({ success: true, response });
    });
}

export default saveSupplylogValueApi;