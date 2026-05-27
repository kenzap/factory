import { toast } from "../../helpers/global.js";
import { isAllowedToEdit } from "../../helpers/order.js";
import { focusEditorField } from "./editor_focus.js";

/**
 * Custom text editor for Tabulator cells with navigation and validation
 * @param {Object} cell - The Tabulator cell object
 * @param {Function} onRendered - Callback when editor is rendered
 * @param {Function} success - Callback when editing succeeds
 * @param {Function} cancel - Callback when editing is cancelled
 * @param {Object} editorParams - Configuration parameters for the editor
 * @returns {HTMLTextAreaElement} The textarea element for editing
 */
export const textEditor = (cell, onRendered, success, cancel, editorParams) => {

    // Check if editing is allowed for this row
    const rowData = cell.getRow().getData();
    const is = isAllowedToEdit(rowData);
    if (!is.allow && editorParams.field !== 'note') {

        toast(is.reason || 'You are not allowed to edit this row.');
        cancel();
        return;
    }

    const input = document.createElement("textarea");
    input.value = String(cell.getValue() || "");
    input.className = "form-control form-control-sm";
    input.rows = 1;
    input.style.minHeight = "30px";
    input.style.resize = "vertical";
    input.setAttribute("inputmode", "text");
    input.setAttribute("spellcheck", "false");

    input.addEventListener("blur", () => {
        success(input.value);
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {

            e.preventDefault();

            success(input.value);

            // Navigate to next or previous cell based on shift key
            if (e.shiftKey) {
                editorParams.navigateToPreviousCell(cell);
            } else {
                editorParams.navigateToNextCell(cell);
            }

        } else if (e.key === "Escape") {
            cancel();
        } else if (e.key === "Tab") {
            e.preventDefault();
            success(input.value);
        }
    });

    onRendered(() => {
        focusEditorField(input, { selectAll: true });
    });

    return input;
}
