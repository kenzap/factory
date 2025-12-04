import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getLocales, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Get Product
 *
 * @version 1.0
 * @param {String} id - Product ID
 * @returns {Array<Object>} - Orders
*/
async function getProduct(id) {

    const client = getDbConnection();
    let product = {};

    // js->'data'->'locales'->$3->>'title' AS title,
    // js->'data'->'locales'->$3->>'sdesc' AS sdesc,
    // Build base query ['_id', 'img', 'status', 'priority', 'price', 'discounts', 'variations', 'locales', 'title', 'slugs', 'sdesc', 'ldesc', 'keywords', 'stock', 'cats', 'updated', 'sketch', 'modelling', 'tax_id', 'input_fields', 'formula', 'formula_price', 'cad_files', 'formula_width', 'formula_length', 'calc_price', 'linked_products', 'var_price', 'parts', 'textures'],
    let query = `
        SELECT
            _id,
            js->'data'->'title' AS title,
            js->'data'->'sdesc' AS sdesc,
            js->'data'->'ldesc' AS ldesc,
            js->'data'->'slugs' AS slugs,
            js->'data'->'keywords' AS keywords,
            js->'data'->'group' AS group,
            js->'data'->'stock' AS stock,
            js->'data'->'cats' AS cats,
            js->'data'->'sketch' AS sketch,
            js->'data'->'modelling' AS modelling,
            js->'data'->'formula_width' AS formula_width,
            js->'data'->'formula_length' AS formula_length,
            js->'data'->'formula_price' AS formula_price,
            js->'data'->'formula' AS formula,
            js->'data'->'img' AS img,
            js->'data'->'status' AS status,
            js->'data'->'var_price' AS var_price,
            js->'data'->'parts' AS parts,
            js->'data'->'textures' AS textures,
            js->'data'->'input_fields' AS input_fields,
            js->'data'->'calc_price' AS calc_price,
            js->'data'->'linked_products' AS linked_products,
            js->'data'->'cad_files' AS cad_files,
            js->'data'->'price' AS price,
            js->'data'->'discounts' AS discounts,
            js->'data'->'variations' AS variations,
            js->'data'->'priority' AS priority,
            js->'data'->'locales' AS locales,
            js->'data'->'updated' AS updated,
            js->'data'->'tax_id' AS tax_id
        FROM data
        WHERE ref = $1 AND sid = $2 AND _id = $3 LIMIT 1
    `;

    let params = ['ecommerce-product', sid, id];

    // ORDER BY name ASC
    try {

        await client.connect();

        // get products
        const result = await client.query(query, params);
        if (result.rows.length > 0) {
            product = result.rows[0];
        } else {
            throw new Error('Product not found');
        }

    } finally {
        await client.end();
    }

    return product;
}

// API route for product export
function getProductApi(app) {

    app.post('/api/get-product/', authenticateToken, async (req, res) => {
        try {

            const records = await getProduct(req.body.id);
            const locale = await getLocale(req.headers?.locale);
            const locales = await getLocales();
            const settings = await getSettings(["var_parent", "currency", "currency_symb", "currency_symb_loc", "system_of_units", "textures", "tax_calc", "price", "taxes", "groups", "stock_categories"]);

            res.send({ success: true, settings, locale, locales, product: records, user: req.user });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductApi;