import { __html, API, getCookie, H } from "../../helpers/global.js";
import { buildOrderScopedItemId, createUniqueOrderItemId, normalizeOrderItemId } from "../../helpers/order_item_ids.js";
import { calculate } from "../../helpers/price.js";
import { buildUpdatedProductRowData } from "./order_product_editor.js";

const buildSketchRequestId = (orderId = '', itemId = '') => {
    const normalizedOrderId = String(orderId || '').trim();
    const normalizedItemId = normalizeOrderItemId(orderId, itemId);
    if (!normalizedOrderId) return normalizedItemId;
    if (!normalizedItemId) {
        return createUniqueOrderItemId(normalizedOrderId, new Set(), '', {
            preferOrderPrefix: true
        });
    }

    return buildOrderScopedItemId(normalizedOrderId, normalizedItemId);
};

const loadProductForSketchLink = async (id) => {

    if (!id) return null;

    try {
        const response = await fetch(API() + '/api/get-product/', {
            method: 'post',
            headers: H(),
            body: JSON.stringify({ id })
        });

        const data = await response.json();
        return data?.success && data.product ? data.product : null;
    } catch (error) {
        console.warn('Failed to load sketch-linked product metadata', error);
        return null;
    }
};

const enrichSketchConfirmPayload = async (payload = {}) => {

    const needsProductMetadata = Boolean(payload?._id) && (
        !String(payload.title || '').trim() ||
        !String(payload.group || '').trim() ||
        !Array.isArray(payload.input_fields) ||
        !payload.formula_width ||
        !payload.formula_length
    );

    if (!needsProductMetadata) return payload;

    const product = await loadProductForSketchLink(payload._id);
    return product ? { ...product, ...payload } : payload;
};

const hasUsableSketchValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
};

const mergeNonEmptySketchValues = (...objects) => {
    const merged = {};

    objects.forEach((source) => {
        if (!source || typeof source !== 'object' || Array.isArray(source)) return;
        Object.entries(source).forEach(([key, value]) => {
            if (!hasUsableSketchValue(value)) return;
            merged[key] = value;
        });
    });

    return merged;
};

const mergeMissingSketchInputState = (currentRowData = {}, updatedRowData = {}) => {
    const currentInputs = currentRowData?.inputs && typeof currentRowData.inputs === 'object' && !Array.isArray(currentRowData.inputs)
        ? currentRowData.inputs
        : {};
    const nextInputs = updatedRowData?.inputs && typeof updatedRowData.inputs === 'object' && !Array.isArray(updatedRowData.inputs)
        ? updatedRowData.inputs
        : {};

    const currentFieldValues = currentRowData?.input_fields_values && typeof currentRowData.input_fields_values === 'object' && !Array.isArray(currentRowData.input_fields_values)
        ? currentRowData.input_fields_values
        : {};
    const nextFieldValues = updatedRowData?.input_fields_values && typeof updatedRowData.input_fields_values === 'object' && !Array.isArray(updatedRowData.input_fields_values)
        ? updatedRowData.input_fields_values
        : {};

    const mergedFieldValues = mergeNonEmptySketchValues(
        currentFieldValues,
        currentInputs,
        nextInputs,
        nextFieldValues
    );

    const currentFields = Array.isArray(currentRowData?.input_fields) ? currentRowData.input_fields : [];
    const nextFields = Array.isArray(updatedRowData?.input_fields) ? updatedRowData.input_fields : [];

    const mergedFields = nextFields.map((field) => {
        const id = String(field?.id || '').trim();
        const label = String(field?.label || '').trim();
        const matchingCurrentField = currentFields.find((currentField) => {
            const currentId = String(currentField?.id || '').trim();
            const currentLabel = String(currentField?.label || '').trim();
            return (id && currentId === id) || (label && currentLabel === label);
        });

        const candidateValues = [
            id ? mergedFieldValues[`input${id}`] : undefined,
            id ? mergedFieldValues[id] : undefined,
            label ? mergedFieldValues[`input${label}`] : undefined,
            label ? mergedFieldValues[label] : undefined,
            field?.default,
            matchingCurrentField?.default,
        ];

        const resolvedDefault = candidateValues.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
        if (resolvedDefault === undefined) return field;
        return { ...field, default: resolvedDefault };
    });

    return {
        ...updatedRowData,
        inputs: mergeNonEmptySketchValues(currentInputs, nextInputs),
        input_fields_values: mergedFieldValues,
        input_fields: mergedFields,
    };
};

