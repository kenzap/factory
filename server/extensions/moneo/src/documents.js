import { InvoiceCalculator } from '@factory/tax-core/calculator';
import { extractCountryFromVAT } from '@factory/tax-core/index';
import { getClient, getSellerCountry } from './db/clients.js'; // waybills and invoices
import { getOrdersForInvoiceSync, getOrdersForReceiptSync, updateOrderMoneoId } from './db/invoices.js'; // waybills and invoices
import { getCarryOverPaymentsForReceiptSync } from './db/payments.js'; // payments
import { convertToDateString, makeMoneoRequest, roundToTwoDecimals } from './utils.js';

const getPreviousMonthRange = () => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));

    return {
        from: monthStart.toISOString(),
        to: monthEnd.toISOString()
    };
};

const extractMoneoId = (response) => {
    if (!response || !Array.isArray(response.result)) return null;
    const row = response.result[0];
    if (!Array.isArray(row) || !row[0]) return null;
    if (!Array.isArray(row[1]) || !Array.isArray(row[1][4])) return null;
    return row[1][4][0] || null;
};

// function buildReceiptUpdatePayload(config, order) {
//     const hasWaybill = !!order?.waybill?.number;
//     const isWaybillPaid = order?.payment?.date && hasWaybill;
//     const id = order?.id || order?._id?.substring(0, 8) || '';
//     const comment = order?.invoice?.number || `#${id}`;
//     const rowComment = isWaybillPaid
//         ? `Pavadzīme (${order.waybill.number})`
//         : (order?.invoice?.number ? `Priekšapmaksa #${String(order.invoice.number).trim()}` : `Nav dati #${id}`);

//     return {
//         request: { compuid: config.get('COMPANY_UID') },
//         data: {
//             'sales.receipts': {
//                 fieldlist: [
//                     'sernr',
//                     'regdate',
//                     'transdate',
//                     'paysum',
//                     'comment'
//                 ],
//                 data: [[
//                     String(order?.moneo_invoice_id || ''),
//                     convertToDateString(order?.invoice?.date),
//                     convertToDateString(order?.payment?.date),
//                     roundToTwoDecimals(order.id ? order?.grand_total || 0 : order?.payment?.amount || 0),
//                     comment
//                 ]]
//             },
//             'sales.receipts_details_rows': {
//                 fieldlist: [
//                     '_sernr',
//                     '_rownr',
//                     'rowcomment',
//                     'rowsum',
//                     'bankrowsum'
//                 ],
//                 data: [[
//                     String(order?.moneo_invoice_id || ''),
//                     0,
//                     rowComment,
//                     roundToTwoDecimals(order.id ? order?.grand_total || 0 : order?.payment?.amount || 0),
//                     roundToTwoDecimals(order?.payment?.amount || 0)
//                 ]]
//             }
//         }
//     };
// }

