
import { makeId, sid } from './../index.js';
import { updateProductStock } from './../product.js';

export const updateStock = async (db, actions) => {

    let response = null;

    if (actions) {

        console.log('updateStock actions:', actions);

        // validate stock update data
        if (!actions.order_id || !actions.product_id ||
            actions.item_id === undefined || actions.amount === undefined) {
            return { success: false, error: 'missing stock update data' };
        }

        // validate item_id
        if (typeof actions.item_id !== 'string' || !actions.item_id.trim()) {
            return { success: false, error: 'invalid item_id' };
        }

        // validate amount
        actions.amount = parseInt(actions.amount);
        if (isNaN(actions.amount) || actions.amount < 0) {
            return { success: false, error: 'invalid amount, must be non-negative number' };
        }

        // Start transaction for atomic stock update
        await db.query('BEGIN');

        const id = actions.order_id + "-" + actions.product_id + "-" + actions.item_id;

        try {
            // find the order item by id
            const itemQuery = `
                    SELECT 
                        _id,
                        js->'data'->>'writeoff_amount' as writeoff_amount
                    FROM data 
                    WHERE js->'data'->>'id' = $1 AND ref = $2 AND sid = $3
                    LIMIT 1
                    `;

            const itemResult = await db.query(itemQuery, [id, 'writeofflog', sid]);

            let last_writeoff_amount = itemResult.rows[0]?.writeoff_amount || 0;

            // const last_stock_writeoff = parseFloat(matchingVariant.last_stock_writeoff || 0);
            const new_amount = parseFloat(actions.amount);

            // revert last stock writeoff if exists and is different from new amount
            if (last_writeoff_amount !== 0) {

                console.log('Reverting last stock writeoff:', last_writeoff_amount);

                await updateProductStock(db, {
                    _id: actions.product_id,
                    amount: parseFloat(last_writeoff_amount),
                    coating: actions.coating,
                    color: actions.color
                }, actions.user_id);
            }

            // apply new stock change if amount is not zero
            if (new_amount !== 0) {

                console.log('Setting new stock amount:', new_amount, actions);

                // apply stock change
                await updateProductStock(db, {
                    _id: actions.product_id,
                    amount: -1 * new_amount,
                    coating: actions.coating,
                    color: actions.color
                }, actions.user_id);
            }

            // Insert or update writeofflog record
            const writeoffData = {
                id: id,
                order_id: actions.order_id,
                product_id: actions.product_id,
                item_id: actions.item_id,
                writeoff_amount: new_amount,
                coating: actions.coating,
                color: actions.color,
                user_id: actions.user_id,
                updated_at: new Date().toISOString(),
                updated_by: actions.user_id
            };

            if (itemResult.rows.length > 0) {

                // Update existing writeofflog record
                const updateLogQuery = `
                        UPDATE data
                        SET js = jsonb_set(
                            js,
                            '{data}',
                            $4::jsonb,
                            true
                        )
                        WHERE js->'data'->>'id' = $1 AND ref = $2 AND sid = $3
                        RETURNING _id
                    `;

                const updateLogParams = [
                    writeoffData.id,
                    'writeofflog',
                    sid,
                    JSON.stringify(writeoffData)
                ];

                const updateLogResult = await db.query(updateLogQuery, updateLogParams);

                if (updateLogResult.rows.length === 0) {
                    await db.query('ROLLBACK');
                    return { success: false, error: 'Writeofflog update failed' };
                }
            } else {

                // console.log('Inserting new writeofflog record', writeoffData);

                const _id = makeId();

                // Insert new writeofflog record
                const insertLogQuery = `
                        INSERT INTO data (_id, pid, ref, sid, js)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING _id
                    `;

                const insertLogParams = [
                    _id,
                    0,
                    'writeofflog',
                    sid,
                    JSON.stringify({ data: writeoffData })
                ];

                response = await db.query(insertLogQuery, insertLogParams);

                if (response.rows.length === 0) {
                    await db.query('ROLLBACK');
                    return { success: false, error: 'Writeofflog insert failed' };
                }
            }

            // Commit transaction
            await db.query('COMMIT');

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    return { success: true, response: response };
}
