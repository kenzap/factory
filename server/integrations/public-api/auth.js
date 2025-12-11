// Bearer token authentication helper
export const authenticateBearerToken = async (req, db) => {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Authorization header with Bearer token required' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const query = `
            SELECT  sid,
                    js->'data'->'permission' as permission, 
                    js->'data'->'active' as active
            FROM data 
            WHERE ref = $1 AND js->'data'->>'token' = $2
            LIMIT 1
        `;

        const result = await db.query(query, ['api-key', token]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid token' };
        }

        const tokenData = result.rows[0];

        if (!tokenData.active) {
            return { success: false, error: 'Token is not active' };
        }

        return { success: true, sid: tokenData.sid, permission: tokenData.permission };

    } catch (error) {
        return { success: false, error: 'Database error ' + error.message };
    }
}
