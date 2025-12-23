import { getDbConnection, sid } from './index.js';

export async function getClientDiscounts(eid) {

    const db = getDbConnection();

    let discounts = {};

    // Querry 
    const query = `
        SELECT 
            js->'data'->'discounts' as discounts
        FROM data 
        WHERE ref = $1 AND sid = $2 AND _id = $3
    `;

    try {
        await db.connect();

        const result = await db.query(query, ['entity', sid, eid]);

        if (result.rows && result.rows[0]) {
            discounts = result.rows[0].discounts || {};
        }

    } finally {
        await db.end();
    }

    return discounts;
}

// logging
export async function getNextOrderId(client) {

    // create next friendly order id
    let last_order_id = 0;
    let webhooks = [];

    const query = "SELECT (js->'data'->>'last_order_id')::int as last_order_id, js->'data'->'webhooks' as webhooks FROM data WHERE ref = $1 AND sid = $2 LIMIT 1";
    const params = ['settings', sid];

    const result = await client.query(query, params);

    if (result.rows.length > 0) {
        const row = result.rows[0];
        if (row.last_order_id !== null) {
            last_order_id = parseInt(row.last_order_id) + 1;
        }
        if (row.webhooks) {
            webhooks = typeof row.webhooks === 'string' ? JSON.parse(row.webhooks) : row.webhooks;
        }
    }

    // update number
    const updateQuery = "UPDATE data SET js = jsonb_set(js, '{data,last_order_id}', $1::jsonb) WHERE ref = $2";
    const updateParams = [JSON.stringify(last_order_id), 'settings'];
    await client.query(updateQuery, updateParams);

    return last_order_id;
}