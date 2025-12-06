import { Auth } from "/_/modules/auth.js";

export const CDN = "https://cdn.kenzap.cloud";
export const FILES = "https://render.factory.app.kenzap.cloud";
export const API_KEY = "";
export const version = "2.0.0";

export const spaceID = () => {

    return "1002170"
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
        // fetch('https://api.kenzap.cloud/error/', { method: 'post', headers: { 'Accept': 'application/json', 'Content-type': 'application/x-www-form-urlencoded', }, body: params });
        return;
    }

    // handle cloud error codes
    switch (data.code) {

        // unauthorized
        case 401:
        case 403:

            new Auth();

            break;
        // something else
        default:

            if (data.error) alert(data.error);

            if (!data.error) alert("something went wrong, please try again later");

            break;
    }
}

export const deleteFile = (id) => {

    fetch(getMediaAPI(), {
        method: 'post',
        headers: H(),
        body: JSON.stringify({
            query: {
                files: {
                    type: 'delete-file',
                    id: id
                }
            }
        })
    })
        .then(response => response.json())
        .then(response => {

            // toast( __html("File removed") );
        })
        .catch(error => { parseApiError(error); });
}

/**
 * @name getAPI
 * @description Returns API link
 */
export const getMediaAPI = () => {

    if (getCookie('datacenter') == "eu") return 'https://api.media-eu.app.kenzap.cloud';

    if (getCookie('datacenter') == "us-east") return 'https://api.media-us-east.app.kenzap.cloud';

    return window.location.host.indexOf("localhost") == 0 ? "https://api.media.app.kenzap.cloud" : "https://api.media.app.kenzap.cloud";
}

export const getDimUnit = (settings) => {

    if (!settings || !settings.system_of_units) return " mm";
    switch (settings.system_of_units) {
        case "imperial": return " in";
        case "metric": return " mm";

    }
}

export const getDimMUnit = (settings) => {

    if (!settings || !settings.system_of_units) return " mm";
    switch (settings.system_of_units) {
        case "imperial": return " ft";
        case "metric": return " m";

    }
}

/**
 * Logs arguments to console if debug mode is enabled.
 * Debug mode is considered enabled if either sessionStorage or localStorage.
 * 
 * @param {...any} args - The arguments to log to the console
 * @example
 */
export const log = (...args) => {

    // console.log(sessionStorage.getItem("debug"))
    if (sessionStorage.getItem("debug") || localStorage.getItem("debug")) { console.log(...args); }
}

export const sortAlphaNum = (a, b) => a['title'].localeCompare(b['title'], 'en', { numeric: true })

