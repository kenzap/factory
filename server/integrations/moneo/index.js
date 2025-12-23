// import fetch from 'node-fetch';
import { getDbConnection, makeId, sid } from '../../_/helpers/index.js';

const MONEO_API_BASE = process.env.MONEO_API_BASE
const MONEO_AUTH_TOKEN = process.env.MONEO_AUTH_TOKEN;
const COMPANY_UID = process.env.COMPANY_UID;
const FIRM_ID = process.env.FIRM_ID;

export const syncWithMoneo = async () => {

    let response = { "invoice": [], "receipt": [], from: null, to: null };
    let syncMode = "invoice";
    let loop = 0;
    const maxLoops = 1;
    const limit = 1;

    const db = getDbConnection();

    await db.connect();

    while (loop < maxLoops) {
        await new Promise(resolve => setTimeout(resolve, 333)); // 1000ms / 3
        loop++;

        // Date range - last month
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - 1, 1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date();
        monthEnd.setMonth(monthEnd.getMonth(), 0);
        monthEnd.setHours(23, 59, 59, 999);

        // Convert to GMT+2 timezone (Europe/Riga)
        const dateStart = new Date(monthStart.getTime() + (2 * 60 * 60 * 1000)).toISOString();
        const dateEnd = new Date(monthEnd.getTime() + (2 * 60 * 60 * 1000)).toISOString();

        response.from = dateStart;
        response.to = dateEnd;
        console.log(`Sync period: ${dateStart} to ${dateEnd}`);

        try {
            // Moneo invoices = Waybills
            const invoiceOrders = await getOrdersForInvoiceSync(db, dateStart, dateEnd, limit);

            // response.invoiceOrders = invoiceOrders;
            // console.log(`Found ${invoiceOrders.length} orders for invoice sync`, invoiceOrders);

            if (invoiceOrders.length > 0) {
                response.invoice = await processInvoices(invoiceOrders, db);
                continue;
            }

            // If no invoices to sync, try receipts
            syncMode = "receipt";

            // Moneo receipts = Invoices
            const receiptOrders = await getOrdersForReceiptSync(db, dateStart, dateEnd, limit);

            // response.receiptOrders = receiptOrders;
            // console.log(`Found ${receiptOrders.length} orders for receipt sync`, receiptOrders);

            if (receiptOrders.length > 0) {
                response.receipt = await processReceipts(receiptOrders, db);
                continue;
            }

            // If nothing to sync, break
            break;

        } catch (error) {
            console.error('Sync error:', error);
            break;
        }
    }

    await db.end();

    return response;
};

async function getOrdersForInvoiceSync(db, dateStart, dateEnd, limit) {

    // Get invoices
    const query = `
        SELECT _id, 
            COALESCE(js->'data'->>'id', '') as id,
            COALESCE(js->'data'->>'from', '') as from,
            COALESCE(js->'data'->>'name', '') as name,
            COALESCE(js->'data'->>'address', '') as address,
            COALESCE(js->'data'->>'eid', '') as eid,
            COALESCE(js->'data'->>'notes', '') as notes,
            COALESCE(js->'data'->'price'->>'total', '') as total,
            COALESCE(js->'data'->'price'->>'tax_total', '') as tax_total,
            COALESCE(js->'data'->'price'->>'grand_total', '') as grand_total,
            COALESCE(js->'data'->>'operator', '') as operator,
            COALESCE(js->'data'->>'due_date', '') as due_date,
            CASE WHEN js->'data'->'draft' IS NOT NULL THEN (js->'data'->'draft')::boolean ELSE false END as draft,
            js->'data'->'inventory' as inventory,
            js->'data'->'invoice' as invoice,
            js->'data'->'payment' as payment,
            js->'data'->'waybill' as waybill,
            js->'data'->'date' as date,
            js->'data'->'items' as items
        FROM data 
        WHERE ref = $1 AND sid = $2 AND (js->'data'->'waybill'->>'date' >= $3) AND (js->'data'->'waybill'->>'date' <= $4) AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) AND js->'integrations'->'moneo'->'invoiceid' IS NULL ORDER BY js->'data'->'waybill'->>'date' ASC
        LIMIT $5
    `;

    const params = ['order', sid, dateStart, dateEnd, limit];

    let result = await db.query(query, params);

    return result.rows;
}

