
export const renderWriteoffInput = (order, item, i) => {

    return `<input type="number" class="form-control form-control-sm writeoff-amount" data-type="w" data-source="item" data-order-id="${order._id}" data-i="${i}" data-item_id="${item?.id}" value="${item?.inventory?.writeoff_amount}" style="width: 80px;">`;
}

export const updateWriteoffInputUI = (order, updatedItem) => {

    // Find the index of the updated item in the order
    const itemIndex = order.items.findIndex(i => i.id === updatedItem.id);
    if (itemIndex === -1) {
        console.warn('Item index not found for writeoff input update:', updatedItem.id);
        return;
    }

    // // Update the writeoff input for the specific item
    // let writeoffInput = document.querySelector(`.writeoff-amount[data-source="item"][data-order-id="${order._id}"][data-i="${itemIndex}"]`);
    // if (writeoffInput) {
    //     writeoffInput.value = updatedItem.inventory?.writeoff_amount || 0;
    // }

    // // Handle bundle items writeoff input update
    // if (updatedItem.bundle_items && Array.isArray(updatedItem.bundle_items)) {
    //     updatedItem.bundle_items.forEach((bundleItem, bundleIndex) => {
    //         let bundleWriteoffInput = document.querySelector(`.writeoff-amount[data-source="bundle"][data-order-id="${order._id}"][data-i="${bundleIndex}"]`);
    //         if (bundleWriteoffInput) {
    //             bundleWriteoffInput.value = bundleItem.inventory?.writeoff_amount || 0;
    //         }
    //     });
    // }
}