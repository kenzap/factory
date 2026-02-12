import { state } from "../../modules/manufacturing/state.js";

export const isOrderReady = (order) => {
    let c = 0;

    // console.log(order)

    order.items.forEach(item => {

        if (!item.inventory || !item.inventory.rdy_date) return false;
        if (item.inventory.rdy_date) c++;
    });

    return c === order.items.length;
}

export const isOrderIssued = (order) => {
    let c = 0;

    order.items.forEach(item => {
        if (!item.inventory || !item.inventory.isu_date) return false;
        if (item.inventory.isu_date) c++;
    });

    return c === order.items.length;
}

export const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const toggleNarrowMode = () => {

    // Check if narrow mode should be enabled
    if (document.cookie.includes('mode=narrow')) {
        document.getElementById('closeBtn').classList.remove('d-none');
        // Adjust layout for narrow mode
        document.querySelectorAll('.narrow').forEach(el => {
            el.style.display = 'none';
        });
    }
}

export const filterByGroup = (orderId, groupId) => {

    const rows = document.querySelectorAll(`.order-item-row[data-order_id="${orderId}"]`);
    rows.forEach(row => {
        const itemGroup = row.dataset.group;

        if (groupId === '' || itemGroup === groupId) {

            // Show the row
            row.classList.remove("d-none");

            // Also show any bundle rows that follow this item
            let nextSibling = row.nextElementSibling;
            while (nextSibling && !nextSibling.classList.contains('order-item-row')) {
                // nextSibling.style.display = '';
                nextSibling.classList.remove("d-none");
                nextSibling = nextSibling.nextElementSibling;
            }
        } else {

            // Hide the row
            row.classList.add("d-none");

            // Also hide any bundle rows that follow this item
            let nextSibling = row.nextElementSibling;
            while (nextSibling && !nextSibling.classList.contains('order-item-row')) {
                // nextSibling.style.display = 'none';
                nextSibling.classList.add("d-none");
                nextSibling = nextSibling.nextElementSibling;
            }
        }
    });

    // Check if any rows are visible
    const anyVisible = Array.from(rows).some(row => !row.classList.contains("d-none"));
    const emptyRow = document.querySelector(`.order-item-row-empty`);

    console.log('Any visible rows:', anyVisible, emptyRow);

    if (emptyRow) {
        if (anyVisible) {
            emptyRow.classList.add('d-none');
        } else {
            emptyRow.classList.remove('d-none');
        }
    }
}

export const refreshOrders = () => {

    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('ordersContainer').style.display = 'none';

    document.querySelector('#companySearch').value = '';
    document.querySelector('#orderSearch').value = '';

    state.actionGetOrders();
}