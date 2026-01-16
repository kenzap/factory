import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, locale, log_error, sid } from '../_/helpers/index.js';

/**
 * Get Product Stock
 *
 * @version 1.0
 * @param {Object} filter - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getProductBundles(products) {

    const db = getDbConnection();

    let response = [];

    // get product stock
    try {

        await db.connect();

        // Get bundle records for provided products
        for (const product of (products || [])) {

            const query = `
                SELECT
                    pb._id as _id,
                    pb.js->'data'->>'product_id' AS product_id,
                    pb.js->'data'->>'bundle_id' AS bundle_id,
                    pb.js->'data'->>'bundle_color' AS color,
                    pb.js->'data'->>'bundle_coating' AS coating,
                    pb.js->'data'->>'bundle_qty' AS qty,
                    ep.js->'data'->'locales'->$3->>'title' AS title,
                    ep.js->'data'->'var_price' AS var_price
                FROM data pb
                LEFT JOIN data ep ON pb.js->'data'->>'bundle_id' IS NOT NULL 
                    AND ep._id = pb.js->'data'->>'bundle_id' 
                    AND ep.ref = 'product' 
                    AND ep.sid = $2
                WHERE pb.ref = $1 AND pb.sid = $2 AND (pb.js->'data'->>'product_id' = $4 AND pb.js->'data'->>'product_color' = $5 AND pb.js->'data'->>'product_coating' = $6)
                `;

            // Build parameters array
            const params = ['product-bundle', sid, locale, product.product_id, product.color, product.coating];

            const result = await db.query(query, params);

            if (!result.rows.length) continue;

            result.rows.forEach(row => {

                // // get stock from var_price
                // let filteredVarPrice = row.var_price;

                // if (filteredVarPrice) if (filteredVarPrice.length) {
                //     row.stock = filteredVarPrice[0].stock || 0;
                // }

                // delete row.var_price;

                response.push({
                    "_id": row._id,
                    "product_id": row.product_id,
                    "bundle_id": row.bundle_id,
                    "color": row.color,
                    "coating": row.coating,
                    "qty": row.qty,
                    "title": row.title,
                    "item_id": product.item_id
                });
            });
        }

        // // Collect all product data with their color and coating
        // const productQueries = products.map(product => ({
        //     product_id: product.product_id,
        //     color: product.color,
        //     coating: product.coating,
        // }));

        // if (productQueries.length === 0) {
        //     response = [];
        // } else {

        //     // Build dynamic query conditions for each product
        //     const conditions = productQueries.map((_, index) => {
        //         const baseIndex = index * 3;
        //         return `(pb.js->'data'->>'product_id' = $${baseIndex + 4} AND pb.js->'data'->>'product_color' = $${baseIndex + 5} AND pb.js->'data'->>'product_coating' = $${baseIndex + 6})`;
        //     }).join(' OR ');

        //     const query = `
        //         SELECT
        //             pb._id as _id,
        //             pb.js->'data'->>'product_id' AS product_id,
        //             pb.js->'data'->>'bundle_id' AS bundle_id,
        //             pb.js->'data'->>'bundle_color' AS color,
        //             pb.js->'data'->>'bundle_coating' AS coating,
        //             pb.js->'data'->>'bundle_qty' AS qty,
        //             ep.js->'data'->'locales'->$3->>'title' AS title,
        //             ep.js->'data'->'var_price' AS var_price
        //         FROM data pb
        //         LEFT JOIN data ep ON pb.js->'data'->>'bundle_id' IS NOT NULL 
        //             AND ep._id = pb.js->'data'->>'bundle_id' 
        //             AND ep.ref = 'product' 
        //             AND ep.sid = $2
        //         WHERE pb.ref = $1 AND pb.sid = $2 AND (${conditions})
        //         `;

        //     // Build parameters array
        //     const params = ['product-bundle', sid, locale];
        //     productQueries.forEach(product => {
        //         params.push(product.product_id, product.color, product.coating);
        //     });

        //     const result = await db.query(query, params);

        //     response = result.rows.map(row => {

        //         const inputProduct = products.find(p => p.product_id === row.product_id);
        //         let filteredVarPrice = row.var_price;

        //         if (inputProduct && (inputProduct.coating || inputProduct.color)) {
        //             filteredVarPrice = (row.var_price || []).filter(vp => {

        //                 const matchesCoating = inputProduct.coating ? (vp.parent === inputProduct.coating || (inputProduct.coating === '-' && vp.parent === "-")) : true;
        //                 const matchesColor = inputProduct.color ? vp.title === inputProduct.color : true;
        //                 return matchesCoating && matchesColor;
        //             });
        //         }

        //         if (filteredVarPrice) if (filteredVarPrice.length) {
        //             row.stock = filteredVarPrice[0].stock || 0;
        //         }

        //         delete row.var_price;

        //         row.item_id = inputProduct?.item_id; // for frontend consistency

        //         return {
        //             ...row
        //         };
        //     });
        // }

    } finally {
        await db.end();
    }

    return response;
}

// API route for product export
function getProductBundlesApi(app) {

    app.post('/api/get-product-bundles/', authenticateToken, async (req, res) => {
        try {

            // console.log('/api/get-product-stock/', req.body);

            const products = req.body.products || {};
            const response = await getProductBundles(products);

            res.send({ success: true, products: response });
        } catch (err) {

            res.status(500).json({ error: 'failed to get product bundles' });

            log_error(`/api/get-product-bundles/: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductBundlesApi;