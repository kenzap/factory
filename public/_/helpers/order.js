import { state } from "../modules/order/state.js";

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
 * Enhances GDPR compliance by abbreviating names of non-corporate clients.
 * Used by document generation to format client name for display.
 * @param {Object} entity - The entity object containing client information
 * @param {string} entity.legal_name - The legal name of the client
 * @param {string} [entity.entity_type] - The type of entity (e.g., 'individual', 'company')
 * @returns {string} Formatted client name
 */
export const formatClientName = (entity) => {

    let legal_name = entity.legal_name || entity.name || '';

    if (entity.entity && entity.entity.toLowerCase() === 'individual' && legal_name.indexOf(' ') > 0) {
        const parts = legal_name.split(' ');
        return parts[0].substring(0, 1) + parts[1].substring(0, 1);
    }
    return legal_name;
}

/**
 * Returns full client name without abbreviation.
 * Useful for tooltips where abbreviated individual names are displayed.
 */
export const getFullClientName = (entity) => {
    return entity?.legal_name || entity?.name || '';
}

/**
 * The purpose of this function is to format a company name for display. And hide individual names for physical persons.
 * It checks if the company name contains certain abbreviations (like "SIA", "BDR", "AS") and if it does not,
 * it abbreviates the name to the first letter of the first two words.
 * @param {Object} settings - The settings object containing price information
 * TODO: add detection based on entity type
 * @deprecated use formatClientName instead
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
 * Determines whether an order row is allowed to be edited.
 * A printed waybill locks the whole table except the note field, while
 * inventory state locks the row-specific editing paths.
 * 
 * @param {Object} rowData - The row data object containing order information
 * @param {Object} [rowData.inventory] - The inventory object containing date fields
 * @param {string} [rowData.inventory.isu_date] - The issue date
 * @param {string} [rowData.inventory.wrt_date] - The write date  
 * @param {string} [rowData.inventory.mnf_date] - The manufacture date
 * @returns {{allow: boolean, reason?: string, lock?: string}}
 */
export const isAllowedToEdit = (rowData) => {

    const inventory = rowData?.inventory || {};

    if (state.order?.waybill?.number) return { allow: false, reason: 'Waybill already issued', lock: 'waybill' };
    if (inventory.isu_date) return { allow: false, reason: 'Item is issued', lock: 'issued' };
    if (inventory.wrt_date) return { allow: false, reason: 'Item is written off', lock: 'written-off' };
    if (inventory.rdy_date) return { allow: false, reason: 'Item is manufactured', lock: 'manufactured' };

    return { allow: true, lock: null };
}

/**
 * Item is excluded from invoice/quotation totals and line tables.
 * Accept legacy or new flag naming for compatibility.
 */
export const isExcludedFromInvoice = (item) => {
    if (!item) return false;
    return item.cancelled_from_invoice === true
        || item.cancelled_from_invoice === 1
        || item.cancelled_from_invoice === '1'
        || item.hidden_from_invoice === true
        || item.hidden_from_invoice === 1
        || item.hidden_from_invoice === '1';
}
