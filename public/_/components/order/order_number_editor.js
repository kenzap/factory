import { toast } from "../../helpers/global.js";
import { isAllowedToEdit } from "../../helpers/order.js";
import { focusEditorField } from "./editor_focus.js";

/**
 * Creates a number input editor for table cells with validation and navigation features.
 * 
 * @param {Object} cell - The Tabulator cell object being edited
 * @param {Function} onRendered - Callback function executed when the editor is rendered
 * @param {Function} success - Callback function to execute on successful edit completion
 * @param {Function} cancel - Callback function to execute when edit is cancelled
 * @param {Object} editorParams - Configuration parameters for the editor
 * @param {number} [editorParams.min] - Minimum allowed value for the input
 * @param {number} [editorParams.max] - Maximum allowed value for the input
 * @param {number} [editorParams.step] - Step increment for the input
 * @param {Function} editorParams.navigateToNextCell - Function to navigate to the next cell
 * @param {Function} editorParams.navigateToPreviousCell - Function to navigate to the previous cell
 * @returns {HTMLInputElement} The created number input element
 * 
 */
export const numberEditor = (cell, onRendered, success, cancel, editorParams) => {
    const parseEditorNumber = (value) => {
        const normalized = String(value ?? "").trim().replace(",", ".");
        if (!normalized) return "";

        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : "";
    };

    // Check if editing is allowed for this row
    const rowData = cell.getRow().getData();
    const is = isAllowedToEdit(rowData);

    // Keep legacy adj override for inventory locks, but waybill lock is stricter.
    if (!is.allow && (is.lock === 'waybill' || editorParams.field !== 'adj')) {

        toast(is.reason || 'You are not allowed to edit this row.');
        cancel();
        return;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.value = cell.getValue() ? parseFloat(cell.getValue()) : "";
    input.className = "form-control form-control-sm";
    input.inputMode = Number(editorParams.step) === 1 ? "numeric" : "decimal";
    input.autocomplete = "off";
    input.setAttribute("spellcheck", "false");

    // Apply editor params
    if (editorParams.min !== undefined) input.dataset.min = editorParams.min;
    if (editorParams.max !== undefined) input.dataset.max = editorParams.max;
    if (editorParams.step !== undefined) input.dataset.step = editorParams.step;

    input.addEventListener("blur", () => {
        success(parseEditorNumber(input.value));
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {

            e.preventDefault();

            success(parseEditorNumber(input.value));

            // Navigate to next or previous cell based on shift key
            if (e.shiftKey) {
                editorParams.navigateToPreviousCell(cell);
            } else {
                editorParams.navigateToNextCell(cell);
            }

        } else if (e.key === "Escape") {
            cancel();
        } else if (e.key === "Tab") {
            success(parseEditorNumber(input.value));
        }
    });

    onRendered(() => {
        focusEditorField(input, { selectAll: true });
    });

    return input;
}
