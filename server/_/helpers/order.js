import { getDbConnection, sid } from './index.js';

/**
 * Retrieves client discounts from the database for a specific entity.
 * 
 * @async
 * @function getClientDiscounts
 * @param {string|number} eid - The entity ID to fetch discounts for
 * @returns {Promise<Object>} A promise that resolves to the discounts object, or an empty object if no discounts found
 * @throws {Error} Database connection or query errors
 * 
 * @description
 * This function connects to the database and queries the 'data' table to retrieve
 * discount information stored in a JSON field. It extracts the 'discounts' property
 * from the 'data' JSON column where the record matches the specified entity ID.
 * 
 * @example
 * const discounts = await getClientDiscounts('entity123');
 * console.log(discounts); // { discount1: 10, discount2: 15 }
 */
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

/**
 * Generates the next sequential order ID by retrieving and incrementing the last order ID from the database.
 * 
 * @async
 * @function getNextOrderId
 * @param {Object} client - Database client object for executing queries
 * @returns {Promise<number>} The next order ID (incremented from the last stored order ID)
 * @throws {Error} If database query fails
 * 
 * @description
 * This function:
 * 1. Queries the database for the current last_order_id from the settings
 * 2. Increments the value by 1 (or starts at 1 if no previous value exists)
 * 3. Updates the database with the new last_order_id
 * 4. Returns the new order ID for use
 * 
 * @example
 * const client = new DatabaseClient();
 * const nextId = await getNextOrderId(client);
 * console.log(`Next order ID: ${nextId}`);
 */
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

/**
 * Enhances GDPR compliance by abbreviating names of non-corporate clients.
 * Used by document generation to format client name for display.
 * @param {Object} entity - The entity object containing client information
 * @param {string} entity.legal_name - The legal name of the client
 * @param {string} [entity.entity_type] - The type of entity (e.g., 'individual', 'company')
 * @returns {string} Formatted client name
 */
export const formatClientName = (entity) => {

    let legal_name = entity.legal_name || '';

    if (entity.entity && entity.entity.toLowerCase() === 'individual' && legal_name.indexOf(' ') > 0) {
        const parts = legal_name.split(' ');
        return parts[0].substring(0, 1) + parts[1].substring(0, 1);
    }
    return legal_name;
}

/**
 * Marks an order as having its email sent by updating the email_sent flag in the database.
 * 
 * @param {string} _id - The unique identifier of the order
 * @param {string} type - The type of email notification (currently unused in implementation)
 * @param {Object} user - The user object containing session information
 * @param {string} user.sid - The session/site identifier for the user
 * @param {Object} logger - Logger instance for recording operations
 * @returns {Promise<void>} Promise that resolves when the operation is complete
 * @throws {Error} Throws database connection or query errors
 */
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
