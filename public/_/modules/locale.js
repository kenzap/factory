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

        this.init();
    }

    init = () => {

        // load locales if present
        if (this.response.locale) window.i18n = { state: { locale: { values: this.response.locale.values } } };
    }
}