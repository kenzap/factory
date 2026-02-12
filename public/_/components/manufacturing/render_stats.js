import { state } from "../../modules/manufacturing/state.js";

export const renderStats = () => {

    let stats = {
        latest: [],
        issued: []
    }

    // Find most recently issued orders by checking all order items' inventory.isu_date
    const issuedOrders = [];
    const manufacturedOrders = [];

    state.orders.forEach(order => {
        let mostRecentIsuDate = null;
        let mostRecentMnfDate = null;
        order.items.forEach(item => {
            if (item.inventory && item.inventory.isu_date) {
                const isuDate = new Date(item.inventory.isu_date);
                if (!mostRecentIsuDate || isuDate > mostRecentIsuDate) {
                    mostRecentIsuDate = isuDate;
                }
            }
            if (item.inventory && item.inventory.rdy_date) {
                const mnfDate = new Date(item.inventory.rdy_date);
                if (!mostRecentMnfDate || mnfDate > mostRecentMnfDate) {
                    mostRecentMnfDate = mnfDate;
                }
            }
        });
        if (mostRecentIsuDate) {
            issuedOrders.push({ orderId: order.id, isuDate: mostRecentIsuDate });
        }
        if (mostRecentMnfDate) {
            manufacturedOrders.push({ orderId: order.id, mnfDate: mostRecentMnfDate });
        }
    });

    // Sort by most recent isu_date descending
    manufacturedOrders.sort((a, b) => b.mnfDate - a.mnfDate);
    issuedOrders.sort((a, b) => b.isuDate - a.isuDate);

    // Take top 5 most recently issued orders
    stats.latest = manufacturedOrders.slice(0, 5).map(o => o.orderId.substring(o.orderId.length - 4));
    stats.issued = issuedOrders.slice(0, 5).map(o => o.orderId.substring(o.orderId.length - 4));

    updateStats(stats);
}

export const updateStats = (stats) => {
    document.getElementById('latestOrders').textContent = stats.latest.join(', ');
    document.getElementById('issuedOrders').textContent = stats.issued.join(', ');
}