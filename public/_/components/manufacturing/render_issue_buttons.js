import { __html, toLocalUserDate, toLocalUserTime } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";

export const renderItemIssueButton = (order_id, index) => {

    const item = state.orders.find(order => order._id === order_id)?.items[index];
    if (!item) return '';

    return `
        ${item?.inventory?.rdy_date ?
            `
                    <button class="btn btn-sm btn-outline-dark btn-cancel ${!item?.inventory?.isu_date ? 'd-none' : ''}" onclick="manufacturing.issueItem('${order_id}','${item?.id}',false)" > ${toLocalUserDate(item?.inventory?.isu_date)} ${toLocalUserTime(item?.inventory?.isu_date)}</button>
                    <button class="btn btn-sm btn-outline-dark btn-issue ${item?.inventory?.isu_date ? 'd-none' : ''}" onclick="manufacturing.issueItem('${order_id}','${item?.id}',true)" > ${__html('Issue')}</button>
                `: ``
        }
        `;
}

export const renderOrderIssueButton = (order_id) => {

    const order = state.orders.find(order => order._id === order_id);
    if (!order) return '';

    return `
        <button class="btn action-btn btn-outline-dark text-nowrap me-3" onclick="manufacturing.issueOrder('${order.id}', true)">
            <i class="bi bi-check-circle me-1"></i> ${__html('Issue')}
        </button>
    `;
}

export const renderOrderCancelIssueButton = (order_id, mostRecentIssueDate) => {

    const order = state.orders.find(order => order._id === order_id);
    if (!order) return '';

    return `
        <button class="btn action-btn btn-outline-dark border-0 text-nowrap me-3" onclick="manufacturing.issueOrder('${order.id}', false)">
            </i> ${toLocalUserDate(mostRecentIssueDate)} ${toLocalUserTime(mostRecentIssueDate)}
        </button>
    `;
}