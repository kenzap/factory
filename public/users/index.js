import { deleteUser } from "../_/api/delete_user.js";
import { getUsers } from "../_/api/get_users.js";
import { getPageNumber, getPagination, replaceQueryParam } from "../_/components/products/helpers.js";
import { getRights } from "../_/components/users/helpers.js";
import { getHtml } from "../_/components/users/html.js";
import { AddUser } from "../_/components/users/modal_add_user.js";
import { EditUser } from "../_/components/users/modal_edit_user.js";
import { ManageUserRights } from "../_/components/users/modal_manage_user_rights.js";
import { __html, hideLoader, initBreadcrumbs, link, log, onChange, onClick, onKeyUp } from "../_/helpers/global.js";
import { bus } from "../_/modules/bus.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

/**
 * Users dashboard page
 * 
 * @version 1.0
 */
class Users {

    // construct class
    constructor() {

        this.firstLoad = true;

        // query filters
        this.filters = {
            s: '',
            portal: '',
            offset: 0,
            limit: 50,
        };

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        this.filters.offset = (getPageNumber() - 1) * this.filters.limit;

        getUsers(this.filters, (response) => {

            log(response);

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            // init locale
            new Locale(response);

            // check if authorized
            if (!isAuthorized(response, 'user_management')) return

            this.settings = response.settings;
            this.users = response.users.users;
            this.meta = response.users.meta;
            this.user = response.user;

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                title: __html('Users'),
                icon: 'person',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            // init footer
            new Footer(response);

            // load page html 
            this.html();

            // render page
            this.render();

            // listeners
            this.listeners();

            document.title = __html('Users');

            this.firstLoad = false;
        });
    }

    // load page
    html = () => {

        if (this.firstLoad) document.querySelector('#app').innerHTML = getHtml();
    }

    // render page
    render = () => {

        // initiate breadcrumbs
        if (this.firstLoad) initBreadcrumbs([
            { link: link('/home/'), text: __html('Home') },
            { text: __html('Users') }
        ]);

        // table
        document.querySelector('.table tbody').innerHTML = this.users.map((user, i) => {

            return `
                <tr>
                    <td>
                        <div class="timgc">
                            <a href="#">
                                <i class="bi bi-person text-muted" style="font-size: 24px;"></i>
                            </a>
                        </div>
                    </td>
                    <td class="destt userActionsCont" style="max-width:250px;min-width:250px;">
                        <div class="my-1">
                            <a class="text-body action" data-type="edit" data-id="${user._id}" data-index="${i}" href="#" >${user.fname || ""}</a>
                        </div>
                    </td>
                    <td>
                        <span>${user.email || ""}</span>
                    </td>
                    <td>
                        <div class="badge ${!user.portal ? 'bg-dark d-none' : 'bg-primary'} fw-light">${!user.portal ? __html('No access') : __html('With access')}</div>
                    </td>
                    <td>
                        <div style="max-width: 300px;">${this.formatRoles(user.rights)}</div>
                    </td>
                    <td>
                        <span>${user.notes || ""}</span>
                    </td>
                    <td class="text-end">
                        <div class="dropdown- userActionsCont" data-user-id="${user._id}" data-user-index="${i}">
                            <i id="userActions${i}" data-bs-toggle="dropdown" data-bs-boundary="viewport" class="bi bi-three-dots-vertical dropdown-toggle- fs-5 po"></i>
                            <ul class="dropdown-menu dropdown-menu-end" data-popper-placement="left-start" aria-labelledby="userActions${i}">
                                <li>
                                    <a class="dropdown-item po action" href="#" data-type="edit" data-id="${user._id}" data-index="${i}">
                                        <i class="bi bi-pencil me-2"></i>
                                        ${__html('Edit')}
                                    </a>
                                </li>
                                <li class="${this.user?.rights.includes('user_rights_management') ? '' : 'd-none'}" >
                                    <a class="dropdown-item po action" href="#" data-type="access" data-id="${user._id}" data-index="${i}">
                                        <i class="bi bi-key me-2"></i>
                                        ${__html('Access')}
                                    </a>
                                </li>
                                <li>
                                    <hr class="dropdown-divider">
                                </li>
                                <li>
                                    <a class="dropdown-item action po" data-type="remove" href="#" data-id="${user._id}" data-index="${i}">
                                        <i class="bi bi-trash me-2 text-danger"></i>
                                        ${__html('Remove')}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>`;
        }).join('')

        getPagination(this.meta, this.init);
    }

    formatRoles = (rights) => {

        let r = getRights();

        // iterate roles
        if (Array.isArray(rights)) {

            return rights.map(right => {

                return `<div class="badge ${r[right]?.class || 'bg-secondary'} fw-light me-2">` + (r[right]?.text || right) + `</div>`;

            }).join('');

        } else {

            return `<div class="badge bg-dark fw-light">` + __html('No rights') + `</div>`;
        }
    }

    // init page listeners
    listeners = () => {

        // user action listeners
        [...document.querySelectorAll('.userActionsCont .action')].forEach(el => {

            el.addEventListener('click', e => {

                e.preventDefault();

                let user = this.users[e.currentTarget.dataset.index];

                switch (e.currentTarget.dataset.type) {
                    case 'edit':

                        new EditUser(user);
                        break;
                    case 'access':

                        new ManageUserRights(user);
                        break;
                    case 'remove':

                        this.remove(user)
                        break;
                }
            });
        });

        // stop here
        if (!this.firstLoad) return;

        // console.log('Init users page listeners');

        // add user listener
        onClick('.btn-add-user-dialog', e => { new AddUser(); });

        // view activity logs
        onClick('.btn-view-events', this.viewEvents);

        // search products activation
        onClick('.bi-search', this.searchUserActivate);

        // portal filter
        onChange('.portal-filter', e => {
            this.filters.portal = e.currentTarget.value;
            this.init();
        });

        // refresh state
        bus.on('user-updated', (data) => {

            this.init();
        });
    }

    searchUserActivate = (e) => {

        e.preventDefault();

        const str = replaceQueryParam('page', 1, window.location.search);
        window.history.replaceState("pagination", document.title, window.location.pathname + str);

        // document.querySelector('.table .bi-search').style.display = 'none';
        document.querySelector('.table thead tr th:nth-child(2) span').style.display = 'none';
        document.querySelector('.table thead tr th:nth-child(2) .search-cont').style.display = 'flex';
        document.querySelector('.table thead tr th:nth-child(2) .search-cont input').focus();

        // search products
        onKeyUp('.table thead tr th:nth-child(2) .search-cont input', e => { this.filters.s = e.currentTarget.value; this.init(); });
    }

    remove = (user) => {

        if (!confirm(__html('Remove this user?'))) return;

        // show loading
        deleteUser(user, (response) => {

            if (!response.success) return;

            this.init();
        });
    }
}

new Users();