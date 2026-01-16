import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, makeId, sid } from '../_/helpers/index.js';


/**
 * Create bundle record if not exists
 * @version 1.0
 * @param {JSON} data - Bundle record data
 * @returns {JSON<Object>} - Response
*/
async function createProductBundleIfNotExists(db, data) {

    let response = { created: false };

    if (!data) return { success: false, error: 'no data provided' };

    // Check if bundle record already exists
    let checkQuery = `
            SELECT _id FROM data
            WHERE ref = $1 AND sid = $2 
            AND js->'data'->>'product_id' = $3
            AND js->'data'->>'product_color' = $4
            AND js->'data'->>'product_coating' = $5
            AND js->'data'->>'bundle_id' = $6
            AND js->'data'->>'bundle_color' = $7
            AND js->'data'->>'bundle_coating' = $8
        `;

    const checkParams = [
        'product-bundle', sid,
        data.product_id,
        data.product_color,
        data.product_coating,
        data.bundle_id,
        data.bundle_color,
        data.bundle_coating
    ];

    const checkResult = await db.query(checkQuery, checkParams);

    if (checkResult.rows.length > 0) {

        console.log('Bundle record already exists for', data.product_color, data.product_coating);

        // Bundle record already exists
        return { success: true, message: 'bundle record already exists' };
    }

    // Create new bundle record
    const insertQuery = `
            INSERT INTO data (_id, pid, ref, sid, js)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING _id
        `;

    const insertParams = [
        makeId(),
        0,
        'product-bundle',
        sid,
        JSON.stringify({ data: data, meta: { created: Math.floor(Date.now() / 1000), updated: Math.floor(Date.now() / 1000) } })
    ];

    // console.log('Creating new product bundle record for', data.product_color, data.product_coating);

    const insertResult = await db.query(insertQuery, insertParams);

    response = { created: true, ...insertResult.rows[0] || {} };

    return response;
}

/**
 * Sync Product Bundle
 * 
 * Create similar bundle records for product with same id but different colors and coatings
 *
 * {"product_id":"e440dce02c04e62e10bed94443c1721795326d9e","product_color":"Zinc","product_coating":"Zinc","bundle_id":"8sgr31mh7x74qz29xtoma26xzr6h11s8xh88ryfc","bundle_color":"Zinc","bundle_coating":"Zinc","bundle_qty":1}
 * 
 * @version 1.0
 * @param {String} id - ID
 * @returns {Object} - Query response
*/
async function syncProductBundle(product_id, bundle_id, bundle_coating, bundle_color) {

    const db = getDbConnection();

    if (!product_id) return { success: false, error: 'no product_id provided' };
    if (!bundle_id) return { success: false, error: 'no bundle_id provided' };

    let response = { bundles_created: 0 };

    // sync product bundle
    const query = `
    SELECT
        _id,
        js->'data'->'var_price' AS var_price
    FROM data
    WHERE ref = $1 AND sid = $2 AND _id = $3
    `;

    // Assume all products use the same locale
    const params = ['product', sid, product_id];

    try {

        await db.connect();

        const result = await db.query(query, params);

        const product = result.rows[0] || {};

        // Filter var_price by coating and color if provided in input products
        for (const vp of (product.var_price || [])) {

            // console.log('vp', vp);

            // create product bundle record
            const bundleData = {
                product_id: product_id,
                product_color: vp.title,
                product_coating: vp.parent,
                bundle_id: bundle_id,
                bundle_color: bundle_color == '-' ? "-" : vp.title,
                bundle_coating: bundle_coating == '-' ? "-" : vp.parent,
                bundle_qty: 1
            };

            // check if bundle record already exists
            const bundle = await createProductBundleIfNotExists(db, bundleData);

            if (bundle.created) {
                response.bundles_created += 1;
                console.log('Created bundle record for', bundle);
            }
        }

    } finally {
        await db.end();
    }

    return response;
}

// API route
function syncProductBundleApi(app) {

    app.post('/api/sync-product-bundle/', authenticateToken, async (_req, res) => {

        const response = await syncProductBundle(_req.body.product_id, _req.body.bundle_id, _req.body.bundle_coating, _req.body.bundle_color);

        // console.log('syncProductBundleApi response', response);

        res.json({ success: true, response });
    });
}

export default syncProductBundleApi;