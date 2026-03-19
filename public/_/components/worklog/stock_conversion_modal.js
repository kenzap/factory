import { getProductStock } from "../../api/get_product_stock.js";
import { __html } from "../../helpers/global.js";
import { DropdownSuggestion } from "../products/dropdown_suggestion.js";

const STORAGE_KEY_PREFIX = 'worklog_stock_conversion_v1';

const getStorageKey = (userId = '') => `${STORAGE_KEY_PREFIX}:${userId || 'default'}`;
const normalizeTypeKey = (type = '') => String(type || '').trim().toLowerCase().replace(/_/g, '-');

const readStored = (userId = '') => {
    try {
        const raw = window.localStorage.getItem(getStorageKey(userId));
        if (!raw) return {};
        return JSON.parse(raw) || {};
    } catch (_err) {
        return {};
    }
};

const readStoredByType = (userId = '', typeId = '') => {
    const all = readStored(userId);
    const typeKey = normalizeTypeKey(typeId);
    if (!typeKey) return all?.global || {};
    return all?.byType?.[typeKey] || {};
};

const writeStoredByType = (userId = '', typeId = '', value = {}) => {
    const all = readStored(userId);
    const typeKey = normalizeTypeKey(typeId);
    const next = {
        ...all,
        byType: {
            ...(all.byType || {})
        }
    };

    if (!typeKey) next.global = { ...(next.global || {}), ...value };
    else next.byType[typeKey] = { ...(next.byType[typeKey] || {}), ...value };

    try {
        window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
    } catch (_err) {
        // noop
    }
};

const getDefaultSourceColorByType = (typeId = '') => {
    const normalized = normalizeTypeKey(typeId);
    if (normalized === 'powder-coating') return 'Zinc';
    if (normalized === 'galvanization') return 'Sagat';
    return '';
};

