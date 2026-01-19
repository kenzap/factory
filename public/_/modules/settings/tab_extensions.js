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
    }

    renderExtensions = () => {
        if (!this.extensions || this.extensions.length === 0) {
            return `<p class="text-muted">${__html('No extensions configured')}</p>`;
        }

        return this.extensions.map(extension => this.renderExtension(extension)).join('');
    }

    renderExtension = (extension) => {
        return /*html*/`
            <div class="card- mb-4">
                <div class="card-header-">
                    <h5 class="mb-2">${extension.name}</h5>
                </div>
                <div class="card-body-">
                    <div class="row">
                        ${Object.entries(extension.config || {}).map(([key, config]) =>
            this.renderConfigField(extension, key, config)
        ).join('')}
                    </div>
                </div>
            </div>`;
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
        const baseAttrs = `id="${fieldId}" name="${key}" class="form-control inp" ${config.required ? 'required' : ''}`;

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
}