/**
 * @name getAPI
 * @description Returns API link from local storage. API can point to different datacenters.
 * @param {string} api
 */
export const getAPI = () => {

    return "https://api-eu-dev.kenzap.cloud";
    return localStorage.getItem("API") ? localStorage.getItem("API") : "https://api-eu-dev.kenzap.cloud";
}

/**
 * @name getStorage
 * @description Returns API link of a bucket storage from local storage. API can point to different datacenters.
 */
export const getStorage = () => {

    return localStorage.getItem("STORAGE") ? localStorage.getItem("STORAGE") : "https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com";
}

/**
 * @name initHeader
 * @description Initiates Kenzap Cloud extension header and related scripts. Verifies user sessions, handles SSO, does cloud space navigation, initializes i18n localization. 
 * @param {object} response
 */
export const initHeader = (response) => {

    // cache header from backend
    if (response.header) localStorage.setItem('header', response.header);

    // cache CDN link
    if (response.cdn) localStorage.setItem('cdn', response.cdn);

    // load header to html if not present
    if (!document.querySelector("#k-script")) {

        let child = document.createElement('div');
        child.innerHTML = localStorage.getItem('header');
        child = child.firstChild;
        document.body.prepend(child);

        // run header scripts
        Function(document.querySelector("#k-script").innerHTML).call('test');
    }

    // load locales if present
    if (response.locale) window.i18n.init(response.locale);
}

/*
 * Translates string based on preloaded i18n locale values.
 * 
 * @param text {String} text to translate
 * @param p {String} list of parameters, to be replaced with %1$, %2$..
 * @returns {String} - text
 */
export const __init = (locale) => {

    if (typeof locale !== 'object' || locale === null) return;

    if (typeof window.i18n === 'undefined') window.i18n = {};

    if (typeof window.i18n.state === 'undefined') window.i18n.state = { locale: {} };

    window.i18n.state.locale = locale;
}

/*
 * Translates string based on preloaded i18n locale values.
 * 
 * @param text {String} text to translate
 * @param p {String} list of parameters, to be replaced with %1$, %2$..
 * @returns {String} - text
 */
export const __ = (text, ...p) => {

    let match = (input, pa) => {

        pa.forEach((p, i) => { input = input.replace('%' + (i + 1) + '$', p); });

        return input;
    }

    if (typeof window.i18n === 'undefined') return match(text, p);
    if (window.i18n.state.locale.values[text] === undefined) return match(text, p);

    return match(window.i18n.state.locale.values[text], p);
}

/*
 * Translates string based on preloaded i18n locale values.
 * 
 * @param text {String} text to translate
 * @param cb {Function} callback function to escape text variable
 * @param p {String} list of parameters, to be replaced with %1$, %2$..
 * @returns {String} - text
 */
const __esc = (text, cb, ...p) => {

    let match = (input, pa) => {

        pa.forEach((p, i) => { input = input.replace('%' + (i + 1) + '$', p); });

        return input;
    }

    if (typeof window.i18n === 'undefined') return match(text, p);
    if (window.i18n.state.locale.values[text] === undefined) return match(text, p);

    return match(cb(window.i18n.state.locale.values[text]), p);
}

/*
 * Converts special characters `&`, `<`, `>`, `"`, `'` to HTML entities.
 * 
 * @param text {String}  text
 * @returns {String} - text
 */
export const attr = (text) => {

    text = String(text);

    if (text.length === 0) {
        return '';
    }

    return text.replace(/[&<>'"]/g, tag => (
        {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&apos;',
            '"': '&quot;'
        }[tag]));
}

/*
 * Converts special characters `&`, `<`, `>`, `"`, `'` to HTML entities and does translation
 * 
 * @param text {String}  text
 * @returns {String} - text
 */
