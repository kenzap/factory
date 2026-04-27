import { store } from './src/store.js';

/**
 * Registers machine tracking routes and handlers
 * @param {Object} options - Configuration object
 * @param {Object} options.router - Express router instance
 * @param {Object} options.db - Database connection instance
 * @param {Object} options.logger - Logger instance
 * @returns {void}
 */
export function register({ router, db, logger }) {

    // register store reading route
    router.post('/store-reading', async (req, res) => {

        const hasMachine = Boolean(req.body?.machine || req.body?.machine_id);
        const hasReading = req.body && req.body.reading !== undefined && req.body.reading !== null;

        if (!req.body || !hasMachine || !hasReading) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const response = await store(req.body, db, logger);

        await db.end();

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.send(response);
    });
};
