import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getSettings, log, sid } from '../_/helpers/index.js';

/**
 * Get Blog posts
 *
 * @version 1.0
 * @param {Object} filter - Post filters including search, category, limit, and offset
 * @returns {Array<Object>} - Response containing posts and metadata
*/
async function getPosts(filters = { limit: 50, s: '', cat: '' }) {

    const db = getDbConnection();
    let posts = [], meta = {};

    // Build base query
    let query = `
        SELECT
            _id,
            js->'data'->'title' AS title,
            js->'data'->'id' AS id,
            js->'data'->'slug' AS slug,
            js->'data'->'author' AS author,
            js->'data'->'language' AS language,
            js->'data'->'status' AS status,
            js->'data'->'img' AS img,
            js->'data'->'tags' AS tags,
            js->'data'->'updated' AS updated,
            js->'data'->'created' AS created
        FROM data
        WHERE ref = $1 AND sid = $2
    `;

    let params = ['blog-post', sid];

    // Add search filter if present
    if (filters.s && filters.s.trim() !== '') {
        query += ` AND unaccent(js->'data'->>'title') ILIKE unaccent($${params.length + 1})`;
        params.push(`%${filters.s}%`);
    }

    // Add cat search matching filter if present
    if (filters.cat && filters.cat.trim() !== '') {
        query += ` AND js->'data'->'tags' @> $${params.length + 1}::jsonb`;
        params.push(JSON.stringify([filters.cat]));
    }

    // Pagination
    const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 50;
    const offset = Number.isInteger(filters.offset) && filters.offset > 0 ? filters.offset : 0;

    query += `
        ORDER BY js->'data'->'created' DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total number of available records for pagination
    let total_records = 0;
    let countQuery = `
        SELECT COUNT(_id) FROM data
        WHERE ref = $1 AND sid = $2
    `;
    let countParams = ['blog-post', sid];

    if (filters.s && filters.s.trim() !== '') {
        countQuery += ` AND unaccent(js->'data'->>'title') ILIKE unaccent($${countParams.length + 1})`;
        countParams.push(`%${filters.s}%`);
    }

    if (filters.cat && filters.cat.trim() !== '') {
        countQuery += ` AND js->'data'->'tags' @> $${countParams.length + 1}::jsonb`;
        countParams.push(JSON.stringify([filters.cat]));
    }

    // Query execution
    try {

        await db.connect();

        // get products
        const result = await db.query(query, params);
        posts = result.rows;

        // get total records
        const countResult = await db.query(countQuery, countParams);
        total_records = parseInt(countResult.rows[0].count, 10);

        meta = { limit: limit, offset: offset, total_records: total_records };

    } finally {
        await db.end();
    }

    return { posts, meta };
}

// API route for product export
function getPostsApi(app) {

    app.post('/api/get-posts/', authenticateToken, async (req, res) => {
        try {
            const filters = req.body.filters || {};
            const records = await getPosts(filters);
            const settings = await getSettings(['domain_name']);

            res.send({ success: true, settings, posts: records.posts, meta: records.meta });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getPostsApi;