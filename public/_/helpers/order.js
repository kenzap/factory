/**
 * Extracts distinct coating types from price settings.
 * 
 * @param {Object} settings - The settings object containing price information
 * @param {Array} settings.price - Array of price items with parent coating information
 * @param {string} settings.price[].parent - The parent coating type for each price item
 * @returns {Array<string>} Array of unique coating types extracted from the price items
 */
export const getCoatings = (settings) => {

    const distinctCoatings = [...new Set(settings.price.map(item => item.parent))];
    return distinctCoatings;
}

/**
 * Extracts unique coating titles from price settings.
 * 
 * @param {Object} settings - The settings object containing price information
 * @param {Array} settings.price - Array of price items with coating information
 * @param {string} settings.price[].title - The title/name of the coating
 * @returns {string[]} Array of distinct coating titles
 */
export const getColors = (settings) => {

    const distinctCoatings = [...new Set(settings.price.map(item => item.title))];
    return distinctCoatings;
}
