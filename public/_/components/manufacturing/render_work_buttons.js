

export const renderWorkButtons = (order, item) => {

    return `
        <div class="work-buttons pt-1 me-1 ps-3">
            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 position-relative" onclick="manufacturing.openWork('marking', '${order.id}', '${order._id}', '${item.id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">
                M
                ${item.worklog?.marking ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                ${item.worklog.marking.qty}
                <span class="visually-hidden">unread messages</span>
                </span>` : ''}
            </button>
            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 position-relative" onclick="manufacturing.openWork('bending', '${order.id}','${order._id}', '${item.id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">
                L
                ${item.worklog?.bending ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                ${item.worklog.bending.qty}
                </span>` : ''}
            </button>
            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 position-relative" onclick="manufacturing.openWork('pipe-forming', '${order.id}', '${order._id}', '${item.id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">
                K
                ${item.worklog?.['pipe-forming'] ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                ${item.worklog['pipe-forming'].qty}
                </span>` : ''}
            </button>
            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 position-relative" onclick="manufacturing.openWork('assembly', '${order.id}', '${order._id}', '${item.id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">
                N
                ${item.worklog?.assembly ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                ${item.worklog.assembly.time || item.worklog.assembly.qty}
                </span>` : ''}
            </button>
            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 position-relative" onclick="manufacturing.openWork('cutting', '${order.id}', '${order._id}', '${item.id}', '${item._id}', '${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}', '${item.color}', '${item.coating}', ${item.qty})">
                G
                ${item.inventory?.writeoff_length ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                ${item.inventory?.writeoff_length / 1000}
                </span>` : ''}
            </button>
        </div>`;
}

export const updateWorkButtonsUI = (order, item) => {

    // Find the specific row for this item
    const itemRow = document.querySelector(`.order-item-row[data-id="${item.id}"][data-order_id="${order._id}"]`);

    if (!itemRow) {
        console.warn('Item row not found for:', item._id);
        return;
    }

    // Find the work buttons container within this row
    const container = itemRow.querySelector('.work-buttons');
    if (!container) {
        console.warn('Work buttons container not found');
        return;
    }

    // Re-render the work buttons HTML
    const newHTML = renderWorkButtons(order, item);

    // Create a temporary element to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = newHTML;
    const newWorkButtons = temp.querySelector('.work-buttons');

    if (newWorkButtons) {
        // Replace the old work buttons with the new ones
        container.innerHTML = newWorkButtons.innerHTML;
        // console.log('Updated work buttons for item:', item.id);
    }
}