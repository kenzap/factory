import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, locale, log, sid } from '../_/helpers/index.js';

/**
 * Get Product List
 *
 * @version 1.0
 * @param {Object} filter - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getProducts(filters = { for: 'product-list', limit: 50, offset: 0, s: '', cat: '' }) {

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
            js->'data'->'cats' AS cats,
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
        query += ` AND (unaccent(js->'data'->'locales'->$3->>'title') ILIKE unaccent($4) OR unaccent(js->'data'->>'title') ILIKE unaccent($4))`;
        params.push(`%${filters.s}%`);
    }

    // Add cat search matching filter if present
    if (filters.cat && filters.cat.trim() !== '') {
        query += ` AND js->'data'->'stock'->'category' @> $${params.length + 1}::jsonb`;
        params.push(JSON.stringify([filters.cat]));
    }

    // Pagination
    const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 50;
    const offset = Number.isInteger(filters.offset) && filters.offset > 0 ? filters.offset : 0;
    params.push(limit, offset);

    if (filters.for == 'product-list') {
        query += `
            ORDER BY js->'data'->>'created' DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;
    }

    if (filters.for == 'stock') {
        query += `
            ORDER BY js->'data'->>'priority' DESC, js->'data'->'locales'->$3->>'title' ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;
    }

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
            const locale = await getLocale(req.headers?.locale);
            const records = await getProducts(filters);
            const settings = await getSettings(["currency", "currency_symb", "currency_symb_loc", "system_of_units", "stock_categories"]);

            res.send({ success: true, user: req.user, settings, locale, products: records.products, meta: records.meta, message: '' });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductsApi;