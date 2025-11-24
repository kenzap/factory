import { calculateItemTotal, getPrice } from "../../helpers/price.js";
import { bus } from "../../modules/bus.js";

/**
 * A client search component that provides autocomplete functionality for searching clients.
 * Example, in the orders journal.
 *  
 * @class ClientSearch  
 */
export const updateCalculations = (cell, settings, order) => {

    // console.log('Updating calculations for cell:', cell.getField());

    const row = cell.getRow();
    const data = row.getData();
    const cellField = cell.getField();

    let coating = data.coating || "";
    let color = data.color || "";
    let price = { price: 0, formula_width_calc: "", formula_length_calc: "" };

    // update product price in the row | based on sketch data
    if (data._id && !data.input_fields_values) {

        // console.log('getPrice settings:', settings);
        price = getPrice(settings, { ...data, coating: coating, color: color });

        // Apply adjustment to the calculated price if adj exists
        if (data.adj && !isNaN(data.adj) && !isNaN(data.formula_length_calc)) {
            price.price = price.price + (data.adj * data.formula_length_calc / 1000);
        }

        row.update({
            price: price.price,
        });
    }

    // update product price when formula_length = L | no sketch data
    // console.log('Data before calculation:', data);
    if (data._id && ((data.formula_length === "L" || data.formula_width === "W"))) {

        // data.input_fields[0].default = data.length || 0;

        if (!data.input_fields_values) { data.input_fields_values = {}; }
        if (data.formula_width) data.input_fields_values.inputW = data.formula_width_calc || 0;
        if (data.formula_length) data.input_fields_values.inputL = data.formula_length_calc || 0;

        if (!data.input_fields) { data.input_fields = []; }
        if (data.formula_width) {
            const existingW = data.input_fields.find(field => field.label === "W");
            if (existingW) {
                existingW.default = data.input_fields_values.inputW;
            } else {
                data.input_fields.push({ label: "W", default: data.input_fields_values.inputW });
            }
        }
        if (data.formula_length) {
            const existingL = data.input_fields.find(field => field.label === "L");
            if (existingL) {
                existingL.default = data.input_fields_values.inputL;
            } else {
                data.input_fields.push({ label: "L", default: data.input_fields_values.inputL });
            }
        }

        price = getPrice(settings, { ...data, coating: coating, color: color, input_fields: data.input_fields, input_fields_values: data.input_fields_values });

        // Apply adjustment to the calculated price if adj exists
        if (data.adj && !isNaN(data.adj) && !isNaN(data.formula_length_calc)) {
            price.price = price.price + (data.adj * data.formula_length_calc / 1000);
        }
        // console.log('getPrice (formula_length = L):', price);

        row.update({
            price: price.price,
        });
    }

    // update product width and length in the row
    if (cellField == "title" && data._id && !data.input_fields_values) {

        row.update({
            product: data.title,
            width: isNaN(price.formula_width_calc) ? "" : price.formula_width_calc || "",
            length: isNaN(price.formula_length_calc) ? "" : price.formula_length_calc || "",
        });
    }

    // Calculate square footage
    const area = calculatearea(data.formula_width_calc, data.formula_length_calc);
    console.log('Calculated area:', area);

    if (!data.sketch_attached) row.update({ area: isNaN(area) ? "" : area });

    // Calculate total price
    const total = calculateItemTotal(
        data.qty,
        price.price,
        data.adj,
        data.discount,
        data.formula_length_calc
    );
    row.update({ total: total });

    bus.emit('order:table:sync:items');
    // bus.emit('order:table:refreshed', order);

    // console.log('Updating', row.getData());
}

// Function to calculate square footage
const calculatearea = (width, length) => {
    if (width && length) {
        return ((width * length) / 1000000).toFixed(3); // Convert mm² to m²
    }
    return 0;
}