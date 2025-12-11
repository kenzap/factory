export const find = async (query, access, db) => {
    try {
        const response = await executeFind(query, access, db);
        return response;
    } catch (error) {
        return {
            success: false,
            reason: error.message
        };
    }
};

/**
 * Execute find query
 */
async function executeFind(query, access, db) {

    // Validate access
    if (!access.permission === 'read' && !access.permission === 'write') {
        return {
            success: false,
            code: 420,
            reason: 'no read permission'
        };
    }

    // Validate query
    validateQuery(query);

    // Extract key
    const key = query.key || query.ref;

    // Build query components
    const builder = new QueryBuilder(query, access, key);

    // Handle ID-based queries
    if (query.id) {
        return await findById(query, builder, db);
    }

    // Handle general queries
    return await findMany(query, builder, db);
}

/**
 * Validate query parameters
 */
function validateQuery(query) {
    const key = query.key || query.ref;

    if (!key || key.length < 2 || key.length > 100) {
        throw new Error("'key' parameter must be between 2-100 characters");
    }

    if (!query.fields && !query.count && !query.sum) {
        throw new Error("'fields' parameter required");
    }
}

/**
 * Find by ID(s)
 */
async function findById(query, builder, db) {
    const ids = Array.isArray(query.id) ? query.id : [query.id];

    if (ids.length === 0) {
        return query.type === 'get' ? {} : [];
    }

    if (ids.some(id => !id || id.length < 12)) {
        throw new Error('Invalid ID format');
    }

    // Single ID with GET
    if (!Array.isArray(query.id) && query.type === 'get') {
        return await findSingle(query, builder, db);
    }

    // Multiple IDs or FIND
    return await findMultiple(ids, query, builder, db);
}

/**
 * Find single record
 */
async function findSingle(query, builder, db) {
    const { select, params } = builder.buildSelectQuery();
    const id = query.id;

    const sql = `
        SELECT ${select}
        FROM data
        WHERE _id = $${params.length + 1}
          AND ref = $1
          AND sid = $2
        LIMIT 1
    `;

    const result = await db.query(sql, [...params, id]);

    if (result.rows.length === 0) {
        return query.type === 'get' ? {} : null;
    }

    return formatSingleResult(result.rows[0], query);
}

/**
 * Find multiple records by IDs
 */
