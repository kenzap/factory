import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getSettings, sid } from '../_/helpers/index.js';
import { getLocale } from '../_/helpers/locale.js';
import { getClientDiscounts } from '../_/helpers/order.js';

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

    const db = getDbConnection();

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
            js->'data'->'address' as "address",
            js->'data'->'name' as "name",
            js->'data'->'legal_name' as "legal_name",
            js->'data'->'person' as "person",
            js->'data'->'due_date' as "due_date",
            js->'data'->'notes' as "notes",
            js->'data'->'price' as "price",
            js->'data'->'vat_status' as "vat_status",
            js->'data'->'vat_number' as "vat_number",
            js->'data'->'tax_region' as "tax_region",
            js->'data'->'entity' as "entity",
            js->'data'->'operator' as "operator",
            js->'data'->'waybill' as "waybill",
            js->'data'->'invoice' as "invoice",
            js->'data'->'quotation' as "quotation",
            js->'data'->'production_slip' as "production_slip",
            js->'data'->'items' as "items"
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 AND js->'data'->'deleted' IS NULL
        LIMIT 1
    `;

    try {

        await db.connect();

        const result = await db.query(query, ['order', sid, id]);
        if (result.rows) data = result.rows[0] || {};

        // console.log('getOrderDetails result', result.rows);

    } finally {
        await db.end();
    }

    return data;
}

// Simple API route
function getOrderApi(app) {

    app.post('/api/get-order/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers);
        let order = _req.body.id ? await getOrderDetails(_req.body.id) : {};
        order.discounts = await getClientDiscounts(order.eid);

        res.json({ success: true, order, settings: await getSettings(["currency", "currency_symb", "currency_symb_loc", "system_of_units", "groups", "price", "tax_auto_rate", "tax_calc", "tax_display", "tax_percent", "tax_rate", "tax_region", "vat_number"]), locale });
    });
}

export default getOrderApi;