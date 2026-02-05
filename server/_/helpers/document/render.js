import { __html, priceFormat } from '../index.js';
import { amountToWords } from './totals.js';

/**
 * Generate invoice items table
 */
export function getInvoiceItemsTable(settings, order, locale, calculator) {
    const hasDiscount = settings.discount_visibility === '1' &&
        order.items.some(item => item.discount && item.discount > 0);
    const showTax = order.vat_status !== "0";

    let table = `
        <table class="items-table">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">${__html(locale, "Product")}</th>
                    ${hasDiscount ? `<th scope="col">${__html(locale, "Price")}</th>` : ''}
                    ${hasDiscount ? `<th scope="col">${__html(locale, "Discount")}</th>` : ''}
                    <th scope="col">${hasDiscount ? __html(locale, "Net") : __html(locale, "Price")}</th>
                    <th scope="col">${__html(locale, "Qty")}</th>
                    <th scope="col">${__html(locale, "Unit")}</th>
                    <th scope="col">${__html(locale, "Total")}</th>
                    ${showTax ? `<th scope="col">${__html(locale, "Tax Rate")}</th>` : ''}
                    ${showTax ? `<th scope="col">${__html(locale, "Tax")}</th>` : ''}
                    ${showTax ? `<th scope="col">${__html(locale, "Incl. tax")}</th>` : ''}
                </tr>
            </thead>
            <tbody>
    `;

    order.items.forEach((item, i) => {
        if (!item.total) return;

        const originalPrice = item.discount && item.discount > 0
            ? item.price / (1 - item.discount / 100)
            : item.price;

        const regime = item.taxRegime || item.tax || {};
        const lineTotal = item.total;
        const lineTax = calculator?.calculateTaxAmount(lineTotal, regime.rate, regime.peppolCode) || 0;
        const lineTotalWithTax = lineTotal + lineTax;

        table += `
            <tr class="${i === order.items.length - 1 ? 'border-secondary' : ''}">
                <th scope="row">${i + 1}</th>
                <td>${formatItemDescription(item, locale)}</td>
                ${hasDiscount ? `<td>${priceFormat(settings, originalPrice)}</td>` : ''}
                ${hasDiscount ? `<td>${item.discount > 0 ? `-${item.discount}%` : ''}</td>` : ''}
                <td>${priceFormat(settings, item.price)}</td>
                <td>${item.qty}</td>
                <td>${item.unit ? __html(locale, item.unit) : __html(locale, "pc")}</td>
                <td>${priceFormat(settings, lineTotal)}</td>
                ${showTax ? `<td>${__html(locale, regime.display || '')}</td>` : ''}
                ${showTax ? `<td>${priceFormat(settings, lineTax)}</td>` : ''}
                ${showTax ? `<td>${priceFormat(settings, lineTotalWithTax)}</td>` : ''}
            </tr>
        `;
    });

    table += `
            </tbody>
        </table>
    `;

    return table;
}

/**
 * Format item description
 */
function formatItemDescription(item, locale) {
    let description = item.title || '';

    if (item.coating) description += ` ${item.coating}`;
    if (item.color) description += ` ${item.color}`;

    if (item.formula_width_calc || item.formula_length_calc) {
        const width = item.formula_width_calc || '';
        const length = item.formula_length_calc || '';
        description += ` ${width}${width && length ? ' x ' : ''}${length}${width || length ? ' mm' : ''}`;
    }

    return description;
}

/**
 * Generate invoice totals
 * 
 * Kopā bez PVN: €150.50
 * Ar PVN 21% apliekamā summa: xx EUR
 * Apgrieztā nodokļa maksāšana (143.4. pants): €0.00
 * PVN 21%: €11.79
 * Kopā apmaksai: €162.29
 * 
 * Kopā bez PVN: €150.50
 * Apgrieztā nodokļa maksāšana (143.4. pants): €0.00
 * PVN 21% (no xx EUR): €11.79
 * Kopā apmaksai: €162.29
 * 
 * Metālapstrāde R7
 * Metāllūžni R2
 */
