import { __html, priceFormat } from '../index.js';
import { amountToWords } from './totals.js';

/**
 * Generate invoice items table
 */
export function getInvoiceItemsTable(detailed, settings, order, locale, calculator) {
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
                <td>${formatItemDescription(detailed, item, settings, locale)}</td>
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
function formatItemDescription(detailed, item, settings, locale) {
    let description = item.title || '';

    if (item.coating) description += ` ${item.coating}`;
    if (item.color) description += ` ${item.color}`;
    if (item.formula_width_calc || item.formula_length_calc) {
        const width = item.formula_width_calc || '';
        const length = item.formula_length_calc || '';
        description += ` ${width}${width && length ? ' x ' : ''}${length}${width || length ? ' mm' : ''}`;
    }

    // Add price per t/m if formula_length_calc exists
    if (detailed && item.formula_length_calc && item.price) {
        const pricePerTM = (item.price * 1000) / item.formula_length_calc;
        description += ` ${priceFormat(settings, pricePerTM)} t/m`;
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
    if (breakdown.some(tax => tax.peppolCode === 'AE' && tax.localId === '7216')) {
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
                    R2
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
    const shouldSkipRecordCalculations = (item) => {
        const width = Number(item?.formula_width_calc) || 0;
        const length = Number(item?.formula_length_calc) || 0;
        return width === 0 && length === 0;
    };
    const hasVisibleSummaryWidth = (widthValue) => (Number(widthValue) || 0) > 0;
    const hasSummaryValues = (summary) =>
        (Number(summary?.totalQty) || 0) > 0 ||
        (Number(summary?.totalTM) || 0) > 0 ||
        (Number(summary?.totalMeters) || 0) > 0;

    // hardcoded sequence for production slip. TODO: implement settings control
    const sequence = [
        "f9f720eda2b5e4ea03d8b4cc5f947534bb5ea3bd", "d6870b81ca4de48181bee1996c39a276f5047f9c", "54ecdf4a1457e02be2af26dc6dbc20273188c69f", "f75c47f6b2e1a4782d467e05f480b111b9b41ab7", "c7ec25d153f22018ec487a7f68c5ceebaa38146d", "099d54a1bf5467d920756974f0deb0f4d41f27aa", "4428c8fae08c55de73a9faffdda38eb0008994cf", "285453e62fccedb3ba97a307041d91c14a5b9d10", "ad833cc8a7847ea08042c999aa84d3ceb8e80d4f", "0e6a7dff18fcfe6b99772eb62f1e00ce223ca277", "479b7df267dfc83722b5576765863a2d906f7d65", "357c3f4748cc71aef4cc76c2153e21769a6f287b", "f8bb892b38af6944b6c3397ae27b982a75c3b903", "d7baf98c909d7491e68c6a7ff235a13d98d5aa8a", "6c366463a32fcc680ba5c0a9739d80de08436564", "i8ow7dxk0x182fcsc4pfnr54wailz3k3f2sg4bir", "oyoxq18llpw66h8fb2uhliksm6efvqacsu6gsizg", "3a77950325ddf7ab231379b0dab228f5475af2d2",
        // "ca2002d2f94566aedcb6d7edbf40710b513fc513", "987de8c4fb72806ad4ce71b3149f207552637067", "546cae599dc1c3cbb1cc9519e16332c686badbb1", "2429e26b2a8c6a179d48479a942a01110297fc00", "3de2da20b6655683a610e32dea35f3b434fd5a4d", "4c0d6027fdd9670ff000c0fe1fb0b5ebfc3389e4", "0f9ddabec2474c42f9dabc22fb269e76f8908ed6", "5109d21d32ee0741d22a03013b231245bc57070f", "c55fefcce684daac907015adc489adcbfdf2223e", "fd3f880d3c5194d4a403f3df9fdc66d491ed3fd7", "8b794917433d54b9dee3bc8ee118b7ba101a2e8b", "ad369303e4276caf3f0333c2484390d30613fbf9", "aebffd6dd5677509a5d9ac865bf53bb8f8a183d2", "6cd72b9bf83fe5288e7d215408b0a0b17f21c0f6", "eceb2bd4ff43d4301fa98a888338cd22d5033688",
        "ca2002d2f94566aedcb6d7edbf40710b513fc513", "987de8c4fb72806ad4ce71b3149f207552637067", "fd1772dcbc3349d58fe9eae43c8ca91524693021", "a06e54816b8b9f08fe3f0b877edf2def378b5b7d", "fd1772dcbc3349d58fe9eae43c8ca91524693021", "a06e54816b8b9f08fe3f0b877edf2def378b5b7d", // round gutters
        "546cae599dc1c3cbb1cc9519e16332c686badbb1", "2429e26b2a8c6a179d48479a942a01110297fc00", "096b4c2c63dd1c97ad81424696d2f15619b8bac1", "4b8ef82ebeafa5d6ecf6b8164f3df504241e3237", "37f3edba12662d2410edf92ed4e3914ca9cf6af0", "5ecb016a0600966c1aa60f928e9e684cd4c511bd", // elbow A
        "3de2da20b6655683a610e32dea35f3b434fd5a4d", "4c0d6027fdd9670ff000c0fe1fb0b5ebfc3389e4", "53735c47953c64a0d46d6a58eb7649ce8a2b3692", "027969105c1dce2695ba8817d8236c19cd6fb0f4", "90ab60aa213e59085a73f1c5fb655ae13782bbb2", "a36f717ce72cdaf714e4300f2708355c07c617bc", // elbow B
        "0f9ddabec2474c42f9dabc22fb269e76f8908ed6", "5109d21d32ee0741d22a03013b231245bc57070f", "29c7e4d8d43546d9d8e790a79bd2ecd0342942b2", "e871395f3790410f7eea66c53a4afec7e07a67eb", "77d1e989fbfbe953cd1652612f915d1a8709ca9b", "63afafe92148909a49dce1e4c187bfac8eb3d5d9", // elbow S
        "c55fefcce684daac907015adc489adcbfdf2223e", "fd3f880d3c5194d4a403f3df9fdc66d491ed3fd7", "b1ec3f3b72fcc55ec2b93fb95bfd78f75f697917", "c50e9e09adf4643a6c2ec9f7fff1b33f57a4034c", "6784d7690f539601539ee17c1671280216403987", "cd90f0d8451e1a73494c84e637ec10a4341f9f98", // downspout
        "8b794917433d54b9dee3bc8ee118b7ba101a2e8b", "5c958564a5c2244b17c8a8c18d78c3a149cfdcdc", "f265b387c6191a4dff9eda18aefa4f17b3c4b1dd", "1923721f31402860f618b12bba202b315bdda13b", "d020675c1df139bb74c6e41b6ee20f779181fee7", "0694777c90ecc1ae382b5b75cf408afaa0ad65c1", // end part A 
        "ad369303e4276caf3f0333c2484390d30613fbf9", "7f9bcbe2ffa85b3e30c9ef6373f25e703d2d2cf0", "f990191350108303a4f90d69d061ad10496f7e48", "5b1883551a57420481d64381f448be598c69cc18", "d81e6e2ecde8b2a9b287358002c7abc2c502087c", "4e14a450aa8bb10651d1efd6394f83b65207c045", // end part B
        "aebffd6dd5677509a5d9ac865bf53bb8f8a183d2", "bb8fc0ce083b091bc8339fa314c8328afe5500c2", "6090729d09ff517ee893b78d0b48ed522030fef0", // end part S
        "6cd72b9bf83fe5288e7d215408b0a0b17f21c0f6", "eceb2bd4ff43d4301fa98a888338cd22d5033688" // konektor Y
    ];

    // console.log("getProductionItemsTable locale", locale);

    let groups = settings.groups ? JSON.parse(settings.groups) : [];

    let tableContent = '';
    let summaryContent = '';
    let itemIndex = 1;

    groups.forEach(group => {

        console.log("getProductionItemsTable group", order.items);

        // Filter order items that belong to this group
        const groupItems = order.items.filter(item =>
            group.id == item?.group
        );

        // Sort by sequence order first, then alphabetically by product name
        groupItems.sort((a, b) => {
            const seqIndexA = sequence.indexOf(a._id);
            const seqIndexB = sequence.indexOf(b._id);

            // If both items are in sequence, sort by sequence order 
            if (seqIndexA !== -1 && seqIndexB !== -1) {
                return seqIndexA - seqIndexB;
            }

            // If only one item is in sequence, prioritize it
            if (seqIndexA !== -1 && seqIndexB === -1) {
                return -1;
            }
            if (seqIndexA === -1 && seqIndexB !== -1) {
                return 1;
            }

            // If neither item is in sequence, sort alphabetically by product name
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
                const qty = Number(item.qty) || 0;
                const skipRecordCalculations = shouldSkipRecordCalculations(item);
                // Calculate total t/m for the item
                let tm = item.formula_length_calc ? (item.formula_length_calc / 1000) * qty : "";
                if (tm) {
                    tm = Math.round(tm * 1000) / 1000;
                    if (!skipRecordCalculations) totalTM += tm;
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
                    if (!skipRecordCalculations) {
                        summary.totalQty += qty;
                        summary.totalTM += tm || 0;
                        summary.totalMeters += item.formula_length_calc ? (item.formula_length_calc / 1000) * qty : 0;
                    }

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

            let groupSummaryRows = '';

            // Add summary rows for each width (show all widths, not just multiple items)
            itemSummary.forEach((summary) => {
                if (hasVisibleSummaryWidth(summary.width) && hasSummaryValues(summary)) {
                    groupSummaryRows += `
                        <tr>
                            <td colspan="2"><strong>${summary.width}mm</strong></td>
                            <td>${summary.totalQty}</td>
                            <td>${summary.totalTM ? Math.round(summary.totalTM * 1000) / 1000 : ""}</td>
                        </tr>
                    `;
                }
            });

            // Add group total row
            const groupTotalQty = groupItems.reduce((sum, item) => {
                if (shouldSkipRecordCalculations(item)) return sum;
                return sum + (Number(item.qty) || 0);
            }, 0);
            const roundedGroupTotalTM = totalTM ? Math.round(totalTM * 1000) / 1000 : 0;
            if (groupTotalQty > 0 || roundedGroupTotalTM > 0) {
                groupSummaryRows += `
                    <tr class="table-info">
                        <td colspan="2"><strong>${__html(locale, "Total")}</strong></td>
                        <td><strong>${groupTotalQty}</strong></td>
                        <td><strong>${roundedGroupTotalTM || ""}</strong></td>
                    </tr>
                `;
            }

            if (groupSummaryRows) {
                summaryContent += `
                    <thead class="table-secondary">
                        <tr>
                            <th scope="col" colspan="2">${__html(locale, group.name)}</th>
                            <th scope="col">${__html(locale, "Qty")}</th>
                            <th scope="col">${__html(locale, "t/m")}</th>   
                        </tr>
                    </thead>
                    <tbody>
                        ${groupSummaryRows}
                    </tbody>
                `;
            }
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
            const qty = Number(item.qty) || 0;
            const skipRecordCalculations = shouldSkipRecordCalculations(item);

            // Calculate total t/m for the item
            let tm = item.formula_length_calc ? (item.formula_length_calc / 1000) * qty : "";
            if (tm) {
                tm = Math.round(tm * 1000) / 1000;
                if (!skipRecordCalculations) totalTM += tm;
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
                if (!skipRecordCalculations) {
                    summary.totalQty += qty;
                    summary.totalTM += tm || 0;
                    summary.totalMeters += item.formula_length_calc ? (item.formula_length_calc / 1000) * qty : 0;
                }

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

        let ungroupedSummaryRows = '';

        // Add summary rows for each width in ungrouped items (show all widths)
        ungroupedSummary.forEach((summary) => {
            if (hasVisibleSummaryWidth(summary.width) && hasSummaryValues(summary)) {
                ungroupedSummaryRows += `
                    <tr>
                        <td><strong>${summary.width}mm</strong></td>
                        <td><strong>${Math.round(summary.totalMeters * 1000) / 1000}m</strong></td>
                        <td><strong>${summary.totalQty}</strong></td>
                        <td><strong>${summary.totalTM ? Math.round(summary.totalTM * 1000) / 1000 : ""}</strong></td>
                    </tr>
                `;
            }
        });

        // Add group total row
        const ungroupedTotalQty = ungroupedItems.reduce((sum, item) => {
            if (shouldSkipRecordCalculations(item)) return sum;
            return sum + (Number(item.qty) || 0);
        }, 0);
        const roundedUngroupedTotalTM = totalTM ? Math.round(totalTM * 1000) / 1000 : 0;
        if (ungroupedTotalQty > 0 || roundedUngroupedTotalTM > 0) {
            ungroupedSummaryRows += `
                <tr class="table-info">
                    <td><strong>${__html(locale, "Total")}</strong></td>
                    <td></td>
                    <td><strong>${ungroupedTotalQty}</strong></td>
                    <td><strong>${roundedUngroupedTotalTM || ""}</strong></td>
                </tr>
            `;
        }

        if (ungroupedSummaryRows) {
            summaryContent += `
                <thead class="table-secondary">
                    <tr>
                        <th scope="col" colspan="4">${__html(locale, "Ungrouped items")} - ${__html(locale, "Summary")}</th>
                    </tr>
                    <tr>
                        <th scope="col">${__html(locale, "Width")}</th>
                        <th scope="col">${__html(locale, "Total meters")}</th>
                        <th scope="col">${__html(locale, "Qty")}</th>
                        <th scope="col">${__html(locale, "t/m")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${ungroupedSummaryRows}
                </tbody>
            `;
        }
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
