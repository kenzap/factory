import { InvoiceCalculator } from '@factory/tax-core/calculator';
import { extractCountryFromVAT } from '@factory/tax-core/index';
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

async function getOrdersForInvoiceSync(db, dateStart, dateEnd, limit) {
    const query = `
        SELECT
            _id,
            COALESCE(js->'data'->>'id', '') AS id,
            COALESCE(js->'data'->>'name', '') AS name,
            COALESCE(js->'data'->>'address', '') AS address,
            COALESCE(js->'data'->>'eid', '') AS eid,
            COALESCE(js->'data'->'price'->>'tax_total', '0') AS tax_total,
            COALESCE(js->'data'->'price'->>'grand_total', '0') AS grand_total,
            js->'data'->'invoice' AS invoice,
            js->'data'->'payment' AS payment,
            js->'data'->'waybill' AS waybill,
            js->'data'->'items' AS items
        FROM data
        WHERE ref = $1
          AND sid = $2
          AND js->'data'->'waybill'->>'number' IS NOT NULL
          AND js->'data'->'waybill'->>'number' != ''
          AND js->'data'->'waybill'->>'date' >= $3
          AND js->'data'->'waybill'->>'date' <= $4
          AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)
          AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)
          AND js->'extensions'->'moneo'->'invoiceid' IS NULL
        ORDER BY js->'data'->'waybill'->>'date' ASC
        LIMIT $5
    `;

    const result = await db.query(query, ['order', db.sid, dateStart, dateEnd, limit]);
    return result.rows || [];
}

async function getOrdersForReceiptSync(db, dateStart, dateEnd, limit) {
    const query = `
        SELECT
            _id,
            COALESCE(js->'data'->>'id', '') AS id,
            COALESCE(js->'data'->>'name', '') AS name,
            COALESCE(js->'data'->>'address', '') AS address,
            COALESCE(js->'data'->>'eid', '') AS eid,
            COALESCE(js->'data'->'price'->>'grand_total', '0') AS grand_total,
            js->'data'->'invoice' AS invoice,
            js->'data'->'payment' AS payment,
            js->'data'->'waybill' AS waybill,
            js->'extensions'->'moneo'->>'invoiceid' AS moneo_invoice_id
        FROM data
        WHERE ref = $1
          AND sid = $2
          AND js->'data'->'payment'->>'date' >= $3
          AND js->'data'->'payment'->>'date' <= $4
          AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)
          AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)
          AND js->'extensions'->'moneo'->'receiptid' IS NULL
          AND js->'data'->'invoice'->>'number' != ''
        ORDER BY js->'data'->'payment'->>'date' ASC
        LIMIT $5
    `;

    const result = await db.query(query, ['order', db.sid, dateStart, dateEnd, limit]);
    return result.rows || [];
}

async function getTransactionsForReceiptSync(db, dateStart, dateEnd, limit) {
    const query = `
        SELECT
            _id,
            COALESCE(js->'data'->>'id', '') AS id,
            COALESCE(js->'data'->>'name', '') AS name,
            COALESCE(js->'data'->>'address', '') AS address,
            COALESCE(js->'data'->>'eid', '') AS eid,
            COALESCE(js->'data'->'price'->>'grand_total', '0') AS grand_total,
            js->'data'->'invoice' AS invoice,
            js->'data'->'payment' AS payment,
            js->'data'->'waybill' AS waybill,
            js->'extensions'->'moneo'->>'invoiceid' AS moneo_invoice_id
        FROM data
        WHERE ref = $1
          AND sid = $2
          AND js->'data'->'payment'->>'date' >= $3
          AND js->'data'->'payment'->>'date' <= $4
          AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)
          AND ((js->'data'->'transaction')::boolean = true AND js->'data'->'transaction' IS NOT NULL)
          AND js->'extensions'->'moneo'->'receiptid' IS NULL
          AND js->'extensions'->'moneo'->'invoiceid' IS NULL
        ORDER BY js->'data'->'payment'->>'date' ASC
        LIMIT $5
    `;

    const result = await db.query(query, ['order', db.sid, dateStart, dateEnd, limit]);
    return result.rows || [];
}

async function getClient(eid, db) {
    const result = await db.query(
        `SELECT
            _id,
            js->'data'->>'legal_name' AS legal_name,
            js->'data'->>'entity' AS entity,
            js->'data'->>'vat_status' AS vat_status,
            js->'data'->>'vat_number' AS vat_number,
            js->'data'->>'country_code' AS country_code,
            js->'extensions'->'moneo'->>'id' AS moneoid
         FROM data WHERE ref = $1 AND sid = $2 AND _id = $3`,
        ['entity', db.sid, eid]
    );

    return result.rows?.[0] || {};
}

async function getSellerCountry(db) {
    const query = `
        SELECT COALESCE(js->'data'->>'tax_region', 'LV') AS tax_region
        FROM data
        WHERE ref = $1 AND sid = $2
        LIMIT 1
    `;
    const result = await db.query(query, ['settings', db.sid]);
    return (result.rows?.[0]?.tax_region || 'LV').toUpperCase();
}

async function updateOrderMoneoId(db, orderId, field, value) {
    const query = `
        UPDATE data
        SET js = jsonb_set(
            jsonb_set(
                jsonb_set(
                    COALESCE(js, '{}'),
                    '{extensions}',
                    COALESCE(js->'extensions', '{}'),
                    true
                ),
                '{extensions,moneo}',
                COALESCE(js->'extensions'->'moneo', '{}'),
                true
            ),
            ARRAY['extensions', 'moneo', $1]::text[],
            to_jsonb($2::text),
            true
        )
        WHERE _id = $3 AND ref = $4 AND sid = $5
        RETURNING _id
    `;

    await db.query(query, [field, String(value), orderId, 'order', db.sid]);
}

function buildInvoicePayload(config, order, client, sellerCountry = 'LV') {
    const calculationItems = Array.isArray(order?.items) ? order.items.map((item) => ({ ...item })) : [];
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
    // const isWaybillPaid = !!(order?.waybill?.date && order?.payment?.date && order.waybill.date <= order.payment.date && hasWaybill);
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
                    convertToDateString(isWaybillPaid || !order?.id ? order?.waybill?.date : order?.invoice?.date),
                    convertToDateString(order?.payment?.date),
                    roundToTwoDecimals(order.id ? order?.grand_total || 0 : order?.payment?.amount || 0),
                    'SEB',
                    'EUR',
                    isWaybillPaid || !order?.id ? ['PAV'] : ['PR'],
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
                    String(order?.moneo_invoice_id || ''),
                    rowComment,
                    roundToTwoDecimals(order.id ? order?.grand_total || 0 : order?.payment?.amount || 0),
                    'EUR',
                    isWaybillPaid || !order?.id ? 'PAV' : 'PR',
                    '0.00',
                    'B',
                    roundToTwoDecimals(order?.payment?.amount || 0),
                    ''
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

        if (!client?.moneoid) {
            results.push({
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
        receipt: []
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

        const transactionOrders = await getTransactionsForReceiptSync(db, range.from, range.to, limit);
        logger.info(`[moneo.syncDocuments] Transaction candidates: ${transactionOrders.length}`);

        if (transactionOrders.length > 0) {
            response.transactions = await processReceipts(db, logger, transactionOrders, config, dryRun);
        }

        return response;
    } catch (error) {
        logger.error(`[moneo.syncDocuments] Fatal error: ${error.message}`);
        return { ...response, success: false, error: error.message };
    } finally {
        await db.close();
    }
};
