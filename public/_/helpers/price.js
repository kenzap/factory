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

    let obj = {};

    if (item.coating == '-') item.coating = 'Painted';

    switch (item.calc_price) {

        case 'variable':

            const item_price = item.var_price.find(o => o.parent === item.coating && o.title === item.color);

            console.log('getPrice variable item_price:', item);

            obj.price = item_price ? item_price.price : 0;
            obj.total = obj.price * item.qty || 1;
            obj.formula_width = item.formula_width ? item.formula_width : '0';
            obj.formula_length = item.formula_length ? item.formula_length : '0';
            obj.formula_width_calc = item.formula_width;
            obj.formula_length_calc = item.formula_length;

            break;
        case 'formula':
        default:

            const coating_price = getCoatingPrice(settings, item.coating, item.color);

            obj.formula = item.formula;
            obj.formula_price = item.formula_price ? item.formula_price : '0';
            obj.formula_width = item.formula_width ? item.formula_width : '0';
            obj.formula_length = item.formula_length ? item.formula_length : '0';
            obj.formula_width_calc = item.formula_width;
            obj.formula_length_calc = item.formula_length;

            // selected coating price
            obj.formula = obj.formula.replaceAll("COATING", coating_price);
            obj.formula_price = obj.formula_price.replaceAll("COATING", coating_price);
            obj.formula_price = obj.formula_price.replaceAll("M2", item.formula + "/1000000");

            for (let price of settings.price) {

                if (price.id.length > 0) {

                    obj.formula = obj.formula.replaceAll(price.id, parseFloat(price.price));
                    obj.formula_price = obj.formula_price.replaceAll(price.id, parseFloat(price.price));
                }
            }

            item.input_fields.forEach((field, i) => {

                obj.formula = obj.formula.replaceAll(field.label, field.default);
                obj.formula_price = obj.formula_price.replaceAll(field.label, field.default);
                obj.formula_width_calc = obj.formula_width_calc.replaceAll(field.label, field.default);
                obj.formula_length_calc = obj.formula_length_calc.replaceAll(field.label, field.default);
            });

            // make final calculations
            obj.price = makeNumber((calculate(obj.formula) / 1000000 * coating_price)) + makeNumber(calculate(obj.formula_price));
            obj.total = obj.price * item.qty;
            obj.formula_width_calc = calculate(obj.formula_width_calc);
            obj.formula_length_calc = calculate(obj.formula_length_calc);

            break;
    }

    return obj;
}

/**
 * Calculates order totals including tax information based on VAT status
 * @param {Object} settings - Configuration settings containing tax information
 * @param {Object} order - Order object containing VAT status and other order details
 * @param {string} order.vat_status - VAT status ("0" for non-VAT payer, "1" for valid VAT payer)
 * @returns {Object} Object containing VAT status and price breakdown
 * @returns {string} returns.vat_status - VAT status of the order
 * @returns {Object} returns.price - Price calculation details
 * @returns {boolean} returns.price.tax_calc - Whether tax calculation is enabled
 * @returns {number} returns.price.tax_percent - Tax percentage applied
 * @returns {number} returns.price.tax_total - Total tax amount
 * @returns {number} returns.price.total - Subtotal before tax
 * @returns {number} returns.price.grand_total - Final total including tax
 */
export const getTotals = (settings, order) => {

    order.price = { tax_calc: false, tax_percent: 0, tax_total: 0, total: 0, grand_total: 0 };

    // let obj = { vat_status: "0", price: { tax_calc: false, tax_percent: 0, tax_total: 0, total: 0, grand_total: 0 } };

    let reversed_tax = false;

    order.items.forEach(obj => {

        if (!obj.price || !obj.qty || !obj.tax_id) return;

        obj.total = calculateItemTotal(obj.qty, obj.price, obj.adj, obj.discount);

        if (obj.tax_id.length == 4) reversed_tax = true;

        order.price.total += obj.total;

        // reversed tax
        order.price.tax_company_total += obj.tax_id.length == 4 ? 0 : obj.total * (parseFloat(settings.tax_percent) / 100);
        order.price.tax_individual_total += obj.total * (parseFloat(settings.tax_percent) / 100);

        // console.log('discount ' +  getDiscount(obj.discounts));
        // console.log(obj.tax_id + " " + (obj.tax_id.length == 4 ? 0 : total * 0.21));
    });

    order.price.tax_calc = true;
    order.price.tax_total = order.price.total * ((order.price.tax_percent / 100));
    order.price.grand_total = order.price.total + order.price.tax_total;

    // valid VAT payer
    if (order.vat_status == "1") {

        order.price.tax_calc = true;
        order.price.tax_percent = 0;
        order.price.tax_total = 0;
        order.price.total = order.price.total;
        order.price.grand_total = order.price.total

        // non VAT payer  
    } else {

        order.price.tax_calc = true;
        order.price.tax_percent = parseFloat(settings.tax_percent);
        order.price.tax_total = order.price.total * parseFloat(settings.tax_percent) / 100;
        order.price.total = order.price.total;
        order.price.grand_total = order.price.total + order.price.tax_total;
    }

    return order.price;
}

/**
 * Calculates the total price for an item with adjustments and discounts applied.
 * 
 * @param {number|string} qty - The quantity of items
 * @param {number|string} price - The unit price per item
 * @param {number} adj - Price adjustment amount (can be positive or negative)
 * @param {number|string} discount - Discount percentage (can include '%' symbol) or decimal value
 * @returns {number} The final calculated price rounded to 2 decimal places, minimum 0
 * 
 * @example
 * // Calculate total for 2 items at $10 each, with $5 adjustment and 10% discount
 * calculateItemTotal(2, 10, 5, 10); // Returns 22.50
 * 
 * @example
 * // Using percentage string format
 * calculateItemTotal(1, 100, 0, "15%"); // Returns 85.00
 */
export const calculateItemTotal = (qty, price, adj, discount) => {

    console.log('calculateItemTotal', qty, price, adj, discount);

    const basePrice = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
    const adjustedPrice = basePrice + (adj || 0);

    // Handle discount with % sign - extract numeric value
    let discountValue = discount || 0;
    if (typeof discountValue === 'string' && discountValue.includes('%')) {
        discountValue = parseFloat(discountValue.replace('%', '')) || 0;
    }

    const discountAmount = adjustedPrice * (discountValue / 100);
    const finalPrice = adjustedPrice - discountAmount;

    console.log('Final price calculation:', {
        basePrice,
        finalPrice
    });
    return parseFloat(Math.max(0, finalPrice).toFixed(2));
}

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
export const getCoatingPrice = (settings, coatingType, coatingColor) => {

    if (!settings || !settings.price) return null;

    const coating = settings.price.find(item => item.parent === coatingType && item.title === coatingColor);
    return coating ? coating.price : 0;
}