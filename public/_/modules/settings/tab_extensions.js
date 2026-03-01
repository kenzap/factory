import { __html } from "../../helpers/global.js";

export class TabExtensions {

    constructor(settings, extensions) {
        this.settings = settings;
        this.extensions = extensions;
        this.tab();
    }

    tab = () => {
        document.querySelector('tab-extensions').innerHTML = /*html*/`
            <div>
                <h4 id="h-extensions" class="card-title mb-4">${__html('Extensions')}</h4>
                ${this.renderExtensions()}
            </div>`;

        this.bindToggleBehavior();
        this.applyAllExtensionStates();
    }

    renderExtensions = () => {
        if (!this.extensions || this.extensions.length === 0) {
            return `<p class="text-muted">${__html('No extensions configured')}</p>`;
        }

        const configurable = this.extensions.filter(ext => Object.keys(ext.config || {}).length > 0);
        const toggleOnly = this.extensions.filter(ext => Object.keys(ext.config || {}).length === 0);

        return /*html*/`
            ${configurable.length ? `
                <div class="mb-4">
                    ${configurable.map(extension => this.renderExtension(extension)).join('')}
                </div>
            ` : ''}
            ${toggleOnly.length ? `
                <h5 class="mb-3">${__html('Other Extensions')}</h5>
                <div class="overflow-hidden">
                    ${toggleOnly.map(extension => this.renderToggleOnlyExtension(extension)).join('')}
                </div>
            ` : ''}
        `;
    }

    renderExtension = (extension) => {
        const enabled = this.isExtensionEnabled(extension);

        return /*html*/`
            <div class="mb-3 extension-card" data-extension-slug="${extension.slug}" style="${enabled ? '' : 'opacity:.55;'}">
                <div class="mb-2">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <h5 class="mb-0">${extension.name}</h5>
                        ${this.renderToggle(extension)}
                    </div>
                </div>
                <div class="row">
                    ${Object.entries(extension.config || {}).map(([key, config]) =>
            this.renderConfigField(extension, key, config)
        ).join('')}
                </div>
            </div>`;
    }

    renderToggleOnlyExtension = (extension) => {
        const enabled = this.isExtensionEnabled(extension);

        return /*html*/`
            <div class="d-flex align-items-center justify-content-between py-3 extension-card" data-extension-slug="${extension.slug}" style="${enabled ? '' : 'opacity:.55;'}">
                <div>
                    <h6 class="mb-0">${extension.name}</h6>
                </div>
                ${this.renderToggle(extension)}
            </div>
        `;
    }

    renderToggle = (extension) => {
        const enabledKey = `${extension.slug}:enabled`;
        const isEnabled = this.isExtensionEnabled(extension);

        return /*html*/`
            <div class="form-check form-switch m-0">
                <input
                    id="${enabledKey}"
                    name="${enabledKey}"
                    class="form-check-input inp"
                    type="checkbox"
                    role="switch"
                    value="1"
                    data-type="checkbox"
                    ${isEnabled ? 'checked' : ''}
                >
                <label class="form-check-label ms-2" for="${enabledKey}">${__html('Enabled')}</label>
            </div>
        `;
    }

    renderConfigField = (extension, key, config) => {
        const value = this.settings?.[`${extension.slug}:${key}`] || config.default || '';
        const fieldId = `${extension.slug}:${key}`;
        const title = config.title || key;

        return /*html*/`
            <div class="col-lg-6">
                <div class="form-group row mb-3">
                    <label class="col-sm-3 col-form-label" for="${fieldId}">
                        ${title}
                        ${config.required ? '<span class="text-danger">*</span>' : ''}
                    </label>
                    <div class="col-sm-9">
                        ${this.renderInput(fieldId, key, config, value)}
                        ${config.required ? `<small class="form-text text-muted">${__html('Required')}</small>` : ''}
                    </div>
                </div>
            </div>`;
    }

    renderInput = (fieldId, key, config, value) => {
        const extensionSlug = fieldId.split(':')[0];
        const baseAttrs = `id="${fieldId}" name="${key}" class="form-control inp extension-config-input" data-extension-config-input="${extensionSlug}" ${config.required ? 'required' : ''}`;

        switch (config.type) {
            case 'token':
            case 'password':
                return `<input type="password" ${baseAttrs} data-type="text" value="${value}" ${config.secret ? 'autocomplete="new-password"' : ''}>`;
            case 'textarea':
                return `<textarea ${baseAttrs} data-type="textarea" rows="3">${value}</textarea>`;
            case 'text':
            default:
                return `<input type="text" ${baseAttrs} data-type="text" value="${value}">`;
        }
    }

    isExtensionEnabled = (extension) => {
        const enabledValue = this.settings?.[`${extension.slug}:enabled`];
        return !['', '0', 0, false, 'false'].includes(enabledValue);
    }

    bindToggleBehavior = () => {
        document.querySelectorAll('input[id$=":enabled"][data-type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', () => {
                const slug = toggle.id.replace(/:enabled$/, '');
                this.applyExtensionState(slug, toggle.checked);
            });
        });
    }

    applyAllExtensionStates = () => {
        document.querySelectorAll('input[id$=":enabled"][data-type="checkbox"]').forEach(toggle => {
            const slug = toggle.id.replace(/:enabled$/, '');
            this.applyExtensionState(slug, toggle.checked);
        });
    }

    applyExtensionState = (slug, enabled) => {
        document.querySelectorAll(`.extension-card[data-extension-slug="${slug}"]`).forEach(card => {
            card.style.opacity = enabled ? '1' : '.55';
        });

        document.querySelectorAll(`.extension-config-input[data-extension-config-input="${slug}"]`).forEach(input => {
            input.disabled = !enabled;
        });
    }
}