export function getInvoiceTotals(settings, order, locale, totals) {
    if (!totals) return '';

    // const showTax = order.vat_status !== "0";
    const breakdown = totals.taxBreakdown || [];

    let html = '<div class="totals">';

    // Left side - Payment info and legal notes
    html += '<div class="totals-left"><table>';

    // html += `
    //     <tr>
    //         <td colspan="2" class="text-start">
    //             <strong>${__html(locale, "Payment terms")}:</strong>
    //             ${order.due_date
    //         ? __html(locale, "Due date") + ' ' + new Date(order.due_date).toLocaleDateString(locale.code)
    //         : '3 ' + __html(locale, "days")}
    //         </td>
    //     </tr>
    // `; 

    // Only show payment terms if there's AE peppol code in tax breakdown
    if (breakdown.some(tax => tax.peppolCode === 'AE')) {
        html += `
            <tr>
                <td colspan="2" class="text-start">
                    <strong>${__html(locale, "Transaction type")}:</strong>
                    R7
                </td>
            </tr>
        `;
    }

    // for metal waste
    if (breakdown.some(tax => tax.peppolCode === 'AE' && tax.localId === 'MET')) {
        html += `
            <tr>
                <td colspan="2" class="text-start">
                    <strong>${__html(locale, "Transaction type")}:</strong>
                    R7
                </td>
            </tr>
        `;
    }

    // Legal references for special tax treatments
    const legalNotes = breakdown.filter(tax => tax.legalText);
    if (legalNotes.length > 0) {
        legalNotes.forEach(tax => {
            html += `
                <tr>
                    <td colspan="2" class="text-start">
                        <strong>${__html(locale, tax.display)}:</strong> ${__html(locale, tax.legalText)}
                    </td>
                </tr>
            `;
        });
    }

    html += `
        <tr>
            <td class="text-start" colspan="2">
                <strong>${__html(locale, "Total in words")}:</strong> ${amountToWords(totals.totalInvoiceAmount, settings)}
            </td>
        </tr>
    `;

    html += '</table></div>';

    // Right side - Totals breakdown
    html += '<div class="totals-right"><table class="totals totals-table">';

    // Subtotal
    html += `
        <tr>
            <td class="text-end"><strong>${__html(locale, "Subtotal without TAX")}:</strong></td>
            <td class="text-end">${priceFormat(settings, totals.totalTaxableAmount)}</td>
        </tr>
    `;

    // Tax breakdown
    if (breakdown.length > 0) {
        breakdown.forEach(tax => {
            const label = tax.rate > 0
                ? `${__html(locale, tax.display)} (${__html(locale, "from ")} ${priceFormat(settings, tax.taxableAmount)}):`
                : `${__html(locale, tax.legalText)}:`;

            html += `
                <tr>
                    <td class="text-end"><strong>${label}</strong></td>
                    <td class="text-end">${priceFormat(settings, tax.taxAmount)}</td>
                </tr>
            `;
        });
    }

    // Grand total
    html += `
        <tr class="total-row">
            <td class="text-end"><strong>${__html(locale, "Total to pay")}:</strong></td>
            <td class="text-end"><strong>${priceFormat(settings, totals.totalInvoiceAmount)}</strong></td>
        </tr>
    `;

    html += '</table></div></div>';

    return html;
}

