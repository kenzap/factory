import { getDbConnection, log, sid } from '../_/helpers/index.js';


async function verifyProducts() {

    const client = getDbConnection();
    let products = [], meta = {}, locale = 'default';

    // js->'data'->'locales'->$3->>'sdesc' AS sdesc,
    // js->'data'->'title' AS title_default,
    // js->'data'->'status' AS status,
    // js->'data'->'var_price' AS var_price,

    // Build base query
    let query = `
        SELECT
            _id,
            js->'data'->'locales'->$3->>'title' AS title,
            js->'data'->>'calc_price' AS calc_price,
            jsonb_array_length(js->'data'->'var_price') AS var_price_length
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'var_price' != '[]' AND (js->'data'->'status' != '0') AND (js->'data'->>'calc_price' = 'variable')
        ORDER BY var_price_length DESC
    `;

    let params = ['ecommerce-product', sid, locale];

    // ORDER BY name ASC
    try {

        await client.connect();

        // get products
        const result = await client.query(query, params);
        products = result.rows;

        // get total records
        // const countResult = await client.query(countQuery, countParams);
        // total_records = parseInt(countResult.rows[0].count, 10);

        meta = {};

    } finally {
        await client.end();
    }

    return { products, meta };
}

// API route
function verifyProductIntegrity(app) {

    // authenticateToken
    app.post('/api/verify-product-integrity/', async (req, res) => {
        try {

            // const locale = await getLocale(req.headers.locale);
            const verify = await verifyProducts();

            res.send({ success: true, verify, sid: 0 });
        } catch (err) {

            res.status(500).json({ error: 'failed to get verification data' });
            log(`Error getting verification data: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default verifyProductIntegrity;