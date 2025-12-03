// import { authenticateToken } from '../_/helpers/auth.js';
import { log } from '../_/helpers/index.js';
import { syncWithMoneo } from '../integrations/moneo/index.js';

// API route for product export
function syncMoneoApi(app) {

    // app.get('/api/sync-moneo/', authenticateToken, async (req, res) => {
    app.get('/api/sync-moneo/', async (req, res) => {
        try {
            const filters = req.body.filters || {};

            const response = await syncWithMoneo();

            res.send({ success: true, response });
        } catch (err) {

            res.status(500).json({ error: 'failed to retrieve records' });
            log(`Error: ${err.stack?.split('\n')[1]?.trim() || 'unknown'} ${err.message}`);
        }
    });
}

export default syncMoneoApi;