import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, locale, log, sid } from '../_/helpers/index.js';

async function getSettings() {

    const client = getDbConnection();

    let settings = {};

    // settings query
    const query = `
        SELECT js->'data'->>'currency' as currency, 
                js->'data'->>'currency_symb' as currency_symb, 
                js->'data'->>'currency_symb_loc' as currency_symb_loc, 
                js->'data'->>'tax_calc' as tax_calc, 
                js->'data'->>'tax_auto_rate' as tax_auto_rate, 
                js->'data'->>'tax_rate' as tax_rate, 
                js->'data'->>'tax_display' as tax_display 
        FROM data 
        WHERE ref = $1 AND sid = $2 
        LIMIT 1
    `;

    try {

        await client.connect();

        const result = await client.query(query, ['ecommerce-settings', sid]);
        if (result.rows.length > 0) {
            const row = result.rows[0];
            settings = {
                currency: row.currency,
                currency_symb: row.currency_symb,
                currency_symb_loc: row.currency_symb_loc,
                tax_auto_rate: row.tax_auto_rate,
                tax_rate: row.tax_rate,
                tax_display: row.tax_display
            };
        }
    } finally {
        await client.end();
    }

    return settings;
}

/**
 * Get Product List
 *
 * @version 1.0
 * @param {Object} filter - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getProducts(filters = { limit: 50, s: '' }) {

    const client = getDbConnection();
    let products = [], meta = {};

    // Build base query
    let query = `
        SELECT
            _id,
            js->'data'->'locales'->$3->>'title' AS title,
            js->'data'->'locales'->$3->>'sdesc' AS sdesc,
            js->'data'->'title' AS title_default,
            js->'data'->'sdesc' AS sdesc_default,
            js->'data'->'formula_length' AS formula_length,
            js->'data'->'formula_price' AS formula_price,
            js->'data'->'formula' AS formula,
            js->'data'->'img' AS img,
            js->'data'->'status' AS status,
            js->'data'->'var_price' AS var_price,
            js->'data'->'input_fields' AS input_fields,
            js->'data'->'calc_price' AS calc_price,
            js->'data'->'cad_files' AS cad_files,
            js->'data'->'price' AS price,
            js->'data'->'priority' AS priority,
            js->'data'->'updated' AS updated,
            js->'data'->'tax_id' AS tax_id
        FROM data
        WHERE ref = $1 AND sid = $2
    `;

    let params = ['ecommerce-product', sid, locale];

    // Add search filter if present
    if (filters.s && filters.s.trim() !== '') {
        query += ` AND unaccent(js->'data'->'locales'->$3->>'title') ILIKE unaccent($4)`;
        params.push(`%${filters.s}%`);
    }

    // Pagination
    const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 50;
    const offset = Number.isInteger(filters.offset) && filters.offset > 0 ? filters.offset : 0;
    params.push(limit, offset);

    query += `
        ORDER BY js->'data'->'created' DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    // Get total number of available records for pagination
    let total_records = 0;
    const countQuery = `
        SELECT COUNT(_id) FROM data
        WHERE ref = $1 AND sid = $2
        ${filters.s && filters.s.trim() !== '' ? `AND unaccent(js->'data'->'locales'->$3->>'title') ILIKE unaccent($4)` : ''}
    `;
    const countParams = params.slice(0, filters.s && filters.s.trim() !== '' ? 4 : 2);

    // ORDER BY name ASC
    try {

        await client.connect();

        // get products
        const result = await client.query(query, params);
        products = result.rows;

        // get total records
        const countResult = await client.query(countQuery, countParams);
        total_records = parseInt(countResult.rows[0].count, 10);

        meta = { limit: limit, offset: offset, total_records: total_records };

    } finally {
        await client.end();
    }

    return { products, meta };
}

// API route for product export
function getProductsApi(app) {

    app.post('/api/get-products/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body.filters || {};
            const records = await getProducts(filters);
            const settings = await getSettings();

            res.send({ success: true, settings, products: records.products, meta: records.meta, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductsApi;