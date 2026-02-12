import { isOrderIssued, isOrderReady } from "./utils.js";

export const actionSortOrders = (orders) => {

    let ordersSorted = { urgent: [], today: [], manufacturing: [], ready: [], issued: [] };

    // Sort orders by company name alphabetically first
    orders.sort((a, b) => {
        const aCompanyName = (a?.legal_name || a?.name || '').toLowerCase();
        const bCompanyName = (b?.legal_name || b?.name || '').toLowerCase();
        return aCompanyName.localeCompare(bCompanyName);
    });

    orders.forEach((order, index) => {

        updateOrderStatus(order);

        switch (order.status) {
            case 'urgent':
                ordersSorted.urgent.push(order);
                break;
            case 'today':
                ordersSorted.today.push(order);
                break;
            case 'manufacturing':
                ordersSorted.manufacturing.push(order);
                break;
            case 'ready':
                ordersSorted.ready.push(order);
                break;
            case 'issued':
                ordersSorted.issued.push(order);
                break;
        }
    });

    return ordersSorted;
}

export const updateOrderStatus = (order) => {

    // Check if due_date is past the current time
    const dueDate = new Date(order.due_date);
    const now = new Date();
    order.isOverdue = dueDate < now;
    order.isReady = isOrderReady(order);
    order.isIssued = isOrderIssued(order);
    order.isToday = dueDate.getDate() === now.getDate() && dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();

    if (order.isOverdue && !order.isReady && !order.isIssued) { order.status = "urgent"; }
    if (order.isReady && !order.isIssued) { order.status = "ready"; }
    if (order.isReady && order.isIssued) { order.status = "issued"; }
    if (!order.isOverdue && !order.isReady && !order.isIssued && !order.isToday) { order.status = "manufacturing"; }
    if (!order.isOverdue && !order.isReady && !order.isIssued && order.isToday) { order.status = "today"; }
}