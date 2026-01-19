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
export const getOrdersReadyForNotification = async (db, logger) => {

    let response = [];

    try {

        // Get orders ready for notification
        const query = `
            SELECT
            _id,
            js->'data'->>'id' as id,
            js->'data'->>'eid' as eid,
            js->'data'->>'phone' as phone
            FROM data 
            WHERE ref = $1 
                AND sid = $2 
                AND (js->'data'->'notifications'->>'order_ready_sent_at' IS NULL)
                AND NOT EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(js->'data'->'items') AS item 
                    WHERE item->'inventory'->>'rdy_date' IS NULL 
                    OR item->'inventory'->>'rdy_date' = ''
                ) AND NOT EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(js->'data'->'items') AS item 
                    WHERE item->'inventory'->>'isu_date' IS NOT NULL 
                    AND item->'inventory'->>'isu_date' != ''
                ) AND jsonb_array_length(js->'data'->'items') > 0
            LIMIT 100
        `;

        const params = ['order', db.sid];

        const result = await db.query(query, params);

        response = result.rows || [];

    } catch (error) {
        logger.error('Error fetching orders ready for notification:', error);
    }

    db.close();

    return response;
};