async function getOrdersForReceiptSync(db, dateStart, dateEnd, limit) {

    // Get waybills
    const query = `
        SELECT _id, 
            COALESCE(js->'data'->>'id', '') as id, 
            COALESCE(js->'data'->>'from', '') as from, 
            COALESCE(js->'data'->>'name', '') as name, 
            COALESCE(js->'data'->>'address', '') as address, 
            COALESCE(js->'data'->>'eid', '') as eid, 
            COALESCE(js->'data'->>'notes', '') as notes,
            COALESCE(js->'data'->'price'->>'total', '') as total,
            COALESCE(js->'data'->'price'->>'tax_total', '') as tax_total,
            COALESCE(js->'data'->'price'->>'grand_total', '') as grand_total,
            COALESCE(js->'data'->>'operator', '') as operator,
            COALESCE(js->'data'->>'due_date', '') as due_date,
            CASE WHEN js->'data'->'draft' IS NOT NULL THEN (js->'data'->'draft')::boolean ELSE false END as draft,
            js->'data'->'inventory' as inventory,
            js->'data'->'invoice' as invoice,
            js->'data'->'payment' as payment,
            js->'data'->'waybill' as waybill,
            js->'data'->'date' as date,
            js->'data'->'items' as items
        FROM data 
                WHERE ref = $1 AND sid = $2 AND (js->'data'->'payment'->>'date' >= $3) AND (js->'data'->'payment'->>'date' <= $4) AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL) AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL) AND js->'integrations'->'moneo'->'receiptid' IS NULL ORDER BY js->'data'->'payment'->>'date' ASC
        LIMIT $5
    `;

    const params = ['order', sid, dateStart, dateEnd, limit];

    let result = await db.query(query, params);

    return result.rows;
}

async function processInvoices(orders, db) {

    let i = [];

    for (const order of orders) {
        const client = await getClient(order.eid, db);

        console.log('Client Moneo ID:', client);

        // // Check if client needs to be synced first
        // if (!clientExtra.moneoid) {
        //     await syncClient(order, db);
        //     // Refresh client data
        //     const updatedClient = await db.query('SELECT * FROM clients WHERE id = ?', [order.client_id]);
        //     if (updatedClient.length > 0) {
        //         const updatedClientExtra = updatedClient[0].extra ? JSON.parse(updatedClient[0].extra) : {};
        //         if (!updatedClientExtra.moneoid) {
        //             console.log('Client sync failed, skipping invoice');
        //             continue;
        //         }
        //         clientExtra.moneoid = updatedClientExtra.moneoid;
        //     }
        // }

        i.push(await createInvoice(order, client, db));
    }

    return i;
}

async function getClient(eid, db) {

    const result = await db.query("SELECT _id, js->'data'->>'legal_name' as legal_name, js->'integrations'->'moneo'->>'id' as moneoid FROM data WHERE ref = $1 AND sid = $2 AND _id = $3", ['entity', sid, eid]);
    if (result.rows.length > 0) return result.rows[0] || {};

    return {};
}

async function processReceipts(orders, db) {

    let r = [];

    for (const order of orders) {
        const client = await getClient(order.eid, db);

        // // Check if client needs to be synced first
        // if (!client.moneoid) {
        //     await syncClient(order, db);
        //     // Refresh client data
        //     const updatedClient = await db.query('SELECT * FROM clients WHERE id = ?', [order.client_id]);
        //     if (updatedClient.length > 0) {
        //         const updatedClientExtra = updatedClient[0].extra ? JSON.parse(updatedClient[0].extra) : {};
        //         if (!updatedClientExtra.moneoid) {
        //             console.log('Client sync failed, skipping receipt');
        //             continue;
        //         }
        //         clientExtra.moneoid = updatedClientExtra.moneoid;
        //     }
        // }

        r.push(await createReceipt(order, client, db));
    }

    return r;
}

async function syncClient(order, db) {
    const clientStruct = {
        request: {
            compuid: COMPANY_UID
        },
        data: {
            'contacts.contacts': {
                fieldlist: [
                    "name",
                    "customerflag",
                    "address1",
                    "vatno",
                    "regnr",
                    "country",
                    "iban",
                    "clientnumber",
                    "vatpayer",
                    "comment"
                ],
                data: []
            }
        }
    };

    // Normalize registration number
    let regnum = (order.reg_number || '').trim();
    if (regnum.startsWith('LV')) {
        regnum = regnum.substring(2);
    }
    regnum = regnum.replace(/-/g, '');

    // Normalize VAT number
    let vatnum = (order.vat_number || '').replace(/-/g, '');

    // Determine VAT payer status
    let vatpayer = 1; // Default: no VAT
    const lursoftData = order.lursoft_data ? JSON.parse(order.lursoft_data) : {};

    if (order.entity_type === 'J' &&
        lursoftData.pvnStatus === 'active' &&
        vatnum.length > 0) {
        vatpayer = 0; // VAT payer
    }

    clientStruct.data['contacts.contacts'].data = [[
        order.name.trim(),
        1, // customer flag
        order.address || '',
        vatnum || '',
        regnum || order.client_id.toString(),
        'LV',
        (order.bank_account || '').replace(/\s+/g, ''),
        order.client_id.toString(),
        vatpayer,
        `#${order.client_id}`
    ]];

    try {
        const response = await makeMoneoRequest('/contacts.contacts/create/', clientStruct);

        if (response.result && response.result[0] && response.result[0][1] &&
            response.result[0][1][4] && response.result[0][1][4][0]) {

            const moneoId = response.result[0][1][4][0];
            const clientExtra = { id: order.client_id, moneoid: moneoId };

            // await db.query(
            //     'UPDATE clients SET extra = ? WHERE id = ?',
            //     [JSON.stringify(clientExtra), order.client_id]
            // );

            console.log(`Client synced with Moneo ID: ${moneoId}`);
        }
    } catch (error) {
        console.error('Client sync failed:', error);
    }
}

