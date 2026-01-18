import createLogger from '../../helpers/logger.js';
import createManagedRawDb from './db.js';

/**
 * Creates a plugin context object for integrations with controlled access to ERP resources.
 * 
 * @param {string} integrationName - The name of the integration/plugin
 * @param {Object} router - Express router instance for the plugin
 * @returns {Object} Plugin context object containing:
 *   - name: The integration name
 *   - router: Express router instance
 *   - logger: Logger instance scoped to the integration
 *   - repositories: Object for controlled database access (currently empty)
 *   - services: Object for exposed ERP services (currently empty)
 *   - config: Configuration object with enabled flag
 */
export const createExtensionContext = (extensionName, db, cronManager, router) => {

    // Example of controlled database access
    return {
        name: extensionName,
        router,
        logger: createLogger(`${extensionName}`),

        // 🔒 Controlled ERP access
        repositories: {
            // order: {
            //     async findById(id) {
            //         // replace with real DB logic
            //         return { id, total: 100, status: 'pending' }
            //     }
            // }
        },

        services: {
            // expose ERP services if needed
        },

        db: createManagedRawDb(db),

        cron: {
            register: (jobName, schedule, handler, options) => {
                const fullName = `${extensionName}:${jobName}`

                cronManager.register(
                    fullName,
                    schedule,
                    async () => {
                        // logger.info(`Cron started`)
                        await handler()
                        // logger.info(`Cron finished`)
                    },
                    options
                )
            }
        },

        config: {
            enabled: true
        }
    }
}

export default createExtensionContext;
