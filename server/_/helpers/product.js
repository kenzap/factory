import { sseManager } from '../helpers/sse.js';
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
export const setProductStock = async (db, inventory, user) => {

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

    // console.log('Updated stock:', user);

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

    sseManager.broadcast({
        type: 'stock-update',
        product_id: inventory._id,
        coating: inventory.coating,
        color: inventory.color,
        amount: inventory.amount,
        updated_by: { user_id: user?.id, name: user?.fname },
        timestamp: new Date().toISOString()
    });

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
export const updateProductStock = async (db, inventory, user) => {

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

    let final_amount = 0;

    // find product by color and coating
    var_price.forEach(v => {

        if ((v.parent === inventory.coating || (v.parent == '-' && inventory.coating == '-')) && v.title === inventory.color) {

            // console.log('A Updated var_price:', v);

            v.stock = (parseFloat(v.stock) || 0) + inventory.amount;
            final_amount = v.stock;

            // console.log('B Updated var_price:', v);
        }
    });

    // console.log('var_price:', var_price);

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

    sseManager.broadcast({
        type: 'stock-update',
        product_id: inventory._id,
        coating: inventory.coating,
        color: inventory.color,
        amount: final_amount,
        updated_by: { user_id: user?.id, name: user?.fname },
        timestamp: new Date().toISOString()
    });

    // console.log('updateResult.rows[0]:', updateResult.rows[0]);

    return updateResult.rows[0];
}

const toFiniteNumber = (value, fallback = NaN) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const escapeFormulaToken = (token = '') => String(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceWordToken = (input = '', token = '', value = 0) => {
    if (!token) return String(input || '');
    return String(input || '').replace(new RegExp(`\\b${escapeFormulaToken(token)}\\b`, 'g'), String(value));
};

const evaluateMathExpression = (expression = '') => {
    const source = String(expression || '').trim();
    if (!source) return NaN;

    const sanitizedExpression = source.replace(/[^-()\d/*+.<>&|?;:\s]/g, '');
    if (!sanitizedExpression.trim()) return NaN;

    try {
        const result = new Function(`return (${sanitizedExpression});`)();
        return Number.isFinite(Number(result)) ? Number(result) : NaN;
    } catch (error) {
        console.error('Error evaluating formula expression:', error);
        return NaN;
    }
};

const applyDimensionValues = (input = '', item = {}) => {
    let result = String(input || '');
    const inputFieldsValues = item?.input_fields_values && typeof item.input_fields_values === 'object'
        ? item.input_fields_values
        : {};
    const inputFields = Array.isArray(item?.input_fields) ? item.input_fields : [];

    Object.entries(inputFieldsValues).forEach(([key, value]) => {
        const cleanKey = String(key || '').replace(/^input/, '').trim();
        if (cleanKey) {
            result = replaceWordToken(result, cleanKey, value);
        }
    });

    inputFields.forEach((field) => {
        const label = String(field?.label || '').trim();
        if (!label) return;

        const overrideValue = inputFieldsValues[`input${label}`] ?? inputFieldsValues[label];
        const replacement = overrideValue ?? field?.default;

        if (replacement !== undefined && replacement !== null && replacement !== '') {
            result = replaceWordToken(result, label, replacement);
        }
    });

    const widthValue = toFiniteNumber(item?.formula_width_calc ?? item?.width ?? item?.formula_width, NaN);
    const lengthValue = toFiniteNumber(item?.formula_length_calc ?? item?.length ?? item?.formula_length, NaN);

    if (Number.isFinite(widthValue)) {
        result = replaceWordToken(result, 'W', widthValue);
    }

    if (Number.isFinite(lengthValue)) {
        result = replaceWordToken(result, 'L', lengthValue);
    }

    return result;
};

const resolveAreaMm2 = (item = {}) => {
    const widthValue = toFiniteNumber(item?.formula_width_calc ?? item?.width ?? item?.formula_width, NaN);
    const lengthValue = toFiniteNumber(item?.formula_length_calc ?? item?.length ?? item?.formula_length, NaN);
    const fallbackExpression = Number.isFinite(widthValue) && Number.isFinite(lengthValue)
        ? `${widthValue}*${lengthValue}`
        : '';
    const sourceExpression = String(item?.formula || '').trim() || fallbackExpression;

    if (!sourceExpression) return NaN;
    return evaluateMathExpression(applyDimensionValues(sourceExpression, item));
};

export const getCoatingPrice = (settings = {}, coatingType = '', coatingColor = '', cm = false) => {
    if (!settings || !Array.isArray(settings.price) || cm) return 0;

    const coating = settings.price.find((item) => item?.parent === coatingType && item?.title === coatingColor);
    return coating ? (toFiniteNumber(coating.price, 0) || 0) : 0;
};

export const getCoatingTypePrice = (settings = {}, coatingType = '', coatingColor = '', cm = false) => {
    if (!settings || !Array.isArray(settings.price) || cm) return 0;

    const exactPrice = getCoatingPrice(settings, coatingType, coatingColor, cm);
    if (Number.isFinite(exactPrice) && exactPrice > 0) return exactPrice;

    const normalizedType = String(coatingType || '').trim();
    if (!normalizedType) return 0;

    const wildcardEntry = settings.price.find((item) =>
        item?.parent === normalizedType && (item?.title === '*' || item?.title === normalizedType)
    );
    if (wildcardEntry) {
        return toFiniteNumber(wildcardEntry.price, 0) || 0;
    }

    const firstMatch = settings.price.find((item) => item?.parent === normalizedType);
    return firstMatch ? (toFiniteNumber(firstMatch.price, 0) || 0) : 0;
};

export const evaluateCostFormula = ({ settings = {}, product = {}, coilPriceM2 = NaN } = {}) => {
    const formulaCost = String(product?.formula_cost || '').trim();
    if (!formulaCost) return NaN;

    const coatingType = product?.parent ?? product?.coating ?? '';
    const coatingColor = product?.title ?? product?.color ?? '';
    const coatingPrice = getCoatingPrice(settings, coatingType, coatingColor, product?.cm === true);
    const coatingTypePrice = getCoatingTypePrice(settings, coatingType, coatingColor, product?.cm === true);
    const areaMm2 = resolveAreaMm2(product);
    const priceSettings = Array.isArray(settings?.price) ? settings.price : [];

    let formula = formulaCost;

    if (formula.includes('COIL_PRICE_M2')) {
        const resolvedCoilPriceM2 = Number.isFinite(coilPriceM2) ? coilPriceM2 : coatingTypePrice;
        if (!Number.isFinite(resolvedCoilPriceM2) || resolvedCoilPriceM2 <= 0) return NaN;
        formula = replaceWordToken(formula, 'COIL_PRICE_M2', resolvedCoilPriceM2);
    }

    formula = replaceWordToken(formula, 'COATING', coatingPrice);
    formula = replaceWordToken(formula, 'MATERIAL', coatingPrice);

    if (formula.includes('M2')) {
        if (!Number.isFinite(areaMm2)) return NaN;
        formula = replaceWordToken(formula, 'M2', areaMm2 / 1000000);
    }

    priceSettings.forEach((priceEntry) => {
        const id = String(priceEntry?.id || '').trim();
        if (!id) return;
        formula = replaceWordToken(formula, id, toFiniteNumber(priceEntry?.price, 0) || 0);
    });

    formula = applyDimensionValues(formula, product);

    const result = evaluateMathExpression(formula);
    return Number.isFinite(result) ? result : NaN;
};

/**
 * Executes a cost calculation formula for a product by replacing variables with actual values.
 * 
 * @async
 * @function execCostFormula
 * @param {Object} settings - Configuration object containing price data
 * @param {Array} settings.price - Array of price entries with id, parent, title, and price properties
 * @param {Object} product - Product object containing formula and variation data
 * @param {string} product.formula_cost - The cost calculation formula string (e.g., "price * 1.21")
 * @param {Array} product.var_price - Array of product price variations with parent and title properties
 * @returns {Promise<number>} The calculated cost result as a float, or 0 if formula is empty or execution fails
 * @throws {Error} Logs error to console if formula execution fails, but returns 0 instead of throwing
 * 
 * @description
 * This function processes a cost formula by:
 * 1. Replacing price entry IDs with their corresponding price values
 * 2. Replacing "COATING" keyword with matching price values based on parent/title variations
 * 3. Safely evaluating the resulting mathematical expression
 * 4. Returning the calculated result or 0 on error
 * 
 * @example
 * const settings = {
 *   price: [
 *     { id: 'base_price', price: 100 },
 *     { parent: 'coating', title: 'premium', price: 1.5 }
 *   ]
 * };
 * const product = {
 *   formula_cost: 'base_price * COATING',
 *   var_price: [{ parent: 'coating', title: 'premium' }]
 * };
 * const result = await execCostFormula(settings, product); // Returns 150
 */
export const execCostFormula = async (settings, product) => {
    const result = evaluateCostFormula({
        settings,
        product,
        coilPriceM2: toFiniteNumber(product?.COIL_PRICE_M2 ?? product?.coil_price_m2, NaN)
    });

    return Number.isFinite(result) ? parseFloat(result) : 0;
}
