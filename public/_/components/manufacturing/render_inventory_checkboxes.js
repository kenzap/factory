
export const renderInventoryCheckboxes = (order, item, i) => {

    return `
        <div class="d-flex align-items-center action-ns">
            <input type="checkbox" data-type="w" data-i="${i}" data-source="item" data-order-id="${order._id}" data-item_id="${item.id}" onchange="manufacturing.syncCheckboxStates(event, '${order._id}')" class="form-check-input m-0 me-3" ${item?.inventory?.origin == 'w' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
            <input type="checkbox" data-type="m" data-i="${i}" data-source="item" data-order-id="${order._id}" data-item_id="${item.id}" onchange="manufacturing.syncCheckboxStates(event, '${order._id}')" class="form-check-input m-0" ${item?.inventory?.origin == 'm' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
        </div>`;
}

export const updateInventoryCheckboxesUI = (order, updatedItem) => {

    // Find the index of the updated item in the order
    const itemIndex = order.items.findIndex(i => i.id === updatedItem.id);
    if (itemIndex === -1) {
        console.warn('Item index not found for inventory checkboxes update:', updatedItem.id);
        return;
    }

    // Update the checkboxes for the specific item
    let checkboxW = document.querySelector(`.action-ns input[data-source="item"][data-type="w"][data-i="${itemIndex}"]`);
    let checkboxM = document.querySelector(`.action-ns input[data-source="item"][data-type="m"][data-i="${itemIndex}"]`);
    let writeoffAmount = document.querySelector(`.writeoff-amount[data-source="item"][data-order-id="${order._id}"][data-i="${itemIndex}"]`);
    if (checkboxW) {
        checkboxW.checked = updatedItem.inventory?.origin === 'w' ? true : false;
        checkboxW.disabled = updatedItem.inventory?.isu_date ? true : false;
    }
    if (checkboxM) {
        checkboxM.checked = updatedItem.inventory?.origin === 'm' ? true : false;
        checkboxM.disabled = updatedItem.inventory?.isu_date ? true : false;
    }

    if (checkboxM && checkboxW) {
        if (checkboxM.checked || (!checkboxW.checked && !checkboxM.checked)) {
            if (writeoffAmount) writeoffAmount.classList.add('d-none'); // Disable input if manufactured is checked
        }
        else {
            if (writeoffAmount) writeoffAmount.classList.remove('d-none'); // Enable input if warehouse is checked
        }
    }
}