import cron from 'node-cron'

/**
 * Creates a cron job manager for scheduling and managing multiple cron tasks.
 * 
 * @param {Map} scheduledJobs - A Map to store registered cron jobs by name
 * @returns {Object} An object with methods to manage cron jobs
 * @returns {Function} returns.register - Register a new cron job
 * @returns {Function} returns.startAll - Start all registered cron jobs
 * @returns {Function} returns.stopAll - Stop all registered cron jobs
 * 
 * @example
 * const jobs = new Map();
 * const cronManager = createCronManager(jobs);
 * 
 * cronManager.register('daily-backup', '0 0 * * *', async () => {
 *   console.log('Running daily backup');
 * });
 * 
 * cronManager.startAll();
 */
export const createCronManager = (scheduledJobs, logger) => {
    return {
        register(name, schedule, handler, options = { timezone: 'UTC' }) {
            if (scheduledJobs.has(name)) {
                throw new Error(`Cron job "${name}" already registered`)
            }

            const task = cron.schedule(schedule, async () => {
                try {
                    await handler()
                } catch (err) {
                    logger.error(`[cron][${name}]`, err)
                }
            }, {
                timezone: options.timezone || 'UTC'
            })

            scheduledJobs.set(name, task)
        },

        startAll() {
            for (const task of scheduledJobs.values()) {
                task.start()
            }
        },

        stopAll() {
            for (const task of scheduledJobs.values()) {
                task.stop()
            }
        }
    }
}

export default createCronManager;