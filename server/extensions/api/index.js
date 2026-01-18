import { authenticateBearerToken } from './src/auth.js';
import { find } from './src/find.js';

/**
 * Registers API routes for the extension.
 * 
 * @param {Object} options - Configuration object
 * @param {Object} options.router - Express router instance for registering routes
 * @param {Object} options.db - Database connection instance
 * @param {Object} options.logger - Logger instance for logging operations
 * 
 * @description This function sets up the following routes:
 * - GET /find - Authenticated route for finding resources
 * - GET /update - Placeholder route for update operations (not implemented)
 * 
 * @link http://localhost:3000/extension/api/find
 * 
 * @example
 * register({
 *   router: express.Router(),
 *   db: databaseConnection,
 *   logger: winston.createLogger()
 * });
 */
export function register({ router, db, logger }) {

    // register find route
    router.post('/find', async (req, res) => {

        // Authenticate with bearer token
        const auth = await authenticateBearerToken(req, db);

        if (!auth.success) {
            return res.status(401).json({ error: auth.error });
        }

        const response = await find(req.body, { sid: auth.sid, permission: auth.permission }, db, logger);

        await db.end();

        res.send({ success: true, response });
    });

    // register update route
    router.post('/update', async (req, res) => {

        // TODO: implement update logic

    });

    // TODO: implement other routes
};