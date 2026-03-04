import { formatStatus } from "../../components/products/helpers.js";
import { __html, CDN, formatTime } from "../../helpers/global.js";

// Product Model
export class Product {
    constructor(data) {
        Object.assign(this, data);
    }

    get imageUrl() {
        if (this.cad_files?.length) {
            return `https://render.factory.app.kenzap.cloud/${this._id}-250.webp`;
        }

        if (this.sketch_img && this.sketch_img.length > 0 && this.sketch_img[0]?.id) {
            return buildFileUrl(`sketch-${this.sketch_img[0].id}-1-100x100.webp`, this.updated);
        }

        if (this.img?.[0]) {
            return buildFileUrl(`product-${this._id}-1-100x100.jpeg`, this.updated);
        }

        return '/assets/img/placeholder.png';
    }

    get imageLargeUrl() {
        if (this.cad_files?.length) {
            return `https://render.factory.app.kenzap.cloud/${this._id}-polyester-2h3-1500.webp`;
        }

        if (this.sketch_img && this.sketch_img.length > 0 && this.sketch_img[0]?.id) {
            return buildFileUrl(`sketch-${this.sketch_img[0].id}-1-500x500.webp`, this.updated);
        }

        if (this.img?.[0]) {
            return buildFileUrl(`product-${this._id}-1-100x100.jpeg`, this.updated);
        }

        return '/assets/img/placeholder.png';
    }

    get displayTitle() {
        return this.title || this.title_default || '';
    }

    get displayDescription() {
        return this.sdesc || this.sdesc_default || '';
    }

    get formattedStatus() {
        return formatStatus(this.status);
    }

    get formattedTime() {
        return formatTime(this.updated_at || this.updated * 1000);
    }
}

const getFilesBase = () => {
    const configured = (localStorage.getItem('cdn') || CDN || '').trim();
    if (!configured) return '/files';

    const noSlash = configured.replace(/\/+$/, '');
    return `${noSlash}`;
};

const buildFileUrl = (filename, updated = '') => {
    const base = getFilesBase();
    const cacheBust = updated ? `?${updated}` : '';
    return `${base}/${encodeURIComponent(filename)}${cacheBust}`;
};

export const getPageNumber = () => {

    let urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get('page') ? urlParams.get('page') : 1;

    return parseInt(page);
}

export const getPagination = (meta, cb) => {

    if (typeof (meta) === 'undefined') { document.querySelector("#listing_info").innerHTML = __html('no records to display'); return; }

    let offset = meta.limit + meta.offset;
    if (offset > meta.total_records) offset = meta.total_records;

    document.querySelector("#listing_info").innerHTML = __html("Showing %1$ to %2$ of %3$ entries", (1 + meta.offset), (offset), meta.total_records);

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

                let str = window.location.search;
                str = replaceQueryParam('page', p, str);

                // prevents browser from storing history with each change:
                window.history.replaceState("pagination", document.title, window.location.pathname + str);
            }

            // only refresh if page differs
            if (ps != p) cb();

            e.preventDefault();
            return false;
        });
    }
}

export const replaceQueryParam = (param, newval, search) => {

    let regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    let query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}