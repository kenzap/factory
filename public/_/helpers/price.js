import { makeNumber } from "./global.js";

/**
 * Calculates pricing information based on item configuration and parameters
 * @param {Object} state - The application state object
 * @param {string} state.item.calc_price - Price calculation method ('variable' or 'formula')
 * @param {string} [state.item.formula] - Formula string for price calculation
 * @param {string} [state.item.formula_price] - Additional formula for price calculation
 * @param {string} [state.item.formula_width] - Formula for width calculation
 * @param {string} [state.item.formula_length] - Formula for length calculation
 * @param {Array} state.settings.price - Array of price objects with id and price properties
 * @param {Object|string|number} p - Parameters object or HTML element value
 * @param {number} [p.qty] - Quantity when p is an object
 * @param {Object} [p.coating] - Coating object when p is an object
 * @param {number} p.coating.price - Coating price
 * @param {Array} [p.input_fields] - Array of input field objects with label and default properties
 * @returns {Object} Price calculation result object
 * @returns {number} returns.price - Calculated unit price
 * @returns {number} returns.total - Total price (price * quantity)
 * @returns {string} [returns.formula] - Processed formula string
 * @returns {string} [returns.formula_price] - Processed price formula string
 * @returns {string} returns.formula_width - Width formula or calculation result
 * @returns {string} returns.formula_length - Length formula or calculation result
 * @returns {number|string} returns.formula_width_calc - Calculated width value
 * @returns {number|string} returns.formula_length_calc - Calculated length value
 */
export const getPrice = (settings, item) => {
    const obj = {
        formula_width: item.formula_width || '0',
        formula_length: item.formula_length || '0',
        formula_width_calc: item.formula_width,
        formula_length_calc: item.formula_length
    };

    if (item.calc_price === 'variable') {
        return calculateVariablePrice(item, obj);
    }

    if (item.calc_price === 'formula') {
        return calculateFormulaPrice(settings, item, obj);
    }

    return { price: 0, total: 0 }
};

/**
 * Calculates the variable price for an item based on its properties and applies adjustments and discounts.
 * 
 * @param {Object} item - The item object containing pricing and configuration data
 * @param {boolean} item.cm - Flag indicating if the item uses centimeter-based pricing
 * @param {Array} item.var_price - Array of variable price objects with code, parent, title, and price properties
 * @param {string} item.coating - The coating type for the item
 * @param {string} item.color - The color of the item
 * @param {number} [item.adj] - Price adjustment value
 * @param {number} [item.formula_length_calc] - Length calculation value for formula-based pricing
 * @param {number} [item.discount] - Discount percentage (0-100)
 * @param {number} [item.qty] - Quantity of the item (defaults to 1)
 * @param {Object} obj - The object to store calculated price values
 * @returns {Object} The updated object with calculated price and total properties
 */
const calculateVariablePrice = (item, obj) => {

    // get variable price for client material (code: cm) or coating and color
    const itemPrice = item.cm == true ? item.var_price?.find(o => o.code === "cm") : item.var_price?.find(o => o.parent === item.coating && o.title === item.color);

    obj.price = parseFloat(itemPrice?.price) || 0;

    // Apply manual price adjustments
    if (item.adj && !isNaN(item.adj)) {

        item.adj = parseFloat(item.adj);
        item.formula_length_calc = parseFloat(item.formula_length_calc);

        obj.price += (item.formula_length_calc && !isNaN(item.formula_length_calc))
            ? item.adj * item.formula_length_calc / 1000
            : item.adj;
    }

    // if item coating and color set to empty price to 0
    if (item.coating === '' && item.color === '') obj.price = 0;

    // Apply discount
    if (item.discount > 0) {

        item.discount = parseFloat(item.discount);
        obj.price = Math.round(obj.price * (1 - item.discount / 100) * 100) / 100;
    }

    // Calculate total price
    obj.total = obj.price * (item.qty || 1);
    return obj;
};

