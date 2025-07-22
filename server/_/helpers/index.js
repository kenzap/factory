import pkg from 'pg';

const { Client } = pkg;

export const sid = 1002170; // Default space ID

// logging
export function log(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

// Database connection helper
export function getDbConnection() {

    console.log('Connecting to database...', process.env.DATABASE_URL);
    return new Client({
        connectionString: process.env.DATABASE_URL
    });
}

// Helper function to get locale
export async function getLocale(client, sid, lang) {
    // Implementation would depend on your locale storage structure
    return {};
}

// Helper function to evaluate math expressions safely
export function evalmath(equation) {
    if (equation.includes(':')) {
        equation = equation.split(':')[1];
    }

    if (!equation) equation = '1';

    try {
        // Basic math evaluation - replace with a proper math parser for production
        return Function('"use strict"; return (' + equation + ')')();
    } catch (e) {
        return 1;
    }
}

export function makeNumber(price) {
    price = price || 0;
    price = parseFloat(price);
    return Math.round(price * 100) / 100;
}

export function priceFormat(state, price) {
    price = makeNumber(price);
    price = parseFloat(price).toFixed(2);

    // Handle Swedish currency conversion
    if (process.env.LANG === 'sv') {
        state.settings.currency_symb = 'kr';
        price = (parseFloat(price) * 12).toFixed(2);
    }

    switch (state.settings.currency_symb_loc) {
        case 'left':
            price = state.settings.currency_symb + price;
            break;
        case 'right':
            price = price + state.settings.currency_symb;
            break;
        case 'left_space':
            price = state.settings.currency_symb + ' ' + price;
            break;
        case 'right_space':
            price = price + ' ' + state.settings.currency_symb;
            break;
    }

    return price;
}

export function getMinPrice(state, item, html = false) {
    const obj = { COATING: 1 };

    switch (item.calc_price) {
        case 'complex':
            obj.price = 0;
            obj.total = 0;
            obj.type = 'complex';
            return html ? '<div class="badge rounded-pill bg-danger fw-bold mt-3" style="font-size: 1rem;">Calculate</div>' : 0.00;

        case 'variable':
            if (!item.var_price || !item.var_price[0]) {
                item.var_price = [{ price: 0 }];
            }

            let min_price = parseFloat(item.var_price[0].price);
            item.var_price.forEach(price => {
                if (parseFloat(price.price) < min_price) {
                    min_price = parseFloat(price.price);
                }
            });

            obj.price = makeNumber(min_price);
            obj.total = obj.price;
            obj.type = 'variable';

            return html ?
                `<div class="badge rounded-pill bg-danger fw-bold mt-3" style="font-size: 1.1rem;"><span style="font-size:0.8rem">no</span> ${priceFormat(state, obj.total)}</div>` :
                obj.total;

        case 'formula':
        default:
            obj.formula = item.formula;
            obj.formula_price = item.formula_price;

            state.sk_settings.price.forEach(price => {
                if (price.id === "ZN") {
                    obj.COATING = parseFloat(price.price);
                }

                if (price.id && price.id.length > 0) {
                    obj.formula = obj.formula.replace(new RegExp(price.id, 'g'), parseFloat(price.price));
                    obj.formula_price = obj.formula_price.replace(new RegExp(price.id, 'g'), parseFloat(price.price));
                }
            });

            obj.formula = obj.formula.replace(/COATING/g, obj.COATING);
            obj.formula_price = obj.formula_price.replace(/COATING/g, obj.COATING);
            obj.formula_price = obj.formula_price.replace(/M2/g, item.formula + "/1000000");

            item.input_fields.forEach(field => {
                obj.formula = obj.formula.replace(new RegExp(field.label, 'g'), field.default);
                obj.formula_price = obj.formula_price.replace(new RegExp(field.label, 'g'), field.default);
            });

            obj.price = makeNumber((evalmath(obj.formula) / 1000000 * obj.COATING)) + makeNumber(evalmath(obj.formula_price));
            obj.total = obj.price * 1;
            obj.type = 'formula';

            return html ?
                `<div class="badge rounded-pill bg-danger fw-bold mt-3" style="font-size: 1.1rem;"><span style="font-size:0.8rem">no</span> ${priceFormat(state, obj.total)}</div>` :
                obj.total;
    }
}