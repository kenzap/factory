import { createNestingJob, exportNestingJob, getNestingApiBaseUrl, getNestingJob, getSketchOrdersBasePath, stopNestingJob } from '../../api/nesting_api.js';
import { execWriteoffAction } from '../../api/exec_writeoff_action.js';
import { __html, getDimUnit, H, toast } from '../../helpers/global.js';
import { NestingVisualization } from './cutting-visualization-nesting.js';

const NESTING_PREFS_KEY = 'nesting_prefs';
const NESTING_RESULTS_CACHE_KEY = 'nesting_results_cache';
const MAX_NESTING_RESULT_CACHE_ENTRIES = 12;
const trimTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '');

const deriveFusionFilePrefix = (itemId, orderId = '') => {
    const rawId = String(itemId || '').trim();
    if (!rawId) return '';

    const normalizedOrderId = String(orderId || '').trim();
    let normalizedId = rawId;

    if (normalizedOrderId && normalizedId.startsWith(`${normalizedOrderId}-`)) {
        normalizedId = normalizedId.slice(normalizedOrderId.length + 1).trim();
    } else {
        normalizedId = normalizedId.replace(/^\d+-/, '').trim() || normalizedId;
    }

    if (!normalizedId) return '';
    return normalizedId.length > 3 ? normalizedId.slice(-3) : normalizedId;
};

const deriveDisplayItemSuffix = (itemId, orderId = '') => {
    const rawId = String(itemId || '').trim();
    if (!rawId) return '';

    const normalizedOrderId = String(orderId || '').trim();
    let normalizedId = rawId;

    if (normalizedOrderId && normalizedId.startsWith(`${normalizedOrderId}-`)) {
        normalizedId = normalizedId.slice(normalizedOrderId.length + 1).trim();
    }

    if (!normalizedId) return '';
    return normalizedId.length > 3 ? normalizedId.slice(-3) : normalizedId;
};

const hasUsableInputValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export class NestingModal {

    constructor({
        items = [],
        orderId = '',
        orderIds = [],
        settings = {},
        defaultSheetHeight = 1250,
        material = '',
        coil = null,
        user = {},
        users = [],
        cb = null,
        mode = 'nesting'
    } = {}) {
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
        this.mode = mode === 'writeoff' ? 'writeoff' : 'nesting';
        this.coil = coil || { _id: '', id: 0, supplier: '', thickness: 0, width: defaultSheetHeight || 1250, length: 1000000, color: '-', coating: '-' };
        this.user = user || {};
        this.users = Array.isArray(users) ? users : [];
        this.cb = typeof cb === 'function' ? cb : (() => { });

        this.nestingJobId = null;
        this.nestingJob = null;
        this.nestingPollTimer = null;
        this.nestingModalActiveSheetIndex = 0;
        this.nestingVisualization = null;
        this.modal = null;
        this.modal_cont = null;
        this.nestingRequestSignature = '';
        this.disabledItems = new Set();
        this.resketchQueueing = false;
        this.selectedUserIds = new Set();
        this.sheets = [];

        this.initializeSelectedUsers();

        this.open();
    }

    initializeSelectedUsers = () => {
        const currentUserId = this.user?.id || this.user?._id || '';
        const validIds = new Set((this.users || []).map((user) => user._id));

        this.selectedUserIds = new Set(
            Array.from(this.selectedUserIds).filter((userId) => validIds.has(userId))
        );

        if (!this.selectedUserIds.size && currentUserId && validIds.has(currentUserId)) {
            this.selectedUserIds.add(currentUserId);
        }

        if (!this.selectedUserIds.size && this.users?.length) {
            this.selectedUserIds.add(this.users[0]._id);
        }
    }

    getSelectedUserIds = () => {
        if (!this.selectedUserIds.size) {
            const fallbackId = this.user?.id || this.user?._id;
            return fallbackId ? [fallbackId] : [];
        }

        return Array.from(this.selectedUserIds);
    }

    renderCoworkerChips = () => {
        const container = document.getElementById('cuttingCoworkerChips');
        const summary = document.getElementById('cuttingCoworkerSummary');
        if (!container || !summary) return;

        if (!this.users?.length) {
            container.innerHTML = '';
            summary.textContent = '';
            return;
        }

        const currentUserId = this.user?.id || this.user?._id || '';

        container.innerHTML = this.users.map((user) => {
            const userId = user._id;
            const isSelected = this.selectedUserIds.has(userId);
            const isCurrentUser = userId === currentUserId;
            const shortName = `${user.fname || ''} ${user?.lname?.charAt(0) || ''}`.trim();

            return `
                <button
                    type="button"
                    class="coworker-chip ${isSelected ? 'is-selected' : ''}"
                    data-user-id="${userId}"
                    aria-pressed="${isSelected ? 'true' : 'false'}"
                    title="${escapeHtml(shortName)}"
                >
                    <span>${escapeHtml(shortName || __html('Employee'))}</span>
                    ${isCurrentUser ? `<small>${escapeHtml(__html('You'))}</small>` : ''}
                </button>
            `;
        }).join('');

        container.querySelectorAll('.coworker-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const userId = chip.dataset.userId;
                if (!userId) return;

                if (this.selectedUserIds.has(userId)) {
                    if (this.selectedUserIds.size === 1) {
                        toast(__html('Select at least one employee'));
                        return;
                    }
                    this.selectedUserIds.delete(userId);
                } else {
                    this.selectedUserIds.add(userId);
                }

                this.renderCoworkerChips();
            });
        });

        const selectedCount = this.selectedUserIds.size;
        summary.textContent = selectedCount > 1
            ? __html('Selected people: %1$s. One record will be created for each person.', selectedCount)
            : __html('Selected person: 1.');
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
                rotation: s.rotation || null
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
            items: Array.isArray(payload?.items)
                ? payload.items.map((item) => ({
                    id: String(item?.id || ''),
                    filePrefix: String(item?.filePrefix || item?.file_prefix || ''),
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
                preferredAlignment: String(payload?.settings?.preferredAlignment || ''),
                rotationStep: String(payload?.settings?.rotationStep || ''),
                joinConnectedLinework: !!payload?.settings?.joinConnectedLinework,
                engravingStyle: String(payload?.settings?.engravingStyle || '')
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
        const strategy = document.getElementById('nestingStrategy')?.value || 'auto';
        const timeLimit = this.getConfiguredTimeLimit();
        const rotation = document.getElementById('nestingRotation')?.value || '90';

        return {
            height,
            widthMode,
            width: widthMode === 'fixed' && Number.isFinite(width) && width > 0 ? width : null,
            strategy,
            timeLimit,
            rotation
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
        const waitingInQueue = this.isWaitingInQueue(job);
        switch (job?.status || 'idle') {
            case 'queued':    return waitingInQueue
                ? { label: __html('Queued'), badgeClass: 'item-status status-warning' }
                : { label: __html('Running'), badgeClass: 'item-status status-primary' };
            case 'running':   return { label: __html('Running'),   badgeClass: 'item-status status-primary' };
            case 'exporting': return { label: __html('Exporting'), badgeClass: 'item-status status-warning' };
            case 'completed': return { label: __html('Completed'), badgeClass: 'item-status status-success' };
            case 'error':     return { label: __html('Error'),     badgeClass: 'item-status status-danger' };
            default:          return { label: __html('Ready'),     badgeClass: 'item-status status-secondary' };
        }
    }

    getQueuedDescription = () => __html('Nesting task queued. It will begin shortly after other jobs are finalized.');

    isWaitingInQueue = (job) => {
        if (job?.status !== 'queued') return false;
        const description = String(job?.description || '').trim();
        return description === this.getQueuedDescription();
    }

    formatNestingMetric = (value, digits = 1, suffix = '') => {
        if (value == null || value === '') return '—';
        if (!Number.isFinite(Number(value))) return '—';
        return `${Number(value).toFixed(digits)}${suffix}`;
    }

    formatCompletedSheetDimensions = (sheet = {}, job = null) => {
        if (job?.status !== 'completed' || job?.live?.is_preview) return '';

        const sheetWidth = Number(sheet?.sheet_height);
        const optimizedLength = Number(sheet?.strip_width);
        if (!Number.isFinite(sheetWidth) || sheetWidth <= 0 || !Number.isFinite(optimizedLength) || optimizedLength <= 0) {
            return '';
        }

        return `${Math.round(sheetWidth)} × ${Math.round(optimizedLength)}${getDimUnit(this.settings)}`;
    }

    getPrintableSheets = (job = null) => {
        if (job?.status !== 'completed') return [];
        return Array.isArray(job?.live?.sheets) ? job.live.sheets : [];
    }

    getTotalWriteoffLength = () => this.sheets.reduce((sum, sheet) => sum + (Number(sheet?.length) || 0), 0)

    syncWriteoffSheetsFromJob = (job = null) => {
        if (this.mode !== 'writeoff') return;

        const printableSheets = this.getPrintableSheets(job);
        const existingById = new Map(this.sheets.map((sheet) => [String(sheet?.id || ''), sheet]));

        this.sheets = printableSheets.map((sheet, index) => {
            const id = String(sheet?.id || `sheet-${index + 1}`);
            const previous = existingById.get(id);
            const width = Number(sheet?.sheet_height) || Number(this.coil?.width) || Number(this.defaultSheetHeight) || 0;
            const length = Number(sheet?.strip_width) || 0;

            return {
                id,
                group: id,
                width: Math.round(width),
                length: Math.round(length),
                qty: 1,
                price: Number(this.coil?.price) || 0,
                type: previous?.type || 'order',
                notes: previous?.notes || '',
                parts: Number(sheet?.parts) || 0,
                material: String(sheet?.material || this.material || '').trim()
            };
        });

        this.renderWriteoffSheets();
    }

    renderWriteoffSheets = () => {
        const container = document.getElementById('cutDistributionChart');
        const totalLengthEl = document.getElementById('cuttingTotalTakenLength');
        if (!container) return;

        if (!this.sheets.length) {
            container.innerHTML = `<div class="text-muted small">${escapeHtml(__html('Write-off sheets will appear after nesting completes'))}</div>`;
            if (totalLengthEl) {
                totalLengthEl.textContent = __html('Total: %1$ %2$', 0, getDimUnit(this.settings));
            }
            return;
        }

        container.innerHTML = this.sheets.map((sheet, index) => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div class="d-flex align-items-center flex-wrap">
                    <span class="me-2">${index + 1}</span>
                    <span class="me-2">${Number(sheet.width).toLocaleString()}</span>
                    ×
                    <span class="mx-2">${Number(sheet.length).toLocaleString()}</span>
                    <span class="me-3">${getDimUnit(this.settings)}</span>
                    <span class="text-muted small me-3">${escapeHtml(__html('%1$ parts', Number(sheet.parts) || 0))}</span>
                    <div class="d-flex me-2">
                        <div class="form-check form-check-inline cbo mb-0">
                            <input class="form-check-input" type="radio" name="type_${index}" id="order_${index}" value="order" ${sheet.type === 'order' ? 'checked' : ''} data-sheet-id="${escapeHtml(sheet.id)}" data-field="type">
                            <label class="form-check-label form-text mt-0" for="order_${index}">${__html('Order')}</label>
                        </div>
                        <div class="form-check form-check-inline cbs mb-0">
                            <input class="form-check-input" type="radio" name="type_${index}" id="stock_${index}" value="stock" ${sheet.type === 'stock' ? 'checked' : ''} data-sheet-id="${escapeHtml(sheet.id)}" data-field="type">
                            <label class="form-check-label form-text mt-0" for="stock_${index}">${__html('Stock')}</label>
                        </div>
                        <div class="form-check form-check-inline cbw mb-0">
                            <input class="form-check-input" type="radio" name="type_${index}" id="waste_${index}" value="waste" ${sheet.type === 'waste' ? 'checked' : ''} data-sheet-id="${escapeHtml(sheet.id)}" data-field="type">
                            <label class="form-check-label form-text mt-0" for="waste_${index}">${__html('Waste')}</label>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('input[data-field="type"]').forEach((input) => {
            input.addEventListener('change', (e) => {
                const sheetId = String(e.target.getAttribute('data-sheet-id') || '');
                const sheet = this.sheets.find((entry) => String(entry?.id || '') === sheetId);
                if (!sheet) return;
                sheet.type = e.target.value;
            });
        });

        if (totalLengthEl) {
            totalLengthEl.textContent = __html(
                'Total: %1$ %2$ (%3$ sheets)',
                this.getTotalWriteoffLength().toLocaleString('en-US', { maximumFractionDigits: 0 }),
                getDimUnit(this.settings),
                this.sheets.length
            );
        }
    }

    buildNestingPrintReportHtml = (job = null) => {
        const sheets = this.getPrintableSheets(job);
        if (!sheets.length) return '';

        const unit = String(getDimUnit(this.settings) || '').trim() || 'mm';
        const summary = {
            sheetCount: Number(job?.live?.sheet_count) || sheets.length,
            totalParts: Number(job?.live?.total_parts) || 0,
            totalMeters: Number(job?.live?.total_meters) || 0,
            avgUtilization: Number(job?.live?.avg_utilization_pct) || 0,
        };

        const rows = sheets.map((sheet, index) => {
            const sheetWidth = Number(sheet?.sheet_height);
            const optimizedLength = Number(sheet?.strip_width);
            const material = String(sheet?.material || this.material || '').trim() || '—';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${Number.isFinite(sheetWidth) && sheetWidth > 0 ? Math.round(sheetWidth) : '—'}</td>
                    <td>${Number.isFinite(optimizedLength) && optimizedLength > 0 ? Math.round(optimizedLength) : '—'}</td>
                    <td>${Number(sheet?.parts) || 0}</td>
                    <td>${escapeHtml(material)}</td>
                </tr>
            `;
        }).join('');

        return `
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <title>${escapeHtml(__html('Nesting Sheet Report'))}</title>
                    <style>
                        body {
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                            color: #212529;
                            margin: 24px;
                        }
                        h1 {
                            font-size: 24px;
                            margin: 0 0 8px;
                        }
                        .meta,
                        .summary {
                            display: grid;
                            gap: 6px;
                            margin-bottom: 18px;
                            font-size: 13px;
                            color: #526170;
                        }
                        .summary {
                            grid-template-columns: repeat(4, minmax(0, 1fr));
                            gap: 12px;
                            color: #212529;
                        }
                        .summary-card {
                            border: 1px solid #dfe6ee;
                            border-radius: 10px;
                            padding: 12px 14px;
                        }
                        .summary-card strong {
                            display: block;
                            font-size: 20px;
                            line-height: 1.2;
                        }
                        .summary-card span {
                            font-size: 12px;
                            color: #6c757d;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 13px;
                        }
                        th, td {
                            border: 1px solid #dfe6ee;
                            padding: 8px 10px;
                            text-align: left;
                            vertical-align: top;
                        }
                        th {
                            background: #f8f9fa;
                            font-weight: 600;
                        }
                        tbody tr:nth-child(even) {
                            background: #fbfcfd;
                        }
                        @media print {
                            body {
                                margin: 12mm;
                            }
                        }
                    </style>
                    <script>
                        window.addEventListener('load', () => {
                            window.setTimeout(() => {
                                window.focus();
                                window.print();
                            }, 200);
                        });
                    </script>
                </head>
                <body>
                    <h1>${escapeHtml(__html('Nesting Sheet Report'))}</h1>
                    <div class="meta">
                        <div><strong>${escapeHtml(__html('Orders'))}:</strong> ${escapeHtml(this.getOrderLabel() || '—')}</div>
                        <div><strong>${escapeHtml(__html('Date'))}:</strong> ${escapeHtml(new Date().toLocaleString())}</div>
                    </div>
                    <div class="summary">
                        <div class="summary-card">
                            <strong>${summary.sheetCount}</strong>
                            <span>${escapeHtml(__html('Sheets'))}</span>
                        </div>
                        <div class="summary-card">
                            <strong>${summary.totalParts}</strong>
                            <span>${escapeHtml(__html('Parts'))}</span>
                        </div>
                        <div class="summary-card">
                            <strong>${escapeHtml(this.formatNestingMetric(summary.avgUtilization, 1, '%'))}</strong>
                            <span>${escapeHtml(__html('Average utilization'))}</span>
                        </div>
                        <div class="summary-card">
                            <strong>${escapeHtml(this.formatNestingMetric(summary.totalMeters, 3, ' m'))}</strong>
                            <span>${escapeHtml(__html('Total length'))}</span>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${escapeHtml(__html('Sheet'))}</th>
                                <th>${escapeHtml(__html('Sheet width'))} (${escapeHtml(unit)})</th>
                                <th>${escapeHtml(__html('Sheet length'))} (${escapeHtml(unit)})</th>
                                <th>${escapeHtml(__html('Parts'))}</th>
                                <th>${escapeHtml(__html('Material'))}</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;
    }

    printNestingReport = () => {
        const job = this.nestingJob;
        const html = this.buildNestingPrintReportHtml(job);
        if (!html) {
            toast(__html('Nesting must be completed before printing'));
            return;
        }

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const printUrl = URL.createObjectURL(blob);
        const printWindow = window.open(printUrl, '_blank', 'width=1100,height=850');
        if (!printWindow) {
            URL.revokeObjectURL(printUrl);
            toast(__html('Unable to open print preview'));
            return;
        }
        window.setTimeout(() => {
            URL.revokeObjectURL(printUrl);
        }, 60000);
    }

    confirmWriteoff = (button) => {
        if (this.mode !== 'writeoff') return;

        if (this.nestingJob?.status !== 'completed' || !this.sheets.length) {
            toast(__html('Nesting must be completed before confirming'));
            return;
        }

        const sheetsWithoutType = this.sheets.filter((sheet) => !sheet.type);
        if (sheetsWithoutType.length > 0) {
            toast(__html('Please select a type (Order/Stock/Waste) for all sheets'));
            return;
        }

        const totalLength = this.getTotalWriteoffLength();
        if (this.coil?._id && totalLength > Number(this.coil?.length || 0)) {
            toast(__html(
                'Total write-off length (%1$ %2$) exceeds coil length (%3$ %4$)',
                totalLength,
                getDimUnit(this.settings),
                this.coil.length,
                getDimUnit(this.settings)
            ));
            return;
        }

        const orderIds = [...new Set(this.items.map((item) => item.order_id).filter(Boolean))];
        const record = {
            title: this.items.length > 0
                ? __html('Write-off for %1$ items from orders %2$', this.items.length, orderIds.map((id) => `#${id}`).join(', '))
                : __html('Write-off from %1$ %2$ × %3$ %4$', this.coil.supplier, this.coil.width, this.coil.length, getDimUnit(this.settings)),
            qty: totalLength,
            product_id: '',
            product_name: '',
            color: this.coil.color,
            coating: this.coil.coating,
            supplier: this.coil.supplier,
            thickness: this.coil.thickness,
            parameters: this.coil.parameters,
            coil_id: this.coil._id,
            origin: 'c',
            time: 0,
            type: 'cutting',
            sheets: this.sheets,
            user_id: this.user?.id || this.user?._id || '',
            employee_ids: this.getSelectedUserIds(),
            order_ids: orderIds,
            items: this.items
        };

        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
        }

        execWriteoffAction(record, (response) => {
            if (button) {
                button.disabled = false;
                button.innerHTML = `<i class="bi bi-check-circle me-1"></i>${__html('Confirm')}`;
            }

            if (!response?.success) {
                toast(__html('Error: %1$', response?.error || __html('Unknown error')));
                return;
            }

            toast(__html('Changes applied'));
            this.modal_cont?.hide();
            this.cb(response);
        });
    }

    getItemSummary = () => ({
        count: this.items.length,
        totalQty: this.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
    })

    getActiveItems = () => this.items.filter(item => !this.disabledItems.has(String(item.id)))

    getResketchableItems = () => this.items.filter((item) => !!item?.sketch_attached)

    getOrderLabel = () => {
        if (!this.orderIds.length) return '';
        if (this.orderIds.length === 1) return `#${this.orderIds[0]}`;
        return this.orderIds.map((id) => `#${id}`).join(', ');
    }

    getItemInputSummary = (item = {}) => {
        const inputValues = item?.input_fields_values && typeof item.input_fields_values === 'object' && !Array.isArray(item.input_fields_values)
            ? item.input_fields_values
            : {};
        const fieldSchema = Array.isArray(item?.input_fields) ? item.input_fields : [];
        const summaryParts = [];
        const seen = new Set();

        fieldSchema.forEach((field) => {
            const id = String(field?.id || '').trim();
            const label = String(field?.label || '').trim();
            const candidateValue = [
                id ? inputValues[id] : undefined,
                id ? inputValues[`input${id}`] : undefined,
                label ? inputValues[label] : undefined,
                label ? inputValues[`input${label}`] : undefined,
            ].find(hasUsableInputValue);

            if (!hasUsableInputValue(candidateValue) || !label || seen.has(label)) return;
            seen.add(label);
            summaryParts.push(`${label}: ${candidateValue}`);
        });

        Object.entries(inputValues).forEach(([rawKey, rawValue]) => {
            if (!hasUsableInputValue(rawValue)) return;

            const normalizedKey = String(rawKey || '').trim();
            if (!normalizedKey) return;

            const fallbackLabel = normalizedKey.startsWith('input')
                ? normalizedKey.slice(5)
                : normalizedKey;
            const label = String(fallbackLabel || '').trim();
            if (!label || seen.has(label)) return;

            seen.add(label);
            summaryParts.push(`${label}: ${rawValue}`);
        });

        return summaryParts.join(' · ');
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
        const resketchableCount = this.getResketchableItems().length;
        const resketchDisabled = resketchableCount === 0 || this.resketchQueueing;

        container.innerHTML = `
            <div class="nesting-items-header">
                <div class="nesting-items-header-main">
                    <span>${__html('Items')}</span>
                    <small class="text-muted">${activeCount} / ${this.items.length} ${__html('selected')}</small>
                </div>
                <div class="nesting-items-actions">
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="nestingResketchBtn" ${resketchDisabled ? 'disabled' : ''}>
                        ${this.resketchQueueing
                            ? `<span class="spinner-border spinner-border-sm me-1" role="status"></span>${__html('Queueing')}`
                            : `<i class="bi bi-arrow-repeat me-1"></i>${__html('Resketch all')}`}
                    </button>
                </div>
            </div>
            <div class="nesting-items-rows">
                ${this.items.map(item => {
                    const id = String(item.id ?? '');
                    const checked = !this.disabledItems.has(id);
                    const w = Number(item.formula_width_calc) || 0;
                    const h = Number(item.formula_length_calc) || 0;
                    const qty = Number(item.qty) || 1;
                    const name = item.title || item.name || item.sku || '';
                    const inputSummary = this.getItemInputSummary(item);
                    const itemOrderId = String(item?.order_id || this.orderId || '').trim();
                    const itemSuffix = deriveDisplayItemSuffix(id, itemOrderId);
                    const compactMeta = [itemOrderId, itemSuffix].filter(Boolean);
                    return `
                        <label class="nesting-item-row${checked ? '' : ' is-disabled'}">
                            <input type="checkbox" class="nesting-item-check flex-shrink-0"
                                   data-item-id="${id}" ${checked ? 'checked' : ''}>
                            <span class="nesting-item-label">
                                <span class="nesting-item-title">
                                    ${name || id}
                                    ${compactMeta.length ? `<small class="nesting-item-meta text-muted">${itemOrderId}${itemSuffix ? ` &middot; <b>${itemSuffix}</b>` : ''}</small>` : ''}
                                </span>
                                ${inputSummary ? `<small class="nesting-item-inputs text-muted">${inputSummary}</small>` : ''}
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

    isNoUsableItemsError = (description) => {
        if (!description) return false;
        return String(description).toLowerCase().includes('no usable items found for nesting');
    }

    toggleNestingStartWarning = (message = '') => {
        const warning = document.getElementById('nestingStartWarning');
        if (!warning) return;

        const hasMessage = !!String(message || '').trim();
        warning.classList.toggle('d-none', !hasMessage);

        const text = warning.querySelector('span');
        if (text && hasMessage) {
            text.textContent = String(message).trim();
        }
    }

    // ─── Payload ──────────────────────────────────────────────────────────────

    buildNestingPayload = () => {
        const activeItems = this.getActiveItems();
        if (!activeItems.length) throw new Error(__html('No items selected for nesting'));
        const baseSketchOrdersPath = trimTrailingSlashes(getSketchOrdersBasePath(this.settings));

        const requestState = this.getNestingRequestState();
        if (!Number.isFinite(requestState.height) || requestState.height <= 0) {
            throw new Error(__html('Sheet width is required'));
        }
        if (requestState.widthMode === 'fixed' && (!Number.isFinite(requestState.width) || requestState.width <= 0)) {
            throw new Error(__html('Max length is required in optimize up to mode'));
        }

        return {
            items: activeItems.map((item) => {
                const itemOrderId = item.order_id || this.orderId;
                const filePrefix = item.sketch_attached
                    ? deriveFusionFilePrefix(item.id, itemOrderId)
                    : '';

                return {
                    orderId: itemOrderId,
                    id: item.id,
                    ...(filePrefix ? { filePrefix, file_prefix: filePrefix } : {}),
                    order_id: itemOrderId,
                    productId: item.product_id,
                    product_id: item.product_id,
                    title: item.title || '',
                    sdesc: item.sdesc || '',
                    sketchAttached: !!item.sketch_attached,
                    sketch_attached: !!item.sketch_attached,
                    inputFieldsValues: item.input_fields_values || {},
                    input_fields_values: item.input_fields_values || {},
                    sourcePath: `${baseSketchOrdersPath}/${String(itemOrderId || '').trim()}/`,
                    qty: Number(item.qty) || 1,
                    width: Number(item.formula_width_calc) || 0,
                    height: Number(item.formula_length_calc) || 0
                };
            }),
            orderId: this.orderId,
            orderIds: [...this.orderIds],
            path: getSketchOrdersBasePath(this.settings),
            exportPath: this.getNestingOrdersPath(),
            export: false,
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
                preferredAlignment: 'bottom-left',
                rotationStep: requestState.rotation,
                joinConnectedLinework: true,
                engravingStyle: 'first-three-chars'
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

        tabs.innerHTML = sheets.map((sheet, index) => {
            const dimensions = this.formatCompletedSheetDimensions(sheet, job);
            return `
            <button type="button" class="nesting-sheet-tab ${index === this.nestingModalActiveSheetIndex ? 'is-active' : ''}" data-sheet-index="${index}">
                <span>${__html('Sheet %1$', index + 1)}</span>
                <small>${sheet.parts || 0} ${__html('parts')}</small>
                ${dimensions ? `<small>${dimensions}</small>` : ''}
            </button>
        `;
        }).join('');

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
        const exportButton = document.getElementById('exportNestingBtn');
        const printButton = document.getElementById('printNestingBtn');
        const confirmButton = document.getElementById('confirmNestingWriteoffBtn');
        const busyWarning = document.getElementById('nestingBusyWarning');
        if (!badge || !description || !runButton) return;

        const meta = this.getNestingStatusMeta(job);
        badge.className = meta.badgeClass;
        badge.textContent = meta.label;

        const live = job?.live || null;
        const preview = job?.preview || null;
        const waitingInQueue = this.isWaitingInQueue(job);
        const queueDescription = waitingInQueue
            ? (job?.description || this.getQueuedDescription())
            : '';
        const descriptionText = job?.description || queueDescription;
        const statusMeters = preview?.total_used_length != null
            ? preview.total_used_length / 1000
            : null;
        const progressText = live?.sheet_count
            ? __html('Sheets: %1$ · Parts: %2$ · Length: %3$', live.sheet_count, live.total_parts || 0, this.formatNestingMetric(statusMeters, 2, ' m'))
            : '';
        description.textContent = descriptionText
            ? `${descriptionText}${progressText ? ` · ${progressText}` : ''}`
            : (progressText || __html('Select settings and start nesting'));

        const isNestingBusy = ['queued', 'running'].includes(job?.status);
        const isExporting = job?.status === 'exporting';
        runButton.disabled = isExporting;
        runButton.classList.add('nesting-action-btn');
        runButton.classList.toggle('btn-dark', !isNestingBusy);
        runButton.classList.toggle('btn-danger', isNestingBusy);
        runButton.innerHTML = isNestingBusy
            ? `<i class="bi bi-stop-circle me-1"></i>${__html('Stop')}`
            : `<i class="bi bi-play-circle me-1"></i>${__html('Start')}`;

        if (exportButton) {
            const canExport = job?.status === 'completed' && Array.isArray(job?.preview?.strips) && job.preview.strips.length > 0;
            const hasExportedFiles = Number(job?.result?.fileCount) > 0 && !!job?.result?.outputDir;
            exportButton.disabled = !canExport || isExporting;
            exportButton.innerHTML = isExporting
                ? `<i class="bi bi-download me-1"></i>${__html('Exporting')}`
                : `<i class="bi bi-download me-1"></i>${hasExportedFiles ? __html('Re-export') : __html('Export')}`;
        }
        if (printButton) {
            printButton.disabled = job?.status !== 'completed' || isExporting || !this.getPrintableSheets(job).length;
        }
        if (confirmButton) {
            confirmButton.disabled = this.mode !== 'writeoff' || job?.status !== 'completed' || !this.getPrintableSheets(job).length || isExporting;
        }

        const fitWarning = document.getElementById('nestingFitWarning');
        if (fitWarning) fitWarning.classList.toggle('d-none', !this.isItemFitError(job?.description));
        if (busyWarning) {
            busyWarning.classList.toggle('d-none', !waitingInQueue);
            const busyWarningText = busyWarning.querySelector('span');
            if (busyWarningText && waitingInQueue) {
                busyWarningText.textContent = queueDescription;
            }
        }
        this.toggleNestingStartWarning(this.isNoUsableItemsError(job?.description) ? job.description : '');
        this.syncWriteoffSheetsFromJob(job);

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
                if (this.isNoUsableItemsError(job?.description)) {
                    this.toggleNestingStartWarning(job.description);
                } else {
                    toast(job?.description || __html('Nesting failed'));
                }
            }
        } catch (error) {
            toast(error?.message || __html('Failed to poll nesting job'));
        }
    }

    stopNestingPreview = async ({ showErrorToast = true } = {}) => {
        const activeJobId = this.nestingJobId;
        const activeStatus = this.nestingJob?.status;
        if (!activeJobId || !['queued', 'running'].includes(activeStatus)) {
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

    exportNestingFiles = async () => {
        const jobId = this.nestingJobId;
        const job = this.nestingJob;
        if (!jobId || job?.status !== 'completed') {
            toast(__html('Nesting must be completed before export'));
            return;
        }

        this.nestingJob = {
            ...job,
            status: 'exporting',
            error: false,
            description: __html('Exporting DXF')
        };
        await this.renderNestingJob(this.nestingJob);

        try {
            const exportedJob = await exportNestingJob(jobId, this.settings);
            if (!exportedJob) {
                throw new Error(__html('Export returned no job payload'));
            }

            this.nestingJob = exportedJob;
            await this.renderNestingJob(this.nestingJob);
            toast(__html('Export completed'));
        } catch (error) {
            try {
                const refreshedJob = await getNestingJob(jobId, this.settings);
                if (refreshedJob) {
                    this.nestingJob = refreshedJob;
                    await this.renderNestingJob(this.nestingJob);
                }
            } catch {
                this.nestingJob = job;
                await this.renderNestingJob(this.nestingJob);
            }
            toast(error?.message || __html('Failed to export nesting files'));
        }
    }

    queueFusionResketch = async () => {
        const items = this.getResketchableItems().map((item) => ({
            id: item.id,
            item_id: item.id,
            order_id: item.order_id || this.orderId,
            product_id: item.product_id,
            sketch_attached: !!item.sketch_attached,
            input_fields_values: item.input_fields_values || {},
        }));

        if (!items.length) {
            toast(__html('No sketch-backed items available for resketching'));
            return;
        }

        this.resketchQueueing = true;
        this.renderNestingItems();

        try {
            const response = await fetch('/extension/fusion-sketching/dashboard/queue-item-resketch', {
                method: 'POST',
                headers: H(),
                body: JSON.stringify({ items })
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || data?.success === false) {
                throw new Error(data?.error || 'Failed to queue resketch tasks');
            }

            toast(__html('Queued %1$ sketch tasks', Number(data?.enqueued_count) || 0));
        } catch (error) {
            toast(error?.message || __html('Failed to queue resketch tasks'));
        } finally {
            this.resketchQueueing = false;
            this.renderNestingItems();
        }
    }

    // ─── Start ────────────────────────────────────────────────────────────────

    startNestingPreview = async ({ preferCache = false } = {}) => {
        document.getElementById('nestingBusyWarning')?.classList.add('d-none');
        this.toggleNestingStartWarning('');

        if (this.nestingJob?.status === 'exporting') {
            toast(__html('Wait until export completes'));
            return;
        }

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
            } else if (this.isNoUsableItemsError(msg)) {
                this.toggleNestingStartWarning(msg);
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
        const showWriteoffSheets = this.mode === 'writeoff';
        const showCoworkers = this.users?.length > 0;
        const isCoilLocked = !!this.coil?._id;
        const titleIcon = this.mode === 'writeoff' ? 'bi-scissors' : 'bi-bounding-box';
        const titleText = this.mode === 'writeoff'
            ? (isCoilLocked
                ? `${this.coil.supplier} / ${this.coil.width} × ${Number(this.coil.length).toLocaleString()} ${getDimUnit(this.settings)} / ${this.coil.color} ${this.coil.coating}`
                : __html('No material selected'))
            : __html('Nesting Preview');
        this.modal.querySelector('.modal-content').innerHTML = `
            <div class="vertical-text d-none">${this.coil?.thickness ? this.coil.thickness + getDimUnit(this.settings) : ''}</div>
            <div class="modal-header bg-light border-0">
                <h5 class="modal-title">
                    <i class="bi ${titleIcon} me-2"></i>
                    ${titleText}
                    ${this.getOrderLabel() ? `<small class="text-muted ms-2">${this.getOrderLabel()}</small>` : ''}
                    <span class="item-status status-secondary ms-2" id="nestingStatusBadge">${__html('Ready')}</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="form-cont writeoff-cont container" style="min-height:300px;">
                    ${showCoworkers ? `
                    <div class="row mb-4">
                        <div class="col-12">
                            <label class="form-label mb-1 small text-muted">${__html('Team')}</label>
                            <div id="cuttingCoworkerChips" class="coworker-chips" role="group" aria-label="${__html('Team')}"></div>
                            <small id="cuttingCoworkerSummary" class="text-muted d-block mt-1"></small>
                        </div>
                    </div>` : ''}
                    <div class="nesting-modal-grid">
                    <div class="nesting-toolbar">
                        <div class="nesting-field">
                            <label for="nestingSheetHeight">${__html('Sheet width')}</label>
                            <input id="nestingSheetHeight" type="number" class="form-control border-0" value="${sheetHeight}" min="1" ${isCoilLocked ? 'disabled' : ''}>
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
                            <label for="nestingRotation">${__html('Rotation')}</label>
                            <select id="nestingRotation" class="form-select border-0">
                                <option value="none">${__html('No rotation')}</option>
                                <option value="180">${__html('180°')}</option>
                                <option value="120">${__html('120°')}</option>
                                <option value="90" selected>${__html('90°')}</option>
                                <option value="60">${__html('60°')}</option>
                                <option value="45">${__html('45°')}</option>
                                <option value="30">${__html('30°')}</option>
                                <option value="15">${__html('15°')}</option>
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
                    <div id="nestingStartWarning" class="d-none nesting-fit-warning">
                        <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                        <span>${__html('No usable items found for nesting')}</span>
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
                    ${showWriteoffSheets ? `
                    <div class="row mt-3">
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="text-muted small" id="cuttingTotalTakenLength">${__html('Total: %1$ %2$', 0, getDimUnit(this.settings))}</div>
                            </div>
                            <div id="cutDistributionChart" class="sheets-list"></div>
                        </div>
                    </div>` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-outline-dark btn-modal" id="printNestingBtn" disabled>
                    <i class="bi bi-printer me-1"></i>${__html('Print')}
                </button>
                <button type="button" class="btn btn-outline-dark btn-modal" id="exportNestingBtn" disabled>
                    <i class="bi bi-download me-1"></i>${__html('Export')}
                </button>
                <span class="nesting-status-text text-muted me-auto" id="nestingStatusText">${__html('Select settings and start nesting')}</span>
                <button type="button" class="btn btn-dark btn-modal nesting-action-btn" id="startNestingBtn">
                    <i class="bi bi-play-circle me-1"></i>${__html('Start')}
                </button>
                ${showWriteoffSheets ? `
                <button type="button" class="btn btn-outline-dark btn-modal" id="confirmNestingWriteoffBtn" disabled>
                    <i class="bi bi-check-circle me-1"></i>${__html('Confirm')}
                </button>` : ''}
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
        const rotationEl = document.getElementById('nestingRotation');
        if (rotationEl && prefs.rotation) rotationEl.value = prefs.rotation;

        this.modal_cont.show();
        this.nestingVisualization = new NestingVisualization(document.getElementById('nestingPreviewCanvas'));
        this.renderCoworkerChips();
        this.syncNestingWidthMode();
        this.renderNestingSummary(null);
        this.renderNestingSheetTabs(null);
        this.renderNestingPreview(null);
        this.renderNestingItems();
        this.renderWriteoffSheets();

        if (this.nestingJobId && ['queued', 'running', 'exporting', 'completed'].includes(this.nestingJob?.status)) {
            this.renderNestingJob(this.nestingJob);
            if (['queued', 'running', 'exporting'].includes(this.nestingJob?.status)) {
                this.scheduleNestingPoll(this.nestingJobId, 100);
            }
        }

        document.getElementById('nestingWidthMode')?.addEventListener('change', this.syncNestingWidthMode);
        document.getElementById('startNestingBtn')?.addEventListener('click', () => this.startNestingPreview());
        document.getElementById('printNestingBtn')?.addEventListener('click', () => this.printNestingReport());
        document.getElementById('exportNestingBtn')?.addEventListener('click', () => this.exportNestingFiles());
        document.getElementById('confirmNestingWriteoffBtn')?.addEventListener('click', (event) => this.confirmWriteoff(event.currentTarget));
        ['nestingSheetHeight', 'nestingWidthMode', 'nestingSheetWidth', 'nestingRotation'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', this.saveNestingPrefs);
        });
        document.getElementById('nestingSheetTabs')?.addEventListener('click', async (event) => {
            const tab = event.target.closest('[data-sheet-index]');
            if (!tab) return;
            this.nestingModalActiveSheetIndex = Number(tab.dataset.sheetIndex) || 0;
            this.renderNestingSheetTabs(this.nestingJob);
            await this.renderNestingPreview(this.nestingJob);
        });
        document.getElementById('nestingItemsList')?.addEventListener('click', async (e) => {
            const resketchBtn = e.target.closest('#nestingResketchBtn');
            if (!resketchBtn || resketchBtn.disabled) return;
            await this.queueFusionResketch();
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
