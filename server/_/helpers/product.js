
import { sid } from './index.js';

/**
 * Sets or updates the stock amount for a specific product variant based on coating and color.
 * 
 * @async
 * @function setProductStock
 * @param {Object} db - Database connection object with query method
 * @param {Object} inventory - Inventory data object containing product variant information
 * @param {string} inventory._id - Product ID
 * @param {string} inventory.coating - Product coating type (use '-' for no coating)
 * @param {string} inventory.color - Product color variant
 * @param {number|string} inventory.amount - Stock amount to set (will be parsed to integer)
 * @param {string} user_id - User ID performing the operation
 * @returns {Promise<Object>} Returns success object with updated product ID or error object
 * @returns {Promise<{success: boolean, error: string}>} On validation failure
 * @returns {Promise<{_id: string}>} On successful update
 * @throws {Error} Throws error if product not found or update operation fails
 * 
 * @description
 * This function validates inventory data, sanitizes the amount input, retrieves existing
 * product variant pricing data, updates or adds stock information for the specified
 * coating/color combination, and persists the changes to the database.
 * 
 * @example
 * const result = await setProductStock(db, {
 *   _id: 'product123',
 *   coating: 'matte',
 *   color: 'red',
 *   amount: '50'
 * }, 'user456');
 */
export const setProductStock = async (db, inventory, user_id) => {

    // console.log('setProductStock', inventory);

    // validate inventory data
    if (!inventory || !inventory._id || !inventory.coating || !inventory.color) {
        return { success: false, error: 'invalid inventory data' };
    }

    // sanitize amount
    inventory.amount = parseInt(inventory.amount, 10);
    if (isNaN(inventory.amount) || inventory.amount.length > 10) {
        return { success: false, error: 'invalid amount' };
    }

    // find the order item by id
    const varQuery = `
                SELECT js->'data'->'var_price' as var_price
                FROM data 
                WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
            `;

    const varResult = await db.query(varQuery, [inventory._id, 'product', sid]);
    let var_price = varResult.rows[0]?.var_price || [];

    // find product by color and coating
    var_price.forEach(v => {

        if ((v.parent === inventory.coating || (v.parent == '-' && inventory.coating == '-')) && v.title === inventory.color) {
            v.stock = parseInt(inventory.amount);
        }
    });

    // var_price is empty
    if (var_price.length === 0) {
        var_price.push({
            parent: inventory.coating,
            title: inventory.color,
            public: false,
            price: 0,
            unit: 'pc',
            stock: parseInt(inventory.amount)
        });
    }

    // console.log('Updated var_price:', var_price);

    // update product stock
    const updateQuery = `
            UPDATE data 
            SET js = jsonb_set(js, '{data,var_price}', $1)
            WHERE _id = $2 AND ref = $3 AND sid = $4
            RETURNING _id
        `;

    const updateParams = [JSON.stringify(var_price), inventory._id, 'product', sid];
    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
        throw new Error('Product not found or update failed');
    }

    return updateResult.rows[0];
}

/**
 * Updates the stock quantity for a specific product variant based on coating and color.
 * 
 * @async
 * @function updateProductStock
 * @param {Object} db - Database connection object with query method
 * @param {Object} inventory - Inventory data object containing product details
 * @param {string} inventory._id - Product ID to update
 * @param {string} inventory.coating - Product coating type (use '-' for no coating)
 * @param {string} inventory.color - Product color variant
 * @param {number|string} inventory.amount - Amount to add to current stock (will be parsed as integer)
 * @param {string} user_id - User ID performing the update (currently unused in implementation)
 * @returns {Promise<Object>} Returns success object with _id on success, or error object on failure
 * @throws {Error} Throws error if product not found or update operation fails
 * 
 * @example
 * const result = await updateProductStock(db, {
 *   _id: 'prod123',
 *   coating: 'Polyester',
 *   color: 'RR11',
 *   amount: 10
 * }, 'user456');
 */
export const updateProductStock = async (db, inventory, user_id) => {

    // console.log('updateProductStock', inventory);

    // validate inventory data
    if (!inventory || !inventory._id || !inventory.coating || !inventory.color) {
        return { success: false, error: 'invalid inventory data' };
    }

    // sanitize amount
    inventory.amount = parseInt(inventory.amount, 10);
    if (isNaN(inventory.amount) || inventory.amount.length > 10) {
        return { success: false, error: 'invalid amount' };
    }

    // find the order item by id
    const varQuery = `
                SELECT js->'data'->'var_price' as var_price
                FROM data 
                WHERE _id = $1 AND ref = $2 AND sid = $3 LIMIT 1
            `;

    const varResult = await db.query(varQuery, [inventory._id, 'product', sid]);
    let var_price = varResult.rows[0]?.var_price || [];

    // find product by color and coating
    var_price.forEach(v => {

        if ((v.parent === inventory.coating || (v.parent == '-' && inventory.coating == '-')) && v.title === inventory.color) {

            // console.log('Updated var_price:', v);

            v.stock = (parseFloat(v.stock) || 0) + inventory.amount;

            // console.log('Updated var_price:', v);
        }
    });

    console.log('Updated var_price:', var_price);

    // update product stock
    const updateQuery = `
            UPDATE data 
            SET js = jsonb_set(js, '{data,var_price}', $1)
            WHERE _id = $2 AND ref = $3 AND sid = $4
            RETURNING _id
        `;

    const updateParams = [JSON.stringify(var_price), inventory._id, 'product', sid];
    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
        throw new Error('Product not found or update failed');
    }

    return updateResult.rows[0];
}