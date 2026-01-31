import { getPrice } from "../../helpers/price.js";
import { bus } from "../../modules/bus.js";

/**
 * Refreshes calculations for a table row and updates the row data with computed values.
 * 
 * @param {Object} cell - The table cell object that triggered the refresh
 * @param {Object} settings - Configuration settings used for price calculations
 * @description This function recalculates area, price per unit, and total values for a table row,
 * updates the row with the new calculated data, and emits events to notify other components
 * of the changes. The calculations include area based on width and length formulas,
 * price per unit calculations, and item totals based on quantity and price.
 * @fires order:table:sync:items - Emitted to synchronize table items with other components
 * @fires order:table:refreshed - Emitted to notify that the table has been refreshed
 */
export const refreshRowCalculations = (cell, settings) => {

    // get row data
    const row = cell.getRow();
    const data = row.getData();

    // calculate area, price per meter and total
    const price = getPrice(settings, { ...data });
    const area = calculateArea(data.formula_width_calc, data.formula_length_calc);
    const price_length = calculatePricePerUnit(data, price);
    const total = calculateItemTotal(data.qty, price.price);

    // update row data
    row.update({
        area: area,
        price_length: price_length,
        discount: parseFloat(data.discount),
        price: price.price,
        total: total,
    });

    // notify other components
    bus.emit('order:table:sync:items');
    bus.emit('order:table:refreshed');
}

// Function to calculate item total price
const calculateItemTotal = (qty, price) => {

    let basePrice = (parseFloat(qty) || 0) * (parseFloat(price) || 0);

    return Math.round(basePrice * 100) / 100;
}

// Function to calculate square footage
const calculateArea = (width, length) => {

    let area = "";
    if (width && length) {
        area = (Math.round((width * length) / 1000) / 1000); // Convert mm² to m²
    }

    return isNaN(area) ? "" : area;
}

// Function to calculate price per meter or other unit
const calculatePricePerUnit = (data, price) => {

    let length_price = "";
    if (data.formula_length_calc && !isNaN(data.formula_length_calc)) {
        length_price = Math.round((price.price / (data.formula_length_calc / 1000)) * 100) / 100; // Price per meter
    }

    return isNaN(length_price) ? "" : length_price;
}