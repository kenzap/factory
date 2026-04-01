export class SuggestionPopup {

    constructor(options = {}, cb = () => { }) {
        this.input = typeof options.input === 'string' ? document.querySelector(options.input) : options.input;
        this.suggestions = Array.isArray(options.suggestions) ? options.suggestions : [];
        this.maxItems = Number.isFinite(options.maxItems) ? options.maxItems : 8;
        this.cb = typeof cb === 'function' ? cb : () => { };
        this.popup = null;
        this.visibleSuggestions = [];
        this.activeIndex = -1;
        this.closeTimeout = null;

        if (!this.input) return;
        this.init();
    }

    init() {
        this.createPopup();

        this.input.addEventListener('focus', () => {
            this.open();
            this.render();
        });

        this.input.addEventListener('input', () => {
            this.open();
            this.render();
        });

        this.input.addEventListener('keydown', (event) => {
            if (!this.popup || this.popup.classList.contains('d-none')) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.moveActive(1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.moveActive(-1);
                return;
            }

            if (event.key === 'Enter') {
                if (this.activeIndex >= 0 && this.visibleSuggestions[this.activeIndex]) {
                    event.preventDefault();
                    this.select(this.visibleSuggestions[this.activeIndex]);
                } else {
                    this.close();
                    this.cb(this.input.value);
                }
                return;
            }

            if (event.key === 'Tab') {
                if (this.activeIndex >= 0 && this.visibleSuggestions[this.activeIndex]) {
                    this.select(this.visibleSuggestions[this.activeIndex]);
                } else {
                    this.close();
                    this.cb(this.input.value);
                }
                return;
            }

            if (event.key === 'Escape') {
                this.close();
            }
        });

        this.input.addEventListener('blur', () => {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = setTimeout(() => {
                this.close();
                this.cb(this.input.value);
            }, 120);
        });

        window.addEventListener('resize', () => {
            if (!this.popup || this.popup.classList.contains('d-none')) return;
            this.positionPopup();
        });

        window.addEventListener('scroll', () => {
            if (!this.popup || this.popup.classList.contains('d-none')) return;
            this.positionPopup();
        }, true);
    }

    createPopup() {
        this.popup = document.createElement('div');
        this.popup.className = 'd-none bg-white border rounded shadow-sm';
        this.popup.style.position = 'absolute';
        this.popup.style.zIndex = '1085';
        this.popup.style.maxHeight = '220px';
        this.popup.style.overflowY = 'auto';
        this.popup.style.minWidth = '120px';
        document.body.appendChild(this.popup);
    }

    positionPopup() {
        if (!this.popup || !this.input) return;
        const rect = this.input.getBoundingClientRect();
        this.popup.style.left = `${window.scrollX + rect.left}px`;
        this.popup.style.top = `${window.scrollY + rect.bottom + 4}px`;
        this.popup.style.width = `${rect.width}px`;
    }

    getFilteredSuggestions() {
        const query = String(this.input?.value || '').trim().toLowerCase();
        const all = (this.suggestions || []).map((item) => String(item || '').trim()).filter(Boolean);
        const unique = [...new Set(all)];
        if (!query) return unique.slice(0, this.maxItems);

        const startsWith = unique.filter((item) => item.toLowerCase().startsWith(query));
        const contains = unique.filter((item) => !item.toLowerCase().startsWith(query) && item.toLowerCase().includes(query));
        return [...startsWith, ...contains].slice(0, this.maxItems);
    }

    render() {
        if (!this.popup) return;

        this.visibleSuggestions = this.getFilteredSuggestions();
        this.activeIndex = this.visibleSuggestions.length ? 0 : -1;

        if (!this.visibleSuggestions.length) {
            this.popup.innerHTML = '';
            this.close();
            return;
        }

        this.popup.innerHTML = this.visibleSuggestions.map((suggestion, index) => `
            <button type="button" class="btn btn-sm text-start w-100 rounded-0 ${index === this.activeIndex ? 'btn-light' : 'btn-white'} suggestion-item" data-index="${index}">
                ${suggestion}
            </button>
        `).join('');

        this.popup.querySelectorAll('.suggestion-item').forEach((item) => {
            item.addEventListener('mousedown', (event) => {
                event.preventDefault();
                const index = Number(item.dataset.index || -1);
                if (index >= 0 && this.visibleSuggestions[index]) this.select(this.visibleSuggestions[index]);
            });
        });

        this.open();
    }

    moveActive(direction) {
        if (!this.visibleSuggestions.length) return;
        const next = this.activeIndex + direction;
        if (next < 0) this.activeIndex = this.visibleSuggestions.length - 1;
        else if (next >= this.visibleSuggestions.length) this.activeIndex = 0;
        else this.activeIndex = next;

        this.popup.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.classList.toggle('btn-light', index === this.activeIndex);
            item.classList.toggle('btn-white', index !== this.activeIndex);
        });
    }

    select(value) {
        if (!this.input) return;
        this.input.value = value;
        this.close();
        this.cb(value);
    }

    open() {
        if (!this.popup) return;
        this.positionPopup();
        this.popup.classList.remove('d-none');
    }

    close() {
        if (!this.popup) return;
        this.popup.classList.add('d-none');
    }
}

