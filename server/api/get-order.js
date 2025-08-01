import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, sid } from '../_/helpers/index.js';

/**
 * Kenzap Factory Get Clients
 *
 * List clients
 *
 * @version 1.0
 * @param {string} id - entity ID of the client
 * @returns {Array<Object>} - Array of clients
*/
async function getOrderDetails(id) {

    const client = getDbConnection();

    let data = {};

    // Querry 
    const query = `
        SELECT
            _id,
            js->'data'->'id' as id,
            js->'data'->'eid' as eid,
            js->'data'->'phone' as "phone",
            js->'data'->'draft' as "draft",
            js->'data'->'email' as "email",
            js->'data'->'status' as "status",
            js->'data'->'name' as "name",
            js->'data'->'legal_name' as "legal_name",
            js->'data'->'person' as "person",
            js->'data'->'due_date' as "due_date",
            js->'data'->'notes' as "notes",
            js->'data'->'price' as "price",
            js->'data'->'vat_status' as "vat_status",
            js->'data'->'entity' as "entity",
            js->'data'->'operator' as "operator",
            js->'data'->'items' as "items"
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
        LIMIT 1
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['ecommerce-order', sid, id]);
        if (result.rows) data = result.rows[0] || {};

        console.log('getOrderDetails result', result.rows);

    } finally {
        await client.end();
    }

    return data;
}

// Simple API route
function getOrderApi(app) {

    app.post('/api/get-order/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers.locale);

        res.json({ success: true, order: await getOrderDetails(_req.body.id), settings: await getSettings(), locale });
    });
}

export default getOrderApi;