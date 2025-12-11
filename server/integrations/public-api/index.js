import { getDbConnection } from '../../_/helpers/index.js';
import { authenticateBearerToken } from './auth.js';
import { find } from './find.js';

// API route for product export
function publicApi(app) {

    app.post('/api/find/', async (req, res) => {

        try {

            const db = getDbConnection();

            await db.connect();

            console.log('query', req.body);

            // Authenticate with bearer token
            const auth = await authenticateBearerToken(req, db);

            if (!auth.success) {
                return res.status(401).json({ error: auth.error });
            }

            const response = await find(req.body, { sid: auth.sid, permission: auth.permission }, db);

            await db.end();

            res.send({ success: true, response });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records ' + err.message });
            log(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default publicApi;