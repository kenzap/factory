import { makeId, sid } from '../index.js';

/**
 * Creates a managed database connection wrapper with restricted SQL operations.
 * 
 * This function provides a secure database interface that only allows specific
 * SQL operations on designated tables while preventing potentially
 * dangerous DDL operations.
 * 
 * @param {Function} getConnection - A function that returns a database connection object
 * @returns {Object} An object with the following methods:
 * @returns {Function} returns.raw - Executes a raw SQL query with validation
 * @returns {Function} returns.close - Closes the database connection
 * @returns {Function} returns.makeId - Generates an ID using the makeId function
 * @returns {Function} returns.sid - Returns the sid value
 * 
 * @example
 * const managedDb = createManagedRawDb(() => new DatabaseConnection());
 * 
 * // Valid operations
 * await managedDb.raw('SELECT * FROM data WHERE id = ?', [1]);
 * await managedDb.raw('INSERT INTO data (name) VALUES (?)', ['test']);
 * 
 * // Invalid operations (will throw errors)
 * // await managedDb.raw('DROP TABLE data'); // DDL not allowed
 * // await managedDb.raw('SELECT * FROM users'); // Only approved tables allowed
 * 
 * @throws {Error} When SQL contains operations other than SELECT/INSERT/UPDATE/DELETE
 * @throws {Error} When SQL attempts to access tables other than the approved set
 * @throws {Error} When SQL contains DDL statements (CREATE/ALTER/DROP/etc.)
 */
export const createManagedRawDb = (getConnection) => {
    let conn = null

    async function ensureConnection() {
        if (!conn) {
            conn = getConnection()
            await conn.connect()
        }
        return conn
    }

    const ALLOWED_OPS = /^(SELECT|INSERT|UPDATE|DELETE)\b/i
    const ALLOWED_TABLES = new Set(['data', 'metering'])
    const TABLE_REF = /\b(FROM|INTO|UPDATE|JOIN)\s+("?[\w.]+"?)/gi
    const FORBIDDEN = /\b(CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i

    return {
        async query(sql, params = []) {
            if (!ALLOWED_OPS.test(sql.trim())) {
                throw new Error('Only SELECT / INSERT / UPDATE / DELETE allowed')
            }

            const tableMatches = [...sql.matchAll(TABLE_REF)]
            if (tableMatches.length === 0) {
                throw new Error('Could not determine target table')
            }

            for (const match of tableMatches) {
                const tableRef = (match[2] || '').replace(/"/g, '')
                const table = tableRef.split('.').pop().toLowerCase()
                if (!ALLOWED_TABLES.has(table)) {
                    throw new Error('Only access to tables "data" and "metering" is allowed')
                }
            }

            if (FORBIDDEN.test(sql)) {
                throw new Error('DDL statements are not allowed')
            }

            const db = await ensureConnection()
            const result = await db.query(sql, params)

            return result
        },

        async close() {
            if (conn) {
                await conn.end()
                conn = null
            }
        },

        async end() {
            if (conn) {
                await conn.end()
                conn = null
            }
        },

        makeId() {
            return makeId();
        },

        sid
    }
}

export default createManagedRawDb;
