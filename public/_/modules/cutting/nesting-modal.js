import { createNestingJob, getNestingApiBaseUrl, getNestingJob, getSketchOrdersBasePath, stopNestingJob } from '../../api/nesting_api.js';
import { __html, getDimUnit, toast } from '../../helpers/global.js';
import { NestingVisualization } from './cutting-visualization-nesting.js';

const NESTING_PREFS_KEY = 'nesting_prefs';
const NESTING_RESULTS_CACHE_KEY = 'nesting_results_cache';
const MAX_NESTING_RESULT_CACHE_ENTRIES = 12;
const trimTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '');

export class NestingModal {

    constructor({ items = [], orderId = '', orderIds = [], settings = {}, defaultSheetHeight = 1250, material = '' } = {}) {
        this.items = items;
        const normalizedOrderIds = (Array.isArray(orderIds) ? orderIds : [orderId])
            .map((value) => String(value || '').trim())
            .filter(Boolean);

        if (!normalizedOrderIds.length && orderId) {
            normalizedOrderIds.push(String(orderId).trim());
        }
        if (!normalizedOrderIds.length) {
            this.items.forEach((item) => {
                const nextOrderId = String(item?.order_id || '').trim();
                if (nextOrderId) normalizedOrderIds.push(nextOrderId);
            });
        }

        this.orderIds = [...new Set(normalizedOrderIds)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        this.orderId = this.orderIds[this.orderIds.length - 1] || String(orderId || '').trim();
        this.settings = settings;
        this.defaultSheetHeight = defaultSheetHeight;
        this.material = material;

        this.nestingJobId = null;
        this.nestingJob = null;
        this.nestingPollTimer = null;
        this.nestingModalActiveSheetIndex = 0;
        this.nestingVisualization = null;
        this.modal = null;
        this.modal_cont = null;
        this.nestingRequestSignature = '';
        this.disabledItems = new Set();

        this.open();
    }

    // ─── Preferences ──────────────────────────────────────────────────────────

    loadNestingPrefs = () => {
        try {
            const raw = localStorage.getItem(NESTING_PREFS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    saveNestingPrefs = () => {
        try {
            const s = this.getNestingRequestState();
            localStorage.setItem(NESTING_PREFS_KEY, JSON.stringify({
                height: s.height || null,
                widthMode: s.widthMode,
                exportEnabled: s.exportEnabled,
                alignment: s.alignment || null
            }));
        } catch {
            // ignore storage errors
        }
    }

    getConfiguredTimeLimit = () => {
        const raw = this.settings?.['nesting:timeLimit'] ?? this.settings?.nesting?.timeLimit;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) return 60;
        return Math.max(10, Math.round(parsed));
    }

    loadNestingResultsCache = () => {
        try {
            const raw = sessionStorage.getItem(NESTING_RESULTS_CACHE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    saveNestingResultsCache = (cache) => {
        try {
            sessionStorage.setItem(NESTING_RESULTS_CACHE_KEY, JSON.stringify(cache || {}));
        } catch {
            // ignore storage errors
        }
    }

    hashNestingSignature = (value) => {
        const input = String(value || '');
        let hash = 5381;
        for (let i = 0; i < input.length; i += 1) {
            hash = ((hash << 5) + hash) + input.charCodeAt(i);
            hash |= 0;
        }
        return `nest-${Math.abs(hash)}`;
    }

    buildNestingRequestSignature = (payload) => {
        const normalized = {
            orderId: String(payload?.orderId || ''),
            orderIds: Array.isArray(payload?.orderIds)
                ? payload.orderIds.map((value) => String(value || ''))
                : [],
            path: String(payload?.path || ''),
            exportPath: String(payload?.exportPath || ''),
            export: !!payload?.export,
            items: Array.isArray(payload?.items)
                ? payload.items.map((item) => ({
                    id: String(item?.id || ''),
                    orderId: String(item?.orderId || item?.order_id || ''),
                    productId: String(item?.productId || item?.product_id || ''),
                    sketchAttached: !!item?.sketchAttached,
                    qty: Number(item?.qty) || 0,
                    width: Number(item?.width) || 0,
                    height: Number(item?.height) || 0
                }))
                : [],
            sheets: Array.isArray(payload?.sheets)
                ? payload.sheets.map((sheet) => ({
                    id: String(sheet?.id || ''),
                    height: Number(sheet?.height) || 0,
                    widthMode: String(sheet?.widthMode || ''),
                    width: sheet?.width == null ? null : (Number(sheet.width) || 0),
                    material: String(sheet?.material || '')
                }))
                : [],
            settings: {
                multiSheetStrategy: String(payload?.settings?.multiSheetStrategy || ''),
                timeLimit: Number(payload?.settings?.timeLimit) || 0,
                preferredAlignment: String(payload?.settings?.preferredAlignment || '')
            }
        };

        return JSON.stringify(normalized);
    }

    getCachedNestingJob = (signature) => {
        if (!signature) return null;
        const cache = this.loadNestingResultsCache();
        const cacheKey = this.hashNestingSignature(signature);
        const entry = cache?.[cacheKey];
        if (!entry || entry.signature !== signature || !entry.job) return null;
        return entry.job;
    }

    cacheNestingJobResult = (signature, job) => {
        if (!signature || !job || job.status !== 'completed') return;

        const cache = this.loadNestingResultsCache();
        const cacheKey = this.hashNestingSignature(signature);

        cache[cacheKey] = {
            signature,
            savedAt: Date.now(),
            job
        };

        const entries = Object.entries(cache).sort((a, b) => (b[1]?.savedAt || 0) - (a[1]?.savedAt || 0));
        const trimmed = Object.fromEntries(entries.slice(0, MAX_NESTING_RESULT_CACHE_ENTRIES));
        this.saveNestingResultsCache(trimmed);
    }

    // ─── State helpers ────────────────────────────────────────────────────────

    getNestingRequestState = () => {
        const height = Number(document.getElementById('nestingSheetHeight')?.value);
        const widthMode = document.getElementById('nestingWidthMode')?.value === 'fixed' ? 'fixed' : 'unlimited';
        const width = Number(document.getElementById('nestingSheetWidth')?.value);
        const exportEnabled = !!document.getElementById('nestingExportToggle')?.checked;
        const strategy = document.getElementById('nestingStrategy')?.value || 'auto';
        const timeLimit = this.getConfiguredTimeLimit();
        const alignment = document.getElementById('nestingAlignment')?.value || 'top';

        return {
            height,
            widthMode,
            width: widthMode === 'fixed' && Number.isFinite(width) && width > 0 ? width : null,
            exportEnabled,
            strategy,
            timeLimit,
            alignment
        };
    }

    syncNestingWidthMode = () => {
        const widthMode = document.getElementById('nestingWidthMode')?.value === 'fixed' ? 'fixed' : 'unlimited';
        const widthInput = document.getElementById('nestingSheetWidth');
        if (!widthInput) return;

        widthInput.disabled = widthMode !== 'fixed';
        if (widthMode !== 'fixed') widthInput.value = '';
    }

    getNestingStatusMeta = (job) => {
        switch (job?.status || 'idle') {
            case 'queued':    return { label: __html('Queued'),    badgeClass: 'item-status status-secondary' };
            case 'running':   return { label: __html('Running'),   badgeClass: 'item-status status-primary' };
            case 'exporting': return { label: __html('Exporting'), badgeClass: 'item-status status-warning' };
            case 'completed': return { label: __html('Completed'), badgeClass: 'item-status status-success' };
            case 'error':     return { label: __html('Error'),     badgeClass: 'item-status status-danger' };
            default:          return { label: __html('Ready'),     badgeClass: 'item-status status-secondary' };
        }
    }

    formatNestingMetric = (value, digits = 1, suffix = '') => {
        if (value == null || value === '') return '—';
        if (!Number.isFinite(Number(value))) return '—';
        return `${Number(value).toFixed(digits)}${suffix}`;
    }

    getItemSummary = () => ({
        count: this.items.length,
        totalQty: this.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
    })

    getActiveItems = () => this.items.filter(item => !this.disabledItems.has(String(item.id)))

    getOrderLabel = () => {
        if (!this.orderIds.length) return '';
        if (this.orderIds.length === 1) return `#${this.orderIds[0]}`;
        return this.orderIds.map((id) => `#${id}`).join(', ');
    }

    getNestingOrdersPath = () => {
        const basePath = trimTrailingSlashes(getSketchOrdersBasePath(this.settings));
        if (this.orderIds.length <= 1) {
            return `${basePath}/`;
        }

        const prefix = this.orderIds.slice(0, -1).join('/');
        return `${basePath}/${prefix}/`;
    }

    renderNestingItems = () => {
        const container = document.getElementById('nestingItemsList');
        if (!container) return;

        const unit = getDimUnit(this.settings);
        const activeCount = this.items.length - this.disabledItems.size;

        container.innerHTML = `
            <div class="nesting-items-header">
                <span>${__html('Items')}</span>
                <small class="text-muted">${activeCount} / ${this.items.length} ${__html('selected')}</small>
            </div>
            <div class="nesting-items-rows">
                ${this.items.map(item => {
                    const id = String(item.id ?? '');
                    const checked = !this.disabledItems.has(id);
                    const w = Number(item.formula_width_calc) || 0;
                    const h = Number(item.formula_length_calc) || 0;
                    const qty = Number(item.qty) || 1;
                    const name = item.title || item.name || item.sku || '';
                    const orderBadge = this.orderIds.length > 1 && item?.order_id
                        ? `<small class="text-muted">#${item.order_id}</small>`
                        : '';
                    return `
                        <label class="nesting-item-row${checked ? '' : ' is-disabled'}">
                            <input type="checkbox" class="nesting-item-check flex-shrink-0"
                                   data-item-id="${id}" ${checked ? 'checked' : ''}>
                            <span class="nesting-item-label">
                                ${name ? `${orderBadge ? `${orderBadge} · ` : ''}${name} <small class="text-muted">${id}</small>` : `${orderBadge ? `${orderBadge} · ` : ''}${id}`}
                            </span>
                            <span class="nesting-item-dims">${w} × ${h}${unit}</span>
                            <span class="nesting-item-qty">×${qty}</span>
                        </label>`;
                }).join('')}
            </div>
        `;
    }

    getDefaultMaxLength = () => {
        const maxLen = this.items.reduce((max, item) => {
            const len = Number(item.formula_length_calc) || 0;
            return len > max ? len : max;
        }, 0);
        return maxLen >= 3000 ? Math.ceil(maxLen * 1.0002) : 3000;
    }

    isItemFitError = (description) => {
        if (!description) return false;
        const d = String(description).toLowerCase();
        return d.includes('strip-width is running away')
            || d.includes('does not fit into the strip')
            || d.includes('does not seem to fit');
    }

    // ─── Payload ──────────────────────────────────────────────────────────────

    buildNestingPayload = () => {
        const activeItems = this.getActiveItems();
        if (!activeItems.length) throw new Error(__html('No items selected for nesting'));

        const requestState = this.getNestingRequestState();
        if (!Number.isFinite(requestState.height) || requestState.height <= 0) {
            throw new Error(__html('Sheet width is required'));
        }
        if (requestState.widthMode === 'fixed' && (!Number.isFinite(requestState.width) || requestState.width <= 0)) {
            throw new Error(__html('Max length is required in optimize up to mode'));
        }

        return {
            items: activeItems.map((item) => ({
                id: item.id,
                orderId: item.order_id,
                order_id: item.order_id,
                productId: item.product_id,
                product_id: item.product_id,
                title: item.title || '',
                sdesc: item.sdesc || '',
                sketchAttached: !!item.sketch_attached,
                sketch_attached: !!item.sketch_attached,
                inputFieldsValues: item.input_fields_values || {},
                input_fields_values: item.input_fields_values || {},
                sourcePath: `${trimTrailingSlashes(getSketchOrdersBasePath(this.settings))}/${String(item.order_id || '').trim()}/`,
                qty: Number(item.qty) || 1,
                width: Number(item.formula_width_calc) || 0,
                height: Number(item.formula_length_calc) || 0
            })),
            orderId: this.orderId,
            orderIds: [...this.orderIds],
            path: getSketchOrdersBasePath(this.settings),
            exportPath: this.getNestingOrdersPath(),
            export: requestState.exportEnabled,
            sheets: [{
                id: 'sheet-1',
                height: requestState.height,
                widthMode: requestState.widthMode,
                ...(requestState.widthMode === 'fixed' ? { width: requestState.width } : {}),
                material: this.material
            }],
            settings: {
                multiSheetStrategy: requestState.strategy,
                timeLimit: requestState.timeLimit,
                preferredAlignment: requestState.alignment
            }
        };
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    renderNestingSummary = (job = null) => {
        const container = document.getElementById('nestingSummary');
        if (!container) return;

        const live = job?.live || null;
        const preview = job?.preview || null;
        const summary = this.getItemSummary();

        const totalMeters = preview?.total_used_length != null
            ? preview.total_used_length / 1000
            : null;

        const utilizationPct = preview?.overall_density != null
            ? preview.overall_density * 100
            : live?.avg_utilization_pct ?? null;

        container.innerHTML = `
            <div class="nesting-summary-card">
                <span class="nesting-summary-label">${__html('Selected')}</span>
                <strong>${summary.count}</strong>
                <small>${__html('%1$ parts requested', summary.totalQty)}</small>
            </div>
            <div class="nesting-summary-card">
                <span class="nesting-summary-label">${__html('Sheets')}</span>
                <strong>${live?.sheet_count || 0}</strong>
                <small>${job ? (live?.is_preview ? __html('Live preview') : __html('Final result')) : __html('Waiting to start')}</small>
            </div>
            <div class="nesting-summary-card">
                <span class="nesting-summary-label">${__html('Utilization')}</span>
                <strong>${this.formatNestingMetric(utilizationPct, 1, '%')}</strong>
                <small>${__html('Average across sheets')}</small>
            </div>
            <div class="nesting-summary-card">
                <span class="nesting-summary-label">${__html('Meters')}</span>
                <strong>${this.formatNestingMetric(totalMeters, 2, ' m')}</strong>
                <small>${__html('Total consumed length')}</small>
            </div>
        `;
    }

    renderNestingSheetTabs = (job = null) => {
        const tabs = document.getElementById('nestingSheetTabs');
        const meta = document.getElementById('nestingSheetMeta');
        if (!tabs || !meta) return;

        const sheets = job?.live?.sheets || [];
        if (!sheets.length) {
            tabs.innerHTML = `<div class="nesting-empty-note">${__html('Waiting for the first sheet preview')}</div>`;
            meta.innerHTML = '';
            return;
        }

        if (this.nestingModalActiveSheetIndex >= sheets.length) {
            this.nestingModalActiveSheetIndex = sheets.length - 1;
        }

        tabs.innerHTML = sheets.map((sheet, index) => `
            <button type="button" class="nesting-sheet-tab ${index === this.nestingModalActiveSheetIndex ? 'is-active' : ''}" data-sheet-index="${index}">
                <span>${__html('Sheet %1$', index + 1)}</span>
                <small>${sheet.parts || 0} ${__html('parts')}</small>
            </button>
        `).join('');

        const activeSheet = sheets[this.nestingModalActiveSheetIndex];
        meta.innerHTML = activeSheet ? `
            <div><strong>${__html('Utilization')}:</strong> ${this.formatNestingMetric(activeSheet.utilization_pct, 1, '%')}</div>
            <div><strong>${__html('Width')}:</strong> ${this.formatNestingMetric(activeSheet.strip_width != null ? activeSheet.strip_width / 1000 : null, 2, ' m')}</div>
            <div><strong>${__html('Height')}:</strong> ${this.formatNestingMetric(activeSheet.sheet_height, 0, getDimUnit(this.settings))}</div>
        ` : '';
    }

    renderNestingPreview = async (job = null) => {
        if (!this.nestingVisualization) return;

        const sheets = job?.live?.sheets || [];
        const activeSheet = sheets[this.nestingModalActiveSheetIndex] || null;

        try {
            if (!activeSheet) {
                this.nestingVisualization.clear(
                    __html('Waiting for preview'),
                    job?.description || __html('Preview will appear once nesting starts')
                );
                return;
            }
            await this.nestingVisualization.renderSheet(activeSheet);
        } catch (error) {
            this.nestingVisualization.clear(
                __html('Preview unavailable'),
                error?.message || __html('Failed to render live nesting preview')
            );
        }
    }

    renderNestingJob = async (job = null) => {
        const badge = document.getElementById('nestingStatusBadge');
        const description = document.getElementById('nestingStatusText');
        const runButton = document.getElementById('startNestingBtn');
        if (!badge || !description || !runButton) return;

        const meta = this.getNestingStatusMeta(job);
        badge.className = meta.badgeClass;
        badge.textContent = meta.label;

        const live = job?.live || null;
        const preview = job?.preview || null;
        const statusMeters = preview?.total_used_length != null
            ? preview.total_used_length / 1000
            : null;
        const progressText = live?.sheet_count
            ? __html('Sheets: %1$ · Parts: %2$ · Length: %3$', live.sheet_count, live.total_parts || 0, this.formatNestingMetric(statusMeters, 2, ' m'))
            : '';
        description.textContent = job?.description
            ? `${job.description}${progressText ? ` · ${progressText}` : ''}`
            : (progressText || __html('Select settings and start nesting'));

        const isBusy = ['queued', 'running', 'exporting'].includes(job?.status);
        runButton.disabled = false;
        runButton.classList.add('nesting-action-btn');
        runButton.classList.toggle('btn-dark', !isBusy);
        runButton.classList.toggle('btn-danger', isBusy);
        runButton.innerHTML = isBusy
            ? `<i class="bi bi-stop-circle me-1"></i>${__html('Stop')}`
            : `<i class="bi bi-play-circle me-1"></i>${__html('Start')}`;

        const fitWarning = document.getElementById('nestingFitWarning');
        if (fitWarning) fitWarning.classList.toggle('d-none', !this.isItemFitError(job?.description));

        this.renderNestingSummary(job);
        this.renderNestingSheetTabs(job);
        await this.renderNestingPreview(job);
    }

    // ─── Polling ──────────────────────────────────────────────────────────────

    scheduleNestingPoll = (jobId, delay = 1000) => {
        clearTimeout(this.nestingPollTimer);
        this.nestingPollTimer = window.setTimeout(() => this.pollNestingJob(jobId), delay);
    }

    pollNestingJob = async (jobId) => {
        if (!jobId || jobId !== this.nestingJobId) return;
        try {
            const previousStatus = this.nestingJob?.status || null;
            const job = await getNestingJob(jobId, this.settings);
            // Discard result if a newer job has taken over while we were awaiting
            if (jobId !== this.nestingJobId) return;
            this.nestingJob = job;
            await this.renderNestingJob(job);

            if (job?.status === 'completed') {
                this.cacheNestingJobResult(this.nestingRequestSignature, job);
            }

            if (['queued', 'running', 'exporting'].includes(job?.status)) {
                this.scheduleNestingPoll(jobId, 1000);
                return;
            }
            if (job?.status === 'error' && previousStatus !== 'error') {
                toast(job?.description || __html('Nesting failed'));
            }
        } catch (error) {
            toast(error?.message || __html('Failed to poll nesting job'));
        }
    }

    stopNestingPreview = async ({ showErrorToast = true } = {}) => {
        const activeJobId = this.nestingJobId;
        const activeStatus = this.nestingJob?.status;
        if (!activeJobId || !['queued', 'running', 'exporting'].includes(activeStatus)) {
            return false;
        }

        this.nestingJobId = null;
        this.nestingJob = null;
        this.nestingModalActiveSheetIndex = 0;
        clearTimeout(this.nestingPollTimer);
        await this.renderNestingJob(null);

        try {
            await stopNestingJob(activeJobId, this.settings);
        } catch (error) {
            if (showErrorToast) {
                toast(error?.message || __html('Failed to stop nesting'));
            }
        }

        return true;
    }

    // ─── Start ────────────────────────────────────────────────────────────────

    startNestingPreview = async ({ preferCache = false } = {}) => {
        document.getElementById('nestingBusyWarning')?.classList.add('d-none');

        if (await this.stopNestingPreview()) {
            return;
        }

        try {
            const payload = this.buildNestingPayload();
            const signature = this.buildNestingRequestSignature(payload);
            this.nestingRequestSignature = signature;

            if (preferCache) {
                const cachedJob = this.getCachedNestingJob(signature);
                if (cachedJob?.status === 'completed') {
                    this.nestingJobId = cachedJob.id || null;
                    this.nestingJob = {
                        ...cachedJob,
                        description: cachedJob.description || __html('Using saved preview')
                    };
                    this.nestingModalActiveSheetIndex = 0;
                    await this.renderNestingJob(this.nestingJob);
                    return;
                }
            }

            const response = await createNestingJob(payload, this.settings);
            this.nestingJobId = response.jobId;
            this.nestingJob = {
                id: response.jobId,
                status: response.status,
                description: response.description || (response.status === 'queued'
                    ? __html('Nesting task queued. It will begin shortly after other jobs are finalized.')
                    : __html('Job accepted')),
                live: { is_preview: true, sheet_count: 0, total_parts: 0, total_meters: 0, sheets: [] }
            };
            this.nestingModalActiveSheetIndex = 0;
            await this.renderNestingJob(this.nestingJob);
            this.scheduleNestingPoll(response.jobId, 100);
        } catch (error) {
            const msg = error?.message || '';
            if (/already running/i.test(msg)) {
                document.getElementById('nestingBusyWarning')?.classList.remove('d-none');
            } else {
                toast(msg || __html('Failed to start nesting'));
            }
        }
    }

    // ─── Open ─────────────────────────────────────────────────────────────────

    open = () => {
        if (!this.items.length) {
            toast(__html('No items to nest'));
            return;
        }

        this.nestingModalActiveSheetIndex = 0;

        const prefs = this.loadNestingPrefs();
        const sheetHeight = (prefs.height && Number.isFinite(prefs.height) && prefs.height > 0)
            ? prefs.height
            : this.defaultSheetHeight;

        this.modal = document.querySelector('.modal');
        this.modal_cont = new bootstrap.Modal(this.modal);

        this.modal.classList.remove('writeoff');
        this.modal.classList.add('nesting-preview-modal');
        this.modal.querySelector('.modal-dialog').classList.remove('modal-fullscreen');
        this.modal.querySelector('.modal-dialog').classList.add('modal-xl');
        this.modal.querySelector('.modal-content').innerHTML = `
            <div class="modal-header bg-light border-0">
                <h5 class="modal-title">
                    <i class="bi bi-bounding-box me-2"></i>
                    ${__html('Nesting Preview')}
                    ${this.getOrderLabel() ? `<small class="text-muted ms-2">${this.getOrderLabel()}</small>` : ''}
                    <span class="item-status status-secondary ms-2" id="nestingStatusBadge">${__html('Ready')}</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="nesting-modal-grid">
                    <div class="nesting-toolbar">
                        <div class="nesting-field">
                            <label for="nestingSheetHeight">${__html('Sheet width')}</label>
                            <input id="nestingSheetHeight" type="number" class="form-control border-0" value="${sheetHeight}" min="1">
                        </div>
                        <div class="nesting-field">
                            <label for="nestingWidthMode">${__html('Length mode')}</label>
                            <select id="nestingWidthMode" class="form-select border-0">
                                <option value="unlimited">${__html('Unlimited')}</option>
                                <option value="fixed">${__html('Optimize up to')}</option>
                            </select>
                        </div>
                        <div class="nesting-field">
                            <label for="nestingSheetWidth">${__html('Max length')}</label>
                            <input id="nestingSheetWidth" type="number" class="form-control border-0" min="1" placeholder="${__html('Optional')}">
                        </div>
                        <div class="nesting-field">
                            <label for="nestingAlignment">${__html('Alignment')}</label>
                            <select id="nestingAlignment" class="form-select border-0">
                                <option value="top">${__html('Top')}</option>
                                <option value="top-left">${__html('Top Left')}</option>
                                <option value="top-right">${__html('Top Right')}</option>
                                <option value="bottom">${__html('Bottom')}</option>
                                <option value="bottom-left">${__html('Bottom Left')}</option>
                                <option value="bottom-right">${__html('Bottom Right')}</option>
                            </select>
                        </div>
                        <select id="nestingStrategy" class="d-none"><option value="auto" selected></option></select>
                    </div>
                    <div class="nesting-summary" id="nestingSummary"></div>
                    <div id="nestingFitWarning" class="d-none nesting-fit-warning">
                        <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                        <span>${__html('One or more items do not fit into the sheet width. Try increasing the sheet width.')}</span>
                    </div>
                    <div id="nestingBusyWarning" class="d-none nesting-fit-warning">
                        <i class="bi bi-hourglass-split flex-shrink-0"></i>
                        <span>${__html('Nesting task queued. It will begin shortly after other jobs are finalized.')}</span>
                    </div>
                    <div class="nesting-preview-layout">
                        <aside class="nesting-sidebar">
                            <div class="nesting-sheet-tabs" id="nestingSheetTabs"></div>
                            <div class="nesting-sheet-meta" id="nestingSheetMeta"></div>
                        </aside>
                        <section class="nesting-preview-panel">
                            <div class="nesting-preview-canvas-wrap">
                                <canvas id="nestingPreviewCanvas"></canvas>
                            </div>
                        </section>
                    </div>
                    <div class="nesting-items-list" id="nestingItemsList"></div>
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <label class="nesting-export-toggle me-2">
                    <input id="nestingExportToggle" type="checkbox">
                    <span>${__html('Export files')}</span>
                </label>
                <span class="nesting-status-text text-muted me-auto" id="nestingStatusText">${__html('Select settings and start nesting')}</span>
                <button type="button" class="btn btn-dark btn-modal nesting-action-btn" id="startNestingBtn">
                    <i class="bi bi-play-circle me-1"></i>${__html('Start')}
                </button>
                <button type="button" class="btn btn-outline-dark btn-modal" data-bs-dismiss="modal">
                    ${__html('Close')}
                </button>
            </div>
        `;

        // Restore persisted preferences
        const widthModeEl = document.getElementById('nestingWidthMode');
        if (widthModeEl && prefs.widthMode) widthModeEl.value = prefs.widthMode;
        const widthInputEl = document.getElementById('nestingSheetWidth');
        if (widthInputEl) widthInputEl.value = this.getDefaultMaxLength();
        const exportEl = document.getElementById('nestingExportToggle');
        if (exportEl) exportEl.checked = !!prefs.exportEnabled;
        const alignmentEl = document.getElementById('nestingAlignment');
        if (alignmentEl && prefs.alignment) alignmentEl.value = prefs.alignment;

        this.modal_cont.show();
        this.nestingVisualization = new NestingVisualization(document.getElementById('nestingPreviewCanvas'));
        this.syncNestingWidthMode();
        this.renderNestingSummary(null);
        this.renderNestingSheetTabs(null);
        this.renderNestingPreview(null);
        this.renderNestingItems();

        if (this.nestingJobId && ['queued', 'running', 'exporting', 'completed'].includes(this.nestingJob?.status)) {
            this.renderNestingJob(this.nestingJob);
            if (['queued', 'running', 'exporting'].includes(this.nestingJob?.status)) {
                this.scheduleNestingPoll(this.nestingJobId, 100);
            }
        }

        document.getElementById('nestingWidthMode')?.addEventListener('change', this.syncNestingWidthMode);
        document.getElementById('startNestingBtn')?.addEventListener('click', () => this.startNestingPreview());
        ['nestingSheetHeight', 'nestingWidthMode', 'nestingSheetWidth', 'nestingExportToggle', 'nestingAlignment'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', this.saveNestingPrefs);
        });
        document.getElementById('nestingSheetTabs')?.addEventListener('click', async (event) => {
            const tab = event.target.closest('[data-sheet-index]');
            if (!tab) return;
            this.nestingModalActiveSheetIndex = Number(tab.dataset.sheetIndex) || 0;
            this.renderNestingSheetTabs(this.nestingJob);
            await this.renderNestingPreview(this.nestingJob);
        });
        document.getElementById('nestingItemsList')?.addEventListener('change', async (e) => {
            const checkbox = e.target.closest('.nesting-item-check');
            if (!checkbox) return;
            const itemId = checkbox.dataset.itemId;
            checkbox.checked ? this.disabledItems.delete(itemId) : this.disabledItems.add(itemId);
            this.renderNestingItems();
            await this.stopNestingPreview({ showErrorToast: false });
            void this.startNestingPreview();
        });

        this.modal.addEventListener('hidden.bs.modal', () => {
            clearTimeout(this.nestingPollTimer);
        }, { once: true });

        void this.startNestingPreview({ preferCache: true });
    }
}
