import { deleteFile } from "../_/api/delete_file.js";
import { getFiles } from "../_/api/get_files.js";
import { __html, attr, getStorage, hideLoader, html, initBreadcrumbs, link, onClick, onKeyUp, showLoader, spaceID } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";
import { isAuthorized } from "../_/modules/unauthorized.js";

class MediaJournal {
    constructor() {
        this.firstLoad = true;
        this.filters = {
            s: '',
            limit: 200,
            offset: 0,
        };

        this.files = [];
        this.meta = { total_records: 0 };
        this.totals = { files: 0, size: 0 };

        this.init();
    }

    init = () => {
        new Modal();

        getFiles(this.filters, (response) => {
            if (!response.success) return;

            hideLoader();
            new Locale(response);

            if (!isAuthorized(response, 'file_management')) return;

            this.user = response.user;
            this.files = response.files?.files || [];
            this.meta = response.files?.meta || { total_records: 0 };
            this.totals = response.files?.totals || { files: 0, size: 0 };

            new Session();
            new Header({
                hidden: false,
                title: __html('Files'),
                icon: 'files',
                style: 'navbar-dark bg-dark',
                user: response?.user,
                controls: `
                    <div class="search-container d-flex align-items-center">
                        <div class="me-0">
                            <input type="text" id="fileSearch" class="form-control search-input" placeholder="${__html('Search file by name, extension or id')}" style="width: 340px;" value="${attr(this.filters.s)}">
                        </div>
                    </div>
                `,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            new Footer(response);
            this.html();
            this.render();
            this.listeners();

            document.title = __html('Files');
            this.firstLoad = false;
        });
    }

    html = () => {
        if (!this.firstLoad) return;

        document.querySelector('#app').innerHTML = `
            <div class="container p-edit">
                <div class="d-flex justify-content-between bd-highlight mb-3">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                </div>
                <div class="files-stats mb-3" id="filesStats"></div>
                <div class="files-table-wrap">
                    <div class="table-responsive">
                        <table class="table table-hover table-borderless align-middle table-striped table-p-list mb-0 files-table" id="filesTable">
                            <thead>
                                <tr>
                                    <th>${__html('Title')}</th>
                                    <th>${__html('Type')}</th>
                                    <th>${__html('Size')}</th>
                                    <th>${__html('Uploaded')}</th>
                                    <th class="text-end">${__html('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    render = () => {
        if (this.firstLoad) {
            initBreadcrumbs([
                { link: link('/home/'), text: __html('Home') },
                { text: __html('Files') },
            ]);
        }

        document.querySelector('#filesStats').innerHTML = `
            <div class="files-stat">
                <div class="files-stat-label">${__html('Visible Files')}</div>
                <div class="files-stat-value">${this.files.length}</div>
            </div>
            <div class="files-stat">
                <div class="files-stat-label">${__html('Total Files')}</div>
                <div class="files-stat-value">${this.totals.files || this.meta.total_records || 0}</div>
            </div>
            <div class="files-stat">
                <div class="files-stat-label">${__html('Total Size')}</div>
                <div class="files-stat-value">${this.formatBytes(this.totals.size || 0)}</div>
            </div>
        `;

        const tbody = document.querySelector('#filesTable tbody');

        if (!this.files.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-files">${__html('No files uploaded yet')}</td></tr>`;
            return;
        }

        tbody.innerHTML = this.files.map((file) => {
            const fileName = file.name || `${file.id}${file.ext ? '.' + file.ext : ''}`;
            const viewUrl = this.getFileUrl(file);
            const iconClass = this.getFileIcon(file);

            return `
                <tr>
                    <td>
                        <div class="file-name-wrap">
                            <span class="file-type-icon"><i class="bi ${attr(iconClass)}"></i></span>
                            <span class="file-name form-text" title="${attr(fileName)}">${html(fileName)}</span>
                        </div>
                    </td>
                    <td class="form-text">${html((file.ext || '').toUpperCase() || '-')}</td>
                    <td class="form-text">${html(this.formatBytes(file.size || 0))}</td>
                    <td class="form-text">${html(this.formatDate(file.uploaded))}</td>
                    <td class="text-end">
                        <div class="dropdown file-actions">
                            <i id="fileActions${attr(file.id)}" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false" class="bi bi-three-dots-vertical dropdown-toggle po fs-5"></i>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="fileActions${attr(file.id)}">
                                <li>
                                    <a class="dropdown-item" href="${attr(viewUrl)}" target="_blank" rel="noopener">
                                        <i class="bi bi-eye me-2"></i>${__html('View')}
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item text-danger btn-delete-file" href="#" data-id="${attr(file.id)}">
                                        <i class="bi bi-trash me-2"></i>${__html('Delete')}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getFileIcon = (file) => {
        const ext = (file.ext || '').toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'bi-file-earmark-image';
        if (['obj', 'mtl', 'stl', 'fbx', 'gltf', 'glb'].includes(ext)) return 'bi-box';
        if (ext === 'pdf') return 'bi-file-earmark-pdf';
        if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'bi-file-earmark-text';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'bi-file-earmark-zip';
        return 'bi-file-earmark';
    }

    getFileUrl = (file) => {
        if (file.view_url) return file.view_url;
        const ext = file.ext ? `.${file.ext}` : '';
        return `${getStorage()}/S${spaceID()}/${file.id}${ext}`;
    }

    formatDate = (ts) => {
        if (!ts) return '-';
        const d = new Date(Number(ts));
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString();
    }

    formatBytes = (bytes) => {
        const value = Number(bytes) || 0;
        if (value === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(value) / Math.log(1024));
        const s = value / Math.pow(1024, i);

        return `${s.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
    }

    listeners = () => {
        onKeyUp('#fileSearch', (e) => {
            this.filters.s = e.currentTarget.value.trim();
            this.filters.offset = 0;
            this.init();
        });

        onClick('.btn-delete-file', (e) => {
            e.preventDefault();

            const id = e.currentTarget.dataset.id;
            if (!id) return;

            const confirmed = window.confirm(__html('Delete this file?'));
            if (!confirmed) return;

            showLoader();
            deleteFile(id, () => {
                const file = this.files.find((f) => f.id === id);
                const fileSize = file?.size || 0;
                this.files = this.files.filter((f) => f.id !== id);
                this.totals.files = Math.max((this.totals.files || 1) - 1, 0);
                this.totals.size = Math.max((this.totals.size || 0) - fileSize, 0);

                hideLoader();
                this.render();
            });
        });
    }
}

window.mediaJournal = new MediaJournal();
