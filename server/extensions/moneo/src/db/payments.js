/**
 * Payments received in this ot the previous month for the waybills are synced seperately into the sales.receipts 
 * of moneo database.
 * For: sales.receipts
 * Type: PAV (document generated after payment, pēcapmaksa), PR (document generated before payment, priekšapmaksa)
 */
export async function getCarryOverPaymentsForReceiptSync(db, dateStart, dateEnd, limit) {
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
            js->'extensions'->'moneo'->>'invoiceid' AS moneo_invoice_id,
            js->'extensions'->'moneo'->>'receiptid' AS moneo_receipt_id
        FROM data
        WHERE ref = $1
          AND sid = $2
          AND js->'data'->'payment'->>'date' >= $3
          AND js->'data'->'payment'->>'date' <= $4
          AND js->'data'->'waybill'->>'date' IS NOT NULL
          AND js->'data'->'waybill'->>'date' < $4
          AND js->'data'->'waybill'->>'number' IS NOT NULL
          AND js->'data'->'waybill'->>'number' != ''
          AND ((js->'data'->'draft')::boolean = false OR js->'data'->'draft' IS NULL)
          AND ((js->'data'->'transaction')::boolean = false OR js->'data'->'transaction' IS NULL)
          AND js->'extensions'->'moneo'->'receiptid' IS NULL
        ORDER BY js->'data'->'payment'->>'date' ASC
        LIMIT $5
    `;

    // AND js->'data'->'invoice'->>'number' != ''
    // AND js->'extensions'->'moneo'->'receiptid' IS NOT NULL
    const result = await db.query(query, ['order', db.sid, dateStart, dateEnd, limit]);
    return result.rows || [];
}


export async function getTransactionsForReceiptSync(db, dateStart, dateEnd, limit) {
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