export const __attr = (text, ...p) => {

    text = String(text);

    if (text.length === 0) {
        return '';
    }

    let cb = (text) => {

        return text.replace(/[<>'"]/g, tag => (
            {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&apos;',
                '"': '&quot;'
            }[tag]));
    }

    return __esc(text, cb, ...p);
}

/*
 * Removes special characters `<`, `>`, `"`, `'` from the link.
 * 
 * @param text {String}  text
 * @returns {String} - text
 */
export const src = (text) => {

    text = String(text);

    if (text.length === 0) {
        return '';
    }

    return text.replace(/[<>'"]/g, tag => (
        {
            '<': '&lt;',
            '>': '&gt;',
            "'": '&apos;',
            '"': '&quot;'
        }[tag]));

}

/*
 * Converts special characters `<`, `>`, `"`, `'` from the link and does translation
 * 
 * @param text {String}  text
 * @returns {String} - text
 */
export const __src = (text, ...p) => {

    text = String(text);

    if (text.length === 0) {
        return '';
    }

    let cb = (text) => {

        return text.replace(/[<>'"]/g, tag => (
            {
                '<': '&lt;',
                '>': '&gt;',
                "'": '&apos;',
                '"': '&quot;'
            }[tag]));
    }

    return __esc(text, cb, ...p);
}

/*
 * Converts special characters `&`, `<`, `>`, `"`, `'` to HTML entities.
 * 
 * @param text {String}  text
 * @returns {String} - text
 */
export const html = (text) => {

    text = String(text);

    if (text.length === 0) {
        return '';
    }

    return text.replace(/[&<>'"]/g, tag => (
        {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&apos;',
            '"': '&quot;'
        }[tag]));
}

/*
 * Converts special characters `&`, `<`, `>`, `"`, `'` to HTML entities and does translations
 * 
 * @param text {String}  text
 * @returns {String} - text
 */
export const __html = (text, ...p) => {

    text = String(text);

    if (text.length === 0) {
        return '';
    }

    let cb = (text) => {

        return text.replace(/[&<>'"]/g, tag => (
            {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&apos;',
                '"': '&quot;'
            }[tag]));
    }

    return __esc(text, cb, ...p);
}

/**
 * @name showLoader
 * @description Initiates full screen three dots loader.
 */
export const showLoader = () => {

    let el = document.querySelector(".loader");
    if (el) el.style.display = 'block';
}

/**
 * @name hideLoader
 * @description Removes full screen three dots loader.
 */
export const hideLoader = () => {

    let el = document.querySelector(".loader");
    if (el) el.style.display = 'none';
}

/**
 * @name initFooter
 * @description Removes full screen three dots loader.
 * @param {string} left - Text or html code to be present on the left bottom side of screen
 * @param {string} right - Text or html code to be present on the left bottom side of screen
 */
export const initFooter = (left, right) => {

    document.querySelector("footer .row").innerHTML = `
    <div class="d-sm-flex justify-content-center justify-content-sm-between">
        <span class="text-muted text-center text-sm-left d-block d-sm-inline-block">${left}</span>
        <span class="float-none float-sm-right d-block mt-1 mt-sm-0 text-center text-muted">${right}</span>
    </div>`;
}

/**
 * @name link
 * @description Handles Cloud navigation links between extensions and its pages. Takes care of custom url parameters.
 * @param {string} slug - Any inbound link
 * 
 * @returns {string} link - Returns original link with kenzp cloud space ID identifier.
 */
export const link = (slug) => {

    let urlParams = new URLSearchParams(window.location.search);
    let sid = urlParams.get('sid') ? urlParams.get('sid') : "";

    let postfix = slug.indexOf('?') == -1 ? '?sid=' + sid : '&sid=' + sid;

    return slug + postfix;
}

/**
 * @name getSiteId
 * @description Gets current Kenzap Cloud space ID identifier from the URL.
 * 
 * @returns {string} id - Kenzap Cloud space ID.
 */
export const getSiteId = () => {

    let urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('sid') ? urlParams.get('sid') : "";

    return id;
}

