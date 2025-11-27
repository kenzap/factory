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

/**
 * The purpose of this function is to format a company name for display. And hide individual names for physical persons.
 * It checks if the company name contains certain abbreviations (like "SIA", "BDR", "AS") and if it does not,
 * it abbreviates the name to the first letter of the first two words.
 * @param {Object} settings - The settings object containing price information
 * @returns 
 */
export const formatCompanyName = (order) => {

    let company = order.name || '';

    // Detect physical persons and abbreviate
    if (company.toLowerCase().indexOf(' sia') === -1 &&
        company.toLowerCase().indexOf(' bdr') === -1 &&
        company.toLowerCase().indexOf(' as') === -1 &&
        company.indexOf(' ') > 0) {
        const parts = company.split(' ');
        return parts[0].substring(0, 1) + parts[1].substring(0, 1);
    }
    return company;
}

/**
 * Determines whether an order row is allowed to be edited based on inventory dates.
 * An order is not allowed to be edited if any of the following dates are present:
 * isu_date (issue date), wrt_date (write date), or mnf_date (manufacture date).
 * 
 * @param {Object} rowData - The row data object containing order information
 * @param {Object} [rowData.inventory] - The inventory object containing date fields
 * @param {string} [rowData.inventory.isu_date] - The issue date
 * @param {string} [rowData.inventory.wrt_date] - The write date  
 * @param {string} [rowData.inventory.mnf_date] - The manufacture date
 * @returns {boolean} Returns false if any inventory dates are present, otherwise false
 */
export const isAllowedToEdit = (rowData) => {

    const inventory = rowData.inventory || false;

    if (inventory.isu_date) return { allow: false, reason: 'Item is issued' };
    if (inventory.wrt_date) return { allow: false, reason: 'Item is written off' };
    if (inventory.rdy_date) return { allow: false, reason: 'Item is manufactured' };

    return { allow: true };;
}