/**
* Generates a random string
* 
* @param int length_
* @return string
*/
export const randomString = (length_) => {

    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz'.split('');
    if (typeof length_ !== "number") {
        length_ = Math.floor(Math.random() * chars.length_);
    }
    let str = '';
    for (let i = 0; i < length_; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

export const stringToHash = str => {

    let hash = 0
    for (let i = 0; i < str.length; ++i)
        hash = Math.imul(31, hash) + str.charCodeAt(i)

    hash = 'c' + Math.abs(hash);

    // console.log(hash);

    return hash;
}

export const mt = (val) => {

    return ("" + val).length < 2 ? "0" + val : val;
}

export const getProductId = () => {

    let urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id') ? urlParams.get('id') : "";
    return id;
}

export const getProductIdFromLink = () => {

    let url = new URL(window.location.href);
    let id = url.pathname.trim().split('/').slice(-2)[0];
    return id;
}

export const replaceQueryParam = (param, newval, search) => {

    let regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    let query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}

export const getPageNumberOld = () => {

    let url = window.location.href.split('/');
    let page = url[url.length - 1];
    let pageN = 1;
    if (page.indexOf('page') == 0) {
        pageN = page.replace('page', '').replace('#', '');
    }
    // console.log(pageN);
    return parseInt(pageN);
}

export const getPageNumber = () => {

    let urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get('page') ? urlParams.get('page') : 1;

    return parseInt(page);
}

export const getPagination = (__, meta, cb) => {

    if (typeof (meta) === 'undefined') { document.querySelector("#listing_info").innerHTML = __('no records to display'); return; }

    let offset = meta.limit + meta.offset;
    if (offset > meta.total_records) offset = meta.total_records;

    document.querySelector("#listing_info").innerHTML = __("Showing %1$ to %2$ of %3$ entries", (1 + meta.offset), (offset), meta.total_records);
    //  "Showing "+(1+meta.offset)+" to "+(offset)+" of "+meta.total_records+" entries";

    let pbc = Math.ceil(meta.total_records / meta.limit);
    document.querySelector("#listing_paginate").style.display = (pbc < 2) ? "none" : "block";

    let page = getPageNumber();
    let html = '<ul class="pagination d-flex justify-content-end pagination-flat mb-0">';
    html += '<li class="paginate_button page-item previous" id="listing_previous"><a href="#" aria-controls="order-listing" data-type="prev" data-page="0" tabindex="0" class="page-link"><span aria-hidden="true">&laquo;</span></li>';
    let i = 0;
    while (i < pbc) {

        i++;
        if (((i >= page - 3) && (i <= page)) || ((i <= page + 3) && (i >= page))) {

            html += '<li class="paginate_button page-item ' + ((page == i) ? 'active' : '') + '"><a href="#" aria-controls="order-listing" data-type="page" data-page="' + i + '" tabindex="0" class="page-link">' + (page == i ? i : i) + '</a></li>';
        }
    }
    html += '<li class="paginate_button page-item next" id="order-listing_next"><a href="#" aria-controls="order-listing" data-type="next" data-page="2" tabindex="0" class="page-link"><span aria-hidden="true">&raquo;</span></a></li>';
    html += '</ul>'

    document.querySelector("#listing_paginate").innerHTML = html;

    let page_link = document.querySelectorAll(".page-link");
    for (const l of page_link) {

        l.addEventListener('click', function (e) {

            let p = parseInt(getPageNumber());
            let ps = p;
            switch (l.dataset.type) {
                case 'prev': p -= 1; if (p < 1) p = 1; break;
                case 'page': p = l.dataset.page; break;
                case 'next': p += 1; if (p > pbc) p = pbc; break;
            }

            // update url
            if (window.history.replaceState) {

                // let url = window.location.href.split('/page');
                // let urlF = (url[0]+'/page'+p).replace('//page', '/page');

                let str = window.location.search;
                str = replaceQueryParam('page', p, str);
                // window.location = window.location.pathname + str

                // prevents browser from storing history with each change:
                window.history.replaceState("kenzap-cloud", document.title, window.location.pathname + str);
            }

            // only refresh if page differs
            if (ps != p) cb();

            e.preventDefault();
            return false;
        });
    }
}

export const formatStatus = (__, st) => {

    st = parseInt(st);
    switch (st) {
        case 0: return '<div class="badge bg-warning text-dark fw-light">' + __('Draft') + '</div>';
        case 1: return '<div class="badge bg-primary fw-light">' + __('Published') + '</div>';
        case 2: return '<div class="badge bg-primary fw-light">' + __('Private') + '</div>';
        case 3: return '<div class="badge bg-secondary fw-light">' + __('Unpublished') + '</div>';
        default: return '<div class="badge bg-secondary fw-light">' + __('Drafts') + '</div>';
    }
}

/**
* Render price
* @public
*/
export const priceFormat = function (settings, price) {

    price = makeNumber(price);

    // Round to 2 decimal places using banker's rounding (round half to even)
    const factor = 100;
    price = (Math.round((parseFloat(price) + Number.EPSILON) * factor) / factor).toFixed(2);

    // Add comma separators for large numbers
    const parts = price.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    price = parts.join('.');

    switch (settings.currency_symb_loc) {
        case 'left': price = settings.currency_symb + price; break;
        case 'right': price = price + settings.currency_symb; break;
        case 'left_space': price = settings.currency_symb + ' ' + price; break;
        case 'right_space': price = price + ' ' + settings.currency_symb; break;
    }

    return price;
}

export const makeNumber = function (price) {

    price = price ? price : 0;
    price = parseFloat(price);
    price = Math.round(price * 100) / 100;
    return price;
}

export const formatTime = (timestamp) => {

    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
}

export const formatDate = (iso) => {

    if (!iso) return '';

    const today = new Date();
    const date = new Date(iso);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return __html('Today');
    if (diffDays === 1) return __html('Tomorrow');
    if (diffDays === -1) return __html('Yesterday');

    return date.toLocaleDateString();
}

// numbers only with allowed exceptions
export const onlyNumbers = (sel, chars) => {

    if (!document.querySelector(sel)) return;

    for (let el of document.querySelectorAll(sel)) {

        el.addEventListener('keypress', (e) => {

            if ((!chars.includes(e.which) && isNaN(String.fromCharCode(e.which))) || e.which == 32 || (document.querySelector(sel).value.includes(String.fromCharCode(e.which)) && chars.includes(e.which))) {

                // stop character from entering input
                e.preventDefault();
                return false;
            }
        });
    }
}

// nums only validation
export const numsOnly = (e, max) => {

    // Only ASCII charactar in that range allowed 
    var ASCIICode = (e.which) ? e.which : e.keyCode
    if (ASCIICode > 31 && ASCIICode != 46 && (ASCIICode < 48 || ASCIICode > 57))
        return false;

    if (parseFloat(e.target.value) > max)
        return false;

    let dec = e.target.value.split('.');
    if (dec.length > 1)
        if (dec[1].length > 1)
            return false;

    return true;
}

export const toLocalUserDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export const toLocalUserDate = (isoString) => {

    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export const toLocalUserTime = (isoString) => {

    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Convert ISO date string (e.g., "2025-08-04T12:00:00.000Z") to local datetime-local input value (e.g., "2025-08-04T15:00")
export const toLocalDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// time elapsed since creation 
export const timeConverterAgo = (__, now, time) => {

    now = parseInt(now);
    time = parseInt(time);

    // parse as elapsed time
    let past = now - time;
    if (past < 60) return __('moments ago');
    if (past < 3600) return __('%1$ minutes ago', parseInt(past / 60));
    if (past < 86400) return __('%1$ hours ago', parseInt(past / 60 / 60));

    // process as normal date
    var a = new Date(time * 1000);
    var months = [__('Jan'), __('Feb'), __('Mar'), __('Apr'), __('May'), __('Jun'), __('Jul'), __('Aug'), __('Sep'), __('Oct'), __('Nov'), __('Dec')];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year; // + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}

export const parseVariations = (_this, product) => {

    let html_vars = '';
    if (typeof (product.variations !== 'undefined'))
        for (let v in product.variations) {

            // variation type
            let type = '';
            if (product.variations[v].type == 'checkbox') type = 'check';
            if (product.variations[v].type == 'radio') type = 'radio';

            // struct variation
            html_vars += '\
        <b>' + __(product.variations[v].title) + (product.variations[v].required == '1' ? ' <span class="tag">' + __('required') + '</span>' : '') + '</b>\
        <div class="kp-'+ type + '" >';

            // variation labels
            for (let d in product.variations[v].data) {

                let checked = false;

                // verify variation price validity
                product.variations[v].data[d]['price'] = makeNumber(product.variations[v].data[d]['price']);

                switch (type) {
                    case 'check':

                        html_vars += '\
                    <label>\
                        <input type="checkbox" data-required="'+ product.variations[v].required + '" data-indexv="' + v + '" data-index="' + d + '" data-title="' + product.variations[v].data[d]['title'] + '" data-titlev="' + __(product.variations[v].title) + '" data-price="' + product.variations[v].data[d]['price'] + '" ' + (checked ? 'checked="checked"' : '') + '>\
                        <div class="checkbox">\
                            <svg width="20px" height="20px" viewBox="0 0 20 20">\
                                <path d="M3,1 L17,1 L17,1 C18.1045695,1 19,1.8954305 19,3 L19,17 L19,17 C19,18.1045695 18.1045695,19 17,19 L3,19 L3,19 C1.8954305,19 1,18.1045695 1,17 L1,3 L1,3 C1,1.8954305 1.8954305,1 3,1 Z"></path>\
                                <polyline points="4 11 8 15 16 6"></polyline>\
                            </svg>\
                        </div>\
                        <span>'+ __(product.variations[v].data[d]['title']) + '</span>\
                        <div class="price">+ '+ priceFormat(_this, product.variations[v].data[d]['price']) + '</div>\
                    </label>';

                        break;
                    case 'radio':

                        html_vars += '\
                    <label>\
                        <input type="radio" data-required="'+ product.variations[v].required + '" data-indexv="' + v + '" name="radio' + v + '" data-index="' + d + '" data-title="' + product.variations[v].data[d]['title'] + '" data-titlev="' + __(product.variations[v].title) + '" data-price="' + product.variations[v].data[d]['price'] + '" ' + (checked ? 'checked="checked"' : '') + ' />\
                        <span>'+ __(product.variations[v].data[d]['title']) + '</span>\
                        <div class="price">+ '+ priceFormat(_this, product.variations[v].data[d]['price']) + '</div>\
                    </label>';

                        break;
                }
            }

            html_vars += '</div>';
        }

    return html_vars;
}

export const escape = (htmlStr) => {

    return htmlStr.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

export const unescape = (htmlStr) => {

    if (!htmlStr) htmlStr = "";
    htmlStr = htmlStr.replace(/&lt;/g, "<");
    htmlStr = htmlStr.replace(/&gt;/g, ">");
    htmlStr = htmlStr.replace(/&quot;/g, "\"");
    htmlStr = htmlStr.replace(/&#39;/g, "\'");
    htmlStr = htmlStr.replace(/&amp;/g, "&");
    return htmlStr;
}

export const isMobile = () => {

    const nav = navigator.userAgent.toLowerCase();
    return (
        nav.match(/iphone/i) || nav.match(/ipod/i) || nav.match(/ipad/i) || nav.match(/android/i)
    );
}

export const lazyLoad = () => {

    let lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
    if (document.querySelector("body").dataset.lazyLoading != '1') {

        document.querySelector("body").dataset.lazyLoading = '1';
        setTimeout(function () {
            lazyImages.forEach(function (lazyImage) {
                if ((lazyImage.getBoundingClientRect().top <= window.innerHeight && lazyImage.getBoundingClientRect().bottom >= 0) && getComputedStyle(lazyImage).display !== "none") {

                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.srcset = lazyImage.dataset.srcset;
                    lazyImage.classList.remove("lazy");
                    lazyImages = lazyImages.filter(function (image) {
                        return image !== lazyImage;
                    });
                }
            });
            document.querySelector("body").dataset.lazyLoading = '0';
        }, 0);
    }
}

/**
 * Converts degrees to radians
 * 
 * @param deg {Integer}
 * @returns {Integer} - radians
 */
export const degToRad = (deg) => {

    return (deg - 90) * Math.PI / 180.0;
}

/*
* Load additional JS or CSS depencies
*
* @param    dep       dependecy. Ex.: hiebee.min.js 
* @param    cb        function to call after script is loaded (optional)       
* @return 	{Boolen} 	result status 
* 
*/
export const loadAddon = (dep, version, cb) => {

    // dependency already loaded, skip
    if (document.getElementById(dep)) { if (typeof cb === 'function') cb.call(); return; }

    // detect dependency type
    let t = dep.split('.').slice(-1)[0];
    // console.log(dep+'loadAddon'+t);
    switch (t) {
        case 'js':

            let js = document.createElement("script");
            js.setAttribute("src", dep);
            js.id = dep;
            js.onload = js.onreadystatechange = function () {

                if (!this.readyState || this.readyState == 'complete')
                    if (typeof cb === 'function') cb.call();
            };
            document.body.appendChild(js);

            break;
        case 'css':

            var head = document.getElementsByTagName('head')[0];
            var css = document.createElement('link');
            css.id = dep;
            css.rel = 'stylesheet';
            css.type = 'text/css';
            css.href = dep;
            head.appendChild(css);

            break;
    }
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
    document.cookie = name + "=" + (escape(value) || "") + expires + ";path=/";
}

/**
 * @name API
 * @description Returns API link from local storage. API can point to different datacenters.
 * @param {string} api
 */
export const API = () => {

    return "";
}

/**
 * @name getAPI
 * @deprecated
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

    return "https://kenzap-sites-eu.oss-eu-central-1.aliyuncs.com";
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
export const initFooter = () => {

    // Check if footer already exists
    if (!document.querySelector("footer")) {
        // Try to find app container
        let appContainer = document.querySelector("#app");

        // If app container exists, insert footer after it
        if (!appContainer) return;

        appContainer.insertAdjacentHTML('afterend', `
            <footer class="container bg-light mt-5 mb-5">
                <div class="row">
                    <div class="d-sm-flex justify-content-center justify-content-sm-between">
                        <span class="text-muted text-center text-sm-left d-block d-sm-inline-block">${__html('%1$Kenzap Factory%2$ 2.0.5. ❤️ Licensed %3$GPLv3%4$.', '<a class="text-muted" href="https://kenzap.com/" target="_blank">', '</a>', '<a class="text-muted" href="https://github.com/kenzap/ecommerce" target="_blank">', '</a>')}</span>
                        <span class="float-none float-sm-right d-block mt-1 mt-sm-0 text-center text-muted"></span>
                    </div>
                </div>
            </footer>
        `);
    }
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

    // return slug + postfix;
    return slug;
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
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Locale': localStorage.getItem('locale') ? localStorage.getItem('locale') : "en",
        'Kenzap-Sid': spaceID()
    }
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
export const toast = (text, type = 'success') => {

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
    document.querySelector('.toast .toast-body').innerHTML = __html(text);
    toast.show();
}

export const mapHexColor = (slug) => {

    this.colors = { 'RR11': { hex_bg: '#14360f', hex_text: '#ffffff' }, 'RR20': { hex_bg: '#f5f9fc', hex_text: '#000000' }, 'RR21': { hex_bg: '#c0c0c0', hex_text: '#000000' }, 'RR22': { hex_bg: '#878a89', hex_text: '#000000' }, 'RR23': { hex_bg: '#37383d', hex_text: '#ffffff' }, 'RR29': { hex_bg: '#681a11', hex_text: '#ffffff' }, 'RR30': { hex_bg: '#cebb7f', hex_text: '#000000' }, 'RR32': { hex_bg: '#2f2218', hex_text: '#ffffff' }, 'RR33': { hex_bg: '#000000', hex_text: '#ffffff' }, 'RR887': { hex_bg: '#32211f', hex_text: '#ffffff' }, 'RR750': { hex_bg: '#7e2f0d', hex_text: '#ffffff' }, 'RR887': { hex_bg: '#37130d', hex_text: '#ffffff' }, 'RR946': { hex_bg: '#afafaf', hex_text: '#000000' }, '2H3': { hex_bg: '#28292b', hex_text: '#ffffff' } };

    if (colors.hasOwnProperty(slug)) {
        return colors[slug];
    } else {
        return { hex_bg: '#f5f9fc', hex_text: '#000000' };
    }
}

/**
 * Retrieves the formatted name of a user by their ID
 * @param {string} userId - The unique identifier of the user
 * @returns {string} The formatted user name (first name + last name initial) or the userId if user not found or users array is not available
 * @example
 * // Returns "John D" if user exists
 * getUserName("123456")
 * 
 * // Returns "123456" if user doesn't exist
 * getUserName("nonexistent")
 */
export const getUserName = (users, userId) => {
    if (!users) return userId;

    const user = users.find(u => u._id === userId);
    return user ? user.fname + ' ' + user.lname.charAt(0) : userId;
}

// Country names object using 2-letter country codes to reference country name
// ISO 3166 Alpha-2 Format: [2 letter Country Code]: [Country Name]
// Sorted alphabetical by country name (special characters on bottom)
export const countries = [
    { "code": "AF", "code3": "AFG", "name": "Afghanistan", "number": "004" },
    { "code": "AL", "code3": "ALB", "name": "Albania", "number": "008" },
    { "code": "DZ", "code3": "DZA", "name": "Algeria", "number": "012" },
    { "code": "AS", "code3": "ASM", "name": "American Samoa", "number": "016" },
    { "code": "AD", "code3": "AND", "name": "Andorra", "number": "020" },
    { "code": "AO", "code3": "AGO", "name": "Angola", "number": "024" },
    { "code": "AI", "code3": "AIA", "name": "Anguilla", "number": "660" },
    { "code": "AQ", "code3": "ATA", "name": "Antarctica", "number": "010" },
    { "code": "AG", "code3": "ATG", "name": "Antigua and Barbuda", "number": "028" },
    { "code": "AR", "code3": "ARG", "name": "Argentina", "number": "032" },
    { "code": "AM", "code3": "ARM", "name": "Armenia", "number": "051" },
    { "code": "AW", "code3": "ABW", "name": "Aruba", "number": "533" },
    { "code": "AU", "code3": "AUS", "name": "Australia", "number": "036" },
    { "code": "AT", "code3": "AUT", "name": "Austria", "number": "040" },
    { "code": "AZ", "code3": "AZE", "name": "Azerbaijan", "number": "031" },
    { "code": "BS", "code3": "BHS", "name": "Bahamas (the)", "number": "044" },
    { "code": "BH", "code3": "BHR", "name": "Bahrain", "number": "048" },
    { "code": "BD", "code3": "BGD", "name": "Bangladesh", "number": "050" },
    { "code": "BB", "code3": "BRB", "name": "Barbados", "number": "052" },
    { "code": "BY", "code3": "BLR", "name": "Belarus", "number": "112" },
    { "code": "BE", "code3": "BEL", "name": "Belgium", "number": "056" },
    { "code": "BZ", "code3": "BLZ", "name": "Belize", "number": "084" },
    { "code": "BJ", "code3": "BEN", "name": "Benin", "number": "204" },
    { "code": "BM", "code3": "BMU", "name": "Bermuda", "number": "060" },
    { "code": "BT", "code3": "BTN", "name": "Bhutan", "number": "064" },
    { "code": "BO", "code3": "BOL", "name": "Bolivia (Plurinational State of)", "number": "068" },
    { "code": "BQ", "code3": "BES", "name": "Bonaire, Sint Eustatius and Saba", "number": "535" },
    { "code": "BA", "code3": "BIH", "name": "Bosnia and Herzegovina", "number": "070" },
    { "code": "BW", "code3": "BWA", "name": "Botswana", "number": "072" },
    { "code": "BV", "code3": "BVT", "name": "Bouvet Island", "number": "074" },
    { "code": "BR", "code3": "BRA", "name": "Brazil", "number": "076" },
    { "code": "IO", "code3": "IOT", "name": "British Indian Ocean Territory (the)", "number": "086" },
    { "code": "BN", "code3": "BRN", "name": "Brunei Darussalam", "number": "096" },
    { "code": "BG", "code3": "BGR", "name": "Bulgaria", "number": "100" },
    { "code": "BF", "code3": "BFA", "name": "Burkina Faso", "number": "854" },
    { "code": "BI", "code3": "BDI", "name": "Burundi", "number": "108" },
    { "code": "CV", "code3": "CPV", "name": "Cabo Verde", "number": "132" },
    { "code": "KH", "code3": "KHM", "name": "Cambodia", "number": "116" },
    { "code": "CM", "code3": "CMR", "name": "Cameroon", "number": "120" },
    { "code": "CA", "code3": "CAN", "name": "Canada", "number": "124" },
    { "code": "KY", "code3": "CYM", "name": "Cayman Islands (the)", "number": "136" },
    { "code": "CF", "code3": "CAF", "name": "Central African Republic (the)", "number": "140" },
    { "code": "TD", "code3": "TCD", "name": "Chad", "number": "148" },
    { "code": "CL", "code3": "CHL", "name": "Chile", "number": "152" },
    { "code": "CN", "code3": "CHN", "name": "China", "number": "156" },
    { "code": "CX", "code3": "CXR", "name": "Christmas Island", "number": "162" },
    { "code": "CC", "code3": "CCK", "name": "Cocos (Keeling) Islands (the)", "number": "166" },
    { "code": "CO", "code3": "COL", "name": "Colombia", "number": "170" },
    { "code": "KM", "code3": "COM", "name": "Comoros (the)", "number": "174" },
    { "code": "CD", "code3": "COD", "name": "Congo (the Democratic Republic of the)", "number": "180" },
    { "code": "CG", "code3": "COG", "name": "Congo (the)", "number": "178" },
    { "code": "CK", "code3": "COK", "name": "Cook Islands (the)", "number": "184" },
    { "code": "CR", "code3": "CRI", "name": "Costa Rica", "number": "188" },
    { "code": "HR", "code3": "HRV", "name": "Croatia", "number": "191" },
    { "code": "CU", "code3": "CUB", "name": "Cuba", "number": "192" },
    { "code": "CW", "code3": "CUW", "name": "Curaçao", "number": "531" },
    { "code": "CY", "code3": "CYP", "name": "Cyprus", "number": "196" },
    { "code": "CZ", "code3": "CZE", "name": "Czechia", "number": "203" },
    { "code": "CI", "code3": "CIV", "name": "Côte d'Ivoire", "number": "384" },
    { "code": "DK", "code3": "DNK", "name": "Denmark", "number": "208" },
    { "code": "DJ", "code3": "DJI", "name": "Djibouti", "number": "262" },
    { "code": "DM", "code3": "DMA", "name": "Dominica", "number": "212" },
    { "code": "DO", "code3": "DOM", "name": "Dominican Republic (the)", "number": "214" },
    { "code": "EC", "code3": "ECU", "name": "Ecuador", "number": "218" },
    { "code": "EG", "code3": "EGY", "name": "Egypt", "number": "818" },
    { "code": "SV", "code3": "SLV", "name": "El Salvador", "number": "222" },
    { "code": "GQ", "code3": "GNQ", "name": "Equatorial Guinea", "number": "226" },
    { "code": "ER", "code3": "ERI", "name": "Eritrea", "number": "232" },
    { "code": "EE", "code3": "EST", "name": "Estonia", "number": "233" },
    { "code": "SZ", "code3": "SWZ", "name": "Eswatini", "number": "748" },
    { "code": "ET", "code3": "ETH", "name": "Ethiopia", "number": "231" },
    { "code": "FK", "code3": "FLK", "name": "Falkland Islands (the) [Malvinas]", "number": "238" },
    { "code": "FO", "code3": "FRO", "name": "Faroe Islands (the)", "number": "234" },
    { "code": "FJ", "code3": "FJI", "name": "Fiji", "number": "242" },
    { "code": "FI", "code3": "FIN", "name": "Finland", "number": "246" },
    { "code": "FR", "code3": "FRA", "name": "France", "number": "250" },
    { "code": "GF", "code3": "GUF", "name": "French Guiana", "number": "254" },
    { "code": "PF", "code3": "PYF", "name": "French Polynesia", "number": "258" },
    { "code": "TF", "code3": "ATF", "name": "French Southern Territories (the)", "number": "260" },
    { "code": "GA", "code3": "GAB", "name": "Gabon", "number": "266" },
    { "code": "GM", "code3": "GMB", "name": "Gambia (the)", "number": "270" },
    { "code": "GE", "code3": "GEO", "name": "Georgia", "number": "268" },
    { "code": "DE", "code3": "DEU", "name": "Germany", "number": "276" },
    { "code": "GH", "code3": "GHA", "name": "Ghana", "number": "288" },
    { "code": "GI", "code3": "GIB", "name": "Gibraltar", "number": "292" },
    { "code": "GR", "code3": "GRC", "name": "Greece", "number": "300" },
    { "code": "GL", "code3": "GRL", "name": "Greenland", "number": "304" },
    { "code": "GD", "code3": "GRD", "name": "Grenada", "number": "308" },
    { "code": "GP", "code3": "GLP", "name": "Guadeloupe", "number": "312" },
    { "code": "GU", "code3": "GUM", "name": "Guam", "number": "316" },
    { "code": "GT", "code3": "GTM", "name": "Guatemala", "number": "320" },
    { "code": "GG", "code3": "GGY", "name": "Guernsey", "number": "831" },
    { "code": "GN", "code3": "GIN", "name": "Guinea", "number": "324" },
    { "code": "GW", "code3": "GNB", "name": "Guinea-Bissau", "number": "624" },
    { "code": "GY", "code3": "GUY", "name": "Guyana", "number": "328" },
    { "code": "HT", "code3": "HTI", "name": "Haiti", "number": "332" },
    { "code": "HM", "code3": "HMD", "name": "Heard Island and McDonald Islands", "number": "334" },
    { "code": "VA", "code3": "VAT", "name": "Holy See (the)", "number": "336" },
    { "code": "HN", "code3": "HND", "name": "Honduras", "number": "340" },
    { "code": "HK", "code3": "HKG", "name": "Hong Kong", "number": "344" },
    { "code": "HU", "code3": "HUN", "name": "Hungary", "number": "348" },
    { "code": "IS", "code3": "ISL", "name": "Iceland", "number": "352" },
    { "code": "IN", "code3": "IND", "name": "India", "number": "356" },
    { "code": "ID", "code3": "IDN", "name": "Indonesia", "number": "360" },
    { "code": "IR", "code3": "IRN", "name": "Iran (Islamic Republic of)", "number": "364" },
    { "code": "IQ", "code3": "IRQ", "name": "Iraq", "number": "368" },
    { "code": "IE", "code3": "IRL", "name": "Ireland", "number": "372" },
    { "code": "IM", "code3": "IMN", "name": "Isle of Man", "number": "833" },
    { "code": "IL", "code3": "ISR", "name": "Israel", "number": "376" },
    { "code": "IT", "code3": "ITA", "name": "Italy", "number": "380" },
    { "code": "JM", "code3": "JAM", "name": "Jamaica", "number": "388" },
    { "code": "JP", "code3": "JPN", "name": "Japan", "number": "392" },
    { "code": "JE", "code3": "JEY", "name": "Jersey", "number": "832" },
    { "code": "JO", "code3": "JOR", "name": "Jordan", "number": "400" },
    { "code": "KZ", "code3": "KAZ", "name": "Kazakhstan", "number": "398" },
    { "code": "KE", "code3": "KEN", "name": "Kenya", "number": "404" },
    { "code": "KI", "code3": "KIR", "name": "Kiribati", "number": "296" },
    { "code": "KP", "code3": "PRK", "name": "Korea (the Democratic People's Republic of)", "number": "408" },
    { "code": "KR", "code3": "KOR", "name": "Korea (the Republic of)", "number": "410" },
    { "code": "KW", "code3": "KWT", "name": "Kuwait", "number": "414" },
    { "code": "KG", "code3": "KGZ", "name": "Kyrgyzstan", "number": "417" },
    { "code": "LA", "code3": "LAO", "name": "Lao People's Democratic Republic (the)", "number": "418" },
    { "code": "LV", "code3": "LVA", "name": "Latvia", "number": "428" },
    { "code": "LB", "code3": "LBN", "name": "Lebanon", "number": "422" },
    { "code": "LS", "code3": "LSO", "name": "Lesotho", "number": "426" },
    { "code": "LR", "code3": "LBR", "name": "Liberia", "number": "430" },
    { "code": "LY", "code3": "LBY", "name": "Libya", "number": "434" },
    { "code": "LI", "code3": "LIE", "name": "Liechtenstein", "number": "438" },
    { "code": "LT", "code3": "LTU", "name": "Lithuania", "number": "440" },
    { "code": "LU", "code3": "LUX", "name": "Luxembourg", "number": "442" },
    { "code": "MO", "code3": "MAC", "name": "Macao", "number": "446" },
    { "code": "MG", "code3": "MDG", "name": "Madagascar", "number": "450" },
    { "code": "MW", "code3": "MWI", "name": "Malawi", "number": "454" },
    { "code": "MY", "code3": "MYS", "name": "Malaysia", "number": "458" },
    { "code": "MV", "code3": "MDV", "name": "Maldives", "number": "462" },
    { "code": "ML", "code3": "MLI", "name": "Mali", "number": "466" },
    { "code": "MT", "code3": "MLT", "name": "Malta", "number": "470" },
    { "code": "MH", "code3": "MHL", "name": "Marshall Islands (the)", "number": "584" },
    { "code": "MQ", "code3": "MTQ", "name": "Martinique", "number": "474" },
    { "code": "MR", "code3": "MRT", "name": "Mauritania", "number": "478" },
    { "code": "MU", "code3": "MUS", "name": "Mauritius", "number": "480" },
    { "code": "YT", "code3": "MYT", "name": "Mayotte", "number": "175" },
    { "code": "MX", "code3": "MEX", "name": "Mexico", "number": "484" },
    { "code": "FM", "code3": "FSM", "name": "Micronesia (Federated States of)", "number": "583" },
    { "code": "MD", "code3": "MDA", "name": "Moldova (the Republic of)", "number": "498" },
    { "code": "MC", "code3": "MCO", "name": "Monaco", "number": "492" },
    { "code": "MN", "code3": "MNG", "name": "Mongolia", "number": "496" },
    { "code": "ME", "code3": "MNE", "name": "Montenegro", "number": "499" },
    { "code": "MS", "code3": "MSR", "name": "Montserrat", "number": "500" },
    { "code": "MA", "code3": "MAR", "name": "Morocco", "number": "504" },
    { "code": "MZ", "code3": "MOZ", "name": "Mozambique", "number": "508" },
    { "code": "MM", "code3": "MMR", "name": "Myanmar", "number": "104" },
    { "code": "NA", "code3": "NAM", "name": "Namibia", "number": "516" },
    { "code": "NR", "code3": "NRU", "name": "Nauru", "number": "520" },
    { "code": "NP", "code3": "NPL", "name": "Nepal", "number": "524" },
    { "code": "NL", "code3": "NLD", "name": "Netherlands (the)", "number": "528" },
    { "code": "NC", "code3": "NCL", "name": "New Caledonia", "number": "540" },
    { "code": "NZ", "code3": "NZL", "name": "New Zealand", "number": "554" },
    { "code": "NI", "code3": "NIC", "name": "Nicaragua", "number": "558" },
    { "code": "NE", "code3": "NER", "name": "Niger (the)", "number": "562" },
    { "code": "NG", "code3": "NGA", "name": "Nigeria", "number": "566" },
    { "code": "NU", "code3": "NIU", "name": "Niue", "number": "570" },
    { "code": "NF", "code3": "NFK", "name": "Norfolk Island", "number": "574" },
    { "code": "MP", "code3": "MNP", "name": "Northern Mariana Islands (the)", "number": "580" },
    { "code": "NO", "code3": "NOR", "name": "Norway", "number": "578" },
    { "code": "OM", "code3": "OMN", "name": "Oman", "number": "512" },
    { "code": "PK", "code3": "PAK", "name": "Pakistan", "number": "586" },
    { "code": "PW", "code3": "PLW", "name": "Palau", "number": "585" },
    { "code": "PS", "code3": "PSE", "name": "Palestine, State of", "number": "275" },
    { "code": "PA", "code3": "PAN", "name": "Panama", "number": "591" },
    { "code": "PG", "code3": "PNG", "name": "Papua New Guinea", "number": "598" },
    { "code": "PY", "code3": "PRY", "name": "Paraguay", "number": "600" },
    { "code": "PE", "code3": "PER", "name": "Peru", "number": "604" },
    { "code": "PH", "code3": "PHL", "name": "Philippines (the)", "number": "608" },
    { "code": "PN", "code3": "PCN", "name": "Pitcairn", "number": "612" },
    { "code": "PL", "code3": "POL", "name": "Poland", "number": "616" },
    { "code": "PT", "code3": "PRT", "name": "Portugal", "number": "620" },
    { "code": "PR", "code3": "PRI", "name": "Puerto Rico", "number": "630" },
    { "code": "QA", "code3": "QAT", "name": "Qatar", "number": "634" },
    { "code": "MK", "code3": "MKD", "name": "Republic of North Macedonia", "number": "807" },
    { "code": "RO", "code3": "ROU", "name": "Romania", "number": "642" },
    { "code": "RU", "code3": "RUS", "name": "Russian Federation (the)", "number": "643" },
    { "code": "RW", "code3": "RWA", "name": "Rwanda", "number": "646" },
    { "code": "RE", "code3": "REU", "name": "Réunion", "number": "638" },
    { "code": "BL", "code3": "BLM", "name": "Saint Barthélemy", "number": "652" },
    { "code": "SH", "code3": "SHN", "name": "Saint Helena, Ascension and Tristan da Cunha", "number": "654" },
    { "code": "KN", "code3": "KNA", "name": "Saint Kitts and Nevis", "number": "659" },
    { "code": "LC", "code3": "LCA", "name": "Saint Lucia", "number": "662" },
    { "code": "MF", "code3": "MAF", "name": "Saint Martin (French part)", "number": "663" },
    { "code": "PM", "code3": "SPM", "name": "Saint Pierre and Miquelon", "number": "666" },
    { "code": "VC", "code3": "VCT", "name": "Saint Vincent and the Grenadines", "number": "670" },
    { "code": "WS", "code3": "WSM", "name": "Samoa", "number": "882" },
    { "code": "SM", "code3": "SMR", "name": "San Marino", "number": "674" },
    { "code": "ST", "code3": "STP", "name": "Sao Tome and Principe", "number": "678" },
    { "code": "SA", "code3": "SAU", "name": "Saudi Arabia", "number": "682" },
    { "code": "SN", "code3": "SEN", "name": "Senegal", "number": "686" },
    { "code": "RS", "code3": "SRB", "name": "Serbia", "number": "688" },
    { "code": "SC", "code3": "SYC", "name": "Seychelles", "number": "690" },
    { "code": "SL", "code3": "SLE", "name": "Sierra Leone", "number": "694" },
    { "code": "SG", "code3": "SGP", "name": "Singapore", "number": "702" },
    { "code": "SX", "code3": "SXM", "name": "Sint Maarten (Dutch part)", "number": "534" },
    { "code": "SK", "code3": "SVK", "name": "Slovakia", "number": "703" },
    { "code": "SI", "code3": "SVN", "name": "Slovenia", "number": "705" },
    { "code": "SB", "code3": "SLB", "name": "Solomon Islands", "number": "090" },
    { "code": "SO", "code3": "SOM", "name": "Somalia", "number": "706" },
    { "code": "ZA", "code3": "ZAF", "name": "South Africa", "number": "710" },
    { "code": "GS", "code3": "SGS", "name": "South Georgia and the South Sandwich Islands", "number": "239" },
    { "code": "SS", "code3": "SSD", "name": "South Sudan", "number": "728" },
    { "code": "ES", "code3": "ESP", "name": "Spain", "number": "724" },
    { "code": "LK", "code3": "LKA", "name": "Sri Lanka", "number": "144" },
    { "code": "SD", "code3": "SDN", "name": "Sudan (the)", "number": "729" },
    { "code": "SR", "code3": "SUR", "name": "Suriname", "number": "740" },
    { "code": "SJ", "code3": "SJM", "name": "Svalbard and Jan Mayen", "number": "744" },
    { "code": "SE", "code3": "SWE", "name": "Sweden", "number": "752" },
    { "code": "CH", "code3": "CHE", "name": "Switzerland", "number": "756" },
    { "code": "SY", "code3": "SYR", "name": "Syrian Arab Republic", "number": "760" },
    { "code": "TW", "code3": "TWN", "name": "Taiwan", "number": "158" },
    { "code": "TJ", "code3": "TJK", "name": "Tajikistan", "number": "762" },
    { "code": "TZ", "code3": "TZA", "name": "Tanzania, United Republic of", "number": "834" },
    { "code": "TH", "code3": "THA", "name": "Thailand", "number": "764" },
    { "code": "TL", "code3": "TLS", "name": "Timor-Leste", "number": "626" },
    { "code": "TG", "code3": "TGO", "name": "Togo", "number": "768" },
    { "code": "TK", "code3": "TKL", "name": "Tokelau", "number": "772" },
    { "code": "TO", "code3": "TON", "name": "Tonga", "number": "776" },
    { "code": "TT", "code3": "TTO", "name": "Trinidad and Tobago", "number": "780" },
    { "code": "TN", "code3": "TUN", "name": "Tunisia", "number": "788" },
    { "code": "TR", "code3": "TUR", "name": "Turkey", "number": "792" },
    { "code": "TM", "code3": "TKM", "name": "Turkmenistan", "number": "795" },
    { "code": "TC", "code3": "TCA", "name": "Turks and Caicos Islands (the)", "number": "796" },
    { "code": "TV", "code3": "TUV", "name": "Tuvalu", "number": "798" },
    { "code": "UG", "code3": "UGA", "name": "Uganda", "number": "800" },
    { "code": "UA", "code3": "UKR", "name": "Ukraine", "number": "804" },
    { "code": "AE", "code3": "ARE", "name": "United Arab Emirates (the)", "number": "784" },
    { "code": "GB", "code3": "GBR", "name": "United Kingdom of Great Britain and Northern Ireland (the)", "number": "826" },
    { "code": "UM", "code3": "UMI", "name": "United States Minor Outlying Islands (the)", "number": "581" },
    { "code": "US", "code3": "USA", "name": "United States of America (the)", "number": "840" },
    { "code": "UY", "code3": "URY", "name": "Uruguay", "number": "858" },
    { "code": "UZ", "code3": "UZB", "name": "Uzbekistan", "number": "860" },
    { "code": "VU", "code3": "VUT", "name": "Vanuatu", "number": "548" },
    { "code": "VE", "code3": "VEN", "name": "Venezuela (Bolivarian Republic of)", "number": "862" },
    { "code": "VN", "code3": "VNM", "name": "Viet Nam", "number": "704" },
    { "code": "VG", "code3": "VGB", "name": "Virgin Islands (British)", "number": "092" },
    { "code": "VI", "code3": "VIR", "name": "Virgin Islands (U.S.)", "number": "850" },
    { "code": "WF", "code3": "WLF", "name": "Wallis and Futuna", "number": "876" },
    { "code": "EH", "code3": "ESH", "name": "Western Sahara", "number": "732" },
    { "code": "YE", "code3": "YEM", "name": "Yemen", "number": "887" },
    { "code": "ZM", "code3": "ZMB", "name": "Zambia", "number": "894" },
    { "code": "ZW", "code3": "ZWE", "name": "Zimbabwe", "number": "716" },
    { "code": "AX", "code3": "ALA", "name": "Åland Islands", "number": "248" }
];

export const languages = [
    { code: 'ab', name: 'Abkhazian' },
    { code: 'aa', name: 'Afar' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'ak', name: 'Akan' },
    { code: 'sq', name: 'Albanian' },
    { code: 'am', name: 'Amharic' },
    { code: 'ar', name: 'Arabic' },
    { code: 'an', name: 'Aragonese' },
    { code: 'hy', name: 'Armenian' },
    { code: 'as', name: 'Assamese' },
    { code: 'av', name: 'Avaric' },
    { code: 'ae', name: 'Avestan' },
    { code: 'ay', name: 'Aymara' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'bm', name: 'Bambara' },
    { code: 'ba', name: 'Bashkir' },
    { code: 'eu', name: 'Basque' },
    { code: 'be', name: 'Belarusian' },
    { code: 'bn', name: 'Bengali' },
    { code: 'bh', name: 'Bihari languages' },
    { code: 'bi', name: 'Bislama' },
    { code: 'bs', name: 'Bosnian' },
    { code: 'br', name: 'Breton' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'my', name: 'Burmese' },
    { code: 'ca', name: 'Catalan, Valencian' },
    { code: 'km', name: 'Central Khmer' },
    { code: 'ch', name: 'Chamorro' },
    { code: 'ce', name: 'Chechen' },
    { code: 'ny', name: 'Chichewa, Chewa, Nyanja' },
    { code: 'zh', name: 'Chinese' },
    { code: 'cu', name: 'Church Slavonic, Old Bulgarian, Old Church Slavonic' },
    { code: 'cv', name: 'Chuvash' },
    { code: 'kw', name: 'Cornish' },
    { code: 'co', name: 'Corsican' },
    { code: 'cr', name: 'Cree' },
    { code: 'hr', name: 'Croatian' },
    { code: 'cs', name: 'Czech' },
    { code: 'da', name: 'Danish' },
    { code: 'dv', name: 'Divehi, Dhivehi, Maldivian' },
    { code: 'nl', name: 'Dutch, Flemish' },
    { code: 'dz', name: 'Dzongkha' },
    { code: 'en', name: 'English' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'et', name: 'Estonian' },
    { code: 'ee', name: 'Ewe' },
    { code: 'fo', name: 'Faroese' },
    { code: 'fj', name: 'Fijian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'fr', name: 'French' },
    { code: 'ff', name: 'Fulah' },
    { code: 'gd', name: 'Gaelic, Scottish Gaelic' },
    { code: 'gl', name: 'Galician' },
    { code: 'lg', name: 'Ganda' },
    { code: 'ka', name: 'Georgian' },
    { code: 'de', name: 'German' },
    { code: 'ki', name: 'Gikuyu, Kikuyu' },
    { code: 'el', name: 'Greek (Modern)' },
    { code: 'kl', name: 'Greenlandic, Kalaallisut' },
    { code: 'gn', name: 'Guarani' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ht', name: 'Haitian, Haitian Creole' },
    { code: 'ha', name: 'Hausa' },
    { code: 'he', name: 'Hebrew' },
    { code: 'hz', name: 'Herero' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ho', name: 'Hiri Motu' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'is', name: 'Icelandic' },
    { code: 'io', name: 'Ido' },
    { code: 'ig', name: 'Igbo' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ia', name: 'Interlingua (International Auxiliary Language Association)' },
    { code: 'ie', name: 'Interlingue' },
    { code: 'iu', name: 'Inuktitut' },
    { code: 'ik', name: 'Inupiaq' },
    { code: 'ga', name: 'Irish' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'jv', name: 'Javanese' },
    { code: 'kn', name: 'Kannada' },
    { code: 'kr', name: 'Kanuri' },
    { code: 'ks', name: 'Kashmiri' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'rw', name: 'Kinyarwanda' },
    { code: 'kv', name: 'Komi' },
    { code: 'kg', name: 'Kongo' },
    { code: 'ko', name: 'Korean' },
    { code: 'kj', name: 'Kwanyama, Kuanyama' },
    { code: 'ku', name: 'Kurdish' },
    { code: 'ky', name: 'Kyrgyz' },
    { code: 'lo', name: 'Lao' },
    { code: 'la', name: 'Latin' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lb', name: 'Letzeburgesch, Luxembourgish' },
    { code: 'li', name: 'Limburgish, Limburgan, Limburger' },
    { code: 'ln', name: 'Lingala' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'lu', name: 'Luba-Katanga' },
    { code: 'mk', name: 'Macedonian' },
    { code: 'mg', name: 'Malagasy' },
    { code: 'ms', name: 'Malay' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'mt', name: 'Maltese' },
    { code: 'gv', name: 'Manx' },
    { code: 'mi', name: 'Maori' },
    { code: 'mr', name: 'Marathi' },
    { code: 'mh', name: 'Marshallese' },
    { code: 'ro', name: 'Moldovan, Moldavian, Romanian' },
    { code: 'mn', name: 'Mongolian' },
    { code: 'na', name: 'Nauru' },
    { code: 'nv', name: 'Navajo, Navaho' },
    { code: 'nd', name: 'Northern Ndebele' },
    { code: 'ng', name: 'Ndonga' },
    { code: 'ne', name: 'Nepali' },
    { code: 'se', name: 'Northern Sami' },
    { code: 'no', name: 'Norwegian' },
    { code: 'nb', name: 'Norwegian Bokmål' },
    { code: 'nn', name: 'Norwegian Nynorsk' },
    { code: 'ii', name: 'Nuosu, Sichuan Yi' },
    { code: 'oc', name: 'Occitan (post 1500)' },
    { code: 'oj', name: 'Ojibwa' },
    { code: 'or', name: 'Oriya' },
    { code: 'om', name: 'Oromo' },
    { code: 'os', name: 'Ossetian, Ossetic' },
    { code: 'pi', name: 'Pali' },
    { code: 'pa', name: 'Panjabi, Punjabi' },
    { code: 'ps', name: 'Pashto, Pushto' },
    { code: 'fa', name: 'Persian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'qu', name: 'Quechua' },
    { code: 'rm', name: 'Romansh' },
    { code: 'rn', name: 'Rundi' },
    { code: 'ru', name: 'Russian' },
    { code: 'sm', name: 'Samoan' },
    { code: 'sg', name: 'Sango' },
    { code: 'sa', name: 'Sanskrit' },
    { code: 'sc', name: 'Sardinian' },
    { code: 'sr', name: 'Serbian' },
    { code: 'sn', name: 'Shona' },
    { code: 'sd', name: 'Sindhi' },
    { code: 'si', name: 'Sinhala, Sinhalese' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'so', name: 'Somali' },
    { code: 'st', name: 'Sotho, Southern' },
    { code: 'nr', name: 'South Ndebele' },
    { code: 'es', name: 'Spanish, Castilian' },
    { code: 'su', name: 'Sundanese' },
    { code: 'sw', name: 'Swahili' },
    { code: 'ss', name: 'Swati' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'ty', name: 'Tahitian' },
    { code: 'tg', name: 'Tajik' },
    { code: 'ta', name: 'Tamil' },
    { code: 'tt', name: 'Tatar' },
    { code: 'te', name: 'Telugu' },
    { code: 'th', name: 'Thai' },
    { code: 'bo', name: 'Tibetan' },
    { code: 'ti', name: 'Tigrinya' },
    { code: 'to', name: 'Tonga (Tonga Islands)' },
    { code: 'ts', name: 'Tsonga' },
    { code: 'tn', name: 'Tswana' },
    { code: 'tr', name: 'Turkish' },
    { code: 'tk', name: 'Turkmen' },
    { code: 'tw', name: 'Twi' },
    { code: 'ug', name: 'Uighur, Uyghur' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ur', name: 'Urdu' },
    { code: 'uz', name: 'Uzbek' },
    { code: 've', name: 'Venda' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'vo', name: 'Volap_k' },
    { code: 'wa', name: 'Walloon' },
    { code: 'cy', name: 'Welsh' },
    { code: 'fy', name: 'Western Frisian' },
    { code: 'wo', name: 'Wolof' },
    { code: 'xh', name: 'Xhosa' },
    { code: 'yi', name: 'Yiddish' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'za', name: 'Zhuang, Chuang' },
    { code: 'zu', name: 'Zulu' }
];

export const getCurrencies = () => {

    // length 164
    return [
        { "name": "Afghan Afghani", "code": "AFA", "symbol": "؋" },
        { "name": "Albanian Lek", "code": "ALL", "symbol": "Lek" },
        { "name": "Algerian Dinar", "code": "DZD", "symbol": "دج" },
        { "name": "Angolan Kwanza", "code": "AOA", "symbol": "Kz" },
        { "name": "Argentine Peso", "code": "ARS", "symbol": "$" },
        { "name": "Armenian Dram", "code": "AMD", "symbol": "֏" },
        { "name": "Aruban Florin", "code": "AWG", "symbol": "ƒ" },
        { "name": "Australian Dollar", "code": "AUD", "symbol": "$" },
        { "name": "Azerbaijani Manat", "code": "AZN", "symbol": "m" },
        { "name": "Bahamian Dollar", "code": "BSD", "symbol": "B$" },
        { "name": "Bahraini Dinar", "code": "BHD", "symbol": ".د.ب" },
        { "name": "Bangladeshi Taka", "code": "BDT", "symbol": "৳" },
        { "name": "Barbadian Dollar", "code": "BBD", "symbol": "Bds$" },
        { "name": "Belarusian Ruble", "code": "BYR", "symbol": "Br" },
        { "name": "Belgian Franc", "code": "BEF", "symbol": "fr" },
        { "name": "Belize Dollar", "code": "BZD", "symbol": "$" },
        { "name": "Bermudan Dollar", "code": "BMD", "symbol": "$" },
        { "name": "Bhutanese Ngultrum", "code": "BTN", "symbol": "Nu." },
        { "name": "Bitcoin", "code": "BTC", "symbol": "฿" },
        { "name": "Bolivian Boliviano", "code": "BOB", "symbol": "Bs." },
        { "name": "Bosnia-Herzegovina Convertible Mark", "code": "BAM", "symbol": "KM" },
        { "name": "Botswanan Pula", "code": "BWP", "symbol": "P" },
        { "name": "Brazilian Real", "code": "BRL", "symbol": "R$" },
        { "name": "British Pound Sterling", "code": "GBP", "symbol": "£" },
        { "name": "Brunei Dollar", "code": "BND", "symbol": "B$" },
        { "name": "Bulgarian Lev", "code": "BGN", "symbol": "Лв." },
        { "name": "Burundian Franc", "code": "BIF", "symbol": "FBu" },
        { "name": "Cambodian Riel", "code": "KHR", "symbol": "KHR" },
        { "name": "Canadian Dollar", "code": "CAD", "symbol": "$" },
        { "name": "Cape Verdean Escudo", "code": "CVE", "symbol": "$" },
        { "name": "Cayman Islands Dollar", "code": "KYD", "symbol": "$" },
        { "name": "CFA Franc BCEAO", "code": "XOF", "symbol": "CFA" },
        { "name": "CFA Franc BEAC", "code": "XAF", "symbol": "FCFA" },
        { "name": "CFP Franc", "code": "XPF", "symbol": "₣" },
        { "name": "Chilean Peso", "code": "CLP", "symbol": "$" },
        { "name": "Chinese Yuan", "code": "CNY", "symbol": "¥" },
        { "name": "Colombian Peso", "code": "COP", "symbol": "$" },
        { "name": "Comorian Franc", "code": "KMF", "symbol": "CF" },
        { "name": "Congolese Franc", "code": "CDF", "symbol": "FC" },
        { "name": "Costa Rican Colón", "code": "CRC", "symbol": "₡" },
        { "name": "Croatian Kuna", "code": "HRK", "symbol": "kn" },
        { "name": "Cuban Convertible Peso", "code": "CUC", "symbol": "$, CUC" },
        { "name": "Czech Republic Koruna", "code": "CZK", "symbol": "Kč" },
        { "name": "Danish Krone", "code": "DKK", "symbol": "Kr." },
        { "name": "Djiboutian Franc", "code": "DJF", "symbol": "Fdj" },
        { "name": "Dominican Peso", "code": "DOP", "symbol": "$" },
        { "name": "East Caribbean Dollar", "code": "XCD", "symbol": "$" },
        { "name": "Egyptian Pound", "code": "EGP", "symbol": "ج.م" },
        { "name": "Eritrean Nakfa", "code": "ERN", "symbol": "Nfk" },
        { "name": "Estonian Kroon", "code": "EEK", "symbol": "kr" },
        { "name": "Ethiopian Birr", "code": "ETB", "symbol": "Nkf" },
        { "name": "Euro", "code": "EUR", "symbol": "€" },
        { "name": "Falkland Islands Pound", "code": "FKP", "symbol": "£" },
        { "name": "Fijian Dollar", "code": "FJD", "symbol": "FJ$" },
        { "name": "Gambian Dalasi", "code": "GMD", "symbol": "D" },
        { "name": "Georgian Lari", "code": "GEL", "symbol": "ლ" },
        { "name": "German Mark", "code": "DEM", "symbol": "DM" },
        { "name": "Ghanaian Cedi", "code": "GHS", "symbol": "GH₵" },
        { "name": "Gibraltar Pound", "code": "GIP", "symbol": "£" },
        { "name": "Greek Drachma", "code": "GRD", "symbol": "₯, Δρχ, Δρ" },
        { "name": "Guatemalan Quetzal", "code": "GTQ", "symbol": "Q" },
        { "name": "Guinean Franc", "code": "GNF", "symbol": "FG" },
        { "name": "Guyanaese Dollar", "code": "GYD", "symbol": "$" },
        { "name": "Haitian Gourde", "code": "HTG", "symbol": "G" },
        { "name": "Honduran Lempira", "code": "HNL", "symbol": "L" },
        { "name": "Hong Kong Dollar", "code": "HKD", "symbol": "$" },
        { "name": "Hungarian Forint", "code": "HUF", "symbol": "Ft" },
        { "name": "Icelandic króna", "code": "ISK", "symbol": "kr" },
        { "name": "Indian Rupee", "code": "INR", "symbol": "₹" },
        { "name": "Indonesian Rupiah", "code": "IDR", "symbol": "Rp" },
        { "name": "Iranian Rial", "code": "IRR", "symbol": "﷼" },
        { "name": "Iraqi Dinar", "code": "IQD", "symbol": "د.ع" },
        { "name": "Israeli New Sheqel", "code": "ILS", "symbol": "₪" },
        { "name": "Italian Lira", "code": "ITL", "symbol": "L,£" },
        { "name": "Jamaican Dollar", "code": "JMD", "symbol": "J$" },
        { "name": "Japanese Yen", "code": "JPY", "symbol": "¥" },
        { "name": "Jordanian Dinar", "code": "JOD", "symbol": "ا.د" },
        { "name": "Kazakhstani Tenge", "code": "KZT", "symbol": "лв" },
        { "name": "Kenyan Shilling", "code": "KES", "symbol": "KSh" },
        { "name": "Kuwaiti Dinar", "code": "KWD", "symbol": "ك.د" },
        { "name": "Kyrgystani Som", "code": "KGS", "symbol": "лв" },
        { "name": "Laotian Kip", "code": "LAK", "symbol": "₭" },
        { "name": "Latvian Lats", "code": "LVL", "symbol": "Ls" },
        { "name": "Lebanese Pound", "code": "LBP", "symbol": "£" },
        { "name": "Lesotho Loti", "code": "LSL", "symbol": "L" },
        { "name": "Liberian Dollar", "code": "LRD", "symbol": "$" },
        { "name": "Libyan Dinar", "code": "LYD", "symbol": "د.ل" },
        { "name": "Lithuanian Litas", "code": "LTL", "symbol": "Lt" },
        { "name": "Macanese Pataca", "code": "MOP", "symbol": "$" },
        { "name": "Macedonian Denar", "code": "MKD", "symbol": "ден" },
        { "name": "Malagasy Ariary", "code": "MGA", "symbol": "Ar" },
        { "name": "Malawian Kwacha", "code": "MWK", "symbol": "MK" },
        { "name": "Malaysian Ringgit", "code": "MYR", "symbol": "RM" },
        { "name": "Maldivian Rufiyaa", "code": "MVR", "symbol": "Rf" },
        { "name": "Mauritanian Ouguiya", "code": "MRO", "symbol": "MRU" },
        { "name": "Mauritian Rupee", "code": "MUR", "symbol": "₨" },
        { "name": "Mexican Peso", "code": "MXN", "symbol": "$" },
        { "name": "Moldovan Leu", "code": "MDL", "symbol": "L" },
        { "name": "Mongolian Tugrik", "code": "MNT", "symbol": "₮" },
        { "name": "Moroccan Dirham", "code": "MAD", "symbol": "MAD" },
        { "name": "Mozambican Metical", "code": "MZM", "symbol": "MT" },
        { "name": "Myanmar Kyat", "code": "MMK", "symbol": "K" },
        { "name": "Namibian Dollar", "code": "NAD", "symbol": "$" },
        { "name": "Nepalese Rupee", "code": "NPR", "symbol": "₨" },
        { "name": "Netherlands Antillean Guilder", "code": "ANG", "symbol": "ƒ" },
        { "name": "New Taiwan Dollar", "code": "TWD", "symbol": "$" },
        { "name": "New Zealand Dollar", "code": "NZD", "symbol": "$" },
        { "name": "Nicaraguan Córdoba", "code": "NIO", "symbol": "C$" },
        { "name": "Nigerian Naira", "code": "NGN", "symbol": "₦" },
        { "name": "North Korean Won", "code": "KPW", "symbol": "₩" },
        { "name": "Norwegian Krone", "code": "NOK", "symbol": "kr" },
        { "name": "Omani Rial", "code": "OMR", "symbol": ".ع.ر" },
        { "name": "Pakistani Rupee", "code": "PKR", "symbol": "₨" },
        { "name": "Panamanian Balboa", "code": "PAB", "symbol": "B/." },
        { "name": "Papua New Guinean Kina", "code": "PGK", "symbol": "K" },
        { "name": "Paraguayan Guarani", "code": "PYG", "symbol": "₲" },
        { "name": "Peruvian Nuevo Sol", "code": "PEN", "symbol": "S/." },
        { "name": "Philippine Peso", "code": "PHP", "symbol": "₱" },
        { "name": "Polish Zloty", "code": "PLN", "symbol": "zł" },
        { "name": "Qatari Rial", "code": "QAR", "symbol": "ق.ر" },
        { "name": "Romanian Leu", "code": "RON", "symbol": "lei" },
        { "name": "Russian Ruble", "code": "RUB", "symbol": "₽" },
        { "name": "Rwandan Franc", "code": "RWF", "symbol": "FRw" },
        { "name": "Salvadoran Colón", "code": "SVC", "symbol": "₡" },
        { "name": "Samoan Tala", "code": "WST", "symbol": "SAT" },
        { "name": "Saudi Riyal", "code": "SAR", "symbol": "﷼" },
        { "name": "Serbian Dinar", "code": "RSD", "symbol": "din" },
        { "name": "Seychellois Rupee", "code": "SCR", "symbol": "SRe" },
        { "name": "Sierra Leonean Leone", "code": "SLL", "symbol": "Le" },
        { "name": "Singapore Dollar", "code": "SGD", "symbol": "$" },
        { "name": "Slovak Koruna", "code": "SKK", "symbol": "Sk" },
        { "name": "Solomon Islands Dollar", "code": "SBD", "symbol": "Si$" },
        { "name": "Somali Shilling", "code": "SOS", "symbol": "Sh.so." },
        { "name": "South African Rand", "code": "ZAR", "symbol": "R" },
        { "name": "South Korean Won", "code": "KRW", "symbol": "₩" },
        { "name": "Special Drawing Rights", "code": "XDR", "symbol": "SDR" },
        { "name": "Sri Lankan Rupee", "code": "LKR", "symbol": "Rs" },
        { "name": "St. Helena Pound", "code": "SHP", "symbol": "£" },
        { "name": "Sudanese Pound", "code": "SDG", "symbol": ".س.ج" },
        { "name": "Surinamese Dollar", "code": "SRD", "symbol": "$" },
        { "name": "Swazi Lilangeni", "code": "SZL", "symbol": "E" },
        { "name": "Swedish Krona", "code": "SEK", "symbol": "kr" },
        { "name": "Swiss Franc", "code": "CHF", "symbol": "CHf" },
        { "name": "Syrian Pound", "code": "SYP", "symbol": "LS" },
        { "name": "São Tomé and Príncipe Dobra", "code": "STD", "symbol": "Db" },
        { "name": "Tajikistani Somoni", "code": "TJS", "symbol": "SM" },
        { "name": "Tanzanian Shilling", "code": "TZS", "symbol": "TSh" },
        { "name": "Thai Baht", "code": "THB", "symbol": "฿" },
        { "name": "Tongan Pa'anga", "code": "TOP", "symbol": "$" },
        { "name": "Trinidad & Tobago Dollar", "code": "TTD", "symbol": "$" },
        { "name": "Tunisian Dinar", "code": "TND", "symbol": "ت.د" },
        { "name": "Turkish Lira", "code": "TRY", "symbol": "₺" },
        { "name": "Turkmenistani Manat", "code": "TMT", "symbol": "T" },
        { "name": "Ugandan Shilling", "code": "UGX", "symbol": "USh" },
        { "name": "Ukrainian Hryvnia", "code": "UAH", "symbol": "₴" },
        { "name": "United Arab Emirates Dirham", "code": "AED", "symbol": "إ.د" },
        { "name": "Uruguayan Peso", "code": "UYU", "symbol": "$" },
        { "name": "US Dollar", "code": "USD", "symbol": "$" },
        { "name": "Uzbekistan Som", "code": "UZS", "symbol": "лв" },
        { "name": "Vanuatu Vatu", "code": "VUV", "symbol": "VT" },
        { "name": "Venezuelan  Bolívar", "code": "VEF", "symbol": "Bs" },
        { "name": "Vietnamese Dong", "code": "VND", "symbol": "₫" },
        { "name": "Yemeni Rial", "code": "YER", "symbol": "﷼" },
        { "name": "Zambian Kwacha", "code": "ZMK", "symbol": "ZK" }
    ];
}