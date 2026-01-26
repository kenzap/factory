import pkg from 'pg';

const { Client } = pkg;

export const sid = 1002170; // Default space ID
export const locale = "lv"; // Default locale

export function __html(locales, key) {
    // This function should return the HTML for the given key
    // For now, it just returns the key itself
    locales = locales || {};
    if (locales.values && locales.values[key]) {
        return locales.values[key];
    }

    return key;
}

export function attr(key) {
    // This function should return the HTML for the given key
    // For now, it just returns the key itself
    return key;
}

// logging
export function log(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

// error logging with reporting
export function log_error(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

// Database connection helper
export function getDbConnection() {
    return new Client({
        connectionString: process.env.DATABASE_URL
        // connectionString: "postgresql://skarda_design:weid84£q213c23Rvd00hjsdaFVDfLSQsvdsfVFDQ@host.docker.internal:5433/skarda_design"
    });
}

export const makeId = () => {

    let length_ = 40; // Default length

    let chars = 'abcdefghiklmnopqrstuvwxyz1234567890'.split('');
    if (typeof length_ !== "number") {
        length_ = Math.floor(Math.random() * chars.length_);
    }
    let str = '';
    for (let i = 0; i < length_; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

export const getLocale = async (locale) => {

    if (!locale) locale = process.env.LOCALE || 'en'; // Default to 'en' if not set

    const db = getDbConnection();
    await db.connect();

    let response = { values: {} };

    try {

        // Get locales
        const query = `
            SELECT 
                js->'data'->'content' as locale
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'locale' = $3 AND js->'data'->>'ext' = 'dashboard'
            LIMIT 1
        `;

        const result = await db.query(query, ['locale', sid, locale]);
        if (result.rows.length > 0) {

            response.values = result.rows[0].locale || {};
        }

    } finally {
        await db.end();
    }

    return response;
}

export const getLocales = async () => {

    const client = getDbConnection();
    await client.connect();

    let locales = {};

    try {

        // Get locales
        const query = `
            SELECT 
                js->'data'->'locale' as locale,
                js->'data'->'language' as language
            FROM data 
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'ext' = 'ecommerce'
            LIMIT 50
        `;

        const result = await client.query(query, ['locale', sid]);
        if (result.rows.length > 0) {

            locales = result.rows;
        }

    } finally {
        await client.end();
    }

    return locales;
}

export const getSettings = async (fields) => {

    const client = getDbConnection();
    await client.connect();

    let settings = {};

    try {

        // Get settings by specified fields
        let query;
        if (fields && fields.length > 0) {
            const fieldSelections = fields.map(field => `js->'data'->'${field}' as ${field}`).join(', ');
            query = `
            SELECT ${fieldSelections}
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
            `;
            // Default fields if none specified
        } else {
            query = `
            SELECT js->'data'->'currency' as currency, 
                   js->'data'->'currency_symb' as currency_symb, 
                   js->'data'->'currency_symb_loc' as currency_symb_loc, 
                   js->'data'->'tax_calc' as tax_calc, 
                   js->'data'->'tax_auto_rate' as tax_auto_rate, 
                   js->'data'->'tax_rate' as tax_rate, 
                   js->'data'->'tax_percent' as tax_percent, 
                   js->'data'->'tax_display' as tax_display,
                   js->'data'->'price' as price,
                   js->'data'->'var_parent' as var_parent,
                   js->'data'->'textures' as textures
            FROM data 
            WHERE ref = $1 AND sid = $2 
            LIMIT 1
            `;
        }

        const result = await client.query(query, ['settings', sid]);
        if (result.rows.length > 0) {
            const row = result.rows[0];

            if (fields && fields.length > 0) {

                // Only include the requested fields
                fields.forEach(field => {
                    settings[field] = row[field];
                });

            } else {

                // Default fields when none specified
                settings = {
                    currency: row.currency,
                    currency_symb: row.currency_symb,
                    currency_symb_loc: row.currency_symb_loc,
                    tax_calc: row.tax_calc,
                    tax_auto_rate: row.tax_auto_rate,
                    tax_rate: row.tax_rate,
                    tax_percent: row.tax_percent,
                    tax_display: row.tax_display,
                    price: row.price,
                    var_parent: row.var_parent,
                    textures: row.textures || []
                };
            }

            // Always include logo regardless of fields parameter
            settings.logo = process.env.LOGO || 'https://cdn.kenzap.com/logo.svg';
        }

    } finally {
        await client.end();
    }

    return settings;
}

// Helper function to get locale
// export async function getLocale(client, sid, lang) {
//     // Implementation would depend on your locale storage structure
//     return {};
// }

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

export function priceFormat(settings, price) {
    price = makeNumber(price);
    price = parseFloat(price).toFixed(2);

    // Handle Swedish currency conversion
    if (process.env.LANG === 'sv') {
        settings.currency_symb = 'kr';
        price = (parseFloat(price) * 12).toFixed(2);
    }

    switch (settings.currency_symb_loc) {
        case 'left':
            price = settings.currency_symb + price;
            break;
        case 'right':
            price = price + settings.currency_symb;
            break;
        case 'left_space':
            price = settings.currency_symb + ' ' + price;
            break;
        case 'right_space':
            price = price + ' ' + settings.currency_symb;
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