function buildInvoicePayload(config, order, client, sellerCountry = 'LV') {
    const calculationItems = Array.isArray(order?.items)
        ? order.items
            .filter((item) => !item?.cancelled_from_invoice && !item?.hidden_from_invoice)
            .map((item) => ({ ...item }))
        : [];
    const buyerCountry = (client?.country_code || extractCountryFromVAT(client?.vat_number) || sellerCountry || 'LV').toUpperCase();
    const calculator = new InvoiceCalculator(
        { currency: 'EUR' },
        { items: calculationItems },
        sellerCountry,
        buyerCountry,
        {
            entity: client?.entity || 'individual',
            vat_status: client?.vat_status || '0',
            vat_number: client?.vat_number || ''
        }
    );
    const totals = calculator.calculateTotals();
    const breakdown = Array.isArray(totals?.taxBreakdown) ? totals.taxBreakdown : [];

    let totalRR7 = 0;
    let total21 = 0;
    for (const tax of breakdown) {
        const taxable = parseFloat(tax?.taxableAmount || 0) || 0;
        if (taxable <= 0) continue;
        if (tax?.peppolCode === 'AE') totalRR7 += taxable;
        else total21 += taxable;
    }

    // Fallback: keep invoice rows populated if calculator returned no groups.
    if (totalRR7 === 0 && total21 === 0 && calculationItems.length > 0) {
        for (const item of calculationItems) {
            const lineTotal = parseFloat(item?.total || 0) || 0;
            if (lineTotal > 0) total21 += lineTotal;
        }
    }

    const usedVatCodes = [];
    if (totalRR7 > 0) usedVatCodes.push('RR7');
    if (total21 > 0) usedVatCodes.push('21');

    const invoiceItems = [];
    if (totalRR7 > 0) invoiceItems.push(['Produkti RR7', '1.00', roundToTwoDecimals(totalRR7), '6210', 'RR7']);
    if (total21 > 0) invoiceItems.push(['Produkti 21', '1.00', roundToTwoDecimals(total21), '6110', '21']);

    return {
        request: { compuid: config.get('COMPANY_UID') },
        data: {
            'sales.invoices': {
                fieldlist: [
                    'legalnr', 'custcode', 'custname', 'okflag', 'address1',
                    'invdate', 'paydate', 'totquant', 'totsum', 'vatsum', 'sum',
                    'country', 'dealtype', 'usedvatcodes', 'paydeal', 'currency',
                    'currencyrate', 'reference', 'comment'
                ],
                data: [[
                    String(order?.waybill?.number || order?.id || ''),
                    client?.moneoid || '',
                    (client?.legal_name || order?.name || '').trim(),
                    1,
                    order?.address || '',
                    convertToDateString(order?.waybill?.date),
                    convertToDateString(order?.payment?.date),
                    '1',
                    roundToTwoDecimals(order?.grand_total || 0),
                    roundToTwoDecimals(order?.tax_total || 0),
                    roundToTwoDecimals(order?.grand_total || 0),
                    'LV',
                    'PAV',
                    usedVatCodes,
                    '10',
                    'EUR',
                    0,
                    String(order?.id || ''),
                    `#${order?.id || ''}`
                ]]
            },
            'sales.invoices_items_rows': {
                fieldlist: ['itemname', 'quant', 'price', 'accnumber', 'vatcode'],
                data: invoiceItems
            }
        }
    };
}

function buildReceiptPayload(config, order, client) {
    const hasWaybill = !!order?.waybill?.number;
    const isWaybillPaid = order?.payment?.date && hasWaybill;
    const id = order?.id || order?._id.substring(0, 8) || '';

    const comment = order?.invoice?.number || `#${id}`;
    const rowComment = isWaybillPaid
        ? `Pavadzīme (${order.waybill.number})`
        : (order?.invoice?.number ? `Priekšapmaksa #${String(order.invoice.number).trim()}` : `Nav dati #${id}`);

    return {
        request: { compuid: config.get('COMPANY_UID') },
        data: {
            'sales.receipts': {
                fieldlist: [
                    'custcode', 'custname', 'regdate', 'transdate', 'paysum',
                    'paytype', 'currency', 'useddealtypes', 'vatsum', 'comment'
                ],
                data: [[
                    client?.moneoid || '',
                    (client?.legal_name || order?.name || '').trim(),
                    convertToDateString(order?.waybill?.date),
                    convertToDateString(order?.payment?.date),
                    roundToTwoDecimals(order.id ? order?.grand_total || 0 : order?.payment?.amount || 0),
                    'SEB',
                    'EUR',
                    [order?.waybill?.date <= order?.payment?.date && order?.waybill?.number ? 'PAV' : 'PR'], // ['PAV'],
                    '0.00',
                    comment
                ]]
            },
            'sales.receipts_details_rows': {
                fieldlist: [
                    'prepaymentnumber', 'invnumber', 'rowcomment', 'rowsum', 'invcurrency',
                    'dealtype', 'taxval', 'taxcode', 'bankrowsum', 'clientreference'
                ],
                data: [[
                    '',
                    parseInt(order?.moneo_invoice_id || 0),
                    rowComment,
                    roundToTwoDecimals(order.id ? order?.grand_total || 0 : order?.payment?.amount || 0),
                    'EUR',
                    order?.waybill?.date <= order?.payment?.date && order?.waybill?.number ? 'PAV' : 'PR', // 'PAV',
                    '0.00',
                    'B',
                    roundToTwoDecimals(order?.payment?.amount || 0),
                    ``
                ]]
            }
        }
    };
}

