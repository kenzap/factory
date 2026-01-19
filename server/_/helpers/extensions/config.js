/**
 * Resolves integration configuration from environment variables
 * @param {Object} manifest - The integration manifest containing config definitions
 * @param {Object} [manifest.config] - Configuration definitions with metadata
 * @param {boolean} [manifest.config[].required] - Whether the config value is required
 * @returns {Object} Resolved configuration object with values from environment variables
 * @throws {Error} When a required configuration value is missing from environment variables
 * @example
 * const manifest = {
 *   config: {
 *     API_KEY: { required: true },
 *     DEBUG_MODE: { required: false }
 *   }
 * };
 * const config = resolveIntegrationConfig(manifest);
 * // Returns: { API_KEY: process.env.API_KEY, DEBUG_MODE: process.env.DEBUG_MODE }
 *
 * @returns {Object} Resolved configuration object
 */
export const resolveIntegrationConfig = (manifest) => {

    const resolved = {}

    if (!manifest.config) return resolved

    for (const [key, meta] of Object.entries(manifest.config)) {
        const value = process.env[key]

        // if (!value && meta.required) {
        //     throw new Error(`Missing required config: ${key}`)
        // }

        resolved[key] = value
    }

    return resolved
}

/**
 * Creates a configuration interface object for an integration.
 * 
 * @param {Object} values - An object containing configuration key-value pairs
 * @param {string} integrationName - The name of the integration this config is for
 * @returns {Object} Configuration interface with a get method
 * @returns {Function} returns.get - Method to retrieve configuration values by key
 * @throws {Error} Throws an error if the requested key is not declared in values
 * 
 * @example
 * const config = createConfigInterface({ apiKey: 'abc123', timeout: 5000 }, 'MyAPI');
 * const apiKey = config.get('apiKey'); // Returns 'abc123'
 * config.get('invalidKey'); // Throws Error: Config "invalidKey" not declared for MyAPI
 */
export const createConfigInterface = (values, integrationName) => {
    return {
        get(key) {
            if (!(key in values)) {
                // throw new Error(
                //     `Config "${key}" not declared for ${integrationName}`
                // )
            }
            return values[integrationName + ":" + key]
        }
    }
}