export function getProductionItemsTable(settings, order, locale) {

    // console.log("getProductionItemsTable locale", locale);

    let groups = settings.groups ? JSON.parse(settings.groups) : [];

    let tableContent = '';
    let summaryContent = '';
    let itemIndex = 1;

    groups.forEach(group => {

        // console.log("getProductionItemsTable group", order.items);

        // Filter order items that belong to this group
        const groupItems = order.items.filter(item =>
            group.id == item?.group
        );

        // Sort group items by priority first (with default 1000), then alphabetically by product name
        groupItems.sort((a, b) => {
            // const priorityA = a.priority !== '' ? a.priority : 1000;
            // const priorityB = b.priority !== '' ? b.priority : 1000;

            // // First sort by priority
            // if (priorityA !== priorityB) {
            //     return priorityA - priorityB;
            // }

            // If priorities are equal, sort alphabetically by product name
            const nameA = (a.title || '').toLowerCase();
            const nameB = (b.title || '').toLowerCase();
            return nameB.localeCompare(nameA);
        });

        // Only create group section if there are items for this group
        if (groupItems.length > 0) {
            // Add group header
            tableContent += `
                <thead class="table-secondary">
                    <tr>
                        <th scope="col"></th>
                        <th scope="col">${__html(locale, group.name)}</th>
                        <th scope="col">${__html(locale, "Width")}</th>
                        <th scope="col">${__html(locale, "Length")}</th>
                        <th scope="col">${__html(locale, "Qty")}</th>
                        <th scope="col">${__html(locale, "t/m")}</th>
                    </tr>
                </thead>
                <tbody>
            `;

            let totalTM = 0;

            // Group items by width
            const itemSummary = new Map();

            // Add items for this group
            groupItems.forEach((item, i) => {
                // Calculate total t/m for the item
                let tm = item.formula_length_calc ? (item.formula_length_calc / 1000) * item.qty : "";
                if (tm) {
                    tm = Math.round(tm * 1000) / 1000;
                    totalTM += tm;
                }

                item.updated = 1;
                if (item.total) {
                    // Create a key for grouping by width
                    const groupKey = item.formula_width_calc || 'no-width';

                    if (!itemSummary.has(groupKey)) {
                        itemSummary.set(groupKey, {
                            width: item.formula_width_calc,
                            items: [],
                            totalQty: 0,
                            totalTM: 0,
                            totalMeters: 0
                        });
                    }

                    const summary = itemSummary.get(groupKey);
                    summary.items.push(item);
                    summary.totalQty += item.qty || 0;
                    summary.totalTM += tm || 0;
                    summary.totalMeters += item.formula_length_calc ? (item.formula_length_calc / 1000) * item.qty : 0;

                    tableContent += `
                        <tr class="${i == groupItems.length - 1 ? "border-secondary" : ""}">
                            <th scope="row">${itemIndex}</th>
                            <td>
                                <div>${item.title + (item.sdesc ? " - " + item.sdesc : "")} ${item.coating} ${item.color}</div>
                                ${item.note ? `<div class="text-muted small">${item.note}</div>` : ``}
                            </td>
                            <td>${item.formula_width_calc ? item.formula_width_calc : ""}</td>
                            <td>${item.formula_length_calc ? item.formula_length_calc : ""}</td>
                            <td>${item.qty}</td>
                            <td>${tm}</td>
                        </tr>
                    `;
                    itemIndex++;
                }
            });

            tableContent += '</tbody>';

            // Add summary for this group to separate table
            summaryContent += `
                <thead class="table-secondary">
                    <tr>
                        <th scope="col" colspan="2">${__html(locale, group.name)}</th>
                        <th scope="col">${__html(locale, "Qty")}</th>
                        <th scope="col">${__html(locale, "t/m")}</th>   
                    </tr>
                </thead>
                <tbody>
            `;

            // Add summary rows for each width (show all widths, not just multiple items)
            itemSummary.forEach((summary) => {
                if (summary.width) {
                    summaryContent += `
                        <tr>
                            <td colspan="2"><strong>${summary.width}mm</strong></td>
                            <td>${summary.totalQty}</td>
                            <td>${summary.totalTM ? Math.round(summary.totalTM * 1000) / 1000 : ""}</td>
                        </tr>
                    `;
                }
            });

            // Add group total row
            summaryContent += `
                <tr class="table-info">
                    <td colspan="2"><strong>${__html(locale, "Total")}</strong></td>
                    <td><strong>${groupItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</strong></td>
                    <td><strong>${totalTM ? Math.round(totalTM * 1000) / 1000 : ""}</strong></td>
                </tr>
            `;

            summaryContent += '</tbody>';
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
                    <th scope="col">${__html(locale, "Width")}</th>
                    <th scope="col">${__html(locale, "Length")}</th>
                    <th scope="col">${__html(locale, "Qty")}</th>
                    <th scope="col">${__html(locale, "t/m")}</th>
                </tr>
            </thead>
            <tbody>
        `;

        let totalTM = 0;
        const ungroupedSummary = new Map();

        // Add ungrouped items
        ungroupedItems.forEach((item, i) => {

            // Calculate total t/m for the item
            let tm = item.formula_length_calc ? (item.formula_length_calc / 1000) * item.qty : "";
            if (tm) {
                tm = Math.round(tm * 1000) / 1000;
                totalTM += tm;
            }

            item.updated = 1;
            if (item.total) {
                // Create a key for grouping by width
                const groupKey = item.formula_width_calc || 'no-width';

                if (!ungroupedSummary.has(groupKey)) {
                    ungroupedSummary.set(groupKey, {
                        width: item.formula_width_calc,
                        items: [],
                        totalQty: 0,
                        totalTM: 0,
                        totalMeters: 0
                    });
                }

                const summary = ungroupedSummary.get(groupKey);
                summary.items.push(item);
                summary.totalQty += item.qty || 0;
                summary.totalTM += tm || 0;
                summary.totalMeters += item.formula_length_calc ? (item.formula_length_calc / 1000) * item.qty : 0;

                tableContent += `
                    <tr class="${i == ungroupedItems.length - 1 ? "border-secondary" : ""}">
                        <th scope="row">${itemIndex}</th>
                        <td>
                            <div>${item.title} ${item.coating} ${item.color}</div>
                            ${item.note ? `<div class="text-muted small">${item.note}</div>` : ``}
                        </td>
                        <td>${item.formula_width_calc ? item.formula_width_calc : ""}</td>
                        <td>${item.formula_length_calc ? item.formula_length_calc : ""}</td>
                        <td>${item.qty}</td>
                        <td>${tm}</td>
                    </tr>
                `;
                itemIndex++;
            }
        });

        tableContent += '</tbody>';

        // Add ungrouped items summary to separate table
        summaryContent += `
            <thead class="table-secondary">
                <tr>
                    <th scope="col" colspan="5">${__html(locale, "Ungrouped items")} - ${__html(locale, "Summary")}</th>
                </tr>
                <tr>
                    <th scope="col">${__html(locale, "Width")}</th>
                    <th scope="col">${__html(locale, "Total meters")}</th>
                    <th scope="col">${__html(locale, "Qty")}</th>
                    <th scope="col">${__html(locale, "t/m")}</th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>
        `;

        // Add summary rows for each width in ungrouped items (show all widths)
        ungroupedSummary.forEach((summary) => {
            if (summary.width) {
                summaryContent += `
                    <tr>
                        <td><strong>${summary.width}mm</strong></td>
                        <td><strong>${Math.round(summary.totalMeters * 1000) / 1000}m</strong></td>
                        <td><strong>${summary.totalQty}</strong></td>
                        <td><strong>${summary.totalTM ? Math.round(summary.totalTM * 1000) / 1000 : ""}</strong></td>
                        <td></td>
                    </tr>
                `;
            }
        });

        // Add group total row
        summaryContent += `
            <tr class="table-info">
                <td><strong>${__html(locale, "Total")}</strong></td>
                <td></td>
                <td><strong>${ungroupedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</strong></td>
                <td><strong>${totalTM ? Math.round(totalTM * 1000) / 1000 : ""}</strong></td>
                <td></td>
            </tr>
        `;

        summaryContent += '</tbody>';
    }

    let tables = `
        <!-- Items Table -->
        <table class="items-table production-items-table">
            ${tableContent}
        </table>
        
        <!-- Summary Table -->
        <h4 class="mt-3 mb-1">${__html(locale, "Summary")}</h4>
        <table class="items-table summary-table">
            ${summaryContent}
        </table>
    `;

    return tables;
}

/**
 * Generate PEPPOL XML
 */
export function generatePeppolXML(order, totals, settings) {
    const taxBreakdown = totals.taxBreakdown || [];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">\n';

    // Tax totals
    xml += '  <TaxTotal>\n';
    xml += `    <TaxAmount currencyID="${settings.currency || 'EUR'}">${totals.totalTaxAmount.toFixed(2)}</TaxAmount>\n`;

    // Group by PEPPOL code for XML
    const peppolGroups = new Map();

    taxBreakdown.forEach(tax => {
        if (!peppolGroups.has(tax.peppolCode)) {
            peppolGroups.set(tax.peppolCode, {
                code: tax.peppolCode,
                rate: tax.rate,
                taxableAmount: 0,
                taxAmount: 0,
                reason: tax.legalText
            });
        }

        const group = peppolGroups.get(tax.peppolCode);
        group.taxableAmount += tax.taxableAmount;
        group.taxAmount += tax.taxAmount;
    });

    peppolGroups.forEach(group => {
        xml += '    <TaxSubtotal>\n';
        xml += `      <TaxableAmount currencyID="${settings.currency || 'EUR'}">${group.taxableAmount.toFixed(2)}</TaxableAmount>\n`;
        xml += `      <TaxAmount currencyID="${settings.currency || 'EUR'}">${group.taxAmount.toFixed(2)}</TaxAmount>\n`;
        xml += '      <TaxCategory>\n';
        xml += `        <ID>${group.code}</ID>\n`;
        xml += `        <Percent>${group.rate}</Percent>\n`;
        if (group.reason) {
            xml += `        <TaxExemptionReason>${group.reason}</TaxExemptionReason>\n`;
        }
        xml += '      </TaxCategory>\n';
        xml += '    </TaxSubtotal>\n';
    });

    xml += '  </TaxTotal>\n';
    xml += '  <LegalMonetaryTotal>\n';
    xml += `    <LineExtensionAmount currencyID="${settings.currency || 'EUR'}">${totals.totalTaxableAmount.toFixed(2)}</LineExtensionAmount>\n`;
    xml += `    <TaxExclusiveAmount currencyID="${settings.currency || 'EUR'}">${totals.totalTaxableAmount.toFixed(2)}</TaxExclusiveAmount>\n`;
    xml += `    <TaxInclusiveAmount currencyID="${settings.currency || 'EUR'}">${totals.totalInvoiceAmount.toFixed(2)}</TaxInclusiveAmount>\n`;
    xml += `    <PayableAmount currencyID="${settings.currency || 'EUR'}">${totals.totalInvoiceAmount.toFixed(2)}</PayableAmount>\n`;
    xml += '  </LegalMonetaryTotal>\n';
    xml += '</Invoice>';

    return xml;
}