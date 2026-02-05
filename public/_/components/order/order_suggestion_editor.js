import { randomString, toast } from "../../helpers/global.js";
import { isAllowedToEdit } from "../../helpers/order.js";

/**
 * Creates a custom cell editor for Tabulator.js with autocomplete suggestions functionality.
 * This editor provides a text input with a datalist for autocomplete suggestions and handles
 * keyboard navigation between cells.
 * 
 * @param {Object} cell - The Tabulator cell object being edited
 * @param {Function} onRendered - Callback function called when the editor is rendered
 * @param {Function} success - Callback function to call when editing is successful, passes the new value
 * @param {Function} cancel - Callback function to call when editing is cancelled
 * @param {Object} editorParams - Configuration object for the editor
 * @param {string[]} editorParams.suggestions - Array of suggestion strings for the autocomplete
 * @param {Function} editorParams.navigateToNextCell - Function to navigate to the next cell
 * @param {Function} editorParams.navigateToPreviousCell - Function to navigate to the previous cell
 * @returns {HTMLInputElement} The input element that serves as the editor
 * 
 */
export const suggestionEditor = (cell, onRendered, success, cancel, editorParams) => {

    // Check if editing is allowed for this row
    const rowData = cell.getRow().getData();
    const is = isAllowedToEdit(rowData);
    if (!is.allow && editorParams.field !== 'discount') {

        toast(is.reason || 'You are not allowed to edit this row.');
        cancel();
        return;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.value = cell.getValue() || "";
    input.className = "form-control form-control-sm";

    const datalist = document.createElement("datalist");
    datalist.id = "suggestions-" + randomString(10);
    datalist.style.backgroundColor = "beige";
    datalist.style.border = "var(--bs-border-width) solid var(--bs-border-color)!important;";
    datalist.style.borderRadius = "4px";
    datalist.style.minWidth = "200px";

    editorParams.suggestions.forEach(suggestion => {
        const option = document.createElement("option");
        option.value = suggestion;
        option.style.backgroundColor = "beige";
        option.style.padding = "4px 8px";
        datalist.appendChild(option);
    });

    let lastKeyPressed = '';
    let datalistOpen = false;

    // Track when datalist opens/closes
    input.addEventListener("focus", () => {
        datalistOpen = true;
    });

    input.addEventListener("keydown", (e) => {
        lastKeyPressed = e.key;

        // Prevent arrow keys from navigating table cells when datalist is open
        if (datalistOpen && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }

        console.log('Key pressed in suggestion editor:', lastKeyPressed);
    });

    // Detect when user selects from datalist
    input.addEventListener("input", (e) => {
        const selectedValue = e.target.value;
        if (editorParams.suggestions.includes(selectedValue) && lastKeyPressed !== 'Backspace' && lastKeyPressed !== 'Delete') {
            console.log('User selected from datalist:', selectedValue);
            datalistOpen = false;
            // Handle the selection here
            success(selectedValue);
            editorParams.navigateToNextCell(cell);
            if (datalist.parentNode) {
                document.body.removeChild(datalist);
            }
        }
    });

    input.setAttribute("list", datalist.id);
    document.body.appendChild(datalist);

    input.addEventListener("blur", () => {
        datalistOpen = false;
        success(input.value);
        if (datalist.parentNode) {
            document.body.removeChild(datalist);
        }
    });

    input.addEventListener("keydown", (e) => {

        if (e.key === "Enter") {
            datalistOpen = false;
            success(input.value);

            // Navigate to next or previous cell based on shift key
            if (e.shiftKey) {
                editorParams.navigateToPreviousCell(cell);
            } else {
                editorParams.navigateToNextCell(cell);
            }

            if (datalist.parentNode) {
                document.body.removeChild(datalist);
            }

        } else if (e.key === "Escape") {
            datalistOpen = false;
            cancel();
            if (datalist.parentNode) {
                document.body.removeChild(datalist);
            }
        }
    });

    onRendered(() => {
        input.focus();
        if (editorParams.field === 'discount') input.select();
    });

    return input;
}