/**
 * @name spaceID
 * @description Gets current Kenzap Cloud space ID identifier from the URL.
 * 
 * @returns {string} id - Kenzap Cloud space ID.
 */
export const spaceID = () => {

    let urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('sid') ? urlParams.get('sid') : "";

    return id;
}

/**
 * @name setCookie
 * @description Set cookie by its name to all .kenzap.cloud subdomains
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {string} days - Number of days when cookie expires.
 */
export const setCookie = (name, value, days) => {

    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = ";expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (escape(value) || "") + expires + ";path=/;domain=.kenzap.cloud";
}

/**
 * @name getCookie
 * @description Read cookie by its name.
 * @param {string} cname - Cookie name.
 * 
 * @returns {string} value - Cookie value.
 */
export const getCookie = (cname) => {

    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/**
 * @name checkHeader
 * @description This function tracks UI updates, creates header version checksum and compares it after every page reload
 * @param {object} object - API response.
 */
export const checkHeader = () => {

    let version = (localStorage.hasOwnProperty('header') && localStorage.hasOwnProperty('header-version')) ? localStorage.getItem('header-version') : 0;
    let check = window.location.hostname + '/' + spaceID() + '/' + getCookie('locale');
    if (check != getCookie('check')) { version = 0; console.log('refresh'); }

    setCookie('check', check, 5);

    return version
}

/**
 * @name headers
 * @description Default headers object for all Kenzap Cloud fetch queries.
 * @param {object} headers
 */
export const H = () => {

    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getCookie('kenzap_api_key'),
        'Kenzap-Locale': getCookie('locale') ? getCookie('locale') : "en",
        'Kenzap-Header': checkHeader(),
        'Kenzap-Token': getCookie('kenzap_token'),
        'Kenzap-Sid': spaceID()
    }
}

/**
 * @name headers
 * @description Default headers object for all Kenzap Cloud fetch queries. 
 * @param {object} headers
 * @deprecated
 */
export const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getCookie('kenzap_api_key'),
    'Kenzap-Locale': getCookie('locale') ? getCookie('locale') : "en",
    'Kenzap-Header': checkHeader(),
    'Kenzap-Token': getCookie('kenzap_token'),
    'Kenzap-Sid': spaceID(),
}

/**
 * @name parseApiError
 * @description Set default logics for different API Error responses.
 * @param {object} object - API response.
 */
export const parseApiError = (data) => {

    // outout to frontend console
    console.log(data);

    // unstructured failure
    if (isNaN(data.code)) {

        // structure failure data
        let log = data;
        try { log = JSON.stringify(log); } catch (e) { }

        let params = new URLSearchParams();
        params.append("cmd", "report");
        params.append("sid", spaceID());
        params.append("token", getCookie('kenzap_token'));
        params.append("data", log);

        // report error
        fetch('https://api-v1.kenzap.cloud/error/', { method: 'post', headers: { 'Accept': 'application/json', 'Content-type': 'application/x-www-form-urlencoded', }, body: params });

        alert('Can not connect to Kenzap Cloud');
        return;
    }

    // handle cloud error codes
    switch (data.code) {

        // unauthorized
        case 401:

            // dev mode
            if (window.location.href.indexOf('localhost') != -1) {

                alert(data.reason);
                return;
            }

            // production mode
            location.href = "https://auth.kenzap.com/?app=65432108792785&redirect=" + encodeURIComponent(window.location.href); break;

        // something else
        default:

            alert(data.reason);
            break;
    }
}

/**
 * @name CDN
 * @description Returns CDN URL of Kenzap Cloud file storage
 * @param {String} region - Default location Singapore. TODO, override by region variable
 */
export const CDN = (region = '') => {

    if (localStorage.getItem('cdn')) return localStorage.getItem('cdn');

    return 'https://kenzap-sites.oss-ap-southeast-1.aliyuncs.com';
}

