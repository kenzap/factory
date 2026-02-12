import { getProductStock } from "../../api/get_product_stock.js";
import { slugify } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";

export const actionGetStock = (order_id, extensionList = []) => {

    // Get stock for each item in the order
    const order = state.orders.find(o => o._id === order_id);
    if (!order) return;

    let products = [];

    order.items.forEach((item, i) => {

        // product items
        products.push({
            _id: item._id,
            hash: item.coating + item.color + item._id,
            coating: item.coating || '',
            color: item.color || ''
        });

        // bundled products that are not yet in items inventory (e.g. when bundles are added after initial load)
        extensionList.forEach(prod => {
            if (prod.product_id === item._id) {
                products.push({
                    _id: prod.bundle_id,
                    hash: (prod.coating || '') + (prod.color || '') + prod.bundle_id,
                    coating: prod.coating || '',
                    color: prod.color || ''
                });
            }
        });

        // bundled products
        if (item.bundle_items && Array.isArray(item.bundle_items)) {
            item.bundle_items.forEach(bundleItem => {
                if (bundleItem.inventory) {
                    products.push({
                        _id: bundleItem.inventory._id,
                        hash: (bundleItem.inventory.coating || '') + (bundleItem.inventory.color || '') + bundleItem.inventory._id,
                        coating: bundleItem.inventory.coating || '',
                        color: bundleItem.inventory.color || ''
                    });
                }
            });
        }
    });

    getProductStock(products, (response) => {

        // console.log('getProductStock response', response);

        if (response.success && response.products && response.products.length > 0) {

            response.products.forEach((product, i) => {

                if (isNaN(product.stock)) product.stock = "";

                let sel = slugify(`stock-${product.coating}-${product.color}-${product._id}`);

                // console.log('Updating stock for', "." + sel, product.stock);

                document.querySelectorAll("." + sel).forEach(element => {
                    element.innerHTML = `<span class="text-muted">${product.stock}</span>`;
                });
            });
        }
    });
}