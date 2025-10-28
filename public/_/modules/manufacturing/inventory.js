import { execOrderItemAction } from "../../api/exec_order_item_action.js";

/**
 * Inventory management class for handling order items, stock updates, and inventory state synchronization.
 * Manages both regular items and bundled products within manufacturing orders.
 */
export class Inventory {

    /**
     * Creates an instance of Inventory.
     */
    constructor() {


    }

    /**
     * Retrieves item data from a DOM event target within an order item row.
     * Traverses the DOM to find the closest order-item-row and extracts item information.
     * @param {Event} e - The DOM event object
     * @param {Object} order - The order object containing items array
     * @returns {Object|null} Object containing item and index, or null if not found
     */
    getItemData(e, order) {
        let orderItemRow = e.target.closest('tr.order-item-row');
        let steps = -1;

        // If not directly in an order-item-row, find it by traversing siblings
        if (!orderItemRow) {
            let currentRow = e.target.closest('tr');
            while (currentRow && currentRow.previousElementSibling) {
                steps++;
                currentRow = currentRow.previousElementSibling;
                if (currentRow.classList.contains('order-item-row')) {
                    orderItemRow = currentRow;
                    break;
                }
            }
        }

        if (!orderItemRow) return null;

        const index = parseInt(orderItemRow.dataset.i);
        const item = order.items[index];

        return {
            item,
            index
        };
    }

    /**
     * Synchronizes inventory state changes with the backend and updates order data.
     * Handles both regular items and bundle items, creating appropriate update and stock actions.
     * @param {Event} e - The DOM event object containing target element data
     * @param {Object} order - The order object to synchronize
     * @param {Function} cb - Callback function to execute after successful synchronization
     */
    syncInventoryState(e, order, cb) {

        // const order = orders.find(o => o._id === _id);
        if (!order) return;

        // Determine if this is a bundle item or regular item
        const isBundle = e.target.dataset.source === "bundle";
        const { item, index } = this.getItemData(e, order);

        // console.log('execOrderItemAction itemData', item);

        // Update item data back to order state
        const actions = {
            update_item: {
                order_id: order._id,
                index,
                item
            }
        };

        // Add stock update action if there are any changes
        if (actions.update_item && !isBundle) {
            actions.update_stock = {
                order_id: order._id,
                item_id: item._id,
                index: index,
                coating: item.coating || '',
                color: item.color || '',
                amount: parseInt(e.target.value) || 0,
            };
        }

        // Add stock update action if there are any changes for bundled products
        if (actions.update_item && isBundle && item.bundle_items && Array.isArray(item.bundle_items)) {
            const bundleItem = item.bundle_items.find(b => b.inventory && b.inventory._id === e.target.dataset.id);
            if (bundleItem) {
                actions.update_stock = {
                    order_id: order._id,
                    item_id: bundleItem.inventory._id,
                    index: index,
                    // checked: bundleItem.inventory.checked || false,
                    coating: bundleItem.inventory.coating || '',
                    color: bundleItem.inventory.color || '',
                    amount: parseInt(e.target.value) || 0,
                };
            }
        }

        // Execute the action
        execOrderItemAction(actions, (response) => {

            if (!response.success) {
                toast(__html('Error updating item status'));
                return;
            }

            cb(order);
        });
    }

