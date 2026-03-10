import { getHome } from "../_/api/get_home.js";
import { saveSettings } from "../_/api/save_settings.js";
import { PreviewWorkLog } from "../_/components/order/preview_worklog.js";
import { ProductSearch } from "../_/components/products/product_search.js";
import { __html, attr, fileUrl, hideLoader, toast } from "../_/helpers/global.js";
import { Footer } from "../_/modules/footer.js";
import { Header } from "../_/modules/header.js";
import { Locale } from "../_/modules/locale.js";
import { Modal } from "../_/modules/modal.js";
import { Session } from "../_/modules/session.js";

/**
 * Main navigation menu page of the dashboard.
 * Loads HTMLContent from _cnt_home.js file.
 * Renders menu items in a list view manner
 * 
 * @version 1.0 
 */
class Launcher {

    // construct class
    constructor() {
        this.filters = [];

        // connect to backend
        this.init();
    }

    init = () => {

        new Modal();

        getHome((response) => {

            // show UI loader
            if (!response.success) return;

            // hide UI loader
            hideLoader();

            this.settings = response.settings;
            this.user = response.user;

            // console.log(this.user.rights);

            // locale
            new Locale(response);

            // session
            new Session();

            // init header
            new Header({
                hidden: false,
                title: __html('Work Report'),
                icon: 'bi bi-journal-text',
                style: 'navbar-light',
                user: response?.user,
                menu: `<button class="btn btn-outline-light sign-out"><i class="bi bi-power"></i> ${__html('Sign out')}</button>`
            });

            // init footer
            new Footer(response);

            // init navigation blocks
            this.initBlocks();

            // load page html 
            this.html();

            // render page
            this.render();
        });
    }

    initBlocks = () => {

        const customBlocks = Array.isArray(this.settings?.worklog_launcher_blocks)
            ? this.settings.worklog_launcher_blocks
            : [];

        this.blocks = customBlocks
            .map((block) => this.normalizeBlock(block))
            .filter(Boolean);

        this.filters = this.getFiltersFromBlocks(this.blocks);
    }

    normalizeBlock = (block = {}) => {
        const id = String(block?.id || '').trim();
        const name = String(block?.name || '').trim();
        if (!id || !name) return null;

        const tags = (Array.isArray(block?.tags) ? block.tags : [])
            .map((tag) => {
                if (typeof tag === 'string') return { label: tag.trim(), cls: '' };
                return {
                    label: String(tag?.label || '').trim(),
                    cls: String(tag?.cls || '').trim()
                };
            })
            .filter((tag) => tag.label);

        const actions = (Array.isArray(block?.actions) ? block.actions : [])
            .map((action) => ({
                type: String(action?.type || '').trim(),
                tag: String(action?.tag || '').trim(),
                label: String(action?.label || '').trim(),
                icon: String(action?.icon || '').trim(),
                style: String(action?.style || '').trim()
            }))
            .filter((action) => action.type && action.label);

        return {
            id,
            name,
            image: String(block?.image || '').trim() || fileUrl(`product-${id}-1-100x100.jpeg`),
            tags,
            actions
        };
    }

    getFiltersFromBlocks = (blocks = []) => {
        const seen = new Set();
        const filters = [];

        blocks.forEach((block) => {
            const tags = Array.isArray(block?.tags) ? block.tags : [];
            tags.forEach((tag) => {
                const label = String(tag?.label || '').trim();
                if (!label || seen.has(label)) return;
                seen.add(label);
                filters.push(label);
            });
        });

        return filters;
    }

    getBlockImageCandidates = (block = {}) => {
        const id = String(block?.id || '').trim();
        const custom = String(block?.image || '').trim();
        const candidates = [];

        if (custom) candidates.push(custom);
        if (id) {
            candidates.push(fileUrl(`sketch-${id}-1-500x500.webp`));
            candidates.push(fileUrl(`sketch-${id}-1-500x500.jpeg`));
            candidates.push(fileUrl(`product-${id}-1-100x100.jpeg`));
            candidates.push(fileUrl(`product-${id}-1-100x100.webp`));
        }
        candidates.push('/assets/img/placeholder.png');

        return [...new Set(candidates.filter(Boolean))];
    }

