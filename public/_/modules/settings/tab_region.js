import { __html, countries, getCurrencies, languages } from "../../helpers/global.js";

export class TabRegion {

    constructor() {
        this.tab();
    }

    getTimezoneOptions = () => {
        const fallback = [
            'UTC',
            'Europe/Riga',
            'Europe/London',
            'Europe/Berlin',
            'Europe/Paris',
            'Europe/Helsinki',
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'Asia/Dubai',
            'Asia/Kolkata',
            'Asia/Singapore',
            'Asia/Tokyo',
            'Australia/Sydney'
        ];

        let zones = fallback;

        if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
            try {
                const supported = Intl.supportedValuesOf('timeZone');
                if (Array.isArray(supported) && supported.length > 0) {
                    zones = ['UTC', ...supported.filter(z => z !== 'UTC')];
                }
            } catch (_err) {
                zones = fallback;
            }
        }

        return zones
            .map(zone => `<option value="${zone}">${zone.replace('_', ' ')}</option>`)
            .join('');
    }

    tab = () => {
        const timezoneOptions = this.getTimezoneOptions();
        const languageOptions = languages
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(lang => `<option value="${lang.code}">${__html(lang.name)} (${lang.code})</option>`)
            .join('');

        document.querySelector('tab-region').innerHTML = /*html*/`
            <div>
                <h4 id="h-region" class="card-title mb-4">${__html('Region')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Default timezone')}</label>
                            <div class="col-sm-9">
                                <select id="default_timezone" class="form-select inp" name="default_timezone" data-type="select">
                                    ${timezoneOptions}
                                </select>
                                <p class="form-text">${__html('IANA timezone used by backend document date conversion (for example, Europe/Riga or America/New_York).')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('System language')}</label>
                            <div class="col-sm-9">
                                <select id="system_language" class="form-select inp" name="system_language" data-type="select">
                                    <option value="">${__html('Choose language')}</option>
                                    ${languageOptions}
                                </select>
                                <p class="form-text">${__html('Default language for generated ERP documentation.')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <h4 id="h-units" class="card-title mb-4 mt-4">${__html('Measurement Units')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('System of units')}</label>
                            <div class="col-sm-9">
                                <select id="system_of_units" class="form-select inp" name="system_of_units" data-type="select">
                                    <option value="">${__html('Choose system of units')}</option>
                                    <option value="metric">${__html('Metric System')}</option>
                                    <option value="imperial">${__html('Imperial System')}</option>
                                </select>
                                <p class="form-text">${__html('Default measurement system used across calculations and reports.')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <h4 id="h-payments" class="card-title mb-4 mt-4">${__html('Payments')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Currency')}</label>
                            <div class="col-sm-9">
                                <select id="currency" class="form-select inp" name="currency" data-type="select">
                                    <option value="">${__html('Choose currency')}</option>
                                    ${getCurrencies().map(c => `<option value="${c.code}">${__html(c.name)} (${__html(c.code)})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Currency symbol')}</label>
                            <div class="col-sm-9">
                                <input id="currency_symb" type="text" class="form-select inp" name="currency_symb" value="" data-type="text">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Position')}</label>
                            <div class="col-sm-9">
                                <select id="currency_symb_loc" class="form-select inp" name="currency_symb_loc" data-type="select">
                                    <option value="left">${__html('Left')}</option>
                                    <option value="right">${__html('Right')}</option>
                                    <option value="left_space">${__html('Left with space')}</option>
                                    <option value="right_space">${__html('Right with space')}</option>
                                </select>
                                <p class="form-text">${__html('Currency position symbol.')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6"></div>
                </div>

                <h4 id="h-tax" class="card-title mb-4 mt-4">${__html('Tax')}</h4>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Calculation')}</label>
                            <div class="col-sm-9">
                                <div class="form-check">
                                    <input id="tax_percent_auto" class="form-check-input inp" name="tax_percent_auto" type="checkbox" value="1" data-type="checkbox">
                                    <label class="form-check-label" for="tax_percent_auto">
                                        ${__html('Auto tax rate')}
                                    </label>
                                </div>
                                <p class="form-text">${__html('Automatically detect tax rate whenever applicable.')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Tax region')}</label>
                            <div class="col-sm-9">
                                <select id="tax_region" class="form-select inp" name="tax_region" data-type="select">
                                    <option value="">${__html('Select')}</option>
                                    ${countries.map(c => `<option value="${c.code}">${__html(c.name)}</option>`).join('')}
                                </select>
                                <p class="form-text">${__html('Select the country for tax calculations and compliance.')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Vat number')}</label>
                            <div class="col-sm-9">
                                <input id="vat_number" type="text" class="form-control inp" placeholder="VAT123456" name="vat_number" data-type="text">
                                <p class="form-text">${__html('Enter the VAT number for tax purposes.')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Standard rate')}</label>
                            <div class="col-sm-9">
                                <input id="tax_percent" type="text" class="form-control inp" placeholder="21" name="tax_percent" data-type="text">
                                <p class="form-text">${__html('Default tax rate. Example, 9 or 21. Use numeric value.')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                            <label class="col-sm-3 col-form-label">${__html('Display')}</label>
                            <div class="col-sm-9">
                                <input id="tax_display" type="text" class="form-control inp" placeholder="VAT" name="tax_display" data-type="text">
                                <p class="form-text">${__html('Tax title. Example, VAT or GST.')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
}
