
import { state } from "../../modules/manufacturing/state.js";
import { renderItemIssueButton, renderOrderCancelIssueButton, renderOrderIssueButton } from "./render_issue_buttons.js";

export const renderInventoryButtons = (order_id) => {

    // Refresh action buttons for the order
    let order = state.orders.find(o => o._id === order_id);

    if (!order) return;

    // Clear existing buttons before re-rendering
    document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = ``;

    // Render item issue buttons
    let counter = { mnf: 0, isu: 0 };
    state.orders = state.orders.map((o, i) => {
        if (o._id === order._id) {
            o.items.forEach((item, j) => {
                if (item.inventory?.rdy_date) counter.mnf++;
                if (item.inventory?.isu_date) counter.isu++;

                let sel = `.action-items-col[data-order-id="${o._id}"][data-item-i="${j}"]`;
                if (document.querySelector(sel)) document.querySelector(sel).innerHTML = renderItemIssueButton(order._id, j);
            });
        }
        return o;
    });

    // Render order issue button
    if (counter.mnf == order.items.length && counter.isu != order.items.length) {
        document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = renderOrderIssueButton(order._id);
    }

    // Render order cancel issue button
    if (counter.mnf == order.items.length && counter.isu == order.items.length) {

        // Find the most recent issue date among all items
        let mostRecentIssueDate = null;
        order.items.forEach((item, i) => {
            if (item.inventory?.isu_date) {
                item.issued = true;
                item.issuedDate = item.inventory.isu_date;
                const isuDate = new Date(item.inventory.isu_date);
                if (!mostRecentIssueDate || isuDate > mostRecentIssueDate) {
                    mostRecentIssueDate = isuDate;
                }
            }
        });

        document.querySelector('.action-col[data-order-id="' + order._id + '"]').innerHTML = renderOrderCancelIssueButton(order._id, mostRecentIssueDate);
    }

    // Render checkboxes enable/disable
    order.items.forEach((item, i) => {
        let checkboxW = document.querySelector(`.action-ns input[data-source="item"][data-type="w"][data-i="${i}"]`);
        let checkboxM = document.querySelector(`.action-ns input[data-source="item"][data-type="m"][data-i="${i}"]`);
        let writeoffAmount = document.querySelector(`.writeoff-amount[data-source="item"][data-order-id="${order._id}"][data-i="${i}"]`);

        if (!checkboxW || !checkboxM) return;

        checkboxW.disabled = item.inventory?.isu_date ? true : false;
        if (checkboxM.checked) checkboxW.disabled = true; // Disable warehouse checkbox if manufactured is checked

        checkboxM.disabled = item.inventory?.isu_date ? true : false;
        if (checkboxW.checked) checkboxM.disabled = true; // Disable manufactured checkbox if warehouse is checked

        if (checkboxM.checked || (!checkboxW.checked && !checkboxM.checked)) {

            if (writeoffAmount) writeoffAmount.classList.add('d-none'); // Disable input if manufactured is checked
        } else {
            if (writeoffAmount) writeoffAmount.classList.remove('d-none'); // Enable input if warehouse is checked
        }

        // Handle bundle items writeoff-amount visibility
        if (item.bundle_items && Array.isArray(item.bundle_items)) {
            item.bundle_items.forEach((bundleItem, bundleIndex) => {
                let bundleCheckboxW = document.querySelector(`.action-ns input[data-source="bundle"][data-type="w"][data-i="${bundleIndex}"]`);
                let bundleWriteoffAmount = document.querySelector(`.writeoff-amount[data-source="bundle"][data-order-id="${order._id}"][data-i="${bundleIndex}"]`);

                if (!bundleCheckboxW || !bundleWriteoffAmount) return;

                if (!bundleCheckboxW.checked) {
                    bundleWriteoffAmount.classList.add('d-none'); // Hide input if bundle checkbox is not checked
                } else {
                    bundleWriteoffAmount.classList.remove('d-none'); // Show input if bundle checkbox is checked
                }
            });
        }
    });

    // Assign inventory amount
    document.querySelectorAll(`.writeoff-amount`).forEach(input => {

        // Only add the event listener if it hasn't been attached yet
        if (!input.dataset.listenerAttached) {
            input.addEventListener('change', (e) => {

                state.Inventory.syncInventoryState(e, order, (order) => {

                    // Refresh UI
                    // renderInventoryButtons(order._id);
                    // actionGetStock(order._id);
                });
            });
            input.dataset.listenerAttached = "true";
        }
    });
}

export const updateInventoryButtonsUI = (order, item) => {

    renderInventoryButtons(order._id);
}