async function createInvoice(order, client, db) {

    // Parse order data from JS column
    // const orderData = order.js ? JSON.parse(order.js) : {};
    const items = order?.items || [];

    // Calculate totals
    let totalWithVat = 0;
    let totalWithoutVat = 0;
    // let vatAmount = 0;

    items.forEach(item => {
        const itemTotal = parseFloat(item.total || 0);
        const taxId = item.tax_id;

        if (taxId === '7216' || taxId === '0000') { // 21% VAT

            totalWithoutVat += itemTotal;
        } else { // 0% VAT

            totalWithVat += itemTotal;
            // const withoutVat = itemTotal / 1.21;
            // totalWithoutVat += withoutVat;
            // vatAmount += itemTotal - withoutVat;
        }
    });

    const usedVatCodes = [];
    if (totalWithoutVat > 0) usedVatCodes.push('RR7');
    if (totalWithVat > 0) usedVatCodes.push('21');

    const invoiceStruct = {
        request: {
            compuid: COMPANY_UID
        },
        data: {
            'sales.invoices': {
                fieldlist: [
                    "legalnr",
                    "custcode",
                    "custname",
                    "okflag",
                    "address1",
                    "invdate",
                    "paydate",
                    "totquant",
                    "totsum",
                    "vatsum",
                    "sum",
                    "country",
                    "dealtype",
                    "usedvatcodes",
                    "paydeal",
                    "currency",
                    "currencyrate",
                    "reference",
                    "comment"
                ],
                data: [[
                    order?.waybill?.number.toString(),
                    client?.moneoid,
                    client?.legal_name?.trim(),
                    1,
                    order?.address || '',
                    convertToDateString(order?.waybill?.date),
                    convertToDateString(order?.payment?.date),
                    "1",
                    roundToTwoDecimals(order.grand_total),
                    roundToTwoDecimals(order.tax_total),
                    roundToTwoDecimals(order.grand_total),
                    "LV",
                    "PAV",
                    usedVatCodes,
                    "10",
                    "EUR",
                    0,
                    order.id.toString(),
                    `#${order.id}`
                ]]
            },
            'sales.invoices_items_rows': {
                fieldlist: [
                    "itemname",
                    "quant",
                    "price",
                    "accnumber",
                    "vatcode"
                ],
                data: []
            }
        }
    };

    // Add invoice items
    const invoiceItems = [];
    if (totalWithoutVat > 0) {
        invoiceItems.push(["Produkti RR7", "1.00", roundToTwoDecimals(totalWithoutVat), "6210", "RR7"]);
    }
    if (totalWithVat > 0) {
        invoiceItems.push(["Produkti 21", "1.00", roundToTwoDecimals(totalWithVat), "6110", "21"]);
    }

    invoiceStruct.data['sales.invoices_items_rows'].data = invoiceItems;

    // console.log('Creating invoice with data:', JSON.stringify(invoiceStruct, null, 2));

    try {
        // const response = await makeMoneoRequest('/sales.invoices/create/', invoiceStruct);
        // if (response.result && response.result[0] && response.result[0][1] &&
        //     response.result[0][1][4] && response.result[0][1][4][0]) {
        //     const moneoInvoiceId = response.result[0][1][4][0];

        // TODO remove
        const moneoInvoiceId = makeId();

        // Update the order with moneo receipt ID in integrations path
        const updateQuery = `
            UPDATE data 
            SET js = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        COALESCE(js, '{}'),
                        '{integrations}',
                        COALESCE(js->'integrations', '{}'),
                        true
                    ),
                    '{integrations,moneo}',
                    COALESCE(js->'integrations'->'moneo', '{}'),
                    true
                ),
                '{integrations,moneo,invoiceid}',
                to_jsonb($1::text),
                true
            )
            WHERE _id = $2 AND ref = $3 AND sid = $4
            RETURNING _id
        `;

        let response = await db.query(updateQuery, [moneoInvoiceId, order._id, 'order', sid]);
        console.log(`Invoice created with Moneo ID: ${moneoInvoiceId}`);

        // }
    } catch (error) {

        invoiceStruct = { "error": error.message };
        console.error('Invoice creation failed:', error);
    }

    return invoiceStruct
}

