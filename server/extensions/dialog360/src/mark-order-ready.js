/**
 * Retrieves orders that are ready for notification based on specific criteria.
 * 
 * This function queries the database for orders that meet the following conditions:
 * - Have a notification timestamp for order ready status
 * - Contain at least one item with inventory issue date
 * - Have a non-empty items array
 * 
 * @async
 * @function getOrdersReadyForNotification
 * @param {Object} db - Database connection object with query method
 * @returns {Promise<Array<Object>>} Array of order objects with id, phone, and _id properties, or empty array if error occurs
 * @throws {Error} Logs error to console if database query fails
 *  
 * @example
 * const orders = await getOrdersReadyForNotification(dbConnection);
 * // Returns: [{ _id: '123', id: 'order_456', phone: '+1234567890' }, ...]
 */
export const markOrderReady = async (id, db, logger) => {

    let response = [];

    const order_ready_sent_at = new Date().toISOString();

    try {

        // Get orders ready for notification
        const query = `
            UPDATE data 
            SET js = jsonb_set(
                jsonb_set(
                    js, 
                    '{data,notifications}', 
                    COALESCE(js->'data'->'notifications', '{}'),
                    true
                ),
                '{data,notifications,order_ready_wa_sent_at}', 
                to_jsonb($4::text),
                true
            )
            WHERE ref = $1 
            AND sid = $2 
            AND js->'data'->>'id' = $3
            RETURNING 
            _id,
            js->'data'->>'id' as id,
            js->'data'->>'eid' as eid,
            js->'data'->>'name' as name,
            js->'data'->>'phone' as phone
        `;

        const params = ['order', db.sid, id, order_ready_sent_at];

        const result = await db.query(query, params);

        response = result.rows || [];

    } catch (error) {
        logger.error('Error fetching orders ready for notification:', error);
    }

    db.close();

    return response;
};
