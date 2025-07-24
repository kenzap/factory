import { Auth } from "/_/modules/auth.js";

export const CDN = "https://cdn.kenzap.cloud";
export const API_KEY = "Qz3fOs8Ghi7rpaW8BOlNgUyo7ANWYoKbRoUa8UkYd2I4FlAgUYFqzPM33IxqoFYa";

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

    price = (Math.round(parseFloat(price) * 100) / 100).toFixed(2);

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

export const formatTime = (__, timestamp) => {

    const d = new Date(parseInt(timestamp) * 1000);
    return d.toLocaleDateString();

    let a = new Date(timestamp * 1000);
    let months = [__('Jan'), __('Feb'), __('Mar'), __('Apr'), __('May'), __('Jun'), __('Jul'), __('Aug'), __('Sep'), __('Oct'), __('Nov'), __('Dec')];
    let year = a.getFullYear();
    let month = months[a.getMonth()];
    let date = a.getDate();
    let hour = a.getHours();
    let min = a.getMinutes();
    let sec = a.getSeconds();
    let time = date + ' ' + month + ' ' + year; // + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}

// numbers only with allowed exceptions
export const onlyNumbers = (sel, chars) => {

    if (!document.querySelector(sel)) return;

    for (let el of document.querySelectorAll(sel)) {

        el.addEventListener('keypress', (e) => {

            // console.log(e.which);

            if ((!chars.includes(e.which) && isNaN(String.fromCharCode(e.which))) || e.which == 32 || (document.querySelector(sel).value.includes(String.fromCharCode(e.which)) && chars.includes(e.which))) {

                // stop character from entering input
                e.preventDefault();
                return false;
            }
        });
    }
}

/**
* Email format validation script
* 
* @param string email
* @return string
*/
export const validateEmail = (email) => {

    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,14})+$/.test(email)) {

        return true;
    } else {

        return false;
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
                // for public qr feed
                // if(typeof(cart.state.product.variations[v]) !== 'undefined' && typeof(cart.state.product.variations[v].list) !== 'undefined' && typeof(cart.state.product.variations[v].list["_"+d]) !== 'undefined'){ checked = true; }

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

// play notification sound. Ex.: when new order received
export const playSound = (_this, max) => {

    // if(!max) max = _this.state.playSound.max_times;

    _this.state.playSound.n = 0;

    if (_this.state.playSound.timer) clearInterval(_this.state.playSound.timer);

    if (_this.state.playSound.allowed) _this.state.playSound.audio.play();

    console.log("playing " + _this.state.playSound.allowed);

    try {
        if (_this.state.playSound.allowed && isMobile()) window.navigator.vibrate(200);
    } catch {

    }

    if (max == 1) return;

    _this.state.playSound.timer = setInterval(() => {

        if (!_this.state.playSound.allowed) return;

        _this.state.playSound.audio.play();

        if (_this.state.playSound.n > max) { clearInterval(_this.state.playSound.timer) }

        _this.state.playSound.n += 1;

    }, 5000);

    // console.log('playSound');
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

export const printReceipt = (_this, order) => {

    // vars
    let o = order, data = {}, date = new Date();

    // 58mm wide thermal printers are best to display 32 chars per line
    let row = (txt, end_ofst) => {

        let output = '', max_char = 32 - end_ofst, max_ofst = 4, ofst_prev = 0, ofst = 0, ci = 0;
        // console.log(max_char);
        for (let i = 0; i < Math.ceil(txt.length / max_char); i++) {

            // add new line print from second loop only
            if (i > 0) output += '\n[L]';

            // ofst store first available whitespace break in words
            ofst = ci = 0;
            for (let e = max_ofst; e > -1 * max_ofst; e--) {

                ci = ((max_char + ofst_prev) * i) + max_char + e; if (txt[ci] == ' ' || ci == txt.length) { ofst += e; break; }
            }

            // add line row
            output += txt.substr((max_char + ofst_prev) * i, max_char + ofst);

            // line ends earlier than expected, skip loop
            if (ci == txt.length) break;

            ofst_prev = ofst;
        }

        return output;
    };

    // debug vs actual print
    data.debug = false;

    // get receipt template
    data.print = _this.state.settings.receipt_template;

    console.log(data.print);

    // order id
    data.print = data.print.replace(/{{order_id}}/g, o.id);

    // current time
    data.print = data.print.replace(/{{date_time}}/g, date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', }));

    // order items
    let items = '';
    for (let i in o.items) {

        console.log(__(o.items[i].title));

        let total = priceFormat(_this, o.items[i].total);
        let end_ofst = (o.items[i].qty + "").length + (total + "").length + 3;
        items += `[L]<b>${o.items[i].qty} X ${row(__(o.items[i].title), end_ofst)}</b>[R]${total}\n`;
        for (let v in o.items[i].variations) {

            items += `[L] ${row(__(o.items[i].variations[v].title), 1)}:`;
            for (let l in o.items[i].variations[v].list) items += ` ${o.items[i].variations[v].list[l].title},`;

            if (items.endsWith(',')) items = items.substring(0, items.length - 1) + '\n';

            // parse variation list
            // let list = ''; for(let l in item[x].variations[v].list) list += item[x].variations[v].list[l].title + " ";
            // vars += '<div><b>' + item[x].variations[v].title + "</b> <span>" + list + "</span></div> ";

            // // meal note
            // if(item[x].variations[v].note !== undefined && item[x].variations[v].note.length > 0) vars += "<div><b>" + __('Note') + "</b> " + item[x].variations[v].note + "</div> ";
        }
    }
    if (items.endsWith('\n')) items = items.substring(0, items.length - 2);
    data.print = data.print.replace(/{{order_items}}/g, items);

    // order note
    let note = !o.note || o.note == '<br>' ? '' : o.note;
    if (note.length > 0) {
        //  data.print += '[C]================================';
        data.print = data.print.replace(/{{order_note}}/g, '[C]================================\n' + note + '\n[C]================================\n');
    }
    // if(note.length>0) data.print += '[C]================================';

    // order totals
    data.print = data.print.replace(/{{total}}/g, priceFormat(_this, o.price.total));
    data.print = data.print.replace(/{{tax_total}}/g, priceFormat(_this, o.price.tax_total));
    data.print = data.print.replace(/{{discount_total}}/g, priceFormat(_this, o.price.discount_total));
    data.print = data.print.replace(/{{grand_total}}/g, priceFormat(_this, o.price.grand_total));


    let order_totals = '';
    order_totals += '[L]Subtotal[R]' + priceFormat(_this, o.price.total) + '\n';
    if (o.price.discount_total > 0) order_totals += '[L]' + __('Discount') + '[R]-' + priceFormat(_this, o.price.discount_total) + '\n';
    if (o.price.fee_total > 0) order_totals += '[L]' + _this.state.settings.fee_display + '[R]' + priceFormat(_this, o.price.fee_total) + '\n';
    if (o.price.tax_total > 0) order_totals += '[L]' + _this.state.settings.tax_display + '[R]' + priceFormat(_this, o.price.tax_total) + '\n';
    if (o.price.grand_total > 0) order_totals += '[L]' + __('Grand Total') + '[R]' + priceFormat(_this, o.price.grand_total);

    data.print = data.print.replace(/{{order_totals}}/g, order_totals);

    // qr link
    data.print = data.print.replace(/{{qr_link}}/g, 'http://' + _this.state.qr_settings.slug + '.kenzap.site');
    data.print = data.print.replace(/{{qr_number}}/g, document.querySelector('#qr-number').value);


    // let click = document.querySelector(".print-order[data-id='"+e.currentTarget.dataset.id+"']");

    // click.setAttribute('href', 'kenzapprint://kenzapprint.app?data='+encodeURIComponent(JSON.stringify(data)));

    // e.currentTarget.setAttribute('href', 'kenzapprint://kenzapprint.app?data='+JSON.stringify(data));

    // alert(data.print);

    let str = 'kenzapprint://kenzapprint.app?data=' + encodeURIComponent(JSON.stringify(data));

    if (data.debug) { console.log(data.print); console.log(str); }

    return str;
}

export const printQR = (_this, order) => {

    // vars
    let o = order, data = {}, date = new Date();

    // debug vs actual print
    data.debug = false;

    // get qr template
    data.print = _this.state.settings.qr_template;

    // qr link
    data.print = data.print.replace(/{{qr_link}}/g, 'http://' + _this.state.qr_settings.slug + '.kenzap.site');
    data.print = data.print.replace(/{{qr_number}}/g, document.querySelector('#qr-number').value);

    if (data.debug) { console.log(data.print); console.log(str); }

    let str = 'kenzapprint://kenzapprint.app?data=' + encodeURIComponent(JSON.stringify(data));

    return str;
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

    return "http://localhost:3000";
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
        'Kenzap-Locale': getCookie('locale') ? getCookie('locale') : "en",
        'Kenzap-Header': checkHeader(),
        'Kenzap-Token': getCookie('kenzap_token'),
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