export const sketchEditor = (cell, settings, order, cb) => {

    let row = typeof cell?.getRow === 'function' ? cell.getRow().getData() : cell;
    const sketchRequestId = buildSketchRequestId(order?.id, row?.id);

    // init variables
    let modal = document.querySelector(".modal");
    let modal_cont = new bootstrap.Modal(modal);

    // render modal
    modal.querySelector(".modal-dialog").classList.add('modal-fullscreen');
    modal.querySelector(".modal-title").innerHTML = ""; //__html('Add New User');
    modal.querySelector(".modal-footer").innerHTML = `
        <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
            ${__html('Close')}
        </button>
        `;

    modal.querySelector(".modal-body").style.width = "100%";
    modal.querySelector(".modal-body").style.height = "100%";
    modal.querySelector(".modal-body").innerHTML = `
             <iframe id="isketch" style="width:100%;height:100%;" frameborder="0" src="${(getCookie("test") ? "http://localhost:3000/www/" : "https://skarda.design")}?iframe=1&consent=1&qty=${row.qty || 1}&coating=${row.coating || ''}&color=${row.color || ''}${row.sketch ? '&sketch=' + row.sketch : ''}&lang=lv&note=${encodeURIComponent(row.note || '')}&static=true${row._id ? '&_id=' + encodeURIComponent(row._id) : ''}${row.inputs ? '&inputs=' + encodeURIComponent(JSON.stringify(row.inputs)) : ''}${row.input_fields_values ? '&input_fields_values=' + encodeURIComponent(JSON.stringify(row.input_fields_values)) : ''}${row.input_fields ? '&input_fields=' + encodeURIComponent(JSON.stringify(row.input_fields)) : ''}${row.orientation ? '&orientation=' + encodeURIComponent(row.orientation) : ''}${row.position ? '&position=' + encodeURIComponent(row.position) : ''}&title=${encodeURIComponent((row.color || '') + ' ' + (row.coating || '') + ' ' + (row.title || ''))}&id=${encodeURIComponent(sketchRequestId)}&time=${Math.floor(Date.now() / 1000)}"></iframe>
        `;

    modal.querySelector(".modal-header").classList.add('bg-light');
    modal.querySelector(".modal-footer").classList.add('d-none');
    modal.querySelector(".modal-body").classList.add('p-0');

    modal_cont.show();

    const collectSiblingItemIds = () => {
        if (!cell?.getTable || !cell?.getRow) return new Set();

        const currentRow = cell.getRow();
        return new Set(
            cell.getTable().getRows()
                .filter((tableRow) => tableRow !== currentRow)
                .map((tableRow) => String(tableRow?.getData?.()?.id || '').trim())
                .filter(Boolean)
        );
    };

    const messageHandler = async (event) => {

        modal_cont.hide();

        try {
            let data = JSON.parse(event.data);

            switch (data.cmd) {

                case 'confirm':

                    if (typeof cell?.getRow === 'function') {
                        const currentRowData = cell.getRow().getData();
                        const { cmd, ...returnedRowData } = data;
                        const siblingIds = collectSiblingItemIds();
                        const normalizedReturnedId = normalizeOrderItemId(order?.id, returnedRowData.id);
                        const preferredRowId = buildSketchRequestId(order?.id, currentRowData.id || sketchRequestId);
                        returnedRowData.id = normalizedReturnedId && !siblingIds.has(normalizedReturnedId)
                            ? normalizedReturnedId
                            : createUniqueOrderItemId(order?.id, siblingIds, preferredRowId, {
                                preferOrderPrefix: true
                            });

                        const enrichedRowData = await enrichSketchConfirmPayload(returnedRowData);
                        let updatedRowData = buildUpdatedProductRowData(
                            currentRowData,
                            enrichedRowData,
                            settings,
                            order?.discounts || {},
                            {
                                preserveSameGroupMeasurements: false,
                                preserveExistingDiscount: true
                            }
                        );

                        updatedRowData = mergeMissingSketchInputState(currentRowData, updatedRowData);

                        updatedRowData.sketch_attached = true;
                        updatedRowData.product_id = updatedRowData.product_id || updatedRowData._id || currentRowData.product_id || currentRowData._id || "";

                        // Fallback recalculation if the returned payload only updated sketch inputs
                        // and did not carry enough product formula metadata for the shared helper.
                        if (data.input_fields_values && !Number.isFinite(Number(updatedRowData.formula_width_calc)) && !Number.isFinite(Number(updatedRowData.formula_length_calc))) {
                            const updateFormula = (formulaKey, targetKey) => {
                                let formula = data[formulaKey];
                                if (formula) {
                                    Object.keys(data.input_fields_values).forEach(key => {
                                        const cleanKey = key.replace('input', '');
                                        if (formula.includes(cleanKey)) {
                                            formula = formula.replaceAll(cleanKey, data.input_fields_values[key]);
                                        }
                                    });
                                    updatedRowData[targetKey] = calculate(formula);
                                }
                            };

                            updateFormula('formula_length', 'formula_length_calc');
                            updateFormula('formula_width', 'formula_width_calc');
                        }

                        cell.getRow().update(updatedRowData);
                        cb(event.data);
                    }

                    break;

                case 'delete':

                    // Remove sketch data from the row
                    break;
            }
        } finally {
            window.removeEventListener('message', messageHandler, true);
        }
    };

    window.addEventListener('message', messageHandler, true);
}
