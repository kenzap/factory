import { attr, toLocalUserDate, toLocalUserTime } from "../../helpers/global.js";
import { formatClientName } from "../../helpers/order.js";
import { state } from "../../modules/manufacturing/state.js";

export const renderOrderRow = (order, index) => {

    const div = document.createElement('div');

    div.dataset._id = order._id;
    div.className = `order-card status-${order.status} fade-in-`;
    // div.style.animationDelay = `${index * 0.05}s`;

    const shortId = order.id.substring(0, order.id.length - 4);
    const lastFour = order.id.substring(order.id.length - 4);

    div.innerHTML = `
            <div class="card-body d-flex flex-row justify-content-between align-items-center" data-order-id="${order.id}">
                <div class="row flex-grow-1 align-items-center">
                    <div class="col-md-2" onclick="manufacturing.getOrderDetails('${order.id}')">
                        <div class="order-id ms-2 p-2 po">
                            ${shortId} <strong>${lastFour}</strong>
                        </div>
                    </div>
                    <div class="col-md-5 po px-0 py-2" onclick="manufacturing.getOrderDetails('${order.id}')">
                        <div class="company-name">${formatClientName(order)}</div>
                        <small class="text-muted elipsized order-notes">${order.notes}</small>
                    </div>
                    <div class="col-md-${state.mode == 'narrow' ? '2' : '1'} po" onclick="manufacturing.getOrderDetails('${order.id}')">
                        <small class="text-muted- text-dark text-nowrap due-date">${toLocalUserDate(order.due_date)}</small>
                    </div>
                    <div class="col-md-1 po" onclick="manufacturing.getOrderDetails('${order.id}')">
                        <small class="text-muted- text-dark text-nowrap due-time">${toLocalUserTime(order.due_date)}</small>
                    </div>
                    <div class="col-md-1 mode-${attr(state.mode)} po" onclick="manufacturing.getOrderDetails('${order.id}')">
                        <small class="text-muted operator-name">${order.operator}</small>
                    </div>
                </div>
                <div class="col-md-2 text-end action-col ms-auto" data-order-id="${order._id}">
                   
                </div>
            </div>
        `;

    return div;
}

export const updateOrderRowUI = (order) => {

    let row = document.querySelector(`.order-card[data-_id="${order._id}"]`);
    if (!row) {
        console.warn('Order row not found for update:', order._id);
        return;
    }

    // Update status class
    row.className = `order-card status-${order.status} fade-in-`;
    // row.style.animationDelay = `${0.24}s`;

    // Update due date
    row.querySelector('.company-name').textContent = formatClientName(order);
    row.querySelector('.order-notes').textContent = order.notes;
    row.querySelector('.due-date').textContent = toLocalUserDate(order.due_date);
    row.querySelector('.due-time').textContent = toLocalUserTime(order.due_date);
    row.querySelector('.operator-name').textContent = order.operator;

    // update sub-items table
    let subItemsRow = document.querySelector(`.sub-items-row[data-_id="${order._id}"]`);
    if (subItemsRow) {
        subItemsRow.className = `sub-items-row status-${order.status}`;
    }
}