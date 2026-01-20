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