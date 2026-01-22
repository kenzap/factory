

/**
 * Extract country code from VAT number
 */
export function extractCountryFromVAT(vatNumber) {
    if (!vatNumber || vatNumber.length < 2) return null;

    const countryCode = vatNumber.substring(0, 2).toUpperCase();

    // Validate it's a valid EU country code
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

    return euCountries.includes(countryCode) ? countryCode : null;
}
