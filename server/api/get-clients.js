import { authenticateToken } from '../_/helpers/auth.js';
import { getDbConnection, getLocale, log, sid } from '../_/helpers/index.js';

/**
 * Retrieves client entities from the database with optional filtering capabilities.
 * 
 * @function getClients
 * @param {Object} [filters] - Filter options for querying clients
 * @param {Object} [filters.client] - Client-specific filters
 * @param {string} [filters.client.name=""] - Client name filter
 * @param {string} [filters.client.eid=""] - Client entity ID filter
 * @param {string} [filters.dateFrom=""] - Start date filter (ISO date string)
 * @param {string} [filters.dateTo=""] - End date filter (ISO date string)
 * @param {string} [filters.type=""] - Type filter (e.g., 'draft')
 * @returns {Promise<Array<Object>>} Promise that resolves to an array of client objects containing:
 *   - _id: Client unique identifier
 *   - legal_name: Legal name or regular name if legal name is empty
 *   - reg_number: Registration number
 *   - vat_number: VAT number
 *   - vat_status: VAT status
 *   - reg_address: Registered address
 *   - bank_acc: Bank account information
 *   - entity: Entity type
 *   - notes: Additional notes
 *   - contacts: Contact information (JSON object)
 *   - created: Creation timestamp
 * ...
 */
async function getClients(filters = { client: { name: "", eid: "" }, dateFrom: '', dateTo: '', type: '', offset: 0, limit: 100 }) {

    const db = getDbConnection();

    let clients = { records: [], total: 0 };

    // Get orders
    let query = `
        SELECT _id, 
                CASE 
                    WHEN COALESCE(js->'data'->>'legal_name', '') = '' 
                    THEN COALESCE(js->'data'->>'name', '') 
                    ELSE COALESCE(js->'data'->>'legal_name', '') 
                END as legal_name,
                COALESCE(js->'data'->>'reg_number', '') as reg_number, 
                COALESCE(js->'data'->>'vat_number', '') as vat_number, 
                COALESCE(js->'data'->>'vat_status', '') as vat_status,
                COALESCE(js->'data'->>'reg_address', '') as reg_address,
                COALESCE(js->'data'->>'bank_acc', '') as bank_acc,
                COALESCE(js->'data'->>'entity', '') as entity,
                COALESCE(js->'data'->>'notes', '') as notes,
                js->'data'->'contacts' as contacts,
                COALESCE(js->'meta'->>'created', '') as created
        FROM data 
        WHERE ref = $1 AND sid = $2 `;

    const params = ['3dfactory-entity', sid];

    if (filters.client?.eid) {
        query += ` AND (js->'data'->>'eid' = $${params.length + 1} OR unaccent(js->'data'->>'name') ILIKE unaccent($${params.length + 2}))`;
        params.push(`${filters.client.eid.trim()}`);
        params.push(`${filters.client.name.trim()}`);
    }

    if (filters.type == 'individual') {
        query += ` AND js->'data'->>'entity' = 'individual'`;
    }

    if (filters.type == 'company') {
        query += ` AND js->'data'->>'entity' = 'company'`;
    }

    // Apply pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    // Apply sorting
    const sortBy = filters.sort_by || 'created';
    const sortDir = filters.sort_dir || 'desc';

    let orderByClause = `js->'data'->>'created'`;
    switch (sortBy) {
        case 'legal_name':
            orderByClause = `CASE 
                WHEN COALESCE(js->'data'->>'legal_name', '') = '' 
                THEN COALESCE(js->'data'->>'name', '') 
                ELSE COALESCE(js->'data'->>'legal_name', '') 
            END`;
            break;
        case 'reg_number':
            orderByClause = `js->'data'->>'reg_number'`;
            break;
        case 'entity':
            orderByClause = `js->'data'->>'entity'`;
            break;
        case 'created':
        default:
            orderByClause = `js->'data'->>'created'`;
            break;
    }

    query += ` ORDER BY ${orderByClause} ${sortDir.toUpperCase()} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit);
    params.push(offset);

    try {

        await db.connect();

        const result = await db.query(query, params);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM data 
            WHERE ref = $1 AND sid = $2 ` +
            (filters.client?.eid ? ` AND (js->'data'->>'eid' = $3 OR unaccent(js->'data'->>'name') ILIKE unaccent($4))` : '') +
            (filters.dateFrom && filters.dateFrom.trim() !== '' ? ` AND js->'data'->>'created' >= $${filters.client?.eid ? 5 : 3}` : '') +
            (filters.dateTo && filters.dateTo.trim() !== '' ? ` AND js->'data'->>'created' <= $${filters.client?.eid ? (filters.dateFrom && filters.dateFrom.trim() !== '' ? 6 : 5) : (filters.dateFrom && filters.dateFrom.trim() !== '' ? 4 : 3)}` : '') +
            (filters.type == 'draft' ? ` AND (js->'data'->'draft')::boolean = true` : '');

        const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
        const countResult = await db.query(countQuery, countParams);
        const totalRecords = parseInt(countResult.rows[0].total);

        clients.records = result.rows;
        clients.total = totalRecords;

    } finally {
        await db.end();
    }

    return clients;
}

// API route
function getClientsApi(app) {

    app.post('/api/get-clients/', authenticateToken, async (req, res) => {
        try {

            const locale = await getLocale(req.headers.locale);
            const filters = req.body.filters || {};
            const clients = await getClients(filters);

            res.send({ success: true, user: req.user, clients, message: '', locale });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error getting records: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default getClientsApi;