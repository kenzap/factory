import { __html, attr, slugify, toast } from "../../helpers/global.js";
import { state } from "../../modules/manufacturing/state.js";
import { actionGetBundles } from "./action_get_bundles.js";
import { renderInventoryButtons } from "./render_inventory_buttons.js";
import { renderInventoryCheckboxes } from "./render_inventory_checkboxes.js";
import { renderWorkButtons } from "./render_work_buttons.js";
import { renderWriteoffInput } from "./render_writeoff_input.js";

export const actionGetOrderDetails = async (orderId) => {

    try {
        let order = state.orders.find(order => order.id === orderId);

        // check if sub-items already loaded for this order
        if (document.querySelector('.sub-items-row[data-order-id="' + orderId + '"]')) {

            document.querySelector('.sub-items-row[data-order-id="' + orderId + '"]').remove();
            return;
        }

        // Remove any existing sub-items rows
        document.querySelectorAll('.sub-items-row').forEach(row => row.remove());

        // Find the order card element
        const orderCards = document.querySelectorAll('.order-card');
        let targetCard = null;
        orderCards.forEach(card => {
            if (card.querySelector('.order-id') && card.querySelector('.order-id').textContent.replace(/\s/g, '').includes(orderId)) {
                targetCard = card;
            }
        });

        if (!targetCard) return;

        // Group items by their group property
        const groupedItems = {};
        order.items.forEach((item, i) => {
            const groupId = item.group || 'ungrouped';
            if (!groupedItems[groupId]) {
                groupedItems[groupId] = [];
            }
            groupedItems[groupId].push({ ...item, originalIndex: i });
        });

        // console.log('Grouped items:', Object.keys(groupedItems));

        // Generate rows following the order of this.settings?.groups
        let itemRows = '', index = -1;

        // First, add groups in the order they appear in settings
        if (state.settings?.groups) {
            state.settings.groups.forEach(group => {
                if (groupedItems[group.id]) {
                    // Add group header row
                    itemRows += `
                            <tr class="group-header-row">
                                <td colspan="1" class="d-none-"></td>
                                <td colspan="7" class="bg-light border-top border-2 pt-2 pb-2">
                                    <small class="me-2 text-muted d-none"><i class="bi bi-box-seam"></i></small>
                                    <small class="text-dark text-group pb-2" style="border-bottom: 1px solid #212529;">${__html(group.name)}</small>
                                </td>
                            </tr>
                        `;

                    // Add items for this group
                    groupedItems[group.id].forEach((item) => {
                        const i = item.originalIndex;
                        index += 1;
                        itemRows += `
                                <tr class="order-item-row ${item?.inventory?.isu_date ? "row-issued" : ""}" data-id="${item.id}" data-i="${i}" data-order_id="${order._id}" data-item_id="${item._id}" data-item-color="${item.color}" data-item-coating="${item.coating}" data-qty="${item.qty}" data-group="${item.group}" >
                                    <td class="d-none">${i + 1}</td>
                                    <td>
                                        ${renderWorkButtons(order, item)}
                                    </td> 
                                    <td>
                                        <div class="d-flex justify-content-start align-items-center product-name ${attr(state.mode)}">
                                            <div>
                                                <strong>${index + 1}. ${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}</strong>
                                                ${item?.note.length ? `<div class="form-text">${item?.note}</div>` : ''}
                                            </div>
                                            <div class="dropdown itemsActionsCont ms-2">
                                                <svg id="itemsActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                                </svg>
                                                <ul class="dropdown-menu" aria-labelledby="itemsActions${i}">
                                                    <li><a class="dropdown-item po set-cm" href="#" data-index="${i}" onclick="manufacturing.addBundle(event, '${item._id}', '${item.title}', '${item.color}', '${item.coating}', '${order._id}')"><i class="bi bi-boxes me-1"></i> ${__html('Bundles')}</a></li>
                                                    <li><hr class="dropdown-divider d-none"></li>
                                                    <li><a class="dropdown-item po delete-row d-none" href="#" data-type="cancel" data-index="${i}"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                        <small class="text-dark">${item.coating} ${item.color} ${item.formula_width_calc > 0 ? item.formula_width_calc : ''} ${item.formula_width_calc > 0 && item.formula_length_calc > 0 ? 'x' : ''} ${item.formula_length_calc > 0 ? item.formula_length_calc : ''}</small>
                                    </td>
                                    <td>${item.unit || "gab"}</td>
                                    <td>${item.qty}</td>
                                    <td>
                                        ${renderInventoryCheckboxes(order, item, i)}
                                    </td>
                                    <td class="mode-${attr(state.mode)} view-${attr(state.viewMode)}"><div class="${slugify(`stock-${item.coating}-${item.color}-${item._id}`)}"><span>&nbsp;</span></div></td>
                                    <td class="mode-${attr(state.mode)} view-${attr(state.viewMode)}">
                                        ${renderWriteoffInput(order, item, i)}
                                    </td>
                                    <td class="action-items-col text-end pe-3" data-order-id="${order._id}" data-item-i="${i}">
                                        
                                    </td> 
                                </tr>
                            `;
                    });
                }
            });
        }

        // Then add ungrouped items at the end if they exist
        if (groupedItems['ungrouped']) {
            itemRows += `
                    <tr class="group-header-row">
                        <td colspan="1" class="d-none-"></td>
                        <td colspan="7" class="bg-light border-top border-2 pt-3 pb-2">
                            <small class="me-2 text-muted d-none"><i class="bi bi-box-seam"></i></small>
                            <small class="text-dark text-group pb-2" style="border-bottom: 1px solid #212529;" >${__html('Other')}</small>
                        </td>
                    </tr>
                `;

            groupedItems['ungrouped'].forEach((item) => {
                const i = item.originalIndex;
                index += 1;
                itemRows += `
                        <tr class="order-item-row ${item?.inventory?.isu_date ? "row-issued" : ""}" data-id="${item.id}" data-i="${i}" data-order_id="${order._id}" data-item_id="${item._id}" data-item-color="${item.color}" data-item-coating="${item.coating}" data-qty="${item.qty}" data-group="${item.group}" >
                            <td class="d-none">${i + 1}</td>
                            <td>
                                ${renderWorkButtons(order, item)}
                            </td> 
                            <td>
                                <div class="d-flex justify-content-start align-items-center product-name ${attr(state.mode)}">
                                    <div>
                                        <strong>${index + 1}. ${item.title + (item?.sdesc?.length ? ' - ' + item.sdesc : '')}</strong>
                                        ${item?.note.length ? `<div class="form-text">${item?.note}</div>` : ''}
                                    </div>
                                    <div class="dropdown itemsActionsCont ms-2">
                                        <svg id="itemsActions${i}" data-bs-toggle="dropdown" data-boundary="viewport" aria-expanded="false" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-three-dots-vertical dropdown-toggle po" viewBox="0 0 16 16">
                                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                                        </svg>
                                        <ul class="dropdown-menu" aria-labelledby="itemsActions${i}">
                                            <li><a class="dropdown-item po set-cm" href="#" data-index="${i}" onclick="manufacturing.addBundle(event, '${item._id}', '${item.title}', '${item.color}', '${item.coating}', '${order._id}')"><i class="bi bi-boxes me-1"></i> ${__html('Bundles')}</a></li>
                                            <li><hr class="dropdown-divider d-none"></li>
                                            <li><a class="dropdown-item po delete-row d-none" href="#" data-type="cancel" data-index="${i}"><i class="bi bi-trash text-danger"></i> ${__html('Delete')}</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <small class="text-dark">${item.coating} ${item.color} ${item.formula_width_calc > 0 ? item.formula_width_calc : ''} ${item.formula_width_calc > 0 && item.formula_length_calc > 0 ? 'x' : ''} ${item.formula_length_calc > 0 ? item.formula_length_calc : ''}</small>
                            </td>
                            <td>${item.unit || "gab"}</td>
                            <td>${item.qty}</td>
                            <td>
                                <div class="d-flex align-items-center action-ns">
                                    <input type="checkbox" data-type="w" data-i="${i}" data-source="item" data-order-id="${order._id}" data-item_id="${item.id}" onchange="manufacturing.syncCheckboxStates(event, '${order._id}')" class="form-check-input m-0 me-3" ${item?.inventory?.origin == 'w' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
                                    <input type="checkbox" data-type="m" data-i="${i}" data-source="item" data-order-id="${order._id}" data-item_id="${item.id}" onchange="manufacturing.syncCheckboxStates(event, '${order._id}')" class="form-check-input m-0" ${item?.inventory?.origin == 'm' ? 'checked' : ''} ${item?.inventory?.isu_date ? 'disabled' : ''} >
                                </div>
                            </td>
                            <td class="mode-${attr(state.mode)} view-${attr(state.viewMode)}"><div class="${slugify(`stock-${item.coating}-${item.color}-${item._id}`)}"><span>&nbsp;</span></div></td>
                            <td class="mode-${attr(state.mode)} view-${attr(state.viewMode)}">
                                ${renderWriteoffInput(order, item, i)}
                            </td>
                            <td class="action-items-col text-end pe-3" data-order-id="${order._id}" data-item-i="${i}">
                                
                            </td> 
                        </tr>
                    `;
            });
        }

        // Create a new row for sub-items
        const subRow = document.createElement('div');
        subRow.className = `sub-items-row status-${order.status}`;
        subRow.dataset.orderId = orderId;
        subRow.dataset._id = order._id;

        // Render sub-items as a table
        subRow.innerHTML = `
                <div class="p-3-">
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered- mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-3">${__html('Works')}</th>
                                    <th>
                                        <div class="d-flex align-items-center text-bold product-name ${attr(state.mode)}">
                                            <div class="d-none">${__html('Product')}</div>
                                            <select class="form-select- form-select-sm- bg-transparent ps-0 p-0 border-0 fw-bold d-none-" id="groupFilter-${orderId}" style="width: auto; margin-left:-3px;" onchange="manufacturing.filterByGroup('${order._id}', this.value)">
                                                <option value="">${__html('Products')}</option>
                                                ${state.settings?.groups ? state.settings.groups.map(group => `
                                                    <option value="${group.id}" class="fw-700">${__html(group.name)}</option>
                                                `).join('') : ''}
                                            </select>
                                        </div>
                                    </th>
                                    <th>${__html('Unit')}</th>
                                    <th>${__html('Quantity')}</th>
                                    <th>&nbsp&nbsp;&nbsp;N&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp&nbsp;S</th>
                                    <th class="mode-${attr(state.mode)} view-${attr(state.viewMode)}">${__html('Stock')}</th>
                                    <th class="mode-${attr(state.mode)} view-${attr(state.viewMode)}">${__html('Taken')}</th>
                                    <th class="text-end pe-3">${__html('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemRows}
                                <tr class="order-item-row-empty d-none">
                                    <td class="d-none">0</td>
                                    <td class="align-middle">
                                        <div class="work-buttons pt-1 me-5">
                                            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 " >M</button>
                                            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 " >L</button>
                                            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0 " >K</button>
                                            <button class="work-btn btn btn-outline-dark btn-sm fw-semibold border-0" >N</button>
                                        </div>
                                    </td>
                                    <td colspan="6" class="text-center align-middle">
                                        <div class="d-flex align-items-center justify-content-start h-100">
                                            <span class="text-muted">${__html('No products found')}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

        // Insert after the target card
        targetCard.parentNode.insertBefore(subRow, targetCard.nextSibling);

        renderInventoryButtons(order._id);

        actionGetBundles(order._id);

    } catch (error) {
        console.error('Error loading order details:', error);
        toast('Error ' + error);
    }
}