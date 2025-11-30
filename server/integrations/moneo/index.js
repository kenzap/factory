import fetch from 'node-fetch';

const MONEO_API_BASE = process.env.MONEO_API_BASE
const MONEO_AUTH_TOKEN = process.env.MONEO_AUTH_TOKEN;
const COMPANY_UID = process.env.COMPANY_UID;
const FIRM_ID = process.env.FIRM_ID;

export const syncWithMoneo = async (db, inventory, user_id) => {

    let syncMode = "invoice";
    let loop = 0;
    const maxLoops = 25;
    const limit = 1;

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

        const dateStart = monthStart.toISOString().split('T')[0];
        const dateEnd = monthEnd.toISOString().split('T')[0];

        console.log(`Sync period: ${dateStart} to ${dateEnd}`);

        try {
            // Get orders for invoice sync
            const invoiceOrders = await getOrdersForInvoiceSync(db, dateStart, dateEnd, limit);

            if (invoiceOrders.length > 0) {
                await processInvoices(invoiceOrders, db);
                continue;
            }

            // If no invoices to sync, try receipts
            syncMode = "receipt";
            const receiptOrders = await getOrdersForReceiptSync(db, dateStart, dateEnd, limit);

            if (receiptOrders.length > 0) {
                await processReceipts(receiptOrders, db);
                continue;
            }

            // If nothing to sync, break
            break;

        } catch (error) {
            console.error('Sync error:', error);
            break;
        }
    }
};

async function getOrdersForInvoiceSync(db, dateStart, dateEnd, limit) {
    const query = `
        SELECT o.*, c.* 
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE (
            (o.created_at >= ? AND o.created_at <= ?) 
            OR (o.delivery_date >= ? AND o.delivery_date <= ?)
        )
        AND o.status IN ('completed', 'delivered')
        AND o.total > 0
        AND c.id IS NOT NULL
        AND o.firm_id = ?
        AND (o.extra IS NULL OR JSON_EXTRACT(o.extra, '$.moneoid') IS NULL)
        ORDER BY o.delivery_date ASC
        LIMIT ?
    `;

    return await db.query(query, [dateStart, dateEnd, dateStart, dateEnd, FIRM_ID, limit]);
}

async function getOrdersForReceiptSync(db, dateStart, dateEnd, limit) {
    const query = `
        SELECT o.*, c.*
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.payment_date IS NOT NULL
        AND o.payment_date != '0000-00-00'
        AND (o.payment_date >= ? AND o.payment_date <= ?)
        AND o.status IN ('completed', 'delivered')
        AND c.id IS NOT NULL
        AND o.firm_id = ?
        AND (o.extra IS NULL OR JSON_EXTRACT(o.extra, '$.moneoreceiptid') IS NULL)
        ORDER BY o.delivery_date ASC
        LIMIT ?
    `;

    return await db.query(query, [dateStart, dateEnd, FIRM_ID, limit]);
}

async function processInvoices(orders, db) {
    for (const order of orders) {
        const clientExtra = order.client_extra ? JSON.parse(order.client_extra) : {};

        // Check if client needs to be synced first
        if (!clientExtra.moneoid) {
            await syncClient(order, db);
            // Refresh client data
            const updatedClient = await db.query('SELECT * FROM clients WHERE id = ?', [order.client_id]);
            if (updatedClient.length > 0) {
                const updatedClientExtra = updatedClient[0].extra ? JSON.parse(updatedClient[0].extra) : {};
                if (!updatedClientExtra.moneoid) {
                    console.log('Client sync failed, skipping invoice');
                    continue;
                }
                clientExtra.moneoid = updatedClientExtra.moneoid;
            }
        }

        await createInvoice(order, clientExtra, db);
    }
}

async function processReceipts(orders, db) {
    for (const order of orders) {
        const clientExtra = order.client_extra ? JSON.parse(order.client_extra) : {};

        // Check if client needs to be synced first
        if (!clientExtra.moneoid) {
            await syncClient(order, db);
            // Refresh client data
            const updatedClient = await db.query('SELECT * FROM clients WHERE id = ?', [order.client_id]);
            if (updatedClient.length > 0) {
                const updatedClientExtra = updatedClient[0].extra ? JSON.parse(updatedClient[0].extra) : {};
                if (!updatedClientExtra.moneoid) {
                    console.log('Client sync failed, skipping receipt');
                    continue;
                }
                clientExtra.moneoid = updatedClientExtra.moneoid;
            }
        }

        await createReceipt(order, clientExtra, db);
    }
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

            await db.query(
                'UPDATE clients SET extra = ? WHERE id = ?',
                [JSON.stringify(clientExtra), order.client_id]
            );

            console.log(`Client synced with Moneo ID: ${moneoId}`);
        }
    } catch (error) {
        console.error('Client sync failed:', error);
    }
}