/**
 * @name initBreadcrumbs
 * @description Render ui breadcrumbs.
 * @param {array} data - List of link objects containing link text and url. If url is missing then renders breadcrumb as static text. Requires html holder with .bc class.
 */
export const initBreadcrumbs = (data) => {

    let html = '<ol class="breadcrumb mt-2 mb-0">';
    for (let bc of data) {

        if (typeof (bc.link) === 'undefined') {

            html += `<li class="breadcrumb-item">${bc.text}</li>`;
        } else {

            html += `<li class="breadcrumb-item"><a href="${bc.link}">${bc.text}</a></li>`;
        }
    }
    html += '</ol>';

    document.querySelector(".bc").innerHTML = html;
}

/**
 * @name onClick
 * @description One row click event listener declaration. Works with one or many HTML selectors.
 * @param {string} sel - HTML selector, id, class, etc.
 * @param {string} fn - callback function fired on click event.
 */
export const onClick = (sel, fn) => {

    if (document.querySelector(sel)) for (let e of document.querySelectorAll(sel)) {

        e.removeEventListener('click', fn, true);
        e.addEventListener('click', fn, true);
    }
}

/**
 * @name onKeyUp
 * @description One row key up event listener declaration. Works with one or many HTML selectors.
 * @param {string} sel - HTML selector, id, class, etc.
 * @param {string} fn - callback function fired on click event.
 */
export const onKeyUp = (sel, fn) => {

    if (document.querySelector(sel)) for (let e of document.querySelectorAll(sel)) {

        e.removeEventListener('keyup', fn, true);
        e.addEventListener('keyup', fn, true);
    }
}

/**
 * @name onChange
 * @description One row change event listener declaration. Works with one or many HTML selectors.
 * @param {string} sel - HTML selector, id, class, etc.
 * @param {string} fn - callback function fired on click event.
 */
export const onChange = (sel, fn) => {

    if (document.querySelector(sel)) for (let e of document.querySelectorAll(sel)) {

        e.removeEventListener('change', fn, true);
        e.addEventListener('change', fn, true);
    }
}

/**
 * @name loadScript
 * @description Asynchronous script loader function.
 * @param {string} url - HTML selector, id, class, etc.
 * @param {string} cb - callback function fired immediately after script is loaded.
 */
export const loadScript = (url, cb) => {

    if (!Array.from(document.querySelectorAll('script')).some(elm => elm.src == url)) {
        let script = document.createElement('script')
        script.onload = cb
        script.src = url
        document.getElementsByTagName('head')[0].appendChild(script)
    }
}

/**
 * @name simulateClick
 * @description Trigger on click event without user interaction.
 * @param {string} elem - HTML selector, id, class, etc.
 */
export const simulateClick = (elem) => {

    // create our event (with options)
    let evt = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    });

    // if cancelled, don't dispatch the event
    !elem.dispatchEvent(evt);
};

/**
 * Converts a value to a properly formatted number with two decimal places.
 * 
 * @param {string|number} price - The price value to convert to a number
 * @returns {number} The parsed and rounded number with up to 2 decimal places
 * 
 * @example
 * makeNumber("12.345") // returns 12.35
 * makeNumber(null) // returns 0
 * makeNumber(undefined) // returns 0
 * makeNumber("10") // returns 10
 */
export const makeNumber = function (price) {

    price = price ? price : 0;
    price = parseFloat(price);
    price = Math.round(price * 100) / 100;
    return price;
}

/**
 * Create a web friendly URL slug from a string.
 *
 * Requires XRegExp (http://xregexp.com) with unicode add-ons for UTF-8 support.
 *
 * Although supported, transliteration is discouraged because
 *     1) most web browsers support UTF-8 characters in URLs
 *     2) transliteration causes a loss of information
 *
 * @author Sean Murphy <sean@iamseanmurphy.com>
 * @copyright Copyright 2012 Sean Murphy. All rights reserved.
 * @license http://creativecommons.org/publicdomain/zero/1.0/
 *
 * @param string s
 * @param object opt
 * @return string
 */
