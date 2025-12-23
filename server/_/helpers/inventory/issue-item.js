
import { sid } from './../index.js';

export const issueItem = async (db, actions) => {

    let response = [];

    if (!actions) return { success: false, error: 'no data provided' };

    for (const issueAction of actions) {

        console.log('issueItem action:', issueAction);

        // validate issue data
        if (issueAction.isu_date === undefined) {
            return { success: false, error: 'no issue data provided' };
        }

        const inventory = {
            isu_date: issueAction.isu_date ? new Date().toISOString() : null,
            isu_user: actions.user_id || null
        };

        // find the order item by id
        const itemQuery = `
                    SELECT js->'data'->'items' as items
                    FROM data 
                    WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
                `;

        const itemResult = await db.query(itemQuery, [issueAction.order_id, 'order', sid]);

        let items = itemResult.rows[0]?.items || [];
        const i = items.findIndex(item => item.id === issueAction.item_id);

        // check if item exists
        if (items.length === 0 || !items[i]) {
            return { success: false, error: 'item not found' };
        }

        if (!items[i].inventory) {
            items[i].inventory = {};
        }

        items[i].inventory.isu_date = inventory.isu_date;
        items[i].inventory.isu_user = inventory.isu_user;

        const updateQuery = `
                    UPDATE data
                    SET js = jsonb_set(
                    js,
                    '{data,items}',
                    $4::jsonb,
                    true
                    )
                    WHERE _id = $1 AND ref = $2 AND sid = $3
                    RETURNING _id
                `;

        const updateParams = [
            issueAction.order_id,
            'order',
            sid,
            JSON.stringify(items)
        ];

        const updateResult = await db.query(updateQuery, updateParams);
        if (updateResult.rows.length) response.push(updateResult.rows[0]);
    }

    return response;
}