async function createInvoice(order, clientExtra, db) {
    // Parse order data from JS column
    const orderData = order.js ? JSON.parse(order.js) : {};
    const items = orderData.data?.items || [];

    // Calculate totals
    let totalWithVat = 0;
    let totalWithoutVat = 0;
    let vatAmount = 0;

    items.forEach(item => {
        const itemTotal = parseFloat(item.total || 0);
        const taxId = item.tax_id;

        if (taxId === '7216' || taxId === '21') { // 21% VAT
            totalWithVat += itemTotal;
            const withoutVat = itemTotal / 1.21;
            totalWithoutVat += withoutVat;
            vatAmount += itemTotal - withoutVat;
        } else { // 0% VAT
            totalWithoutVat += itemTotal;
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
                    order.invoice_number || order.id.toString(),
                    clientExtra.moneoid,
                    order.name.trim(),
                    1,
                    order.address || '',
                    order.delivery_date || order.created_at,
                    order.payment_date || order.created_at,
                    "1",
                    order.total,
                    vatAmount,
                    order.total,
                    "LV",
                    "PAV",
                    usedVatCodes,
                    "10",
                    "EUR",
                    0,
                    order.reference || "",
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
        invoiceItems.push(["Products 0%", "1.00", totalWithoutVat.toFixed(2), "6210", "RR7"]);
    }
    if (totalWithVat > 0) {
        invoiceItems.push(["Products 21%", "1.00", (totalWithVat / 1.21).toFixed(2), "6110", "21"]);
    }

    invoiceStruct.data['sales.invoices_items_rows'].data = invoiceItems;

    try {
        const response = await makeMoneoRequest('/sales.invoices/create/', invoiceStruct);

        if (response.result && response.result[0] && response.result[0][1] &&
            response.result[0][1][4] && response.result[0][1][4][0]) {

            const moneoInvoiceId = response.result[0][1][4][0];
            const orderExtra = order.extra ? JSON.parse(order.extra) : {};
            orderExtra.moneoid = moneoInvoiceId;

            await db.query(
                'UPDATE orders SET extra = ? WHERE id = ?',
                [JSON.stringify(orderExtra), order.id]
            );

            console.log(`Invoice created with Moneo ID: ${moneoInvoiceId}`);
        }
    } catch (error) {
        console.error('Invoice creation failed:', error);
    }
}

async function createReceipt(order, clientExtra, db) {
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
                    clientExtra.moneoid,
                    order.name.trim(),
                    order.delivery_date || order.created_at,
                    order.payment_date,
                    order.paid_amount || order.total,
                    "SEB",
                    "EUR",
                    order.delivery_date <= order.payment_date && order.invoice_number ? ["PAV"] : ["PR"],
                    "0.00",
                    order.invoice_number || `#${order.id}`
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
                    0, // Will be updated with Moneo invoice ID if available
                    order.delivery_date <= order.payment_date && order.invoice_number
                        ? `Invoice (${order.invoice_number})`
                        : "Prepayment",
                    order.paid_amount || order.total,
                    "EUR",
                    order.delivery_date <= order.payment_date && order.invoice_number ? "PAV" : "PR",
                    "0.00",
                    "B",
                    order.paid_amount || order.total,
                    ""
                ]]
            }
        }
    };

    try {
        const response = await makeMoneoRequest('/sales.receipts/create/', receiptStruct);

        if (response.result && response.result[0] && response.result[0][1] &&
            response.result[0][1][4] && response.result[0][1][4][0]) {

            const moneoReceiptId = response.result[0][1][4][0];
            const orderExtra = order.extra ? JSON.parse(order.extra) : {};
            orderExtra.moneoreceiptid = moneoReceiptId;

            await db.query(
                'UPDATE orders SET extra = ? WHERE id = ?',
                [JSON.stringify(orderExtra), order.id]
            );

            console.log(`Receipt created with Moneo ID: ${moneoReceiptId}`);
        }
    } catch (error) {
        console.error('Receipt creation failed:', error);
    }
}

async function makeMoneoRequest(endpoint, data) {
    const response = await fetch(`${MONEO_API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': MONEO_AUTH_TOKEN,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:28.0) Gecko/20100101 Firefox/28.0'
        },
        body: JSON.stringify(data),
        // Disable SSL verification (not recommended for production)
        agent: new (await import('https')).Agent({
            rejectUnauthorized: false
        })
    });

    if (!response.ok) {
        throw new Error(`Moneo API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}
