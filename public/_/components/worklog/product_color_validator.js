export class ProductColorValidator {

    constructor({ input, suggestions = [], allowValues = [] } = {}) {
        this.input = typeof input === 'string' ? document.querySelector(input) : input;
        this.suggestions = [];
        this.allowValues = [];
        this.setSuggestions(suggestions);
        this.setAllowedValues(allowValues);
    }

    setSuggestions(suggestions = []) {
        this.suggestions = Array.isArray(suggestions) ? suggestions : [];
    }

    setAllowedValues(values = []) {
        this.allowValues = Array.isArray(values) ? values : [];
    }

    bind() {
        if (!this.input || this.input.dataset.validationBound === '1') return;

        const validate = () => this.validate();
        this.input.addEventListener('input', validate);
        this.input.addEventListener('blur', validate);
        this.input.dataset.validationBound = '1';
    }

    validate() {
        if (!this.input) return true;

        const value = (this.input.value || '').trim();
        if (!value) {
            this.input.classList.remove('is-invalid');
            return true;
        }

        const normalizedValue = value.toLowerCase();
        const isAllowedValue = this.allowValues
            .some((item) => String(item || '').trim().toLowerCase() === normalizedValue);
        if (isAllowedValue) {
            this.input.classList.remove('is-invalid');
            return true;
        }

        const matchedSuggestion = this.suggestions
            .find((item) => String(item || '').trim().toLowerCase() === normalizedValue);
        const hasMatch = Boolean(matchedSuggestion);

        if (hasMatch && value !== matchedSuggestion) {
            this.input.value = matchedSuggestion;
        }

        this.input.classList.toggle('is-invalid', !hasMatch);
        return hasMatch;
    }
}
