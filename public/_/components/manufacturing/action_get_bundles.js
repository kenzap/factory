import { getProductBundles } from "../../api/get_product_bundles.js";
import { attr, slugify } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";
import { actionGetStock } from "./action_get_stock.js";
import { renderInventoryButtons } from "./render_inventory_buttons.js";

export const actionGetBundles = (orderId) => {

    // Get stock for each item in the order
    const order = state.orders.find(o => o._id === orderId);
    if (!order) return;

    let products = [];

    order.items.forEach((item, i) => {

        // todo: add bundled products
        products.push({
            item_id: item.id,
            product_id: item._id,
            coating: item.coating || '',
            color: item.color || ''
        });
    });

    // Reload bundles for all orders
    getProductBundles(products, (response) => {

        // console.log('Bundles response', response);

        if (response.success && response.products && response.products.length > 0) {

            // Clear existing bundles for this order before adding new ones
            document.querySelectorAll(`.order-item-row[data-order_id="${orderId}"]`).forEach(element => {

                // Remove any existing bundle rows that follow this item
                let nextSibling = element.nextElementSibling;
                while (nextSibling && !nextSibling.classList.contains('order-item-row') && !nextSibling.classList.contains('group-header-row')) {
                    let toRemove = nextSibling;
                    nextSibling = nextSibling.nextElementSibling;
                    toRemove.remove();
                }
            });

            // Map bundles with order items
            response.products.forEach((bundleItem, bundleItemIndex) => {

                console.log('Adding bundle item:', bundleItem);

                // Map bundle data from order.items.bundles if it exists
                let bundleInventory = null;
                let bundleId = "";
                let bundleAmount = 1;
                let bundleChecked = 0;
                let orderItem = order.items.find(item => item.id === bundleItem.item_id);
                let qty = orderItem ? orderItem.qty : 1;

                if (orderItem.bundle_items && Array.isArray(orderItem.bundle_items)) {

                    const matchingBundle = orderItem.bundle_items.find(b =>
                        b.inventory._id === bundleItem.bundle_id
                    );

                    if (matchingBundle) {
                        bundleId = matchingBundle.inventory._id
                        bundleInventory = matchingBundle.inventory || bundleItem.inventory;
                        bundleAmount = matchingBundle.inventory?.writeoff_amount || bundleItem.inventory?.writeoff_amount || 0;
                        bundleChecked = matchingBundle.inventory?.checked || bundleItem.inventory?.checked || false;
                    }
                } else {
                    bundleId = bundleItem.bundle_id;
                    bundleInventory = bundleItem.inventory;
                    bundleAmount = bundleItem.inventory?.writeoff_amount || 0;
                    bundleChecked = bundleItem.inventory?.checked || false;
                }

                let row = ` 
                        <tr data-bundle-id="${bundleItem.bundle_id}" class="view-${attr(state.viewMode)} ${orderItem?.inventory?.isu_date ? "row-issued" : ""}">
                            <td class="d-none py-0"></td>
                            <td class="py-0">

                            </td>
                            <td class="py-0" >
                                <div class="product-name ${attr(state.mode)}">
                                    <small class="text-dark me-2"><i class="bi bi-box me-1"></i> ${bundleItem?.title}</small>
                                    <small class="text-dark me-2">${bundleItem?.coating}</small>
                                    <small class="text-dark me-2">${bundleItem?.color}</small>
                                </div>
                            </td>
                            <td class="py-0"><small class="text-dark">${bundleItem?.unit || "gab"}</small></td>
                            <td class="py-0">
                                <small class="text-dark">${parseFloat(bundleItem?.qty) * parseFloat(qty)}</small>
                            </td>
                            <td class="py-0">
                                <div class="d-flex align-items-center action-ns">
                                    <input type="checkbox" data-type="w" data-i="${bundleItemIndex}" data-amount="${(bundleItem?.qty || 1) * qty}" data-id="${bundleItem.bundle_id}" data-source="bundle" data-color="${bundleItem?.color}" data-coating="${bundleItem?.coating}" data-item_id="${bundleItem?.product_id}" onchange="manufacturing.syncCheckboxStates(event, '${orderId}')" class="form-check-input m-0 me-3" ${bundleChecked ? 'checked' : ''} ${orderItem?.inventory?.isu_date ? 'disabled' : ''} >
                                </div>
                            </td>
                            <td class="py-0 mode-${attr(state.mode)} view-${attr(state.viewMode)}">
                                <small class="text-dark">
                                    <div class="${slugify(`stock-${bundleItem?.coating}-${bundleItem?.color}-${bundleItem?.bundle_id}`)}"><span></span></div>
                                </small>
                            </td>
                            <td class="py-0 mode-${attr(state.mode)} view-${attr(state.viewMode)}">
                                <input type="number" class="form-control form-control-xs writeoff-amount ${bundleAmount == 0 ? 'd-none' : ''}" data-type="w" data-id="${bundleItem.bundle_id}" data-source="bundle" data-order-id="${orderId}" data-i="${bundleItemIndex}" data-item_id="${bundleItem?.product_id}" value="${bundleAmount}" style="width: 80px;">
                            </td>
                            <td class="py-0 action-items-col- text-end pe-3" data-order-id="${orderId}" data-item-i="${bundleItemIndex}">
                            </td> 
                        </tr>`;

                if (document.querySelector(`.order-item-row[data-id="${bundleItem.item_id}"]`)) document.querySelector(`.order-item-row[data-id="${bundleItem.item_id}"]`).insertAdjacentHTML('afterend', row);
            });
        }

        actionGetStock(order._id, response.products);

        renderInventoryButtons(order._id);
    });
}