import { toast } from "../../helpers/global.js";
import { isAllowedToEdit } from "../../helpers/order.js";

/**
 * Custom text editor for Tabulator cells with navigation and validation
 * @param {Object} cell - The Tabulator cell object
 * @param {Function} onRendered - Callback when editor is rendered
 * @param {Function} success - Callback when editing succeeds
 * @param {Function} cancel - Callback when editing is cancelled
 * @param {Object} editorParams - Configuration parameters for the editor
 * @returns {HTMLInputElement} The input element for editing
 */
export const textEditor = (cell, onRendered, success, cancel, editorParams) => {

    // Check if editing is allowed for this row
    const rowData = cell.getRow().getData();
    const is = isAllowedToEdit(rowData);
    if (!is.allow) {

        toast(is.reason || 'You are not allowed to edit this row.');
        cancel();
        return;
    }

    const input = document.createElement("input");
    input.type = "number";
    input.value = cell.getValue() ? parseFloat(cell.getValue()) : "";
    input.className = "form-control form-control-sm";

    // Apply editor params
    if (editorParams.min !== undefined) input.min = editorParams.min;
    if (editorParams.max !== undefined) input.max = editorParams.max;
    if (editorParams.step !== undefined) input.step = editorParams.step;

    input.addEventListener("blur", () => {
        success(input.value ? parseFloat(input.value) : "");
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {

            e.preventDefault();

            success(input.value ? parseFloat(input.value) : "");

            // Navigate to next or previous cell based on shift key
            if (e.shiftKey) {
                editorParams.navigateToPreviousCell(cell);
            } else {
                editorParams.navigateToNextCell(cell);
            }

        } else if (e.key === "Escape") {
            cancel();
        } else if (e.key === "Tab") {
            success(input.value ? parseFloat(input.value) : "");
        }
    });

    onRendered(() => {
        input.focus();
        input.select();
    });

    return input;
}