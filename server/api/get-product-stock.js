import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, log, sid } from '../_/helpers/index.js';

/**
 * Get Product Stock
 *
 * @version 1.0
 * @param {Object} filter - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getProductStock(products) {

    const client = getDbConnection();

    let response = [];

    // get product stock
    try {

        await client.connect();

        // Collect all product IDs
        const productIds = products.map(product => product._id);

        if (productIds.length === 0) {
            response = [];
        } else {

            // Use ANY to query multiple IDs at once
            const query = `
            SELECT
                _id,
                js->'data'->'locales'->$3->>'title' AS title,
                js->'data'->'locales'->$3->>'sdesc' AS sdesc,
                js->'data'->'title' AS title_default,
                js->'data'->'var_price' AS var_price
            FROM data
            WHERE ref = $1 AND sid = $2 AND _id = ANY($4)
            `;

            // Assume all products use the same locale
            const locale = process.env.LOCALE || 'en';
            const params = ['ecommerce-product', sid, locale, productIds];
            const result = await client.query(query, params);

            // Filter var_price by coating and color if provided in input products
            response = result.rows.map(row => {
                const inputProduct = products.find(p => p._id === row._id);
                let filteredVarPrice = row.var_price;

                if (inputProduct && (inputProduct.coating || inputProduct.color)) {
                    filteredVarPrice = (row.var_price || []).filter(vp => {

                        const matchesCoating = inputProduct.coating ? (vp.parent === inputProduct.coating || (inputProduct.coating === '-' && vp.parent === "-")) : true;
                        const matchesColor = inputProduct.color ? vp.title === inputProduct.color : true;
                        return matchesCoating && matchesColor;
                    });
                }

                // console.log('Filtered var_price:', row.var_price);

                if (filteredVarPrice.length) {
                    row.stock = filteredVarPrice[0].stock || 0; // Assuming stock is in the first variation
                    row.hash = (filteredVarPrice[0]?.parent || '') + filteredVarPrice[0].title + row._id;
                    row.color = inputProduct.color || '';
                    row.coating = inputProduct.coating || '';
                    row.bundled_products = row.bundled_products || [];
                }

                delete row.var_price;

                return {
                    ...row
                };
            });
        }

    } finally {
        await client.end();
    }

    return response;
}

// API route for product export
function getProductStockApi(app) {

    app.post('/api/get-product-stock/', authenticateToken, async (req, res) => {
        try {

            // console.log('/api/get-product-stock/', req.body);

            const products = req.body.products || {};
            const response = await getProductStock(products);

            res.send({ success: true, products: response });
        } catch (err) {

            res.status(500).json({ error: 'failed to get orders' });
            log(`Error getting orders: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getProductStockApi;