import { getArrayChecksum } from '../helpers/checksum.js';

/**
 * Class representing the Locale component.
 * Manages locale initialization and internationalization setup.
 * 
 * @class Locale
 * @export
 */
export class Locale {

    constructor(response) {

        this.response = response;

        this.locale = localStorage.getItem('locale') ? localStorage.getItem('locale') : 'en';

        this.init();
    }

    init = () => {

        // always load locale values from server
        if (this.response.locale && Object.keys(this.response.locale.values).length > 0) {

            // initialize i18n
            window.i18n = { state: { locale: { values: this.response.locale.values } } };

            // cache locally
            sessionStorage.setItem('locale_values_' + this.locale, JSON.stringify(this.response.locale));

            // store checksum
            sessionStorage.setItem('locale_checksum_' + this.locale, getArrayChecksum(this.response.locale.values));

            return;
        }

        // try to load from local storage
        const locale_cached = sessionStorage.getItem('locale_values_' + this.locale);
        if (locale_cached) {

            const locale_data = JSON.parse(locale_cached);

            // console.log('Locale found locally:', locale_data);

            // initialize i18n
            window.i18n = { state: { locale: { values: locale_data.values } } };

            return;
        }

        // default to empty locale
        window.i18n = { state: { locale: { values: {} } } };
    }
}