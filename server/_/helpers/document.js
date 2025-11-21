
import { __html, makeNumber, priceFormat, sid } from './index.js';

export async function getDocumentData(client, type, _id, user, locale) {

    let settings = {}, order = {}, entity = {};

    // Get settings
    const settingsQuery = `
                SELECT js->'data'->>'currency' as currency, 
                       js->'data'->>'currency_symb' as currency_symb, 
                       js->'data'->>'currency_symb_loc' as currency_symb_loc, 
                       js->'data'->>'tax_calc' as tax_calc, 
                       js->'data'->>'tax_auto_rate' as tax_auto_rate, 
                       js->'data'->>'tax_percent' as tax_percent, 
                       js->'data'->>'tax_display' as tax_display,
                       js->'data'->>'waybill_last_number' as waybill_last_number,
                       js->'data'->>'waybill_anulled_list' as waybill_anulled_list,
                       js->'data'->>'groups' as groups,
                       js->'data'->>$3 as document_template
                FROM data 
                WHERE ref = $1 AND sid = $2
                LIMIT 1
            `;

    const settingsResult = await client.query(settingsQuery, ['3dfactory-settings', sid, type + '_document_template']);
    if (settingsResult.rows.length > 0) {
        settings = settingsResult.rows[0];
    }

    // Get order details
    const orderQuery = `
            SELECT
                _id,
                js->'data'->'id' as id,
                js->'data'->'eid' as eid,
                js->'data'->'phone' as "phone",
                js->'data'->'address' as "address",
                js->'data'->'draft' as "draft",
                js->'data'->'email' as "email",
                js->'data'->'status' as "status",
                js->'data'->'name' as "name",
                js->'data'->'legal_name' as "legal_name",
                js->'data'->'person' as "person",
                js->'data'->'due_date' as "due_date",
                js->'data'->'notes' as "notes",
                js->'data'->'price' as "price",
                js->'data'->'vat_status' as "vat_status",
                js->'data'->'entity' as "entity",
                js->'data'->'operator' as "operator",
                js->'data'->'waybill' as "waybill",
                js->'data'->'invoice' as "invoice",
                js->'data'->'items' as "items"
            FROM data
            WHERE ref = $1 AND sid = $2 AND js->'data'->>'id' = $3 
            LIMIT 1
        `;

    const orderResult = await client.query(orderQuery, ['ecommerce-order', sid, _id]);
    if (orderResult.rows) order = orderResult.rows[0] || {};

    // console.log('waybill order', order);

    // Get client work 
    const clientQuery = `
            SELECT 
                _id,
                js->'data'->>'name' as name,
                js->'data'->>'email' as email,
                js->'data'->>'type' as "type",
                js->'data'->>'entity' as entity,
                js->'data'->>'legal_name' as "legal_name",
                js->'data'->>'bank_name' as "bank_name",
                js->'data'->>'bank_acc' as "bank_acc",
                js->'data'->>'reg_address' as "reg_address",
                js->'data'->>'reg_number' as "reg_number",
                js->'data'->>'reg_num' as reg_num,
                js->'data'->>'vat_number' as "vat_number",
                js->'data'->>'vat_status' as "vat_status",
                js->'data'->>'notes' as "notes",
                js->'data'->>'phone' as phone,
                js->'data'->'contacts' as contacts,
                js->'data'->'drivers' as drivers,
                js->'data'->'mnf_date' as mnf_date,
                js->'data'->'isu_date' as isu_date
            FROM data 
            WHERE ref = $1 AND sid = $2 AND _id = $3
        `;

    const entityResult = await client.query(clientQuery, ['3dfactory-entity', sid, order.eid]);
    if (entityResult.rows) entity = entityResult.rows[0] || {};

    return {
        settings,
        order,
        entity
    };
}

