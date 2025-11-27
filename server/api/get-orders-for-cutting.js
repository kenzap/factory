import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, log, sid } from '../_/helpers/index.js';

async function getMetalStock(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '', items: false }) {

    const db = getDbConnection();

    let log = [];

    let query = `
        SELECT
            _id,
            js->'data'->'supplier' AS supplier,
            js->'data'->'qty' AS qty,
            js->'data'->'type' AS type,
            js->'data'->'status' AS status,
            js->'data'->'product_id' AS product_id,
            js->'data'->'product_name' AS product_name,
            js->'data'->'parent_coil_id' AS parent_coil_id,
            js->'data'->'color' AS color,
            js->'data'->'coating' AS coating,
            js->'data'->'width' AS width,
            js->'data'->'length' AS length,
            js->'data'->'thickness' AS thickness,
            js->'data'->'parameters' AS parameters,
            js->'data'->'origin' AS origin,
            js->'data'->'date' AS date,
            js->'data'->'notes' AS notes,
            js->'data'->'price' AS price
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'type' = 'metal' AND js->'data'->>'status' = 'available' AND (js->'data'->>'length')::numeric > 0
    `;

    let params = ['supplylog', sid];

    // query filters
    if (filters) {

        if (filters.cm == false && filters.color) {
            query += ` AND js->'data'->>'color' = $${params.length + 1}`;
            params.push(filters.color);
        }

        if (filters.cm == false && filters.coating) {
            query += ` AND js->'data'->>'coating' = $${params.length + 1}`;
            params.push(filters.coating);
        }

        if (filters.cm == true) {
            query += ` AND js->'data'->>'cm' = 'true'`;
        }

        if (filters.cm == false) {
            query += ` AND (js->'data'->>'cm' IS NULL OR js->'data'->>'cm' = 'false')`;
        }
    }

    query += ` ORDER BY js->'data'->>'date' DESC LIMIT 100`;

    try {

        await db.connect();

        const result = await db.query(query, params);

        log = result.rows;

    } finally {
        await db.end();
    }

    return log;
}

/**
 * Get orders for cutting
 * 
 * @version 1.0
 * @param {string} lang - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getOrdersForCutting(filters = { client: { name: "" }, dateFrom: '', dateTo: '', type: '', items: false }) {

    const db = getDbConnection();

    let orders = {};

    // Get orders
    let query = `
        SELECT _id, 
                COALESCE(js->'data'->>'id', '') as id, 
                COALESCE(js->'data'->>'from', '') as from, 
                COALESCE(js->'data'->>'name', '') as name, 
                COALESCE(js->'data'->>'notes', '') as notes,
                COALESCE(js->'data'->'price'->>'total', '') as total,
                COALESCE(js->'data'->>'operator', '') as operator,
                COALESCE(js->'data'->>'due_date', '') as due_date,
                CASE WHEN js->'data'->'draft' IS NOT NULL THEN (js->'data'->'draft')::boolean ELSE false END as draft,
                js->'data'->'inventory' as inventory,
                js->'data'->'invoice' as invoice,
                js->'data'->'payment' as payment,
                js->'data'->'waybill' as waybill,
                js->'data'->'date' as date
                ${filters.items === true ? `, js->'data'->'items' as items` : ''}
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    const params = ['ecommerce-order', sid];

    if (filters.client?.name && filters.db.name.trim() !== '') {
        query += ` AND LOWER(js->'data'->>'name') LIKE LOWER($${params.length + 1})`;
        params.push(`%${filters.client.name.trim()}%`);
    }

    if (filters.cm == false && filters.color) {
        query += ` AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->>'color' = $${params.length + 1}
        )`;
        params.push(filters.color);
    }

    if (filters.cm == false && filters.coating) {
        query += ` AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->>'coating' = $${params.length + 1}
        )`;
        params.push(filters.coating);
    }

    if (filters.cm == true) {
        query += ` AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE item->>'cm' = 'true'
        )`;
    }

    // get orders for cutting list - exclude drafts and transactions, only with due_date set
    query += ` AND (js->'data'->'draft')::boolean = false AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) `; // AND js->'data'->'due_date' IS NOT NULL

    // hide orders where all items were written off more than 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    query += ` AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(js->'data'->'items') AS item 
            WHERE 
                (item->'inventory'->>'isu_date' IS NULL OR item->'inventory'->>'isu_date' = '') AND
                ((item->'inventory'->>'wrt_date' IS NOT NULL AND (item->'inventory'->>'wrt_date')::timestamp > $${params.length + 1}) OR (item->'inventory'->>'wrt_date' IS NULL))
        ) AND jsonb_array_length(js->'data'->'items') > 0`;

    params.push(twoDaysAgo.toISOString());

    query += ` ORDER BY js->'data'->>'id' DESC LIMIT 1000`;

    try {

        await db.connect();

        const result = await db.query(query, params);

        // Filter out order items where coating and color don't match the filters
        if (filters.cm == false && (filters.color || filters.coating)) {
            result.rows = result.rows.map(order => {
                if (order.items) {
                    const filteredItems = order.items.filter(item => {
                        let matches = true;
                        if (filters.color && item.color !== filters.color) {
                            matches = false;
                        }
                        if (filters.coating && item.coating !== filters.coating) {
                            matches = false;
                        }
                        if (filters.cm && item.cm === filters.cm) {
                            matches = false;
                        }
                        return matches;
                    });
                    return { ...order, items: filteredItems };
                }
                return order;
            }).filter(order => !order.items || order.items.length > 0);
        }

        // Filter out order items where cm set to true (client material)
        if (filters.cm == true) {
            result.rows = result.rows.map(order => {
                if (order.items) {
                    const filteredItems = order.items.filter(item => item.cm === true || item.cm === 'true');
                    return { ...order, items: filteredItems };
                }
                return order;
            }).filter(order => !order.items || order.items.length > 0);
        }

        orders = result.rows;

    } finally {
        await db.end();
    }

    return orders;
}

// API route 
function getOrdersForCuttingApi(app) {

    app.post('/api/get-orders-for-cutting/', authenticateToken, async (req, res) => {
        try {

            console.log('/api/get-orders/', req.body.filters);

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const orders = await getOrdersForCutting(filters);
            const stock = await getMetalStock(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "system_of_units"]);

            res.send({ success: true, settings, orders, stock, locale, user: req?.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getOrdersForCuttingApi;