import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, getSettings, sid } from '../_/helpers/index.js';

/**
 * Get Product List
 *
 * @version 1.0
 * @param {Object} filter - Language code for product titles and categories
 * @returns {Array<Object>} - Orders
*/
async function getUsers(filters = { limit: 50, s: '' }) {

    const client = getDbConnection();
    let users = [], meta = {};

    try {

        await client.connect();

        // Get user
        let userQuery = `
            SELECT  _id, 
                    js->'data'->'fname' as fname,
                    js->'data'->'lname' as lname,
                    js->'data'->'email' as email,
                    js->'data'->'phone' as phone,
                    js->'data'->'rights' as rights,
                    js->'data'->'portal' as portal,
                    js->'data'->'notes' as notes,
                    js->'data'->'avatar' as avatar,
                    js->'data'->'blocks' as blocks
            FROM data 
            WHERE ref = $1 AND sid = $2
        `;

        let userParams = ['user', sid];

        // Add search filter if present AND js->'data'->>'email' = $3
        if (filters.s && filters.s.trim() !== '') {
            userQuery += ` AND (unaccent(js->'data'->>'email') ILIKE unaccent($3) OR (unaccent(js->'data'->>'fname') ILIKE unaccent($3) OR unaccent(js->'data'->>'lname') ILIKE unaccent($3))) `;
            userParams.push(`%${filters.s}%`);
        }

        // Portal filter
        if (filters.portal && filters.portal === 'no-access') {
            userQuery += ` AND (js->'data'->>'portal' IS NULL OR js->'data'->>'portal' = '') `;
        } else if (filters.portal && filters.portal === 'access') {
            userQuery += ` AND (js->'data'->>'portal' IS NOT NULL AND js->'data'->>'portal' <> '') `;
        }

        // Pagination
        const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 50;
        const offset = Number.isInteger(filters.offset) && filters.offset > 0 ? filters.offset : 0;
        userParams.push(limit, offset);

        userQuery += `
            ORDER BY js->'data'->'created' DESC
            LIMIT $${userParams.length - 1} OFFSET $${userParams.length}
        `;

        const userResult = await client.query(userQuery, userParams);
        if (userResult.rows.length > 0) {
            users = userResult.rows;
        }

        // Get total number of available records for pagination
        let total_records = 0;
        const countQuery = `
            SELECT COUNT(_id) FROM data
            WHERE ref = $1 AND sid = $2
            ${filters.s && filters.s.trim() !== '' ? ` AND (unaccent(js->'data'->>'email') ILIKE unaccent($3) OR (unaccent(js->'data'->>'fname') ILIKE unaccent($3) OR unaccent(js->'data'->>'lname') ILIKE unaccent($3))) ` : ''}
            ${filters.portal && filters.portal === 'no-access' ? ` AND (js->'data'->>'portal' IS NULL OR js->'data'->>'portal' = '') ` : ''}
            ${filters.portal && filters.portal === 'access' ? ` AND (js->'data'->>'portal' IS NOT NULL AND js->'data'->>'portal' <> '') ` : ''}
        `;
        const countParams = userParams.slice(0, filters.s && filters.s.trim() !== '' ? 3 : 2);

        // get total records
        const countResult = await client.query(countQuery, countParams);
        total_records = parseInt(countResult.rows[0].count, 10);

        meta = { limit: limit, offset: offset, total_records: total_records };

    } finally {
        await client.end();
    }

    return { users, meta };
}

// API route
function getUsersApi(app) {

    app.post('/api/get-users/', authenticateToken, async (_req, res) => {

        const locale = await getLocale(_req.headers.locale);
        const settings = await getSettings();
        const users = await getUsers(_req.body.filters || {});

        res.json({ success: true, user: _req.user, users: users, settings, locale });
    });
}

export default getUsersApi;