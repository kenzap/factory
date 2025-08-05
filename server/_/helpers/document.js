
import { __html, makeNumber, priceFormat } from './index.js';

export function getWaybillItemsTable(settings, order) {

    // console.log("getWaybillItemsTable", order.items);

    let table = `
            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">${__html("Product")}</th>
                        <th scope="col">${__html("Price")}</th>
                        ${order.discount ? `<th scope="col"><div class="text-start">${__html("Discount")}</div></th>` : ``}
                        ${order.discount ? `<th scope="col"><div class="text-start">${__html("Price")} - %</div></th>` : ``}
                        <th scope="col">${__html("Qty")}</th>
                        <th scope="col">${__html("Unit")}</th>
                        <th scope="col"><div class="${order.vat_status == "0" ? "text-end" : "text-start"}">${__html("Total")}</div></th>
                        <th scope="col" class="${order.vat_status == "0" ? "d-none" : ""}">${__html("Tax")} / ${__html("Code")}</th>
                        <th scope="col" class="${order.vat_status == "0" ? "d-none" : ""}"><div class="text-end">${__html("Total with tax")}</div></th>
                    </tr>
                </thead>
                <tbody>
                ${order.items.map((item, i) => {

        item.updated = 1;

        if (!item.tax_id) item.tax_id = "";

        return `
            <tr class="${i == order.items.length - 1 ? "border-secondary" : ""}">
                <th scope="row">${i + 1}</th>
                <td>${item.title} ${item.coating} ${item.color}</td>
                <td>${priceFormat(settings, item.price)}</td>
                ${order.discount ? `<th scope="col"><div class="text-start">-${Math.round(100 - item.discount * 100)}%</div></th>` : ``}
                ${order.discount ? `<th scope="col"><div class="text-start">${Math.round(item.priced * 100) / 100}</div></th>` : ``}
                <td>${item.qty}</td>
                <td>${item.unit || __html("pc")}</td>
                <td class="${order.vat_status == "0" ? "text-end" : "text-start"}">${priceFormat(settings, item.total)}</td>
                <td class="${order.vat_status == "0" ? "d-none" : "d-none"}">${item.tax_id}</td>
                <td class="${order.vat_status == "0" ? "d-none" : ""}">${item.tax_id.length == 4 ? "ANM / " + item.tax_id : settings.tax_percent + "%"}</td>
                <td class="text-end ${order.vat_status == "0" ? "d-none" : ""}">${priceFormat(settings, item.total * (item.tax_id.length == 4 ? 1 : (parseFloat(settings.tax_percent) / 100 + 1)))}</td>
            </tr>
        `;
    }).join('')
        }

                </tbody>
            </table>
        `;

    return table;
}

export const getWaybillTotals = (settings, order) => {

    // Calculate totals based on VAT status
    let item_total_0 = 0; // Items without VAT
    let item_total_21 = 0; // Items with VAT

    // Calculate totals for different VAT categories
    order.items.forEach(item => {
        if (item.tax_id.length === 4) {
            // No VAT (reverse charge)
            item_total_0 += makeNumber(item.total);
        } else {
            // With VAT
            item_total_21 += makeNumber(item.total);
        }
    });

    const pvnas = parseFloat(settings.tax_percent);
    const pvnas0 = pvnas / 100;
    const pvnas1 = (pvnas / 100) + 1;

    let summa_final = 0;
    let totalsHtml = '';

    if (item_total_0 === 0 && item_total_21 > 0) {
        // Only VAT items
        summa_final = Math.round((item_total_21 * pvnas1) * 100) / 100;

        totalsHtml = `
            <table class="totals-table">
                <tr>
                    <td class="text-end"><strong>TOTAL:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_total_21)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>VAT ${pvnas}%:</strong></td>
                    <td class="text-end">${priceFormat(settings, Math.round(item_total_21 * pvnas0 * 100) / 100)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>TOTAL TO PAY:</strong></td>
                    <td class="text-end">${priceFormat(settings, summa_final)}</td>
                </tr>
            </table>`;

    } else if (item_total_0 > 0 && item_total_21 === 0) {
        // Only non-VAT items (reverse charge)
        summa_final = Math.round(item_total_0 * 100) / 100;

        totalsHtml = `
            <table class="totals-table">
                <tr>
                    <td class="text-end"><strong>TOTAL:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_total_0)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>VAT (Reverse charge):</strong></td>
                    <td class="text-end">${priceFormat(settings, 0)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>TOTAL TO PAY:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_total_0)}</td>
                </tr>
            </table>`;

    } else if (item_total_0 > 0 && item_total_21 > 0) {

        // Mixed VAT and non-VAT items
        summa_final = Math.round((item_total_0 + (item_total_21 * pvnas1)) * 100) / 100;

        totalsHtml = `
            <table class="totals-table">
                <tr>
                    <td class="text-end me-2"><strong>TOTAL (Reverse charge):</strong> </td>
                    <td class="text-end">${priceFormat(settings, item_total_0)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>TOTAL (VAT 21%):</strong> </td>
                    <td class="text-end">${priceFormat(settings, item_total_21)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>VAT (Reverse charge):</strong> </td>
                    <td class="text-end">${priceFormat(settings, 0)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>VAT (21%):</strong> </td>
                    <td class="text-end">${priceFormat(settings, Math.round((item_total_21 * (pvnas1 - 1)) * 100) / 100)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>TOTAL TO PAY:</strong> </td>
                    <td class="text-end">${priceFormat(settings, summa_final)}</td>
                </tr>
            </table>`;
    }

    return `
        <!-- Totals -->
        <div class="totals">
            <div class="totals-left">
                
            </div>
            <div class="totals-right">
                ${totalsHtml}
            </div>
        </div>`;
}
/**
   * Generates HTML table rows displaying the total price, VAT, and grand total.
   *
   * @returns {string} HTML string containing table rows with the total price, VAT, and grand total.
   */
