export async function getClient(eid, db) {
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

export async function getSellerCountry(db) {
    const query = `
        SELECT COALESCE(js->'data'->>'tax_region', 'LV') AS tax_region
        FROM data
        WHERE ref = $1 AND sid = $2
        LIMIT 1
    `;
    const result = await db.query(query, ['settings', db.sid]);
    return (result.rows?.[0]?.tax_region || 'LV').toUpperCase();
}