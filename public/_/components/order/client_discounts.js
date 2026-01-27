import { __html, onChange, onClick } from "../../helpers/global.js";

/**
 * ClientDiscounts component to manage client discount rates in different product categories.
 * 
 * @class ClientDiscounts
 */
export class ClientDiscounts {

    constructor(settings, client) {
        this.client = client;
        this.productCategories = settings?.groups || [];

        // Initialize discounts structure if it doesn't exist
        this.client.discounts = this.client.discounts || {};

        // Ensure all categories have default discount values
        this.productCategories.forEach(category => {
            if (!this.client.discounts[category.id]) {
                this.client.discounts[category.id] = 0;
            }
        });

        this.init();
    }

    init = () => {
        this.view();
        this.refreshDiscounts();
        this.listeners();
    }

    view = () => {
        document.querySelector('client-discounts').innerHTML = `
            <div class="mb-5">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-percent me-2"></i>${__html('Discount Rates')}</h5>
                </div>
                
                <div id="discountsList">
                    <!-- Discount items will be dynamically added here -->
                </div>
                
                ${this.productCategories.length === 0 ? `
                    <div class="alert alert-info text-center">
                        <i class="bi bi-info-circle me-2"></i>${__html('No product categories available')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    refreshDiscounts = () => {
        const discountsList = document.getElementById('discountsList');
        discountsList.innerHTML = '';

        this.productCategories.forEach((category, index) => {
            const discountValue = this.client.discounts[category.id] || 0;

            discountsList.insertAdjacentHTML('beforeend', /*html*/`
            <div class="discount-item d-flex align-items-center py-2 mb-0 bg-light border-sm border-bottom rounded-0 bg-white" data-category-id="${category.id}">
                <div class="flex-grow-1 me-3">
                    <label class="form-label fw-normal mb-0">
                        <i class="bi bi-tag me-2 text-primary-"></i>${__html(category.name)}
                    </label>
                </div>
                <div class="input-group" style="width: 84px;">
                    <input type="number" 
                        class="form-control form-control-sm discount-input" 
                        data-category-id="${category.id}"
                        value="${discountValue}" 
                        min="0" 
                        max="100" 
                        step="0.1"
                        placeholder="0">
                    <span class="input-group-text">%</span>
                </div>
            </div>
            `);
        });

        // Add event listeners for discount inputs
        onChange('.discount-input', (e) => {
            const categoryId = e.currentTarget.dataset.categoryId;
            const discountValue = parseFloat(e.currentTarget.value) || 0;

            // Ensure value is within valid range
            const clampedValue = Math.max(0, Math.min(100, discountValue));

            if (clampedValue !== discountValue) {
                e.currentTarget.value = clampedValue;
            }

            this.client.discounts[categoryId] = clampedValue;
        });

        // Add event listeners for reset buttons
        onClick('.btn-reset-discount', (e) => {
            const categoryId = e.currentTarget.dataset.categoryId;
            this.resetDiscount(categoryId);
        });
    }

    resetDiscount(categoryId) {
        this.client.discounts[categoryId] = 0;
        const input = document.querySelector(`input[data-category-id="${categoryId}"]`);
        if (input) {
            input.value = 0;
        }
    }

    resetAllDiscounts() {
        this.productCategories.forEach(category => {
            this.client.discounts[category.id] = 0;
        });
        this.refreshDiscounts();
    }

    getDiscountForCategory(categoryId) {
        return this.client.discounts[categoryId] || 0;
    }

    setDiscountForCategory(categoryId, discount) {
        const clampedDiscount = Math.max(0, Math.min(100, discount));
        this.client.discounts[categoryId] = clampedDiscount;
        this.refreshDiscounts();
    }

    listeners = () => {
        // No additional global listeners needed as they are handled in refreshDiscounts
    }
}
