/**
 * TAX REGIME DEFINITIONS
 * Each regime contains: localId, peppolCode, rate, display, legalRef, legalText, matcher
 */
export const TAX_REGIMES = {
    // Latvia Standard VAT
    LV_STANDARD: {
        localId: '',
        peppolCode: 'S',
        rate: 21,
        display: 'VAT 21%',
        legalRef: null,
        legalText: null,
        country: 'LV',
        matcher: (id) => id === null || id === undefined || id === ''
    },

    // Latvia Reverse Charge - Construction (Art. 142)
    LV_RC_CONSTRUCTION: {
        localId: '0000',
        peppolCode: 'AE',
        rate: 0,
        display: 'ANM',
        legalRef: '142',
        legalText: () => ('Reverse charge (Art. 142 - Construction)'),
        country: 'LV',
        requiresVAT: true,
        matcher: (id) => id === '0000'
    },

    // Latvia Reverse Charge - General (Art. 143)
    LV_RC_GENERAL: {
        localId: '143',
        peppolCode: 'AE',
        rate: 0,
        display: 'ANM',
        legalRef: '143',
        legalText: () => ('Reverse charge (Art. 143)'),
        country: 'LV',
        requiresVAT: true,
        matcher: (id) => id === '143' || id?.includes('143.')
    },

    // Latvia Reverse Charge - Metal Processing (Art. 143.1)
    LV_RC_METAL: {
        localId: 'MET',
        peppolCode: 'AE',
        rate: 0,
        display: 'ANM',
        legalRef: '143.1',
        legalText: () => ('Reverse charge (Art. 143.1 - Metal processing)'),
        country: 'LV',
        requiresVAT: true,
        matcher: (id) => id?.includes('MET')
    },

    // Latvia Reverse Charge - Data Processing (Art. 143.1)
    LV_RC_DATA: {
        localId: 'DAT',
        peppolCode: 'AE',
        rate: 0,
        display: 'ANM',
        legalRef: '143.1',
        legalText: () => ('Reverse charge (Art. 143.1 - Data processing)'),
        country: 'LV',
        requiresVAT: true,
        matcher: (id) => id?.includes('DAT')
    },

    // Latvia Reverse Charge - Specific goods (Art. 143.4)
    LV_RC_SPECIFIC: {
        localId: '7216',
        peppolCode: 'AE',
        rate: 0,
        display: 'ANM / 7216',
        legalRef: '143.4',
        legalText: () => ('Reverse charge (Art. 143.4)'),
        country: 'LV',
        requiresVAT: true,
        matcher: (id) => id === '7216'
    },

    // Latvia Reduced Rate 12%
    LV_REDUCED_12: {
        localId: 'RED12',
        peppolCode: 'AA',
        rate: 12,
        display: 'VAT 12%',
        legalRef: null,
        legalText: null,
        country: 'LV',
        matcher: (id) => id === 'RED12'
    },

    // Latvia Reduced Rate 5%
    LV_REDUCED_5: {
        localId: 'RED5',
        peppolCode: 'AA',
        rate: 5,
        display: 'VAT 5%',
        legalRef: null,
        legalText: null,
        country: 'LV',
        matcher: (id) => id === 'RED5'
    },

    // Intra-Community Supply (Cross-border EU B2B)
    EU_INTRA_COMMUNITY: {
        localId: 'EU_IC',
        peppolCode: 'K',
        rate: 0,
        display: 'VAT 0%',
        legalRef: '138',
        legalText: () => ('Intra-community supply (Art. 138 EU VAT Directive)'),
        country: 'EU',
        requiresVAT: true,
        matcher: null // Handled by cross-border logic
    },

    // Export outside EU
    EXPORT: {
        localId: 'EXPORT',
        peppolCode: 'G',
        rate: 0,
        display: 'VAT 0%',
        legalRef: null,
        legalText: () => ('Export outside EU'),
        country: null,
        matcher: null // Handled by cross-border logic
    }
};