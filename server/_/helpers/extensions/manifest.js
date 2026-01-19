import fs from 'fs';
import path from 'path';

const INTEGRATIONS_DIR = path.join(process.cwd(), 'server', 'extensions');

/**
 * Loads integration manifests from the integrations directory
 * 
 * @param {string} directory - The directory path to load integrations from
 * @param {Object} app - The application instance
 * @param {Object} logger - Logger instance for logging operations
 * @param {Object} scheduledJobs - Scheduled jobs object
 * @param {Object} fileCache - File cache object for caching operations
 * @returns {Promise<Object>} A promise that resolves to an object containing integration manifests, keyed by integration name
 * @description Scans the integrations directory for manifest.json files, parses them, and returns the config sections of valid manifests
 */
export const loadIntegrationManifests = () => {

    const manifests = []

    if (!fs.existsSync(INTEGRATIONS_DIR)) return manifests

    for (const name of fs.readdirSync(INTEGRATIONS_DIR)) {
        const manifestPath = path.join(
            INTEGRATIONS_DIR,
            name,
            'manifest.json'
        )

        if (!fs.existsSync(manifestPath)) continue

        const manifest = JSON.parse(
            fs.readFileSync(manifestPath, 'utf8')
        )

        if (manifest.config) {
            manifests.push({
                name: manifest.name,
                slug: name,
                config: manifest.config
            })
        }
    }

    return manifests
}

export const loadManifest = (integrationPath) => {
    const manifestPath = path.join(
        path.dirname(integrationPath),
        'manifest.json'
    )

    if (!fs.existsSync(manifestPath)) return null

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    return manifest
}

// export default loadManifest;

// export default loadIntegrationManifests;
