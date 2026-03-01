import express from 'express';
import fs from 'fs';
import path from 'path';
import { getDbConnection } from '../index.js';
import { getSettings } from '../settings.js';
import { createExtensionContext } from './context.js';
import { createCronManager } from './cron.js';
import { checkFileExists } from './file.js';
import { loadManifest } from './manifest.js';

/**
 * Loads and registers extensions from a specified directory
 * 
 * @async
 * @function loadExtensions
 * @param {string} directory - The directory path containing extension folders
 * @param {Object} app - Express application instance
 * @param {Object} logger - Logger instance for logging messages
 * @param {Object} scheduledJobs - Object containing scheduled jobs for cron management
 * @param {Object} fileCache - Cache object for file existence checking
 * @returns {Promise<void>} Promise that resolves when all extensions are loaded
 * 
 * @description
 * This function scans the provided directory for extension folders, loads each extension's
 * index.js file, validates that it exports a register function, creates an isolated router
 * for each extension, mounts it under the /extension/{folder} namespace, and registers
 * the extension with a context object containing database connection, cron manager, and router.
 * 
 * @example
 * await loadExtensions('./extensions', app, logger, scheduledJobs, fileCache);
 */
export const loadExtensions = async (directory, app, logger, scheduledJobs, fileCache) => {

    if (!fs.existsSync(directory)) return

    const cronManager = createCronManager(scheduledJobs, logger);
    const settings = await getSettings();

    const integrationFolders = fs.readdirSync(directory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

    for (const folder of integrationFolders) {
        const enabledRaw = settings?.[`${folder}:enabled`];
        const isEnabled = !['', '0', 0, false, 'false'].includes(enabledRaw);

        if (!isEnabled) {
            logger.info(`Skipped integration (disabled): ${folder}`);
            continue;
        }

        const integrationPath = path.join(directory, folder, 'index.js')

        if (!checkFileExists(integrationPath, fileCache)) {
            logger.warn(`Integration ${folder} missing index.js`)
            continue
        }

        const manifest = loadManifest(integrationPath)

        try {
            const module = await import(integrationPath)
            const integration = module.default || module

            if (typeof integration?.register !== 'function') {
                logger.warn(`Integration ${folder} does not export register()`)
                continue
            }

            // 🔹 Create isolated router
            const router = express.Router()

            // 🔹 Mount under namespace
            app.use(`/extension/${folder}`, router)

            // 🔹 Create plugin context
            const context = await createExtensionContext(folder, getDbConnection, cronManager, router, manifest)

            // 🔹 Register integration
            integration.register(context)

            logger.info(`Loaded integration: ${folder}`)
        } catch (err) {
            logger.error(`Failed loading integration ${folder}`, err)
        }
    }
}

export default loadExtensions;