async function findMultiple(ids, query, builder, db) {
    const { select, params } = builder.buildSelectQuery();
    const limit = builder.getLimit();
    const offset = builder.getOffset();

    const idPlaceholders = ids.map((_, i) => `$${params.length + 1 + i}`).join(', ');

    const sql = `
        SELECT ${select}
        FROM data
        WHERE ref = $1
          AND sid = $2
          AND _id IN (${idPlaceholders})
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    console.log('SQL:', sql, [...params, ...ids]);

    const result = await db.query(sql, [...params, ...ids]);

    return formatMultipleResults(result.rows, query);
}

/**
 * Find many records with filters
 */
async function findMany(query, builder, db) {
    const { select, params } = builder.buildSelectQuery();
    const whereClause = builder.buildWhereClause();
    const groupBy = builder.buildGroupBy();
    const orderBy = builder.buildOrderBy();
    const limit = builder.getLimit();
    const offset = builder.getOffset();

    // Main query
    const sql = `
        SELECT ${select}
        FROM data
        WHERE ${whereClause}
        ${groupBy}
        ${orderBy}
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
    `;

    const result = await db.query(sql, [...params, limit, offset]);

    // Count query
    const countSql = `
        SELECT COUNT(_id) as total_records
        FROM data
        WHERE ${whereClause}
    `;

    const countResult = await db.query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].total_records);

    // Format results
    const data = formatMultipleResults(result.rows, query);

    return {
        data: query.type === 'get' && data.length > 0 ? data[0] : data,
        meta: {
            total_records: totalRecords,
            limit,
            offset
        }
    };
}

/**
 * Format single result
 */
function formatSingleResult(row, query) {
    const result = formatRow(row, query);
    return query.type === 'find' ? result : (result.data || result);
}

/**
 * Format multiple results
 */
function formatMultipleResults(rows, query) {
    return rows.map(row => formatRow(row, query));
}

/**
 * Format a single row
 */
function formatRow(row, query) {
    const item = {};
    const allFields = query.fields === '*';

    // Handle all fields
    if (allFields && row.data) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        Object.assign(item, data);
    }

    // Handle specific fields
    if (query.fields && !allFields) {
        query.fields.forEach(field => {
            if (field === '_id') {
                item[field] = row._id || row[field];
            } else {
                item[field] = parseJsonValue(row[field]);
            }
        });
    }

    // Handle count fields
    if (query.count) {
        query.count.forEach(field => {
            const countKey = `${field}_count`;
            item[countKey] = parseInt(row[countKey]) || 0;
        });
    }

    // Handle sum fields
    if (query.sum) {
        query.sum.forEach(field => {
            const sumKey = `${field}_sum`;
            item[sumKey] = parseFloat(row[sumKey]) || 0;
        });
    }

    // Ensure _id is present
    if (row._id && !item._id) {
        item._id = row._id;
    }

    return item;
}

/**
 * Parse JSON value from database
 */
function parseJsonValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}

/**
 * Query Builder
 */
class QueryBuilder {
    constructor(query, access, key) {
        this.query = query;
        this.access = access;
        this.key = key;
        this.params = [key, access.sid];
        this.paramIndex = 3;
    }

    buildSelectQuery() {
        const fields = this.buildSelectFields();
        return {
            select: fields,
            params: this.params
        };
    }

    buildSelectFields() {
        const parts = [];

        if (this.query.fields === '*') {
            return "_id, js->'data' as data";
        }

        if (this.query.fields) {
            this.query.fields.forEach(field => {
                if (field === '_id') {
                    parts.push('_id');
                } else {
                    parts.push(`js->'data'->'${field}' as "${field}"`);
                }
            });
        }

        if (this.query.count) {
            this.query.count.forEach(field => {
                parts.push(`COUNT(js->'data'->'${field}') as ${field}_count`);
            });
        }

        if (this.query.sum) {
            this.query.sum.forEach(field => {
                parts.push(`SUM((js->'data'->>'${field}')::numeric) as ${field}_sum`);
            });
        }

        return parts.join(', ');
    }

    buildWhereClause() {
        const conditions = ['ref = $1', 'sid = $2'];

        const search = this.buildSearchCondition();
        if (search) {
            conditions.push(search);
        }

        const terms = this.buildTermConditions();
        if (terms) {
            conditions.push(`(${terms})`);
        }

        return conditions.join(' AND ');
    }

    buildSearchCondition() {
        if (!this.query.search?.s || this.query.search.s.length === 0) {
            return null;
        }

        const searchValue = `%${this.query.search.s}%`;
        this.params.push(searchValue);

        if (this.query.search.field) {
            return `LOWER(js->'data'->>'${this.query.search.field}') LIKE LOWER($${this.paramIndex++})`;
        }

        return `LOWER(js::text) LIKE LOWER($${this.paramIndex++})`;
    }

    buildTermConditions() {
        if (!this.query.term) {
            return null;
        }

        const relation = this.query.term_relation || 'AND';

        if (typeof this.query.term === 'string') {
            return this.parseStringTerm(this.query.term);
        }

        if (Array.isArray(this.query.term)) {
            return this.query.term
                .map(t => this.buildSingleTerm(t))
                .join(` ${relation} `);
        }

        return this.buildSingleTerm(this.query.term);
    }

    parseStringTerm(termString) {
        const parts = termString.split('=');
        const conditions = [];

        for (let i = 0; i < parts.length - 1; i += 2) {
            const field = parts[i];
            const value = parts[i + 1];
            conditions.push(`js->'data'->>'${field}' = '${value}'`);
        }

        return conditions.join(' AND ');
    }

    buildSingleTerm(term) {
        const field = `js->'data'->>'${term.field}'`;

        if (term.type === 'numeric') {
            return `(${field})::numeric ${term.relation} ${term.value}`;
        }

        return `${field} ${term.relation} '${term.value}'`;
    }

    buildGroupBy() {
        if (!this.query.groupby || this.query.groupby.length === 0) {
            return '';
        }

        const groups = Array.isArray(this.query.groupby)
            ? this.query.groupby.map(g => `js->'data'->'${g.field}'`)
            : [`js->'data'->'${this.query.groupby.field}'`];

        return `GROUP BY ${groups.join(', ')}`;
    }

    buildOrderBy() {
        if (!this.query.sortby || this.query.sortby.length === 0) {
            return '';
        }

        const sortFields = Array.isArray(this.query.sortby)
            ? this.query.sortby
            : [this.query.sortby];

        const orders = sortFields.map(sort => {
            const isAggregation = sort.field.endsWith('_count') || sort.field.endsWith('_sum');

            if (isAggregation) {
                return `${sort.field} ${sort.order}`;
            }

            return `js->'data'->'${sort.field}' ${sort.order}`;
        });

        return `ORDER BY ${orders.join(', ')}`;
    }

    getLimit() {
        const limit = parseInt(this.query.limit) || 10;
        return Math.min(Math.max(limit, 1), 1000);
    }

    getOffset() {
        const offset = parseInt(this.query.offset) || 0;
        return Math.max(offset, 0);
    }
}