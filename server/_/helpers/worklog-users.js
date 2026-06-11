import { getDbConnection, sid } from './index.js';

/**
 * Retrieves portal-enabled users for worklog-like employee selection UIs.
 */
export async function getPortalUsers() {
    const db = getDbConnection();
    let users = [];

    try {
        await db.connect();

        const query = `
        SELECT
            _id,
            js->'data'->'fname' AS fname,
            js->'data'->'lname' AS lname
        FROM data
        WHERE ref = $1 AND sid = $2 AND (js->'data'->>'portal' IS NOT NULL AND js->'data'->>'portal' <> '')
        LIMIT 100
        `;

        const result = await db.query(query, ['user', sid]);
        if (result.rows.length > 0) users = result.rows;
    } finally {
        await db.end();
    }

    return users;
}

/**
 * Build activity score map for worklog users based on recent records.
 * Score formula:
 * - today entries * 2
 * - last 7 days entries * 3
 * - last 30 days entries * 1
 */
export async function getWorkLogActivityScores() {
    const db = getDbConnection();
    const scores = {};

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - (7 * dayMs));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * dayMs));

    try {
        await db.connect();

        const query = `
        SELECT
            js->'data'->>'user_id' AS user_id,
            js->'data'->>'date' AS date
        FROM data
        WHERE ref = $1 AND sid = $2 AND js->'data'->>'date' >= $3
        ORDER BY js->'data'->>'date' DESC
        LIMIT 3000
        `;

        const result = await db.query(query, ['worklog', sid, thirtyDaysAgo.toISOString()]);

        for (const row of result.rows || []) {
            const userId = row.user_id;
            const entryDate = row.date ? new Date(row.date) : null;
            if (!userId || !entryDate || Number.isNaN(entryDate.getTime())) continue;

            if (!scores[userId]) {
                scores[userId] = {
                    score: 0,
                    today: 0,
                    week: 0,
                    month: 0,
                    last_activity: ''
                };
            }

            const bucket = scores[userId];

            if (entryDate >= startToday) bucket.today += 1;
            if (entryDate >= sevenDaysAgo) bucket.week += 1;
            if (entryDate >= thirtyDaysAgo) bucket.month += 1;
            if (!bucket.last_activity || entryDate.toISOString() > bucket.last_activity) {
                bucket.last_activity = entryDate.toISOString();
            }
        }

        for (const userId of Object.keys(scores)) {
            const bucket = scores[userId];
            bucket.score = (bucket.today * 2) + (bucket.week * 3) + bucket.month;
        }
    } finally {
        await db.end();
    }

    return scores;
}
