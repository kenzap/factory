
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

    let reversed_tax = false;

    if (!order.items) return;

    order.items.forEach(obj => {

        if (!obj.price || !obj.qty || !obj.tax_id) return;

        obj.total = calculateItemTotal(obj.qty, obj.price, obj.adj, obj.discount);

        order.price.total += obj.total;
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

        order.price.tax_calc = false;
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
export const calculateItemTotal = (qty, price, adj, discount, length) => {

    // console.log('calculateItemTotal', qty, price, adj, discount);

    let basePrice;

    basePrice = (parseFloat(qty) || 0) * (parseFloat(price) || 0);

    return Math.round(basePrice * 100) / 100;
}