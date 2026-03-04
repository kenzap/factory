import { __html, attr, onChange, onClick, randomString, toast } from "../../helpers/global.js";

/**
 * ClientEntityUsers component that manages user-entity links.
 * These links are used to resolve connected entities for authenticated portal users.
 *
 * @class ClientEntityUsers
 */
export class ClientEntityUsers {

    constructor(client) {

        this.client = client;
        this.client.users = this.client.users || [];

        this.init();
    }

    init = () => {

        this.view();
        this.refreshUsers();
        this.listeners();
    }

    view = () => {

        document.querySelector('client-entity-users').innerHTML = `
            <div class="mb-5">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="bi bi-people me-2"></i>${__html('Users')}</h5>
                    <button class="btn btn-outline-primary btn-sm" id="addEntityUserBtn">
                        <i class="bi bi-plus me-1"></i>${__html('Add User')}
                    </button>
                </div>
                
                <div id="entityUsersList"></div>

                <button class="btn add-contact-btn w-100 py-3" id="addEntityUserPlaceholder">
                    <i class="bi bi-plus me-2"></i>${__html('Add First Entity User')}
                </button>
            </div>
        `;
    }

    refreshUsers = () => {

        const list = document.getElementById('entityUsersList');
        list.innerHTML = '';

        this.client.users = this.client.users.map((user) => ({
            ...user,
            id: user?.id || randomString(6)
        }));

        this.client.users.forEach((user, i) => {
            list.insertAdjacentHTML('beforeend', /*html*/`
                <div class="entity-user-item bg-light bg-gradient p-3 mb-3 border-sm" id="${attr(user.id || randomString(6))}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6><i class="bi bi-person-badge me-2"></i>${__html('User #%1$', i + 1)}</h6>
                        <button class="btn btn-outline-danger btn-remove-entity-user btn-sm" data-id="${attr(user.id)}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-2">
                            <label class="form-label">${__html('Email')}</label>
                            <input type="email" class="form-control form-control-sm" autocomplete="off" name="email_${attr(user.id)}" value="${attr(user.email || '')}" placeholder="${__html('name@example.com')}">
                        </div>
                        <div class="col-md-4 mb-2">
                            <label class="form-label">${__html('Phone number')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="phone_${attr(user.id)}" value="${attr(user.phone || '')}" placeholder="+371...">
                        </div>
                        <div class="col-md-4 mb-1">
                            <label class="form-label">${__html('Note')}</label>
                            <input type="text" class="form-control form-control-sm" autocomplete="off" name="notes_${attr(user.id)}" value="${attr(user.notes || '')}" placeholder="${__html('Note')}">
                        </div>
                    </div>
                </div>
            `);
        });

        onClick('.btn-remove-entity-user', (e) => {
            this.removeUser(e.currentTarget.dataset.id);
        });

        onChange('.entity-user-item input', (e) => {
            const itemId = e.currentTarget.closest('.entity-user-item').id;
            const fieldName = e.currentTarget.name.split('_')[0];
            const fieldValue = e.currentTarget.value.trim();

            const index = this.client.users.findIndex(user => user.id === itemId);
            if (index !== -1) {
                this.client.users[index][fieldName] = fieldValue;
            }
        });

        const showPlaceholder = this.client.users.length === 0;
        document.getElementById('addEntityUserPlaceholder').classList.toggle('d-none', !showPlaceholder);
    }

    addUser = () => {

        this.client.users.push({
            id: randomString(6),
            email: '',
            phone: '',
            notes: ''
        });

        this.refreshUsers();
    }

    removeUser = (userId) => {

        this.client.users = this.client.users.filter(user => user.id !== userId);
        this.refreshUsers();
    }

    validate = () => {

        const invalid = this.client.users.find(user => !(String(user.email || '').trim() || String(user.phone || '').trim()));
        if (invalid) {
            toast(__html('Each entity user row must contain email or phone.'));
            return false;
        }
        return true;
    }

    listeners = () => {

        document.getElementById('addEntityUserBtn').addEventListener('click', this.addUser.bind(this));
        document.getElementById('addEntityUserPlaceholder').addEventListener('click', this.addUser.bind(this));
    }
}