export async function updateWaybillNumber(db, order) {

    console.log(`updateWaybillNumber: ${order.id}, waybill_number: ${order.waybill.number}`);

    let waybill = order.waybill || {};

    // Update entire waybill object in the database
    const query = `
            UPDATE data
            SET js = jsonb_set(js, '{data,waybill}', $1::jsonb)
            WHERE ref = 'ecommerce-order' AND sid = $2 AND js->'data'->>'id' = $3
            RETURNING _id
        `;

    let response = await db.query(query, [JSON.stringify(waybill), sid, order.id]);

    return response.rows[0] ? response.rows[0]._id : null;
}

export async function updateInvoiceNumber(db, order) {

    console.log(`updateInvoiceNumber: ${order.id}, invoice_number: ${order.invoice.number}`);

    let invoice = order.invoice || {};

    // Update entire waybill object in the database
    const query = `
            UPDATE data
            SET js = jsonb_set(js, '{data,invoice}', $1::jsonb)
            WHERE ref = 'ecommerce-order' AND sid = $2 AND js->'data'->>'id' = $3
            RETURNING _id
        `;

    let response = await db.query(query, [JSON.stringify(invoice), sid, order.id]);

    return response.rows[0] ? response.rows[0]._id : null;
}

export function getWaybillItemsTable(settings, order, locale) {

    console.log("getWaybillItemsTable locale", locale);

    let table = `
            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">${__html(locale, "Product")}</th>
                        <th scope="col">${__html(locale, "Price")}</th>
                        ${order.discount ? `<th scope="col"><div class="text-start">${__html(locale, "Discount")}</div></th>` : ``}
                        ${order.discount ? `<th scope="col"><div class="text-start">${__html(locale, "Price")} - %</div></th>` : ``}
                        <th scope="col">${__html(locale, "Qty")}</th>
                        <th scope="col">${__html(locale, "Unit")}</th>
                        <th scope="col"><div class="${order.vat_status == "0" ? "text-end" : "text-start"}">${__html(locale, "Price")}</div></th>
                        <th scope="col" class="${order.vat_status == "0" ? "d-none" : ""}">${__html(locale, "Tax")} / ${__html(locale, "Code")}</th>
                        <th scope="col" class="${order.vat_status == "0" ? "d-none" : ""}"><div class="text-end">${__html(locale, "Total")}</div></th>
                    </tr>
                </thead>
                <tbody>
                ${order.items.map((item, i) => {

        item.updated = 1;

        if (!item.tax_id) item.tax_id = "";

        return item.total ? `
            <tr class="${i == order.items.length - 1 ? "border-secondary" : ""}">
                <th scope="row">${i + 1}</th>
                <td>${item.title} ${item.coating} ${item.color} ${item.formula_width_calc ? item.formula_width_calc + " x " : ""} ${item.formula_length_calc ? item.formula_length_calc : ""} ${item.formula_width_calc || item.formula_length_calc ? "mm" : ""} ${item.formula_width_calc && item.formula_length_calc ? `(${priceFormat(settings, item.price / (item.formula_length_calc / 1000))} par t/m)` : ""} ${i == 1000 ? "(4 x Skrūve DIN 933 8.8 M8 x 40 HDG, 4 x Uzgrieznis DIN 934 M8 HDG, 2 x Gumijas blīve 3 mm EPDM W-60)" : ""}${i == 1001 ? "(1 x Uzgrieznis DIN 934 M8 HDG, 1 x Skrūve DIN 933 8.8 M8 x 40 HDG)" : ""}</td>
                <td>${priceFormat(settings, item.price)}</td>
                ${order.discount ? `<th scope="col"><div class="text-start">-${Math.round(100 - item.discount * 100)}%</div></th>` : ``}
                ${order.discount ? `<th scope="col"><div class="text-start">${Math.round(item.priced * 100) / 100}</div></th>` : ``}
                <td>${item.qty}</td>
                <td>${item.unit ? __html(locale, item.unit) : __html(locale, "pc")}</td>
                <td class="${order.vat_status == "0" ? "text-end" : "text-start"}">${priceFormat(settings, item.total)}</td>
                <td class="${order.vat_status == "0" ? "d-none" : "d-none"}">${item.tax_id}</td>
                <td class="${order.vat_status == "0" ? "d-none" : ""}">${item.tax_id.length == 4 ? "ANM / " + item.tax_id : settings.tax_percent + "%"}</td>
                <td class="text-end ${order.vat_status == "0" ? "d-none" : ""}">${priceFormat(settings, item.total * (item.tax_id.length == 4 ? 1 : (parseFloat(settings.tax_percent) / 100 + 1)))}</td>
            </tr>
        ` : '';
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
    let item_grand_total = 0; // Grand total with and without VAT
    let totalsHtml = '';

    let vat_text = 'PVN ' + settings.tax_percent + '%:';

    settings.tax_percent = parseFloat(settings.tax_percent);

    const tax_coef = (settings.tax_percent / 100) + 1;

    // Calculate totals for different VAT categories
    // todo: standardize with peppol document format scheme 
    order.items.forEach(item => {
        if (item.tax_id.length > 2 && order.vat_status == "1") {

            let pvn_row = "ANM";
            let xml_tax_category = "AE";

            if (item.tax_id !== "0000") {
                // PVN_metalapstrade = true; // Note: these variables need to be defined in scope
            }

            if (item.tax_id === "0000") {
                // PVN_buvnieciba = true; // Note: these variables need to be defined in scope
            }

            if (!isNaN(item.tax_id) && item.tax_id !== "0000") {
                vat_text = "PVN (Nodokļa apgrieztā maksāšana 143.4. pants): ";
            }

            if (!isNaN(item.tax_id) && item.tax_id === "0000") {
                vat_text = "PVN (Nodokļa apgrieztā maksāšana 142 pants): ";
            }

            if (item.tax_id.includes("MET")) {
                vat_text = "PVN (Nodokļa apgrieztā maksāšana 143 pants): ";
            }

            if (item.tax_id.includes("DAT")) {
                vat_text = "PVN (Nodokļa apgrieztā maksāšana 143.1 pants): ";
            }

            // No VAT (reverse charge)
            item_total_0 += makeNumber(item.total);
        } else {
            // With VAT
            item_total_21 += makeNumber(item.total);
        }
    });


    if (item_total_0 === 0 && item_total_21 > 0) {
        // Only VAT items
        item_grand_total = Math.round((item_total_21 * tax_coef) * 100) / 100;

        totalsHtml = `
            <table class="totals-table">
                <tr>
                    <td class="text-end"><strong>KOPĀ:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_total_21)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>${vat_text}</strong></td>
                    <td class="text-end">${priceFormat(settings, Math.round(item_total_21 * settings.tax_percent) / 100)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>KOPĀ APMAKSAI:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_grand_total)}</td>
                </tr>
            </table>`;

    } else if (item_total_0 > 0 && item_total_21 === 0) {
        // Only non-VAT items (reverse charge)
        item_grand_total = Math.round(item_total_0 * 100) / 100;

        totalsHtml = `
            <table class="totals-table">
                <tr>
                    <td class="text-end"><strong>KOPĀ:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_total_0)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>${vat_text}</strong></td>
                    <td class="text-end">${priceFormat(settings, 0)}</td>
                </tr>
                <tr>
                    <td class="text-end"><strong>KOPĀ APMAKSAI:</strong></td>
                    <td class="text-end">${priceFormat(settings, item_total_0)}</td>
                </tr>
            </table>`;

    } else if (item_total_0 > 0 && item_total_21 > 0) {

        // Mixed VAT and non-VAT items
        item_grand_total = Math.round((item_total_0 + (item_total_21 * tax_coef)) * 100) / 100;

        totalsHtml = `
            <table class="totals-table">
                <tr>
                    <td class="text-end me-2"><strong>KOPĀ:</strong> </td>
                    <td class="text-end">${priceFormat(settings, item_total_0)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>KOPĀ (PVN ${settings.tax_percent}%):</strong> </td>
                    <td class="text-end">${priceFormat(settings, item_total_21)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>${vat_text}</strong> </td>
                    <td class="text-end">${priceFormat(settings, 0)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>PVN ${settings.tax_percent}%:</strong> </td>
                    <td class="text-end">${priceFormat(settings, Math.round((item_total_21 * (tax_coef - 1)) * 100) / 100)}</td>
                </tr>
                <tr>
                    <td class="text-end me-2"><strong>KOPĀ APMAKSAI:</strong> </td>
                    <td class="text-end">${priceFormat(settings, item_grand_total)}</td>
                </tr>
            </table>`;
    }

    return `
        <!-- Totals -->
        <div class="totals">
            <div class="totals-left">
                <table>
                    ${item_total_0 > 0 && item_total_21 > 0
            ? `
                        <tr>
                            <td class="text-start me-2"><strong></strong> </td>
                            <td class="text-start">&nbsp;</td>
                        </tr>`
            : ''}
                    <tr>
                        <td class="text-start me-2"><strong>Apm. termiņš:</strong> </td>
                        <td class="text-start">3 dienas.</td>
                    </tr>
                    <tr>
                        <td class="text-start me-2"><strong>${item_total_0 > 0 ? "Darījuma veids:" : "&nbsp;"}</strong> </td>
                        <td class="text-start">${item_total_0 > 0 ? "R7" : "&nbsp;"}</td>
                    </tr>
                    <tr>
                        <td class="text-start me-2"><strong>Kopā apmaksai vārdos:</strong> </td>
                        <td class="text-start">${amountToWords(item_grand_total, settings)}</td>
                    </tr>
                </table>
            </div>
            <div class="totals-right">
                ${totalsHtml}
            </div>
        </div>`;
}

export function getProductionItemsTable(settings, order, locale) {

    // console.log("getProductionItemsTable locale", locale);

    let groups = settings.groups ? JSON.parse(settings.groups) : [];

    // console.log("getProductionItemsTable groups", groups);
    // console.log("getProductionItemsTable locale", order.items);

    // if (!Array.isArray(groups)) groups = [];

    let tableContent = '';
    let itemIndex = 1;

    console.log("getProductionItemsTable order.items", order.items);

    groups.forEach(group => {

        // console.log("getProductionItemsTable group", order.items);

        // Filter order items that belong to this group
        const groupItems = order.items.filter(item =>
            group.id == item?.group
        );

        // Sort group items by priority first (with default 1000), then alphabetically by product name
        groupItems.sort((a, b) => {
            const priorityA = a.priority !== '' ? a.priority : 1000;
            const priorityB = b.priority !== '' ? b.priority : 1000;

            // First sort by priority
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // If priorities are equal, sort alphabetically by product name
            const nameA = (a.title || '').toLowerCase();
            const nameB = (b.title || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // Only create group section if there are items for this group
        if (groupItems.length > 0) {
            // Add group header
            tableContent += `
                <thead class="table-secondary">
                    <tr>
                        <th scope="col"></th>
                        <th scope="col">${__html(locale, group.name)}</th>
                        <th scope="col">${__html(locale, "Qty")}</th>
                        <th scope="col">${__html(locale, "t/m")}</th>
                        <th scope="col">${__html(locale, "Unit")}</th>
                    </tr>
                </thead>
                <tbody>
            `;

            // Add items for this group
            groupItems.forEach((item, i) => {
                item.updated = 1;
                if (item.total) {
                    tableContent += `
                        <tr class="${i == groupItems.length - 1 ? "border-secondary" : ""}">
                            <th scope="row">${itemIndex}</th>
                            <td>
                                <div>${item.title + (item.sdesc ? " - " + item.sdesc : "")} ${item.coating} ${item.color} ${item.formula_width_calc ? item.formula_width_calc + " x " : ""} ${item.formula_length_calc ? item.formula_length_calc : ""} ${item.formula_width_calc || item.formula_length_calc ? "mm" : ""}</div>
                                ${item.note ? `<div class="text-muted small">${item.note}</div>` : ``}
                            </td>
                            <td>${item.qty}</td>
                            <td>${item.formula_length_calc ? (item.formula_length_calc / 1000) * item.qty : ""}</td>
                            <td>${item.unit ? __html(locale, item.unit) : __html(locale, "pc")}</td>
                        </tr>
                    `;
                    itemIndex++;
                }
            });

            tableContent += '</tbody>';
        }
    });

    // Add ungrouped items if any
    const groupedItemIds = groups.flatMap(group => group.id);
    const ungroupedItems = order.items.filter(item =>
        !groupedItemIds.includes(item?.group)
    );

    // Sort ungrouped items alphabetically by product name
    ungroupedItems.sort((a, b) => {
        const nameA = (a.title || '').toLowerCase();
        const nameB = (b.title || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    if (ungroupedItems.length > 0) {
        tableContent += `
            <thead class="table-secondary">
                <tr>
                    <th scope="col"></th>
                    <th scope="col">${__html(locale, "Product")}</th>
                    <th scope="col">${__html(locale, "Qty")}</th>
                    <th scope="col">${__html(locale, "t/m")}</th>
                    <th scope="col">${__html(locale, "Unit")}</th>
                </tr>
            </thead>
            <tbody>
        `;

        ungroupedItems.forEach((item, i) => {
            item.updated = 1;

            if (item.total) {
                tableContent += `
                    <tr class="${i == ungroupedItems.length - 1 ? "border-secondary" : ""}">
                        <th scope="row">${itemIndex}</th>
                        <td>
                            <div>${item.title} ${item.coating} ${item.color}</div>
                            ${item.note ? `<div class="text-muted small">${item.note}</div>` : ``}
                        </td>
                        <td>${item.qty}</td>
                        <td>${item.formula_length_calc ? (item.formula_length_calc / 1000) * item.qty : ""}</td>
                        <td>${item.unit ? item.unit : __html(locale, "pc")}</td>
                    </tr>
                `;
                itemIndex++;
            }
        });

        tableContent += '</tbody>';
    }

    let table = `
        <!-- Items Table -->
        <table class="items-table">
            ${tableContent}
        </table>
    `;

    return table;
}

export const amountToWords = (amount, settings) => {

    console.log(`amountToWords: ${amount}, settings: ${settings}`);

    // Convert amount to words based on currency
    const amount_int = Math.floor(amount);
    const amount_cents = Math.round((amount - amount_int) * 100);

    const units = ["", "viens", "divi", "trīs", "četri", "pieci", "seši", "septiņi", "astoņi", "deviņi"];
    const teens = ["desmit", "vienpadsmit", "divpadsmit", "trīspadsmit", "četrpadsmit", "piecpadsmit", "sešpadsmit", "septiņpadsmit", "astoņpadsmit", "deviņpadsmit"];
    const tens = ["", "", "divdesmit", "trīsdesmit", "četrdesmit", "piecdesmit", "sešdesmit", "septiņdesmit", "astoņdesmit", "deviņdesmit"];
    const hundreds = ["", "simts", "divsimt", "trīssimt", "četrsimt", "piecsimt", "sešsimt", "septiņsimt", "astoņsimt", "deviņsimt"];

    function numberToWords(num) {
        if (num === 0) return "";

        let words = '';

        if (num >= 100) {
            const hundredsPart = Math.floor(num / 100);
            if (hundredsPart === 1) {
                words += "simts ";
            } else {
                words += units[hundredsPart] + "simt ";
            }
            num %= 100;
        }

        if (num >= 20) {
            words += tens[Math.floor(num / 10)] + " ";
            num %= 10;
        } else if (num >= 10) {
            words += teens[num - 10] + " ";
            return words.trim();
        }

        if (num > 0) {
            words += units[num] + " ";
        }

        return words.trim();
    }

    let result = '';

    // Convert main amount
    const mainWords = numberToWords(amount_int);
    if (mainWords) {
        result += mainWords.charAt(0).toUpperCase() + mainWords.slice(1) + " ";
    } else {
        result += "Nulle ";
    }

    // Add currency name
    if (settings.currency === "EUR") {
        result += amount_int === 1 ? "Eiro" : "Eiro";
    } else {
        result += settings.currency;
    }

    // Add cents if they exist
    if (amount_cents > 0) {
        result += ", " + amount_cents + " ";
        if (settings.currency === "EUR") {
            result += "eirocenti";
        } else {
            result += "centi";
        }
    }

    return result;
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

    // console.log(order.items);

    // Extract manufacturing date from order
    if (!order?.items && order.items.length == 0) return '';

    let latestDate = null;
    for (const orderItem of order.items) {
        if (orderItem?.inventory?.rdy_date) {
            const currentDate = new Date(orderItem.inventory.rdy_date);
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

export async function getInvoiceNextNumber(db, order, settings, user) {

    // number already issued
    if (order?.invoice && order?.invoice?.number) return order.invoice;

    order.invoice = {
        number: order.id,
        date: new Date().toISOString(),
        user_id: user?.id || null
    }

    await updateInvoiceNumber(db, { id: order.id, invoice: order.invoice });

    return order.invoice;
}

export async function getWaybillNextNumber(db, order, settings, user) {

    // number already issued
    if (order?.waybill && order?.waybill?.number) return order.waybill;

    // get number from annulled list if present
    if (settings.waybill_anulled_list && settings.waybill_anulled_list.trim()) {
        const annulledNumbers = settings.waybill_anulled_list.trim().split('\n').filter(num => num.trim());
        if (annulledNumbers.length > 0) {

            // Use the first annulled number and remove it from the list
            const reusedNumber = annulledNumbers.shift().trim();
            settings.waybill_anulled_list = annulledNumbers.join('\n');

            order.waybill = {
                number: reusedNumber,
                date: new Date().toISOString(),
                user_id: user?.id || null
            }

            await updateWaybillNumber(db, { id: order.id, waybill: order.waybill });

            // Update settings with the new annulled list
            const updateSettingsQuery = `
                UPDATE data
                SET js = jsonb_set(js, '{data,waybill_anulled_list}', $1::jsonb)
                WHERE ref = '3dfactory-settings' AND sid = $2
            `;
            await db.query(updateSettingsQuery, [JSON.stringify(settings.waybill_anulled_list), sid]);

            console.log(`Reused annulled waybill number: ${reusedNumber}`);

            return order.waybill;
        }
    }

    // generate new waybill number
    let waybill_prefix;
    let waybill_next_number;
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

    order.waybill = {
        number: waybill_prefix + "-" + waybill_next_number,
        date: new Date().toISOString(),
        user_id: user?.id || null
    }

    // Update settings waybill_last_number
    const settingsQuery = `
            UPDATE data
            SET js = jsonb_set(js, '{data,waybill_last_number}', $1::jsonb)
            WHERE ref = '3dfactory-settings' AND sid = $2
        `;

    // when waybill is annulled this request is skipped
    if (order.waybill.number) await db.query(settingsQuery, [JSON.stringify(order.waybill.number), sid]);

    await updateWaybillNumber(db, { id: order.id, waybill: order.waybill });

    return order.waybill;
}

export const parseDocument = (document, data) => {

    // Replace placeholders in the document template
    document = data.order?.waybill?.date
        ? document.replace(/\{\{waybill_date\}\}/g, new Date(data.order.waybill.date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'waybill_date');

    document = data.order?.waybill?.date
        ? document.replace(/\{\{issue_date\}\}/g, new Date(data.order.waybill.date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'issue_date');

    document = data.entity.legal_name
        ? document.replace(/\{\{client_name\}\}/g, data.entity.legal_name)
        : removeField(document, 'client_name');

    document = data.entity.reg_number
        ? document.replace(/\{\{client_reg_number\}\}/g, data.entity.reg_number)
        : removeField(document, 'client_reg_number');

    document = data.entity.vat_number
        ? document.replace(/\{\{client_vat_number\}\}/g, data.entity.vat_number)
        : removeField(document, 'client_vat_number');

    document = data.entity.bank_name
        ? document.replace(/\{\{client_bank\}\}/g, data.entity.bank_name)
        : removeField(document, 'client_bank');

    document = data.entity.bank_acc
        ? document.replace(/\{\{client_bank_acc\}\}/g, data.entity.bank_acc)
        : removeField(document, 'client_bank_acc');

    document = data.entity.bank_code
        ? document.replace(/\{\{client_bank_code\}\}/g, data.entity.bank_code)
        : removeField(document, 'client_bank_code');

    document = data.order?.waybill?.number
        ? document.replace(/\{\{waybill_number\}\}/g, data.order.waybill.number)
        : removeField(document, 'waybill_number');

    document = data.order.email
        ? document.replace(/\{\{client_contact_email\}\}/g, data.order.email)
        : removeField(document, 'client_contact_email');

    document = data.order.phone
        ? document.replace(/\{\{client_contact_phone\}\}/g, data.order.phone)
        : removeField(document, 'client_contact_phone');

    document = data.entity.reg_address
        ? document.replace(/\{\{client_reg_address\}\}/g, data.entity.reg_address)
        : removeField(document, 'client_reg_address');

    document = data.order?.invoice?.number
        ? document.replace(/\{\{invoice_number\}\}/g, data.order?.invoice?.number)
        : removeField(document, 'invoice_number');

    document = data.order?.id
        ? document.replace(/\{\{order_number\}\}/g, data.order?.id)
        : removeField(document, 'order_number');

    document = data.order?.notes
        ? document.replace(/\{\{order_notes\}\}/g, data.order?.notes)
        : removeField(document, 'order_notes');

    document = new Date().toLocaleDateString(data.lang, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
        ? document.replace(/\{\{today_date\}\}/g, new Date().toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'today_date');

    document = data.order?.address
        ? document.replace(/\{\{delivery_address\}\}/g, data.order?.address)
        : removeField(document, 'delivery_address');

    document = data.order?.manufacturing_date
        ? document.replace(/\{\{manufacturing_date\}\}/g, new Date(data.order?.manufacturing_date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }))
        : removeField(document, 'manufacturing_date');

    document = data.order?.due_date
        ? document.replace(/\{\{due_date\}\}/g, new Date(data.order?.due_date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }))
        : removeField(document, 'due_date');

    document = data.issuing_date
        ? document.replace(/\{\{receiving_date\}\}/g, new Date(data.issuing_date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }))
        : removeField(document, 'receiving_date');

    document = data?.waybill_items_table
        ? document.replace(/\{\{waybill_items_table\}\}/g, data.waybill_items_table)
        : removeField(document, 'waybill_items_table');

    document = data?.production_items_table
        ? document.replace(/\{\{production_items_table\}\}/g, data.production_items_table)
        : removeField(document, 'production_items_table');

    document = data?.waybill_totals
        ? document.replace(/\{\{waybill_totals\}\}/g, data.waybill_totals)
        : removeField(document, 'waybill_totals');

    document = data.user?.fname
        ? document.replace(/\{\{operator_name\}\}/g, data.user?.fname || '' + ' ' + data.user?.lname || '')
        : removeField(document, 'operator_name');

    // invoice specific fields
    document = data.order.waybill?.number
        ? document.replace(/\{\{invoice_number\}\}/g, data.order.waybill.number)
        : removeField(document, 'invoice_number');

    document = data.order.invoice?.number
        ? document.replace(/\{\{invoice_date\}\}/g, new Date(data.order?.invoice?.date).toLocaleDateString(data.lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        : removeField(document, 'invoice_date');

    document = data?.invoice_items_table
        ? document.replace(/\{\{invoice_items_table\}\}/g, data.invoice_items_table)
        : removeField(document, 'invoice_items_table');

    document = data?.invoice_totals
        ? document.replace(/\{\{invoice_totals\}\}/g, data.invoice_totals)
        : removeField(document, 'invoice_totals');


    return document;
}