async function createInvoice(db, logger, order, client, config, dryRun = false) {
    const sellerCountry = await getSellerCountry(db);
    const payload = buildInvoicePayload(config, order, client, sellerCountry);
    if (dryRun) {
        return { order_id: order._id, status: 'pending', payload };
    }

    const response = await makeMoneoRequest('/sales.invoices/create/', config, payload);
    const moneoInvoiceId = extractMoneoId(response);

    if (!moneoInvoiceId) {
        throw new Error(`Invoice create returned invalid response for order ${order._id}: ${JSON.stringify(response)}`);
    }

    await updateOrderMoneoId(db, order._id, 'invoiceid', moneoInvoiceId);
    logger.info(`[moneo.syncDocuments] Invoice synced order=${order._id} moneo_invoice_id=${moneoInvoiceId}`);

    return { order_id: order._id, moneo_invoice_id: String(moneoInvoiceId), payload, status: 'synced' };
}

async function createReceipt(db, logger, order, client, config, dryRun = false) {
    const payload = buildReceiptPayload(config, order, client);
    if (dryRun) {
        return { order_id: order._id, status: 'pending', payload };
    }

    const response = await makeMoneoRequest('/sales.receipts/create/', config, payload);
    const moneoReceiptId = extractMoneoId(response);

    if (!moneoReceiptId) {
        throw new Error(`Receipt create returned invalid response for order ${order._id}: ${JSON.stringify(response)}`);
    }

    await updateOrderMoneoId(db, order._id, 'receiptid', moneoReceiptId);
    logger.info(`[moneo.syncDocuments] Receipt synced order=${order._id} moneo_receipt_id=${moneoReceiptId}`);

    return { order_id: order._id, moneo_receipt_id: String(moneoReceiptId), payload, status: 'synced' };
}

async function processInvoices(db, logger, orders, config, dryRun = false) {
    const results = [];

    for (const order of orders) {
        const client = await getClient(order.eid, db);

        if (!client?.moneoid) {
            results.push({
                order_id: order._id,
                id: order.id,
                from: order?.from || '',
                status: 'skipped',
                reason: 'missing_client_moneo_id',
                eid: order.eid
            });
            continue;
        }

        try {
            const synced = await createInvoice(db, logger, order, client, config, dryRun);
            results.push(synced);
        } catch (error) {
            logger.error(`[moneo.syncDocuments] Invoice sync failed for order ${order._id}: ${error.message}`);
            results.push({ order_id: order._id, status: 'failed', error: error.message });
        }
    }

    return results;
}

async function processReceipts(db, logger, orders, config, dryRun = false) {
    const results = [];

    for (const order of orders) {
        const client = await getClient(order.eid, db);

        logger.info(`[moneo.processReceipts] Order: ${order.id}`, order)
        logger.info(`[moneo.processReceipts] Client:`, client)

        if (!client?.moneoid) {
            results.push({
                id: order.id,
                order_id: order._id,
                status: 'skipped',
                reason: 'missing_client_moneo_id',
                eid: order.eid
            });
            continue;
        }

        try {
            const synced = await createReceipt(db, logger, order, client, config, dryRun);
            results.push(synced);
        } catch (error) {
            logger.error(`[moneo.syncDocuments] Receipt sync failed for order ${order._id}: ${error.message}`);
            results.push({ order_id: order._id, status: 'failed', error: error.message });
        }
    }

    return results;
}

