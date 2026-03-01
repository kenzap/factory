/**
 * Atomically claims one eligible order for feedback request email.
 * The claim sets `data.email_ask_feedback` to a unix timestamp to avoid duplicates.
 */
export const claimOrderForFeedback = async (db, logger, minOrderAgeSeconds = 7 * 24 * 60 * 60) => {
    const now = Math.floor(Date.now() / 1000);
    const createdBefore = now - minOrderAgeSeconds;

    const query = `
        UPDATE data "order"
        SET js = jsonb_set("order".js, '{data,email_ask_feedback}', to_jsonb($4::bigint), true)
        WHERE "order"._id = (
            SELECT candidate._id
            FROM data candidate
            WHERE candidate.ref = $1
              AND candidate.sid = $2
              AND COALESCE(candidate.js->'data'->>'email', '') <> ''
              AND COALESCE(candidate.js->'data'->>'created', '0')::bigint <= $3
              AND (candidate.js->'data'->>'email_ask_feedback' IS NULL OR candidate.js->'data'->>'email_ask_feedback' = '')
              AND EXISTS (
                  SELECT 1
                  FROM data entity
                  WHERE entity.ref = 'entity'
                    AND entity.sid = $2
                    AND entity._id = candidate.js->'data'->>'eid'
                    AND LOWER(COALESCE(entity.js->'data'->'notifications'->'ask_feedback'->>'email', 'false')) = 'true'
              )
            ORDER BY COALESCE(candidate.js->'data'->>'created', '0')::bigint ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING
            "order"._id,
            "order".js->'data'->>'id' AS id,
            "order".js->'data'->>'name' AS name,
            "order".js->'data'->>'email' AS email,
            "order".js->'data'->>'created' AS created
    `;

    try {
        const params = ['order', db.sid, createdBefore, now];
        const result = await db.query(query, params);
        return result.rows?.[0] || null;
    } catch (error) {
        logger.error('Error claiming order for feedback request:', error);
        return null;
    }
};

export default claimOrderForFeedback;
