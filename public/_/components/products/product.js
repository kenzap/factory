import { __html } from "../../helpers/global.js";

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

                // let url = window.location.href.split('/page');
                // let urlF = (url[0]+'/page'+p).replace('//page', '/page');

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

export const formatStatus = (st) => {

    st = parseInt(st);
    switch (st) {
        case 0: return '<div class="badge bg-warning text-dark fw-light">' + __html('Draft') + '</div>';
        case 1: return '<div class="badge bg-primary fw-light">' + __html('Published') + '</div>';
        case 2: return '<div class="badge bg-primary fw-light">' + __html('Private') + '</div>';
        case 3: return '<div class="badge bg-secondary fw-light">' + __html('Unpublished') + '</div>';
        default: return '<div class="badge bg-secondary fw-light">' + __html('Drafts') + '</div>';
    }
}

export const replaceQueryParam = (param, newval, search) => {

    let regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    let query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}