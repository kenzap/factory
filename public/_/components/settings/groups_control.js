import { __html, randomString } from "../../helpers/global.js";

// ▢ rainwater system
// ◯ rainwater system
// bending
// snow retention
// roofing panel
// complex product
// stock product

export class GroupsControl {

    constructor(settings) {

        this.settings = settings;

        if (!this.settings.groups) this.settings.groups = [];

        this.view();
    }

    view = () => {

        if (!document.querySelector("groups-control")) return;

        document.querySelector("groups-control").innerHTML = `
            <div class="form-group row mb-3 mt-1">
                <label class="col-sm-3 col-form-label">${__html('Groups')}</label>
                <div class="col-sm-9">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <p class="form-text m-0">${__html('Manage product groups')}</p>
                        <button type="button" class="btn btn-sm btn-outline-primary" id="add-group-btn">
                            <i class="bi bi-plus-circle me-1 add-group"></i> ${__html('Add group')}
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless" id="groups-table">
                            <thead>
                                <tr>
                                    <th class="form-text">${__html('Name')}</th>
                                    <th width="100" class="form-text text-end">${__html('Action')}</th>
                                </tr>
                            </thead>
                            <tbody id="groups-tbody">
                                <!-- Groups will be populated here -->
                            </tbody>
                        </table>
                    </div>
                    <input type="hidden" id="groups" name="groups" data-type="json">
                </div>
            </div>`;

        this.populateGroups();
        this.listeners();
    }

    populateGroups = () => {
        const tbody = document.querySelector("#groups-tbody");
        tbody.innerHTML = "";

        this.settings.groups.forEach((group, index) => {
            tbody.appendChild(this.createGroupRow(group, index));
        });
    }

    createGroupRow = (group, index) => {
        const row = document.createElement("tr");
        row.dataset.index = index;

        row.innerHTML = `
            <td>
                <input type="text" class="form-control form-control-sm group-name" value="${group.name || ''}" data-index="${index}">
            </td>
            <td class="align-middle text-end">
                <div type="button" class="text-danger remove-group align-middle text-end" data-index="${index}" style="border: none; background: none;">
                    <i class="bi bi-x-circle"></i>
                </div>
            </td>
            `;

        return row;
    }

    listeners = () => {
        document.querySelector("#add-group-btn").addEventListener('click', () => {
            const newGroup = { id: randomString(6), name: "" };
            this.settings.groups.push(newGroup);
            this.populateGroups();
            this.syncGroupsInput();
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-group')) {
                const index = parseInt(e.target.closest('.remove-group').dataset.index);
                this.settings.groups.splice(index, 1);
                this.populateGroups();
                this.syncGroupsInput();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('group-name')) {
                const index = parseInt(e.target.dataset.index);
                this.settings.groups[index].name = e.target.value;
                this.syncGroupsInput();
            }
        });
    }

    syncGroupsInput = () => {
        const input = document.querySelector("#groups");
        if (input) {
            input.value = JSON.stringify(this.settings.groups);
        }
    }
}