    // load page
    html = () => {

        document.querySelector('#app').innerHTML = /*html*/`
            <div class="container">
                <div class="filter-tabs">
                    <div class="filter-tab active" data-filter="all" onclick="launcher.filter(this, '')">${__html('All')}</div>
                    ${this.filters.map((filter) => { return `<div class="filter-tab" onclick="launcher.filter(this)" data-filter="${filter}">${__html(filter)}</div>`; }).join('')}
                </div>
                <div class="d-flex justify-content-between bd-highlight mb-3 d-none">
                    <nav class="bc" aria-label="breadcrumb"></nav>
                </div>
                <div id="cards" class="row grid"></div>
            </div>
        </div>`;
    }

    // generate card HTML for a product
    card = (p, pi) => {
        if (p?.__isAddCard) {
            return /*html*/`
                <div class="card card-add-block" data-filter="all" onclick="launcher.openBlockBuilderModal()" style="cursor:pointer;">
                    <div class="card-header bg-white border-0 d-flex align-items-center justify-content-center" style="min-height:190px;">
                        <div class="d-flex align-items-center justify-content-center text-muted opacity-75" style="gap:8px;">
                            <i class="bi bi-plus-circle" style="font-size:1.05rem;"></i>
                            <span class="product-name mb-0">${__html('Add product')}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // product
        const tagsHtml = p.tags.map(t => `<span class="tag ${t.cls}">${__html(t.label)}</span>`).join('');
        const imageCandidates = this.getBlockImageCandidates(p);
        const initialImage = imageCandidates[0] || '/assets/img/placeholder.png';
        const fallbacks = attr(JSON.stringify(imageCandidates.slice(1)));

        // actions
        const btnsHtml = p.actions.map((a, ai) => `<button class="action-btn ${a.style}" onclick="launcher.openWorkLog('${pi}', '${ai}')"><span class="btn-icon">${a.icon}</span>${a.label}</button>`).join('');

        return /*html*/`
            <div class="card" data-filter="${p.tags.map(t => t.label).join(' ')}">
                <div class="card-stripe d-none"></div>
                <div class="card-header bg-white border-0">
                    <div class="product-img-wrap">
                        <img src="${attr(initialImage)}" data-fallbacks='${fallbacks}' alt="${p.name}" onerror="launcher.onBlockImageError(this)"/>
                    </div>
                    <div class="product-info">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="product-name">${p.name}</div>
                            <button type="button"
                                class="btn btn-sm p-0 border-0 bg-transparent text-muted opacity-75"
                                title="${__html('Edit')}"
                                onclick="event.stopPropagation(); launcher.openBlockBuilderModal('${attr(p.id)}')">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                        </div>
                        <div class="product-tags">${tagsHtml}</div>
                    </div>
                </div>
                <div class="card-divider"></div>
                <div class="btn-grid">${btnsHtml}</div>
            </div>
        `;
    }

    onBlockImageError = (img) => {
        if (!img) return;

        let queue = [];
        try {
            queue = JSON.parse(img.dataset.fallbacks || '[]');
        } catch (_err) {
            queue = [];
        }

        const next = Array.isArray(queue) ? queue.shift() : '';
        if (next) {
            img.dataset.fallbacks = JSON.stringify(queue);
            img.src = next;
            return;
        }

        img.outerHTML = `<span class='img-fallback'>⚙️</span>`;
    }

    // render page
    render = () => {

        const grid = document.getElementById('cards');

        const blocks = [...this.blocks, { __isAddCard: true }];
        const cardsHtml = blocks.map((p, index) => this.card(p, index)).join('');
        grid.innerHTML = cardsHtml;

        document.title = __html('Home');
    }

    // init page listeners
    listeners = () => {


    }

    filter = (el) => {

        const filterTabs = document.querySelectorAll('.filter-tab');
        const cards = document.querySelectorAll('.card');
        // const filter = this.filters.find(f => f === filter);

        // if (!filter) return;

        // Remove active class from all tabs
        filterTabs.forEach(t => t.classList.remove('active'));

        // Add active class to clicked tab
        el.classList.add('active');

        const filterType = el.dataset.filter;

        if (filterType === 'all') {
            cards.forEach(card => card.style.display = 'block');
        } else {
            cards.forEach(card => {
                if (card.classList.contains('card-add-block')) {
                    card.style.display = 'block';
                    return;
                }
                if (card.dataset.filter.indexOf(filterType) !== -1) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    }

    getBlockActionRow = (action = {}) => {
        const type = String(action.type || '').trim();
        const icon = String(action.icon || '').trim();
        const style = String(action.style || '').trim();
        return /*html*/`
            <tr class="block-action-row">
                <td>
                    <select class="form-select form-select-sm block-action-type">
                        <option value="">${__html('Select')}</option>
                        ${this.getWorkCategoryTypeOptions(type)}
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm block-action-tag" placeholder="${__html('Tag')}" value="${attr(action.tag || '')}"></td>
                <td><input type="text" class="form-control form-control-sm block-action-label" placeholder="${__html('Button label')}" value="${attr(action.label || '')}"></td>
                <td>
                    <select class="form-select form-select-sm block-action-icon">
                        <option value="">${__html('Select')}</option>
                        ${this.getIconOptions(icon)}
                    </select>
                </td>
                <td>
                    <select class="form-select form-select-sm block-action-style">
                        ${this.getStyleOptions(style)}
                    </select>
                </td>
                <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger block-action-remove">${__html('Remove')}</button></td>
            </tr>
        `;
    }

    getIconOptions = (selectedIcon = '') => {
        const icons = ['&#8544;', '&#8544;&#8544;', '&#8544;&#8544;&#8544;', '&#8544;&#8548;', '&#8548;'];
        const options = [];
        const inList = icons.includes(selectedIcon);

        if (selectedIcon && !inList) {
            options.push(`<option value="${attr(selectedIcon)}" selected>${selectedIcon}</option>`);
        }

        icons.forEach((icon) => {
            const selected = icon === selectedIcon ? 'selected' : '';
            options.push(`<option value="${icon}" ${selected}>${icon}</option>`);
        });

        return options.join('');
    }

    getStyleOptions = (selectedStyle = '') => {
        const styles = [
            { value: 'secondary', label: __html('Gray'), swatch: '⬛' },
            { value: 'success', label: __html('Green'), swatch: '🟩' },
            { value: 'info', label: __html('Cyan'), swatch: '🟦' },
            { value: 'warning', label: __html('Yellow'), swatch: '🟨' },
            { value: 'danger', label: __html('Red'), swatch: '🟥' },
            { value: 'primary', label: __html('Blue'), swatch: '🔵' },
            { value: 'dark', label: __html('Black'), swatch: '⚫' },
            { value: 'light', label: __html('Light'), swatch: '⚪' }
        ];

        const options = [];
        const inList = styles.some((style) => style.value === selectedStyle);

        options.push(`<option value="" ${selectedStyle === '' ? 'selected' : ''}>${__html('Select')}</option>`);

        if (selectedStyle && !inList) {
            options.push(`<option value="${attr(selectedStyle)}" selected>${__html(selectedStyle)}</option>`);
        }

        styles.forEach((style) => {
            const selected = style.value === selectedStyle ? 'selected' : '';
            options.push(`<option value="${style.value}" ${selected}>${style.swatch} ${style.label}</option>`);
        });

        return options.join('');
    }

    getWorkCategoryTypeOptions = (selectedType = '') => {
        const categories = Array.isArray(this.settings?.work_categories) ? this.settings.work_categories : [];
        const options = [];
        const inSettings = categories.some((category) => String(category?.id || '') === selectedType);

        if (selectedType && !inSettings) {
            options.push(`<option value="${attr(selectedType)}" selected>${__html(selectedType)}</option>`);
        }

        categories.forEach((category) => {
            const id = String(category?.id || '').trim();
            if (!id) return;
            const name = String(category?.name || id).trim();
            const selected = id === selectedType ? 'selected' : '';
            options.push(`<option value="${attr(id)}" ${selected}>${__html(name)}</option>`);
        });

        return options.join('');
    }

    getBlockDraftFromModal = (modal) => {
        const root = modal.querySelector('.launcher-block-builder');
        if (!root) return {};

        const actions = Array.from(root.querySelectorAll('.block-action-row')).map((row) => ({
            type: row.querySelector('.block-action-type')?.value?.trim() || '',
            tag: row.querySelector('.block-action-tag')?.value?.trim() || '',
            label: row.querySelector('.block-action-label')?.value?.trim() || '',
            icon: row.querySelector('.block-action-icon')?.value?.trim() || '',
            style: row.querySelector('.block-action-style')?.value?.trim() || ''
        })).filter((action) => action.type || action.tag || action.label || action.icon || action.style);

        const rawTags = (root.querySelector('#block_builder_tags')?.value || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        return {
            id: root.querySelector('#block_builder_id')?.value?.trim() || '',
            name: root.querySelector('#block_builder_name')?.value?.trim() || '',
            image: root.querySelector('#block_builder_image')?.value?.trim() || '',
            tags: rawTags.map((label) => ({ label, cls: '' })),
            actions
        };
    }

    updateBlockBuilderPreview = () => {
        const modal = document.querySelector('.modal-item');
        if (!modal) return;

        const preview = modal.querySelector('#block_builder_preview');
        if (!preview) return;

        const draft = this.getBlockDraftFromModal(modal);
        preview.textContent = JSON.stringify(draft, null, 2);
    }

    openBlockBuilderModal = (blockId = '') => {
        const modal = document.querySelector('.modal-item');
        if (!modal) return;
        const selectedId = String(blockId || '').trim();
        const selectedBlock = selectedId
            ? this.normalizeBlock(this.blocks.find((block) => String(block?.id || '').trim() === selectedId))
            : null;
        const initialActions = (selectedBlock?.actions && selectedBlock.actions.length > 0) ? selectedBlock.actions : [{}];
        const initialTags = Array.isArray(selectedBlock?.tags) ? selectedBlock.tags.map((tag) => tag?.label).filter(Boolean).join(', ') : '';
        const initialSearch = selectedBlock?.name || '';

        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.remove('modal-sm', 'modal-xl', 'modal-fullscreen');
            modalDialog.classList.add('modal-xl');
        }

        modal.querySelector(".modal-body").classList.remove('p-0');
        modal.querySelector(".modal-body").classList.remove('bg-light');

        modal.querySelector('.modal-title').textContent = selectedBlock ? __html('Edit product') : __html('Add product');
        modal.querySelector('.modal-body').innerHTML = /*html*/`
            <div class="launcher-block-builder">
                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <label class="form-label mb-1">${__html('Product')}</label>
                        <div class="position-relative">
                            <input id="block_builder_product_search" type="text" class="form-control form-control-sm pe-4" placeholder="${__html('Search product')}" value="${attr(initialSearch)}">
                            <i class="bi bi-search position-absolute top-50 end-0 translate-middle-y me-2 text-muted"></i>
                        </div>
                        <input id="block_builder_product_coating" type="hidden" value="">
                        <input id="block_builder_product_color" type="hidden" value="">
                        <input id="block_builder_id" type="hidden" value="${attr(selectedBlock?.id || '')}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label mb-1">${__html('Block name')}</label>
                        <input id="block_builder_name" type="text" class="form-control form-control-sm" placeholder="${__html('Product name')}" value="${attr(selectedBlock?.name || '')}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label mb-1">${__html('Image URL')}</label>
                        <input id="block_builder_image" type="text" class="form-control form-control-sm" placeholder="https://..." value="${attr(selectedBlock?.image || '')}">
                    </div>
                    <div class="col-12">
                        <label class="form-label mb-1">${__html('Tags')}</label>
                        <input id="block_builder_tags" type="text" class="form-control form-control-sm" placeholder="${__html('Comma separated, e.g. K-style, Ø 125/100')}" value="${attr(initialTags)}">
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${__html('Actions')}</h6>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="block_builder_add_action">${__html('Add action')}</button>
                </div>

                <div class="table-responsive mb-3">
                    <table class="table table-sm table-bordered align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>${__html('Type')}</th>
                                <th>${__html('Tag')}</th>
                                <th>${__html('Label')}</th>
                                <th>${__html('Operation')}</th>
                                <th>${__html('Style')}</th>
                                <th style="width:90px;"></th>
                            </tr>
                        </thead>
                        <tbody id="block_builder_actions">
                            ${initialActions.map((action) => this.getBlockActionRow(action)).join('')}
                        </tbody>
                    </table>
                </div>

                <h6 class="mb-2">${__html('JSON preview')}</h6>
                <pre id="block_builder_preview" class="bg-light border rounded p-2 small mb-0" style="max-height:260px; overflow:auto;"></pre>
            </div>
        `;

        modal.querySelector('.modal-footer').innerHTML = /*html*/`
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">${__html('Close')}</button>
            <button type="button" class="btn btn-primary" id="block_builder_save">${__html('Save')}</button>
        `;

        const builder = modal.querySelector('.launcher-block-builder');
        const actionsTable = modal.querySelector('#block_builder_actions');
        const addBtn = modal.querySelector('#block_builder_add_action');
        const saveBtn = modal.querySelector('#block_builder_save');
        const productSearchInput = modal.querySelector('#block_builder_product_search');
        const productIdInput = modal.querySelector('#block_builder_id');
        const productNameInput = modal.querySelector('#block_builder_name');
        const productImageInput = modal.querySelector('#block_builder_image');

        const refreshPreview = () => this.updateBlockBuilderPreview();

        builder?.addEventListener('input', refreshPreview);

        addBtn?.addEventListener('click', () => {
            actionsTable.insertAdjacentHTML('beforeend', this.getBlockActionRow());
            refreshPreview();
        });

        actionsTable?.addEventListener('click', (event) => {
            const btn = event.target.closest('.block-action-remove');
            if (!btn) return;

            const rows = actionsTable.querySelectorAll('.block-action-row');
            if (rows.length === 1) {
                rows[0].querySelectorAll('input, select').forEach((field) => { field.value = ''; });
            } else {
                btn.closest('.block-action-row')?.remove();
            }

            refreshPreview();
        });

        saveBtn?.addEventListener('click', () => {
            const draft = this.normalizeBlock(this.getBlockDraftFromModal(modal));
            if (!draft) {
                toast(__html('Product is required'));
                return;
            }
            if (!draft.actions?.length) {
                toast(__html('Add at least one action'));
                return;
            }

            const current = Array.isArray(this.settings?.worklog_launcher_blocks) ? this.settings.worklog_launcher_blocks : [];
            const next = [...current.filter((item) => item?.id !== draft.id), draft];

            saveSettings({ worklog_launcher_blocks: next }, (response) => {
                if (!response?.success) {
                    toast(__html('Failed to save'));
                    return;
                }
                this.refreshAfterBlockSave(modal);
            });
        });

        // Reuse existing product picker behavior from bundle/worklog flows.
        new ProductSearch({
            name: '#block_builder_product_search',
            coating: '#block_builder_product_coating',
            color: '#block_builder_product_color'
        }, (product) => {

            if (productIdInput) productIdInput.value = product?._id || '';
            if (productNameInput && !productNameInput.value.trim()) productNameInput.value = product?.title || '';
            if (productImageInput && !productImageInput.value.trim()) {
                productImageInput.value = product?.sketch_img || product?.image || '';
            }
            if (productSearchInput) {
                productSearchInput.value = [product?.title || '', product?.sdesc || ''].join(' ').trim();
            }

            refreshPreview();
        });

        refreshPreview();

        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();
    }

    refreshAfterBlockSave = (modal) => {
        getHome((response) => {
            if (!response?.success) {
                this.settings.worklog_launcher_blocks = Array.isArray(this.settings?.worklog_launcher_blocks)
                    ? this.settings.worklog_launcher_blocks
                    : [];
            } else {
                this.settings = response.settings || this.settings;
            }

            this.initBlocks();
            this.html();
            this.render();

            bootstrap.Modal.getOrCreateInstance(modal).hide();
            toast(__html('Saved'));
        });
    }

    // open work log modal for a specific product and action
    openWorkLog(pi, ai) {

        let block = this.blocks[pi];
        let action = block.actions[ai];

        let tag = action?.tag;
        let label = action?.label;

        let id = "", order_id = "", item_id = "", product_id = block.id, product_name = block.name, type = action.type, qty = 0, color = "-", coating = "-";

        new PreviewWorkLog({ type, tag, label, id, order_id, item_id, product_id, product_name, color, coating, qty, user_id: this.user.id }, (response) => {
            if (!response.success) {
                toast(__html('Error opening work log'));
                return;
            }
            if (response.success) {
                this.loadOrders();
            }
        });
    }
}

window.launcher = new Launcher();
