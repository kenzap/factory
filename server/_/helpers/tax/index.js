import { TAX_REGIMES } from './regimes.js';

/**
 * EU Country VAT Rates
 */
export const EU_COUNTRIES = {
    AT: { name: 'Austria', standard: 20, reduced: [10, 13] },
    BE: { name: 'Belgium', standard: 21, reduced: [6, 12] },
    BG: { name: 'Bulgaria', standard: 20, reduced: [9] },
    HR: { name: 'Croatia', standard: 25, reduced: [5, 13] },
    CY: { name: 'Cyprus', standard: 19, reduced: [5, 9] },
    CZ: { name: 'Czech Republic', standard: 21, reduced: [10, 15] },
    DK: { name: 'Denmark', standard: 25, reduced: [] },
    EE: { name: 'Estonia', standard: 22, reduced: [9] },
    FI: { name: 'Finland', standard: 25.5, reduced: [10, 14] },
    FR: { name: 'France', standard: 20, reduced: [5.5, 10] },
    DE: { name: 'Germany', standard: 19, reduced: [7] },
    GR: { name: 'Greece', standard: 24, reduced: [6, 13] },
    HU: { name: 'Hungary', standard: 27, reduced: [5, 18] },
    IE: { name: 'Ireland', standard: 23, reduced: [9, 13.5] },
    IT: { name: 'Italy', standard: 22, reduced: [4, 5, 10] },
    LV: { name: 'Latvia', standard: 21, reduced: [5, 12] },
    LT: { name: 'Lithuania', standard: 21, reduced: [5, 9] },
    LU: { name: 'Luxembourg', standard: 17, reduced: [8, 14] },
    MT: { name: 'Malta', standard: 18, reduced: [5, 7] },
    NL: { name: 'Netherlands', standard: 21, reduced: [9] },
    PL: { name: 'Poland', standard: 23, reduced: [5, 8] },
    PT: { name: 'Portugal', standard: 23, reduced: [6, 13] },
    RO: { name: 'Romania', standard: 19, reduced: [5, 9] },
    SK: { name: 'Slovakia', standard: 20, reduced: [10] },
    SI: { name: 'Slovenia', standard: 22, reduced: [5, 9.5] },
    ES: { name: 'Spain', standard: 21, reduced: [4, 10] },
    SE: { name: 'Sweden', standard: 25, reduced: [6, 12] }
};

/**
 * Check if buyer is VAT registered
 */
function isVATRegistered(buyerEntity) {
    const isBusiness = buyerEntity?.entity === 'business' || buyerEntity?.entity === 'company';
    const hasValidVAT = buyerEntity?.vat_status === '1' && buyerEntity?.vat_number;
    return isBusiness && hasValidVAT;
}

/**
 * Check if country is in EU
 */
export function isEUCountry(countryCode) {
    return countryCode in EU_COUNTRIES;
}

/**
 * Find matching tax regime by tax_id
 */
function findRegimeByTaxId(taxId, country) {

    // console.log('findRegimeByTaxId Finding regime for tax ID:', taxId, 'in country:', country);

    for (const [key, regime] of Object.entries(TAX_REGIMES)) {
        if (regime.country === country && regime.matcher && regime.matcher(taxId)) {
            return regime;
        }
    }
    return null;
}

/**
 * Get standard VAT regime for a country
 */
function getStandardRegime(countryCode) {
    const country = EU_COUNTRIES[countryCode];
    if (!country) {
        return {
            id: 'EU_INTRA_COMMUNITY',
            localId: null,
            peppolCode: 'S',
            rate: 0,
            display: 'VAT 0%',
            legalRef: null,
            legalText: null,
            country: countryCode,
            matcher: null
        };
    }

    return {
        id: countryCode + '_STANDARD',
        localId: null,
        peppolCode: 'S',
        rate: country.standard,
        display: `VAT ${country.standard}%`,
        legalRef: null,
        legalText: null,
        country: countryCode,
        matcher: null
    };
}

/**
 * Resolve tax regime from item data
 * SINGLE FUNCTION that determines which tax regime applies
 */
export function resolveRegime(item, sellerCountry, buyerCountry, buyerEntity = {}) {
    const hasVAT = isVATRegistered(buyerEntity);

    // Priority 1: Domestic regimes
    if (sellerCountry === buyerCountry) {
        const regime = findRegimeByTaxId(item.tax_id, sellerCountry);

        if (regime) {

            // console.log('Found matching regime for domestic transaction:', regime, hasVAT, buyerEntity);

            // Check if regime requires VAT registration
            if (regime.requiresVAT && !hasVAT) {
                // Override to standard VAT
                return getStandardRegime(sellerCountry);
            }
            return regime;
        }

        // No matching regime, use standard
        return getStandardRegime(sellerCountry);
    }

    // Priority 2: Cross-border EU (Intra-community)
    if (isEUCountry(sellerCountry) && isEUCountry(buyerCountry) && hasVAT) {
        return TAX_REGIMES.EU_INTRA_COMMUNITY;
    }

    // Priority 3: Cross-border EU B2C or non-VAT business
    if (isEUCountry(sellerCountry) && isEUCountry(buyerCountry) && !hasVAT) {
        return getStandardRegime(sellerCountry);
    }

    // Priority 4: Export outside EU
    if (isEUCountry(sellerCountry) && !isEUCountry(buyerCountry)) {
        return TAX_REGIMES.EXPORT;
    }

    // Fallback: Standard rate
    return getStandardRegime(sellerCountry);
}

/**
 * Calculate tax amount
 */
export function calculateTax(baseAmount, regime) {
    if (!regime || regime.rate === 0) {
        return 0;
    }
    return Math.round((baseAmount * (regime.rate / 100)) * 10000) / 10000;
}


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