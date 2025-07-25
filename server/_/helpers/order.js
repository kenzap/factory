import { sid } from './index.js';

// const { Client } = pkg;

// logging
export async function getNextOrderId(client) {

    // create next friendly order id
    let last_order_id = 0;
    let webhooks = [];

    const query = "SELECT (js->'data'->>'last_order_id')::int as last_order_id, js->'data'->'webhooks' as webhooks FROM data WHERE ref = $1 AND sid = $2 LIMIT 1";
    const params = ['ecommerce-settings', sid];

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
    const updateParams = [JSON.stringify(last_order_id), 'ecommerce-settings'];
    await client.query(updateQuery, updateParams);

    return last_order_id;
}