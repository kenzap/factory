import { sid } from './index.js';

async function lockOrderRecord(db, lookup) {

    if (lookup?.orderRecordId) {
        const query = `
            SELECT _id, js
            FROM data
            WHERE ref = $1 AND sid = $2 AND _id = $3
            FOR UPDATE
        `;

        const result = await db.query(query, ['order', sid, lookup.orderRecordId]);
        return result.rows[0] || null;
    }

    if (lookup?.orderId) {
        const query = `
            SELECT _id, js
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3
            LIMIT 1
            FOR UPDATE
        `;

        const result = await db.query(query, ['order', sid, String(lookup.orderId)]);
        return result.rows[0] || null;
    }

    return null;
}

export async function withLockedOrderItems(db, lookup, mutate) {

    await db.query('BEGIN');

    try {
        const orderRecord = await lockOrderRecord(db, lookup);

        if (!orderRecord) {
            await db.query('ROLLBACK');
            return null;
        }

        const orderData = orderRecord.js || {};
        if (!orderData.data) orderData.data = {};

        const items = Array.isArray(orderData.data.items) ? orderData.data.items : [];
        const mutation = await mutate({
            orderRecord,
            orderData,
            items
        });

        if (mutation?.skipUpdate) {
            await db.query('COMMIT');
            return {
                orderRecord,
                items,
                updated: false,
                mutation
            };
        }

        const nextItems = mutation?.items || items;
        orderData.data.items = nextItems;

        const updateQuery = `
            UPDATE data
            SET js = $1
            WHERE _id = $2 AND ref = $3 AND sid = $4
            RETURNING _id
        `;

        await db.query(updateQuery, [JSON.stringify(orderData), orderRecord._id, 'order', sid]);
        await db.query('COMMIT');

        return {
            orderRecord,
            items: nextItems,
            updated: true,
            mutation
        };
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    }
}
