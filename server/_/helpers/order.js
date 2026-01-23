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

export async function markOrderEmailSent(_id, type, user, logger) {

    const db = getDbConnection();
    await db.connect();

    try {

        const query_select = `
            SELECT js->'data'->>'notifications' as notifications,
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3
            LIMIT 1
        `;

        const result_select = await db.query(query_select, ['order', user.sid, _id]);
        const emailSent = result_select.rows[0]?.email_sent === 'true';

        const query_update = `
            UPDATE data
            SET js = jsonb_set(js, '{data,email_sent}', 'true'::jsonb)
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3
        `;

        await db.query(query, ['order', user.sid, _id]);

        logger.info(`Marked email_sent for Order ID: ${_id}`);
    } finally {
        await db.end();
    }

}