    /**
     * Updates checkbox states for inventory items and manages origin selection logic.
     * Handles mutual exclusivity between warehouse (w) and manufactured (m) checkboxes.
     * Also manages bundle item checkbox states and inventory data.
     * @param {Event} e - The checkbox change event
     * @param {Object} order - The order object to update
     */
    syncCheckboxState(e, order) {

        // Update the order state based on the checkbox that was changed
        const source = e.target.dataset.source;
        const type = e.target.dataset.type;
        const index = parseInt(e.target.dataset.i);

        if (source === "item") {
            // Handle main item checkbox changes
            const item = order.items[index];
            if (!item.inventory) item.inventory = {};

            if (type === "w" && e.target.checked) {
                item.inventory.origin = 'w';
                // Uncheck the manufactured checkbox
                let checkboxM = document.querySelector(`.action-ns input[data-source="item"][data-type="m"][data-i="${index}"]`);
                if (checkboxM) checkboxM.checked = false;
            } else if (type === "m" && e.target.checked) {
                item.inventory.origin = 'm';
                // Uncheck the warehouse checkbox
                let checkboxW = document.querySelector(`.action-ns input[data-source="item"][data-type="w"][data-i="${index}"]`);
                if (checkboxW) checkboxW.checked = false;
            } else if (!e.target.checked) {
                // If unchecked, determine which other checkbox is still checked
                let checkboxW = document.querySelector(`.action-ns input[data-source="item"][data-type="w"][data-i="${index}"]`);
                let checkboxM = document.querySelector(`.action-ns input[data-source="item"][data-type="m"][data-i="${index}"]`);

                if (checkboxW && checkboxW.checked) {
                    item.inventory.origin = 'w';
                } else if (checkboxM && checkboxM.checked) {
                    item.inventory.origin = 'm';
                } else {
                    item.inventory.origin = 'c';
                }
            }
        } else if (source === "bundle") {
            // Handle bundle item checkbox changes
            const bundleId = e.target.dataset.id;
            const color = e.target.dataset.color || '';
            const coating = e.target.dataset.coating || '';

            // Find the parent item row to get the correct item index
            let parentRow = e.target.closest('tr');
            while (parentRow && !parentRow.classList.contains('order-item-row')) {
                parentRow = parentRow.previousElementSibling;
            }

            if (parentRow) {
                const parentIndex = parseInt(parentRow.dataset.i);
                const parentItem = order.items[parentIndex];

                // Ensure bundle_items array exists
                if (!parentItem.bundle_items) {
                    parentItem.bundle_items = [];
                }

                // Find or create the bundle item
                let bundleItem = parentItem.bundle_items.find(b => b.inventory && b.inventory._id === bundleId);

                if (!bundleItem) {
                    // Create new bundle item entry
                    bundleItem = {
                        inventory: {
                            _id: bundleId,
                            color: color,
                            coating: coating,
                            amount: 0,
                            origin: 'c',
                            checked: false
                        }
                    };
                    parentItem.bundle_items.push(bundleItem);
                }

                // Update the bundle item state
                bundleItem.inventory.checked = e.target.checked;

                // Update the amount if checkbox is checked
                if (e.target.checked) {
                    const expectedAmount = parseFloat(e.target.dataset.amount) || 0;
                    bundleItem.inventory.amount = expectedAmount;
                    bundleItem.inventory.origin = 'w';
                } else {
                    bundleItem.inventory.amount = 0;
                }
            }
        }

        this.updateWriteoffAmount(e, order);
    }

    /** 
     * Updates writeoff amount fields based on checkbox states and item selection.
     * Shows/hides writeoff amount inputs and sets default values based on inventory origin.
     * @param {Event} e - The DOM event object
     * @param {string} order_id - The ID of the order being updated
     */
    updateWriteoffAmount(e, order) {

        if (!order) return;

        const source = e.target.dataset.source;
        const type = e.target.dataset.type;
        const index = parseInt(e.target.dataset.i);

        if (source === "item") {

            // Handle main item writeoff amount
            let writeoffAmount = document.querySelector(`.writeoff-amount[data-source="item"][data-order-id="${order._id}"][data-i="${index}"]`);
            let checkboxW = document.querySelector(`.action-ns input[data-source="item"][data-type="w"][data-i="${index}"]`);
            let checkboxM = document.querySelector(`.action-ns input[data-source="item"][data-type="m"][data-i="${index}"]`);

            if (writeoffAmount && checkboxW && checkboxM) {
                if (checkboxW.checked) {
                    writeoffAmount.classList.remove('d-none');
                    if (parseInt(writeoffAmount.value) === 0) {
                        writeoffAmount.value = order.items[index].qty || 0;
                    }
                } else if (checkboxM.checked) {
                    writeoffAmount.classList.add('d-none');
                    writeoffAmount.value = 0;
                } else {
                    writeoffAmount.classList.add('d-none');
                    writeoffAmount.value = 0;
                }

                // Trigger change event for writeoff amount
                writeoffAmount.dispatchEvent(new Event('change'));
            }
        } else if (source === "bundle") {
            // Handle bundle item writeoff amount
            let bundleWriteoffAmount = e.target.closest('tr').querySelector('.writeoff-amount[data-source="bundle"]');

            if (bundleWriteoffAmount && e.target.checked) {
                bundleWriteoffAmount.classList.remove('d-none');
                const expectedAmount = parseFloat(e.target.dataset.amount) || 0;
                if (parseInt(bundleWriteoffAmount.value) === 0) {
                    bundleWriteoffAmount.value = expectedAmount;
                }
            } else if (bundleWriteoffAmount) {
                bundleWriteoffAmount.classList.add('d-none');
                bundleWriteoffAmount.value = 0;
            }

            // Trigger change event for bundle writeoff amount
            if (bundleWriteoffAmount) {
                bundleWriteoffAmount.dispatchEvent(new Event('change'));
            }
        }
    }
}