/**
 * Calculates the total price for an item based on formula, coating, and additional costs.
 * 
 * @param {Object} settings - Configuration settings for price calculations
 * @param {Object} item - The item object containing pricing parameters
 * @param {string} item.coating - Coating type for the item
 * @param {string} item.color - Color specification for the item
 * @param {boolean} item.cm - Flag indicating if item is a custom measurement
 * @param {string} item.formula - Base formula string for area calculation
 * @param {string} [item.formula_price] - Additional cost formula string (defaults to '0')
 * @param {number} [item.discount] - Discount percentage to apply to additional price
 * @param {number} [item.adj] - Adjustment value to add to final price
 * @param {number} item.qty - Quantity of items
 * @param {Object} obj - Object to store calculated results
 * @param {string} obj.formula_width_calc - Formula for width calculation
 * @param {string} obj.formula_length_calc - Formula for length calculation
 * 
 * @returns {Object} Updated object with calculated pricing information
 * @returns {string} returns.formula - Processed formula with variables replaced
 * @returns {string} returns.formula_price - Processed additional price formula
 * @returns {number} returns.formula_width_calc - Calculated width value
 * @returns {number} returns.formula_length_calc - Calculated length value
 * @returns {number} returns.price - Final unit price including all calculations
 * @returns {number} returns.total - Total price (unit price × quantity)
 */
const calculateFormulaPrice = (settings, item, obj) => {

    // Get coating price per m2
    let coatingPrice = getCoatingPrice(settings, item.coating, item.color, item.cm);

    // console.log('getCoating settings:', settings);
    console.log('calculateFormulaPrice for item:', item);
    // console.log('getCoating price:', coatingPrice);

    // m2 calculation
    obj.formula = item.formula;
    obj.formula = replaceFormulaVariables(obj.formula, settings, item, coatingPrice);

    // Additional cost calculation or pm 
    obj.formula_price = item.formula_price || '0';
    obj.formula_price = replaceFormulaVariables(obj.formula_price, settings, item, coatingPrice);

    // Replace in width/length calculations
    [obj.formula_width_calc, obj.formula_length_calc] = replaceInDimensions([obj.formula_width_calc, obj.formula_length_calc], item);

    // Coating price per m2 (no discount applied to coating)
    let basePrice = makeNumber(calculate(obj.formula) / 1000000 * coatingPrice);

    // Additional cost calculation (per meter price)
    let additionalPrice = makeNumber(calculate(obj.formula_price));

    // Apply discount only to the per-meter (additional) price component
    if (item.discount > 0) {
        additionalPrice *= (1 - item.discount / 100);
    }

    // if coating price is 0, set total to 0 to avoid charging for additional costs when coating is not selected
    if (!item.cm && coatingPrice === 0) { basePrice = 0; additionalPrice = 0; }

    obj.price = basePrice + additionalPrice + (item.adj && !item.formula_length_calc ? item.adj : 0);

    // if client material, price excludes coating price
    if (item.cm) obj.price = additionalPrice + (item.adj && !item.formula_length_calc ? item.adj : 0);

    // if item coating and color set to empty price to 0
    if (item.coating === '' && item.color === '') obj.price = 0;

    // Apply adjustments
    if (item.adj && !isNaN(item.adj)) {
        obj.price += (item.formula_length_calc && !isNaN(item.formula_length_calc))
            ? item.adj * item.formula_length_calc / 1000
            : item.adj;
    }

    obj.coating_price = coatingPrice;
    obj.total = obj.price * item.qty;
    obj.formula_width_calc = calculate(obj.formula_width_calc);
    obj.formula_length_calc = calculate(obj.formula_length_calc);

    return obj;
};

/**
 * Replaces variables in a formula string with actual values from settings and item data.
 * 
 * @param {string} formula - The formula string containing variables to be replaced
 * @param {Object} settings - Settings object containing price configurations
 * @param {Array} settings.price - Array of price objects with id and price properties
 * @param {Object} item - Item object containing formula data and dimensions
 * @param {number} item.formula - Base formula value used for M2 calculation
 * @param {Object} [item.input_fields_values] - Override values when sketch is attached
 * @param {boolean} [item.sketch_attached] - Flag indicating if sketch is attached
 * @param {Array} [item.input_fields] - Array of input field objects with label and default properties
 * @param {number} item.formula_width_calc - Width calculation value used as fallback for W
 * @param {number} item.formula_length_calc - Length calculation value used as fallback for L
 * @param {number} coatingPrice - Coating price value to replace COATING variable
 * 
 * @returns {string} The processed formula string with all variables replaced by their values
 * 
 * @description
 * Processing order:
 * 1. Replaces COATING with coatingPrice
 * 2. Replaces M2 with formula/1000000
 * 3. Replaces price IDs from settings with their corresponding prices
 * 4. If sketch is attached, replaces variables with input_fields_values
 * 5. Replaces input field labels with defaults, or falls back to W/L with calculated values
 */