export const openStockConversionModal = ({
    userId = '',
    productId = '',
    qty = 0,
    typeId = '',
    sourceColor = '',
    sourceCoating = '',
    targetColor = '',
    targetCoating = '',
    typeLabel = '',
    colorSuggestions = [],
    coatingSuggestions = []
} = {}) => new Promise((resolve) => {
    const stored = readStoredByType(userId, typeId);

    const initialSourceColor = sourceColor || stored.source_color || getDefaultSourceColorByType(typeId);
    const initialSourceCoating = sourceCoating || stored.source_coating || '';
    const initialWriteOff = stored.write_off !== false;
    const initialReplenish = stored.replenish !== false;
    const qtyValue = parseFloat(qty || 0) || 0;

    const modalId = `stockConversionModal-${Date.now()}`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = /*html*/`
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">${__html(typeLabel) || '-'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${__html('Close')}"></button>
                    </div>
                    <div class="modal-body py-0">
                        <div class="p-2 mb-3" style="background:#f8f9fb;border-radius:10px;">
                            <div class="form-check form-switch mb-2">
                                <input class="form-check-input" type="checkbox" id="${modalId}-writeoff" ${initialWriteOff ? 'checked' : ''}>
                                <label class="form-check-label" for="${modalId}-writeoff">${__html('Write off source stock')}</label>
                            </div>
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label mb-1">${__html('Source color')}</label>
                                    <input type="text" class="form-control" id="${modalId}-source-color" value="${initialSourceColor}">
                                </div>
                                <div class="col-6">
                                    <label class="form-label mb-1">${__html('Source coating')}</label>
                                    <input type="text" class="form-control" id="${modalId}-source-coating" value="${initialSourceCoating}">
                                </div>
                            </div>
                            <div class="small text-muted mt-1" id="${modalId}-source-stock-summary">
                                ${__html('Before')}: <strong id="${modalId}-source-stock-before">-</strong>
                                &nbsp;→&nbsp;
                                ${__html('After')}: <strong id="${modalId}-source-stock-after">-</strong>
                            </div>
                            <div class="small text-danger mt-1 d-none" id="${modalId}-source-warning"></div>
                        </div>

                        <div class="p-2" style="background:#f8f9fb;border-radius:10px;">
                            <div class="form-check form-switch mb-2">
                                <input class="form-check-input" type="checkbox" id="${modalId}-replenish" ${initialReplenish ? 'checked' : ''}>
                                <label class="form-check-label" for="${modalId}-replenish">${__html('Replenish target stock')}</label>
                            </div>
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label mb-1">${__html('Target color')}</label>
                                    <input type="text" class="form-control" id="${modalId}-target-color" value="${targetColor || ''}">
                                </div>
                                <div class="col-6">
                                    <label class="form-label mb-1">${__html('Target coating')}</label>
                                    <input type="text" class="form-control" id="${modalId}-target-coating" value="${targetCoating || ''}">
                                </div>
                            </div>
                            <div class="small text-muted mt-1" id="${modalId}-target-stock-summary">
                                ${__html('Before')}: <strong id="${modalId}-target-stock-before">-</strong>
                                &nbsp;→&nbsp;
                                ${__html('After')}: <strong id="${modalId}-target-stock-after">-</strong>
                            </div>
                            <div class="small text-danger mt-1 d-none" id="${modalId}-target-warning"></div>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">${__html('Cancel')}</button>
                        <button type="button" class="btn btn-dark" id="${modalId}-confirm">${__html('Confirm')}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);

    const writeOffEl = modalEl.querySelector(`#${modalId}-writeoff`);
    const replenishEl = modalEl.querySelector(`#${modalId}-replenish`);
    const sourceColorEl = modalEl.querySelector(`#${modalId}-source-color`);
    const sourceCoatingEl = modalEl.querySelector(`#${modalId}-source-coating`);
    const targetColorEl = modalEl.querySelector(`#${modalId}-target-color`);
    const targetCoatingEl = modalEl.querySelector(`#${modalId}-target-coating`);
    const sourceStockBeforeEl = modalEl.querySelector(`#${modalId}-source-stock-before`);
    const sourceStockAfterEl = modalEl.querySelector(`#${modalId}-source-stock-after`);
    const sourceStockSummaryEl = modalEl.querySelector(`#${modalId}-source-stock-summary`);
    const targetStockBeforeEl = modalEl.querySelector(`#${modalId}-target-stock-before`);
    const targetStockAfterEl = modalEl.querySelector(`#${modalId}-target-stock-after`);
    const targetStockSummaryEl = modalEl.querySelector(`#${modalId}-target-stock-summary`);
    const sourceWarningEl = modalEl.querySelector(`#${modalId}-source-warning`);
    const targetWarningEl = modalEl.querySelector(`#${modalId}-target-warning`);
    const confirmEl = modalEl.querySelector(`#${modalId}-confirm`);

    let sourceStockTimer = null;
    let targetStockTimer = null;
    let sourceCurrentStock = null;
    let targetCurrentStock = null;
    let sourceStockStatus = 'idle'; // idle | loading | loaded | missing
    let targetStockStatus = 'idle'; // idle | loading | loaded | missing

    const formatStock = (value) => {
        const number = parseFloat(value);
        if (!Number.isFinite(number)) return '-';
        if (Number.isInteger(number)) return String(number);
        return number.toFixed(2).replace(/\.00$/, '');
    };

    const renderWarning = (element, message = '') => {
        if (!element) return;
        if (!message) {
            element.innerHTML = '';
            element.classList.add('d-none');
            return;
        }

        element.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>${message}`;
        element.classList.remove('d-none');
    };

    const updateProjectedValues = () => {
        const writeOff = Boolean(writeOffEl?.checked);
        const replenish = Boolean(replenishEl?.checked);
        const sourceColor = String(sourceColorEl?.value || '').trim();
        const sourceCoating = String(sourceCoatingEl?.value || '').trim();
        const targetColor = String(targetColorEl?.value || '').trim();
        const targetCoating = String(targetCoatingEl?.value || '').trim();
        const hasSourceSelection = Boolean(sourceColor && sourceCoating);
        const hasTargetSelection = Boolean(targetColor && targetCoating);
        const sourceAfter = Number.isFinite(sourceCurrentStock)
            ? (writeOff ? sourceCurrentStock - qtyValue : sourceCurrentStock)
            : null;
        const targetAfter = Number.isFinite(targetCurrentStock)
            ? (replenish ? targetCurrentStock + qtyValue : targetCurrentStock)
            : null;

        if (sourceStockBeforeEl) sourceStockBeforeEl.textContent = formatStock(sourceCurrentStock);
        if (targetStockBeforeEl) targetStockBeforeEl.textContent = formatStock(targetCurrentStock);

        if (sourceStockAfterEl) {
            sourceStockAfterEl.textContent = Number.isFinite(sourceAfter) ? formatStock(sourceAfter) : '-';
            sourceStockAfterEl.classList.toggle('text-danger', Number.isFinite(sourceAfter) && sourceAfter < 0);
        }

        if (targetStockAfterEl) {
            targetStockAfterEl.textContent = Number.isFinite(targetAfter) ? formatStock(targetAfter) : '-';
        }

        if (sourceWarningEl) {
            let warningText = '';
            if (writeOff && hasSourceSelection && sourceStockStatus === 'missing') {
                warningText = __html('Source stock position was not found.');
            } else if (writeOff && sourceStockStatus === 'loaded' && Number.isFinite(sourceAfter) && sourceAfter < 0) {
                warningText = __html('Write off would result in negative stock.');
            }
            renderWarning(sourceWarningEl, warningText);
            sourceStockSummaryEl?.classList.toggle('d-none', Boolean(warningText));
        }

        if (targetWarningEl) {
            let warningText = '';
            if (replenish && hasTargetSelection && targetStockStatus === 'missing') {
                warningText = __html('Target stock position was not found.');
            }
            renderWarning(targetWarningEl, warningText);
            targetStockSummaryEl?.classList.toggle('d-none', Boolean(warningText));
        }
    };

    const updateStockAmount = (color, coating, setCurrentStock, channel = 'source') => {
        const cleanColor = String(color || '').trim();
        const cleanCoating = String(coating || '').trim();
        const setStatus = (status) => {
            if (channel === 'source') sourceStockStatus = status;
            else targetStockStatus = status;
        };

        if (!productId || !cleanColor || !cleanCoating) {
            setStatus('idle');
            setCurrentStock(null);
            updateProjectedValues();
            return;
        }

        setStatus('loading');
        setCurrentStock(null);
        updateProjectedValues();

        getProductStock([{ _id: productId, color: cleanColor, coating: cleanCoating }], (response) => {
            const amount = response?.products?.[0]?.stock;
            if (amount === undefined || amount === null || amount === '') {
                setStatus('missing');
                setCurrentStock(null);
                updateProjectedValues();
                return;
            }

            const parsed = parseFloat(amount);
            if (Number.isFinite(parsed)) {
                setStatus('loaded');
                setCurrentStock(parsed);
            } else {
                setStatus('missing');
                setCurrentStock(null);
            }
            updateProjectedValues();
        });
    };

    const updateSourceStockDebounced = () => {
        if (sourceStockTimer) clearTimeout(sourceStockTimer);
        sourceStockTimer = setTimeout(() => {
            updateStockAmount(sourceColorEl?.value, sourceCoatingEl?.value, (value) => { sourceCurrentStock = value; }, 'source');
        }, 180);
    };

    const updateTargetStockDebounced = () => {
        if (targetStockTimer) clearTimeout(targetStockTimer);
        targetStockTimer = setTimeout(() => {
            updateStockAmount(targetColorEl?.value, targetCoatingEl?.value, (value) => { targetCurrentStock = value; }, 'target');
        }, 180);
    };

    const syncState = () => {
        const writeOff = Boolean(writeOffEl?.checked);
        const replenish = Boolean(replenishEl?.checked);

        if (sourceColorEl) sourceColorEl.disabled = !writeOff;
        if (sourceCoatingEl) sourceCoatingEl.disabled = !writeOff;
        if (targetColorEl) targetColorEl.disabled = !replenish;
        if (targetCoatingEl) targetCoatingEl.disabled = !replenish;
        if (sourceColorEl) sourceColorEl.style.opacity = writeOff ? '1' : '0.75';
        if (sourceCoatingEl) sourceCoatingEl.style.opacity = writeOff ? '1' : '0.75';
        if (targetColorEl) targetColorEl.style.opacity = replenish ? '1' : '0.75';
        if (targetCoatingEl) targetCoatingEl.style.opacity = replenish ? '1' : '0.75';
    };

    writeOffEl?.addEventListener('change', syncState);
    replenishEl?.addEventListener('change', syncState);
    writeOffEl?.addEventListener('change', updateProjectedValues);
    replenishEl?.addEventListener('change', updateProjectedValues);
    sourceColorEl?.addEventListener('input', updateSourceStockDebounced);
    sourceCoatingEl?.addEventListener('input', updateSourceStockDebounced);
    targetColorEl?.addEventListener('input', updateTargetStockDebounced);
    targetCoatingEl?.addEventListener('input', updateTargetStockDebounced);
    syncState();

    new DropdownSuggestion({
        input: `#${modalId}-source-color`,
        suggestions: colorSuggestions
    }, () => updateSourceStockDebounced());
    new DropdownSuggestion({
        input: `#${modalId}-source-coating`,
        suggestions: coatingSuggestions
    }, () => updateSourceStockDebounced());
    new DropdownSuggestion({
        input: `#${modalId}-target-color`,
        suggestions: colorSuggestions
    }, () => updateTargetStockDebounced());
    new DropdownSuggestion({
        input: `#${modalId}-target-coating`,
        suggestions: coatingSuggestions
    }, () => updateTargetStockDebounced());

    updateSourceStockDebounced();
    updateTargetStockDebounced();
    updateProjectedValues();

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);

    const cleanup = () => {
        bsModal.dispose();
        modalEl.remove();
    };

    let resolved = false;
    const finish = (value) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
    };

    confirmEl?.addEventListener('click', () => {
        const writeOff = Boolean(writeOffEl?.checked);
        const replenish = Boolean(replenishEl?.checked);
        const source_color = (sourceColorEl?.value || '').trim();
        const source_coating = (sourceCoatingEl?.value || '').trim();

        const target_color = (targetColorEl?.value || '').trim();
        const target_coating = (targetCoatingEl?.value || '').trim();

        if (!writeOff && !replenish) {
            sourceColorEl?.focus();
            return;
        }

        if (writeOff && (!source_color || !source_coating)) {
            (source_color ? sourceCoatingEl : sourceColorEl)?.focus();
            return;
        }
        if (replenish && (!target_color || !target_coating)) {
            (target_color ? targetCoatingEl : targetColorEl)?.focus();
            return;
        }

        writeStoredByType(userId, typeId, {
            write_off: writeOff,
            replenish,
            source_color,
            source_coating
        });

        bsModal.hide();
        finish({
            writeOff,
            replenish,
            source_color,
            source_coating,
            target_color,
            target_coating
        });
    });

    modalEl.addEventListener('shown.bs.modal', () => {
        (sourceColorEl || confirmEl)?.focus();
    }, { once: true });

    modalEl.addEventListener('hidden.bs.modal', () => {
        cleanup();
        finish(null);
    }, { once: true });

    bsModal.show();
});

export default openStockConversionModal;
