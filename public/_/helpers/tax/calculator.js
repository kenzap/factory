// calculator.js
// Simplified calculator using unified tax regimes

import { calculateTax, resolveRegime } from './index.js';

/**
 * Invoice Calculator
 * Uses single tax regime model for all calculations
 */
export class InvoiceCalculator {
    constructor(settings, order, sellerCountry, buyerCountry, buyerEntity = {}) {
        this.settings = settings;
        this.order = order;
        this.sellerCountry = sellerCountry || 'LV';
        this.buyerCountry = buyerCountry || 'LV';
        this.buyerEntity = buyerEntity;
        this.taxGroups = new Map();
    }

    /**
     * Calculate totals
     */
    calculateTotals(locale) {
        this.taxGroups.clear();

        if (!this.order.items) this.order.items = [];

        let tax_total = 0;
        let taxable_amount = 0;

        this.order.items.forEach(item => {
            if (!item.total || item.total === 0) return;

            // Resolve tax regime for this item
            const regime = resolveRegime(
                item,
                this.sellerCountry,
                this.buyerCountry,
                this.buyerEntity
            );

            // Store regime info on item
            item.tax = {
                id: regime.id,
                rate: regime.rate,
                code: item.tax_id || "",
                display: regime.display,
                peppol_code: regime.peppolCode,
                legal: regime.legalText ? regime.legalText(locale) : null
            }

            item.tax_rate = regime.rate;
            item.tax_display = regime.display;
            item.tax_legal = regime.legalText ? regime.legalText(locale) : null;

            // Calculate tax
            const lineTotal = item.total;
            const taxAmount = calculateTax(lineTotal, regime);

            tax_total += taxAmount;
            taxable_amount += lineTotal;
            // console.log('Line Total:', lineTotal, 'Tax Amount:', taxAmount);

            // Group by display + legal reference
            const groupKey = `${regime.display}_${regime.legalRef || 'none'}`;

            if (!this.taxGroups.has(groupKey)) {
                this.taxGroups.set(groupKey, {
                    display: regime.display,
                    rate: regime.rate,
                    legalRef: regime.legalRef,
                    legalText: regime.legalText ? regime.legalText(locale) : null,
                    peppolCode: regime.peppolCode,
                    taxableAmount: 0,
                    taxAmount: 0,
                    items: []
                });
            }

            const group = this.taxGroups.get(groupKey);
            group.taxableAmount += lineTotal;
            group.taxAmount += taxAmount;
            group.items.push(item);
        });

        // console.log('Total Tax:', tax_total, taxable_amount);

        return this.generateTotals();
    }

    /**
     * Generate totals object
     */
    generateTotals() {
        let totalTaxableAmount = 0;
        let totalTaxAmount = 0;

        const taxBreakdown = Array.from(this.taxGroups.values());

        taxBreakdown.forEach(group => {
            totalTaxableAmount += group.taxableAmount;
            totalTaxAmount += group.taxAmount;
        });

        const totalInvoiceAmount = Math.round((totalTaxableAmount + totalTaxAmount) * 1000) / 1000;

        return {
            taxBreakdown,
            totalTaxableAmount: Math.round(totalTaxableAmount * 1000) / 1000,
            totalTaxAmount: Math.round(totalTaxAmount * 1000) / 1000,
            totalInvoiceAmount,
            currency: this.settings.currency || 'EUR'
        };
    }

    /**
     * Calculate tax for single line (used in table rendering)
     */
    calculateTaxAmount(baseAmount, rate, peppolCode) {
        if (['AE', 'K', 'G', 'E', 'Z', 'O'].includes(peppolCode)) {
            return 0;
        }
        return Math.round((baseAmount * (rate / 100)) * 10000) / 10000;
    }
}