const replaceFormulaVariables = (formula, settings, item, coatingPrice) => {

    // console.log('replaceFormulaVariables', item);

    let result = formula
        .replaceAll("COATING", coatingPrice)
        .replaceAll("M2", `${item.formula}/1000000`);

    // Replace price IDs
    settings.price.forEach(price => {
        if (price.id.length > 0) {
            result = result.replaceAll(price.id, parseFloat(price.price));
        }
    });

    // Sketch attached | override with input_fields_values
    if (item.sketch_attached) {
        Object.keys(item.input_fields_values).forEach(key => {
            result = result.replaceAll(key.replace('input', ''), item.input_fields_values[key]);
        });
    }

    // No sketch attached
    if (!item.sketch_attached) {

        // Allows direct replacement of W if specified in orders table
        if (item.formula_width == "W") {
            result = result.replaceAll("W", item.formula_width_calc);
        }

        // Allows direct replacement of L if specified in orders table
        if (item.formula_length == "L") {
            result = result.replaceAll("L", item.formula_length_calc);
        }

        // Use default input field values or fallback to W/L
        if (item.input_fields?.length) {
            item.input_fields.forEach(field => {
                result = result.replaceAll(field.label, field.default);
            });
        }
    }

    // console.log('replaceFormulaVariables result', result);

    return result;
};

/**
 * Replaces placeholders in dimension strings with actual values from an item's properties.
 * 
 * @param {string[]} dimensions - Array of dimension strings containing placeholders to be replaced
 * @param {Object} item - The item object containing replacement values
 * @param {Object[]} [item.input_fields] - Array of input field objects with label and default properties
 * @param {string} item.input_fields[].label - The placeholder text to be replaced
 * @param {string|number} item.input_fields[].default - The value to replace the placeholder with
 * @param {string|number} [item.formula_width_calc] - The value to replace "W" placeholders when input_fields is not available
 * @param {string|number} [item.formula_length_calc] - The value to replace "L" placeholders when input_fields is not available
 * @returns {string[]} Array of dimension strings with placeholders replaced by actual values
 */
const replaceInDimensions = (dimensions, item) => {
    return dimensions.map(dim => {
        if (item.input_fields?.length) {
            item.input_fields.forEach(field => {
                dim = dim.replaceAll(field.label, field.default);
            });
        } else {
            dim = dim
                .replaceAll("W", item.formula_width_calc)
                .replaceAll("L", item.formula_length_calc);
        }
        return dim;
    });
};

/**
 * Evaluates a mathematical expression string and returns the calculated result.
 * 
 * @param {string} expression - The mathematical expression to evaluate (e.g., "2 + 3 * 4")
 * @returns {number|string} The calculated result as a number, or 0 for empty expressions, or empty string if evaluation fails
 * 
 * @example
 * calculate("2 + 3 * 4"); // returns 14
 * calculate(""); // returns 0
 * calculate("invalid"); // returns ""
 * 
 * @description
 * This function sanitizes the input expression by removing potentially dangerous characters
 * while preserving mathematical operators, digits, parentheses, and some comparison operators.
 * Uses Function constructor instead of eval for security reasons.
 * 
 * @throws Will not throw but catches errors internally and returns empty string on failure
 */
export const calculate = (expression) => {

    // return eval(expression);

    if (expression.length == 0) return 0;

    const sanitizedExpression = expression.replace(/[^-()\d/*+.<>&|?;:\s]/g, ''); // Strip invalid characters except <, >, &, |, ?, ;, and whitespace

    try {
        return new Function(`return (${sanitizedExpression});`)();
    } catch (error) {

        console.log("Expression:" + expression);
        console.log("Sanitized:" + sanitizedExpression);
        console.error('Error evaluating expression:', error);
        return "";
    }
}

/**
 * Finds a coating color configuration from the settings based on coating type and color.
 * 
 * @param {Object} settings - The settings object containing price configurations
 * @param {string} coatingType - The parent coating type to search for
 * @param {string} coatingColor - The specific coating color title to find
 * @returns {Object|null} The matching coating configuration object, or null if not found
 */
export const getCoatingPrice = (settings, coatingType, coatingColor, cm) => {

    if (!settings || !settings.price) return null;

    const coating = settings.price.find(item => item.parent === coatingType && item.title === coatingColor);
    return coating && !cm ? coating.price : 0;
}