async function createReceipt(order, client, db) {
    const receiptStruct = {
        request: {
            compuid: COMPANY_UID
        },
        data: {
            'sales.receipts': {
                fieldlist: [
                    "custcode",
                    "custname",
                    "regdate",
                    "transdate",
                    "paysum",
                    "paytype",
                    "currency",
                    "useddealtypes",
                    "vatsum",
                    "comment"
                ],
                data: [[
                    client?.moneoid,
                    client?.legal_name?.trim(),
                    convertToDateString(order.waybill?.date),
                    convertToDateString(order.payment?.date),
                    roundToTwoDecimals(order.grand_total || 0),
                    "SEB",
                    "EUR",
                    order.waybill?.date <= order.payment?.date && order.waybill?.number ? ["PAV"] : ["PR"],
                    "0.00",
                    order.invoice?.number || `#${order.id}`
                ]]
            },
            'sales.receipts_details_rows': {
                fieldlist: [
                    "prepaymentnumber",
                    "invnumber",
                    "rowcomment",
                    "rowsum",
                    "invcurrency",
                    "dealtype",
                    "taxval",
                    "taxcode",
                    "bankrowsum",
                    "clientreference"
                ],
                data: [[
                    "",
                    client?.moneoid || "",
                    order.waybill?.date <= order.payment?.date
                        ? (order.waybill?.number === "" || !order.waybill?.number
                            ? (order.invoice?.number === 0 || !order.invoice?.number
                                ? `Nav dati #${order.id}`
                                : `Priekšapmaksa #${order.invoice.number.toString().trim()}`)
                            : `Pavadzīme (${order.waybill.number})`)
                        : "Priekšapmaksa",
                    roundToTwoDecimals(order.grand_total || 0),
                    "EUR",
                    order.waybill?.date <= order.payment?.date && order.waybill?.number ? "PAV" : "PR",
                    "0.00",
                    "B",
                    roundToTwoDecimals(order.payment?.amount || 0),
                    ""
                ]]
            }
        }
    };

    try {

        console.log('Creating receipt with data:', JSON.stringify(receiptStruct, null, 2));

        // const response = await makeMoneoRequest('/sales.receipts/create/', receiptStruct);
        // if (response.result && response.result[0] && response.result[0][1] &&
        //     response.result[0][1][4] && response.result[0][1][4][0]) {
        //     const moneoReceiptId = response.result[0][1][4][0];

        // TODO remove
        const moneoReceiptId = makeId();

        // Update the order with moneo receipt ID in integrations path
        const updateQuery = `
            UPDATE data 
            SET js = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        COALESCE(js, '{}'),
                        '{integrations}',
                        COALESCE(js->'integrations', '{}'),
                        true
                    ),
                    '{integrations,moneo}',
                    COALESCE(js->'integrations'->'moneo', '{}'),
                    true
                ),
                '{integrations,moneo,receiptid}',
                to_jsonb($1::text),
                true
            )
            WHERE _id = $2 AND ref = $3 AND sid = $4
            RETURNING _id
        `;

        let response = await db.query(updateQuery, [moneoReceiptId, order._id, 'order', sid]);

        // receiptStruct.db_response = response;

        console.log(`Receipt created with Moneo ID: ${moneoReceiptId}`, order._id);
        // }
    } catch (error) {

        receiptStruct = { "error": error.message };
        console.error('Receipt creation failed:', error);
    }

    return receiptStruct
}

async function makeMoneoRequest(endpoint, data) {
    // const response = await fetch(`${MONEO_API_BASE}${endpoint}`, {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': MONEO_AUTH_TOKEN,
    //         'Accept': '*/*',
    //         'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:28.0) Gecko/20100101 Firefox/28.0'
    //     },
    //     body: JSON.stringify(data),
    //     // Disable SSL verification (not recommended for production)
    //     agent: new (await import('https')).Agent({
    //         rejectUnauthorized: false
    //     })
    // });

    // if (!response.ok) {
    //     throw new Error(`Moneo API error: ${response.status} ${response.statusText}`);
    // }

    // return await response.json();
    return {}; // MOCK RESPONSE FOR TESTING PURPOSES
}

function roundToTwoDecimals(num) {

    return (Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100).toFixed(2);
}

function convertToDateString(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return '0000-00-00';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}