export const slugify = (s, opt) => {

    s = String(s);
    opt = Object(opt);

    var defaults = {
        'delimiter': '-',
        'limit': undefined,
        'lowercase': true,
        'replacements': {},
        'transliterate': (typeof (XRegExp) === 'undefined') ? true : false
    };

    // Merge options
    for (var k in defaults) {
        if (!opt.hasOwnProperty(k)) {
            opt[k] = defaults[k];
        }
    }

    var char_map = {
        // Latin
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE', 'Ç': 'C',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Å': 'O',
        'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U', 'Å°': 'U', 'Ý': 'Y', 'Þ': 'TH',
        'ß': 'ss',
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ð': 'd', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'Å': 'o',
        'ø': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'Å±': 'u', 'ý': 'y', 'þ': 'th',
        'ÿ': 'y',

        // Latin symbols
        '©': '(c)',

        // Greek
        'Α': 'A', 'Β': 'B', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Θ': '8',
        'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': '3', 'Ο': 'O', 'Π': 'P',
        'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'X', 'Ψ': 'PS', 'Ω': 'W',
        'Î': 'A', 'Î': 'E', 'Î': 'I', 'Î': 'O', 'Î': 'Y', 'Î': 'H', 'Î': 'W', 'Îª': 'I',
        'Î«': 'Y',
        'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'h', 'θ': '8',
        'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': '3', 'ο': 'o', 'π': 'p',
        'ρ': 'r', 'σ': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'x', 'ψ': 'ps', 'ω': 'w',
        'Î¬': 'a', 'Î­': 'e', 'Î¯': 'i', 'Ï': 'o', 'Ï': 'y', 'Î®': 'h', 'Ï': 'w', 'ς': 's',
        'Ï': 'i', 'Î°': 'y', 'Ï': 'y', 'Î': 'i',

        // Turkish
        'Å': 'S', 'Ä°': 'I', 'Ç': 'C', 'Ü': 'U', 'Ö': 'O', 'Ä': 'G',
        'Å': 's', 'Ä±': 'i', 'ç': 'c', 'ü': 'u', 'ö': 'o', 'Ä': 'g',

        // Russian
        'Ð': 'A', 'Ð': 'B', 'Ð': 'V', 'Ð': 'G', 'Ð': 'D', 'Ð': 'E', 'Ð': 'Yo', 'Ð': 'Zh',
        'Ð': 'Z', 'Ð': 'I', 'Ð': 'J', 'Ð': 'K', 'Ð': 'L', 'Ð': 'M', 'Ð': 'N', 'Ð': 'O',
        'Ð': 'P', 'Ð ': 'R', 'Ð¡': 'S', 'Ð¢': 'T', 'Ð£': 'U', 'Ð¤': 'F', 'Ð¥': 'H', 'Ð¦': 'C',
        'Ð§': 'Ch', 'Ð¨': 'Sh', 'Ð©': 'Sh', 'Ðª': '', 'Ð«': 'Y', 'Ð¬': '', 'Ð­': 'E', 'Ð®': 'Yu',
        'Ð¯': 'Ya',
        'Ð°': 'a', 'Ð±': 'b', 'Ð²': 'v', 'Ð³': 'g', 'Ð´': 'd', 'Ðµ': 'e', 'Ñ': 'yo', 'Ð¶': 'zh',
        'Ð·': 'z', 'Ð¸': 'i', 'Ð¹': 'j', 'Ðº': 'k', 'Ð»': 'l', 'Ð¼': 'm', 'Ð½': 'n', 'Ð¾': 'o',
        'Ð¿': 'p', 'Ñ': 'r', 'Ñ': 's', 'Ñ': 't', 'Ñ': 'u', 'Ñ': 'f', 'Ñ': 'h', 'Ñ': 'c',
        'Ñ': 'ch', 'Ñ': 'sh', 'Ñ': 'sh', 'Ñ': '', 'Ñ': 'y', 'Ñ': '', 'Ñ': 'e', 'Ñ': 'yu',
        'Ñ': 'ya',

        // Ukrainian
        'Ð': 'Ye', 'Ð': 'I', 'Ð': 'Yi', 'Ò': 'G',
        'Ñ': 'ye', 'Ñ': 'i', 'Ñ': 'yi', 'Ò': 'g',

        // Czech
        'Ä': 'C', 'Ä': 'D', 'Ä': 'E', 'Å': 'N', 'Å': 'R', 'Š': 'S', 'Å¤': 'T', 'Å®': 'U',
        'Å½': 'Z',
        'Ä': 'c', 'Ä': 'd', 'Ä': 'e', 'Å': 'n', 'Å': 'r', 'š': 's', 'Å¥': 't', 'Å¯': 'u',
        'Å¾': 'z',

        // Polish
        'Ä': 'A', 'Ä': 'C', 'Ä': 'e', 'Å': 'L', 'Å': 'N', 'Ó': 'o', 'Å': 'S', 'Å¹': 'Z',
        'Å»': 'Z',
        'Ä': 'a', 'Ä': 'c', 'Ä': 'e', 'Å': 'l', 'Å': 'n', 'ó': 'o', 'Å': 's', 'Åº': 'z',
        'Å¼': 'z',

        // Latvian
        'Ä': 'A', 'Ä': 'C', 'Ä': 'E', 'Ä¢': 'G', 'Äª': 'i', 'Ä¶': 'k', 'Ä»': 'L', 'Å': 'N',
        'Š': 'S', 'Åª': 'u', 'Å½': 'Z',
        'Ä': 'a', 'Ä': 'c', 'Ä': 'e', 'Ä£': 'g', 'Ä«': 'i', 'Ä·': 'k', 'Ä¼': 'l', 'Å': 'n',
        'š': 's', 'Å«': 'u', 'Å¾': 'z'
    };

    // Make custom replacements
    for (var k in opt.replacements) {
        s = s.replace(RegExp(k, 'g'), opt.replacements[k]);
    }

    // Transliterate characters to ASCII
    if (opt.transliterate) {
        for (var k in char_map) {
            s = s.replace(RegExp(k, 'g'), char_map[k]);
        }
    }

    // Replace non-alphanumeric characters with our delimiter
    var alnum = (typeof (XRegExp) === 'undefined') ? RegExp('[^a-z0-9]+', 'ig') : XRegExp('[^\\p{L}\\p{N}]+', 'ig');
    s = s.replace(alnum, opt.delimiter);

    // Remove duplicate delimiters
    s = s.replace(RegExp('[' + opt.delimiter + ']{2,}', 'g'), opt.delimiter);

    // Truncate slug to max. characters
    s = s.substring(0, opt.limit);

    // Remove delimiter from ends
    s = s.replace(RegExp('(^' + opt.delimiter + '|' + opt.delimiter + '$)', 'g'), '');

    return opt.lowercase ? s.toLowerCase() : s;
}

/**
 * @name toast
 * @description Triggers toast notification. Adds toast html to the page if missing.
 * @param {string} text - Toast notification.
 */
export const toast = (text) => {

    // only add once
    if (!document.querySelector(".toast")) {

        let html = `
        <div class="toast-cont position-fixed bottom-0 p-2 m-4 end-0 align-items-center" style="z-index:10000;">
            <div class="toast hide align-items-center text-white bg-dark border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="3000">
                <div class="d-flex">
                    <div class="toast-body"></div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        </div>`;
        if (document.querySelector('body > div')) document.querySelector('body > div').insertAdjacentHTML('afterend', html);
    }

    let toast = new bootstrap.Toast(document.querySelector('.toast'));
    document.querySelector('.toast .toast-body').innerHTML = text;
    toast.show();
}