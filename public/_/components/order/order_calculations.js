import { calculateItemTotal, getPrice } from "../../helpers/price.js";
import { bus } from "../../modules/bus.js";

/**
 * A client search component that provides autocomplete functionality for searching clients.
 * Example, in the orders journal.
 * 
 * @class ClientSearch 
 */
export const updateCalculations = (cell, settings) => {

    // console.log('Updating calculations for cell:', cell.getField());

    const row = cell.getRow();
    const data = row.getData();
    const cellField = cell.getField();

    let coating = data.coating || "";
    let color = data.color || "";
    let price = { price: 0, formula_width_calc: "", formula_length_calc: "" };

    // update product price in the row
    if (data._id && !data.input_fields_values) {

        // console.log('getPrice settings:', settings);
        price = getPrice(settings, { ...data, coating: coating, color: color });

        row.update({
            price: price.price,
        });
    }

    // calculate price based on the product's formula
    if (cellField == "title" && data._id && !data.input_fields_values) {

        row.update({
            product: data.title,
            width: price.formula_width_calc || "",
            length: price.formula_length_calc || "",
        });
    }

    // Calculate square footage
    const area = calculatearea(data.formula_width_calc, data.formula_length_calc);
    // console.log('Calculated area:', area);

    if (!data.input_fields_values) row.update({ area: area });

    // Calculate total price
    const total = calculateItemTotal(
        data.qty,
        data.price,
        data.adj,
        data.discount
    );
    row.update({ total: total });

    bus.emit('order:table:sync:items');
    bus.emit('order:table:refreshed');

    // console.log('Updating', row.getData());
}

// Function to calculate square footage
const calculatearea = (width, length) => {
    if (width && length) {
        return ((width * length) / 1000000).toFixed(3); // Convert mm² to m²
    }
    return 0;
}