// render.js
// Invoice rendering using unified tax regimes

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
                    ${showTax ? `<th scope="col">${__html(locale, "Total with tax")}</th>` : ''}
                </tr>
            </thead>
            <tbody>
    `;

    order.items.forEach((item, i) => {
        if (!item.total) return;

        const originalPrice = item.discount && item.discount > 0
            ? item.price / (1 - item.discount / 100)
            : item.price;

        const regime = item.taxRegime || {};
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
 */
export function getInvoiceTotals(settings, order, locale, totals) {
    if (!totals) return '';

    // const showTax = order.vat_status !== "0";
    const breakdown = totals.taxBreakdown || [];

    let html = '<div class="totals">';

    // Left side - Payment info and legal notes
    html += '<div class="totals-left"><table>';

    html += `
        <tr>
            <td class="text-start"><strong>${__html(locale, "Payment terms")}:</strong></td>
            <td class="text-start">${order.due_date
            ? __html(locale, "Due date") + ' ' + new Date(order.due_date).toLocaleDateString(locale.code)
            : '3 ' + __html(locale, "days")}</td>
        </tr>
    `;

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
            <td class="text-start"><strong>${__html(locale, "Total in words")}:</strong></td>
            <td class="text-start">${amountToWords(totals.totalInvoiceAmount, settings)}</td>
        </tr>
    `;

    html += '</table></div>';

    // Right side - Totals breakdown
    html += '<div class="totals-right"><table class="totals-table">';

    // Subtotal
    html += `
        <tr>
            <td class="text-end"><strong>${__html(locale, "Subtotal")}:</strong></td>
            <td class="text-end">${priceFormat(settings, totals.totalTaxableAmount)}</td>
        </tr>
    `;

    // Tax breakdown
    if (breakdown.length > 0) {
        breakdown.forEach(tax => {
            const label = tax.rate > 0
                ? `${__html(locale, tax.display)}:`
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
    let itemIndex = 1;

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

            let totalTM = 0;

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
                    tableContent += `
                        <tr class="${i == groupItems.length - 1 ? "border-secondary" : ""}">
                            <th scope="row">${itemIndex}</th>
                            <td>
                                <div>${item.title + (item.sdesc ? " - " + item.sdesc : "")} ${item.coating} ${item.color} ${item.formula_width_calc ? item.formula_width_calc + " x " : ""} ${item.formula_length_calc ? item.formula_length_calc : ""} ${item.formula_width_calc || item.formula_length_calc ? "mm" : ""}</div>
                                ${item.note ? `<div class="text-muted small">${item.note}</div>` : ``}
                            </td>
                            <td>${item.qty}</td>
                            <td>${tm}</td >
                            <td>${item.unit ? __html(locale, item.unit) : __html(locale, "pc")}</td>
                        </tr>
            `;
                    itemIndex++;
                }
            });

            // Add group total row
            tableContent += `
                <tr class="table-info">
                    <th scope="row"></th>
                    <td></td>
                    <td><strong>${groupItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</strong></td>
                    <td><strong>${totalTM ? totalTM : ""}</strong></td>
                    <td></td>
                </tr>
            `;

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
            </thead >
            <tbody>
                `;

        let totalTM = 0;

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

        // Add group total row
        tableContent += `
                <tr class="table-info">
                    <th scope="row"></th>
                    <td></td>
                    <td><strong>${ungroupedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</strong></td>
                    <td><strong>${totalTM ? totalTM : ""}</strong></td>
                    <td></td>
                </tr>
            `;

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