export const viewTotalNoVat = (settings, order) => {

    return `
        <tr>
            <td class="text-end fs-5" colspan="${order.discount ? 7 : 5}">${__html("Total")} ${priceFormat(settings, order.price.total)}</td>
        </tr>
        <tr>
            <td class="text-end fs-5" colspan="${order.discount ? 7 : 5}">${__html("VAT 21%")} ${priceFormat(settings, order.price.total * (parseFloat(settings.tax_percent) / 100))}</td>
        </tr>
        <tr>
            <td class="text-end fs-3" colspan="${order.discount ? 7 : 5}">${__html("Grand total")} ${priceFormat(settings, order.price.total + order.price.total * (parseFloat(settings.tax_percent) / 100))}</td>
        </tr>
        `;
}

/**
 * Generates the HTML string for displaying the total VAT and grand total of an order.
 *
 * This function constructs a table row with the total VAT and grand total values,
 * optionally including discount information if a discount is applied to the order.
 *
 * @returns {string} The HTML string representing the total VAT and grand total row.
 */
export const viewTotalVat = (settings, order) => {


    return `
        <tr>
            <td class="text-end fs-5" colspan="${order.discount ? 7 : 5}">${__html("Total")} ${priceFormat(settings, order.price.total)}</td>
        </tr>
        <tr>
            <td class="text-end fs-5" colspan="${order.discount ? 7 : 5}">${__html("VAT 21%")} ${priceFormat(settings, order.price.total * (parseFloat(settings.tax_percent) / 100))}</td>
        </tr>
        <tr>
            <td class="text-end fs-3" colspan="${order.discount ? 7 : 5}">${__html("Grand total")} ${priceFormat(settings, order.price.total + order.price.total * (parseFloat(settings.tax_percent) / 100))}</td>
        </tr>
        `;
}

export function removeField(waybill, fieldName) {

    // Create a regex pattern to match the entire <p> tag with the specified id
    const regex = new RegExp(`<p\\s+id="${fieldName}"[^>]*>.*?</p>`, 'gi');
    waybill = waybill.replace(regex, '');

    return waybill;
}

export function getManufacturingDate(order) {

    console.log(order.items);
    // Extract manufacturing date from order
    if (!order?.items && order.items.length == 0) return '';

    let latestDate = null;
    for (const orderItem of order.items) {
        if (orderItem?.inventory?.mnf_date) {
            const currentDate = new Date(orderItem.inventory.mnf_date);
            if (!latestDate || currentDate > latestDate) {
                latestDate = currentDate;
            }
        }
    }
    return latestDate;
}

export function getIssuingDate(order) {

    // Extract manufacturing date from order
    if (!order?.items && order.items.length == 0) return '';

    let latestDate = null;
    for (const orderItem of order.items) {
        if (orderItem?.inventory?.isu_date) {
            const currentDate = new Date(orderItem.inventory.isu_date);
            if (!latestDate || currentDate > latestDate) {
                latestDate = currentDate;
            }
        }
    }
    return latestDate;
}

export function getWaybillNextNumber(settings) {

    let waybill_prefix;
    let waybill_next_number;

    // get waybill prefix
    const prefixMatch = settings.waybill_last_number.toString().match(/^([^-]+)/);
    waybill_prefix = prefixMatch ? prefixMatch[1] : '';

    // Extract numeric part from waybill format (SKA-224261) and increment by 1
    if (settings.waybill_last_number) {
        const match = settings.waybill_last_number.toString().match(/(\d+)$/);
        if (match) {
            const numericPart = parseInt(match[1]);
            settings.waybill_last_number = numericPart + 1;
        } else {
            settings.waybill_last_number = 1;
        }
    } else {
        settings.waybill_last_number = 1;
    }
    waybill_next_number = settings.waybill_last_number ? parseInt(settings.waybill_last_number) : 0;



    return waybill_prefix + "-" + waybill_next_number;
}
