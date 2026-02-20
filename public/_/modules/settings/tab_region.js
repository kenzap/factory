import { __html } from "../../helpers/global.js";

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
                </div>
            </div>`;
    }
}