// async function updateReceipt(db, logger, order, config, dryRun = false) {
//     const payload = buildReceiptUpdatePayload(config, order);
//     // const payload = buildReceiptPayload(config, order);
//     if (dryRun) {
//         return { order_id: order._id, moneo_invoice_id: String(order?.moneo_invoice_id || ''), status: 'pending', payload };
//     }

//     await makeMoneoRequest('/sales.receipts/update/', config, payload);
//     logger.info(`[moneo.syncDocuments] Receipt updated order=${order._id} moneo_invoice_id=${order?.moneo_invoice_id || ''}`);

//     return { order_id: order._id, moneo_invoice_id: String(order?.moneo_invoice_id || ''), payload, status: 'updated' };
// }

// async function processReceiptUpdates(db, logger, orders, config, dryRun = false) {
//     const results = [];

//     for (const order of orders) {
//         if (!order?.moneo_invoice_id) {
//             results.push({
//                 order_id: order._id,
//                 status: 'skipped',
//                 reason: 'missing_moneo_invoice_id'
//             });
//             continue;
//         }

//         try {
//             const updated = await updateReceipt(db, logger, order, config, dryRun);
//             results.push(updated);
//         } catch (error) {
//             logger.error(`[moneo.syncDocuments] Receipt update failed for order ${order._id}: ${error.message}`);
//             results.push({ order_id: order._id, status: 'failed', error: error.message });
//         }
//     }

//     return results;
// }

export const syncDocuments = async (db, logger, config, options = {}) => {
    const range = getPreviousMonthRange();
    const limit = Number.isFinite(Number(options?.limit)) && Number(options.limit) > 0
        ? Number.parseInt(options.limit, 10)
        : 1;
    const dryRun = options?.dryRun === true;

    const response = {
        success: true,
        dry_run: dryRun,
        from: range.from,
        to: range.to,
        limit,
        invoice: [],
        receipt: [],
        receipt_carry_over: []
    };

    try {
        logger.info(`[moneo.syncDocuments] Mode=${dryRun ? 'dry-run' : 'sync'} Period ${range.from} -> ${range.to}, limit=${limit}`);

        const invoiceOrders = await getOrdersForInvoiceSync(db, range.from, range.to, limit);
        logger.info(`[moneo.syncDocuments] Invoice candidates: ${invoiceOrders.length}`);

        if (invoiceOrders.length > 0) {
            response.invoice = await processInvoices(db, logger, invoiceOrders, config, dryRun);
            return response;
        }

        const receiptOrders = await getOrdersForReceiptSync(db, range.from, range.to, limit);
        logger.info(`[moneo.syncDocuments] Receipt candidates: ${receiptOrders.length}`);

        if (receiptOrders.length > 0) {
            response.receipt = await processReceipts(db, logger, receiptOrders, config, dryRun);
            return response;
        }

        const carryOverReceiptOrders = await getCarryOverPaymentsForReceiptSync(db, range.from, range.to, limit);
        logger.info(`[moneo.syncDocuments] Carry-over receipt candidates: ${carryOverReceiptOrders.length}`);

        if (carryOverReceiptOrders.length > 0) {
            response.receipt_carry_over = await processReceipts(db, logger, carryOverReceiptOrders, config, dryRun);
            return response;
        }

        // const transactionOrders = await getTransactionsForReceiptSync(db, range.from, range.to, limit);
        // logger.info(`[moneo.syncDocuments] Transaction candidates: ${transactionOrders.length}`);

        // if (transactionOrders.length > 0) {
        //     response.transactions = await processReceipts(db, logger, transactionOrders, config, dryRun);
        // }

        return response;
    } catch (error) {
        logger.error(`[moneo.syncDocuments] Fatal error: ${error.message}`);
        return { ...response, success: false, error: error.message };
    } finally {
        await db.close();
    }
};
