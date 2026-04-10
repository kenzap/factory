/*
    Getting all waybills for current month pending sync with Moneo.
    For: sales.invoices
    Type: PAV (document generated after payment, pēcapmaksa)
*/
export async function getOrdersForInvoiceSync(db, dateStart, dateEnd, limit) {
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

/*
    Getting all invoices for current month pending sync with Moneo.
    For: sales.invoices
    Type: PR (document generated before payment, priekšapmaksa)
*/
export async function getOrdersForReceiptSync(db, dateStart, dateEnd, limit) {
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
          AND (
                js->'data'->'waybill'->>'date' IS NULL
                OR js->'data'->'waybill'->>'date' = ''
                OR js->'data'->'waybill'->>'date' >= $3
          )
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

export async function updateOrderMoneoId(db, orderId, field, value) {
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