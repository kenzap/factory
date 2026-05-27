import { randomString } from "../helpers/global.js";
import { state } from "../modules/order/state.js";

const scheduleCellEdit = (resolveCell, field) => {
    const openEditor = () => {
        const cell = typeof resolveCell === "function" ? resolveCell() : null;
        if (!cell) return;

        try {
            cell.edit();
        } catch (error) {
            console.warn('Cannot edit cell:', field, error);
        }
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(openEditor);
        });
        return;
    }

    setTimeout(openEditor, 0);
};

/**
 * Navigates to the next editable cell in a table, moving horizontally through columns
 * and vertically to the next row when reaching the end of editable columns.
 * 
 * @param {Object} currentCell - The current cell object from which to navigate
 * @param {Object} table - The table object containing rows and columns
 * 
 * @example
 * // Navigate from current cell to next editable cell
 * navigateToNextCell(currentCell, tableInstance);
 */
export const navigateToNextCell = (currentCell) => {

    // console.log('Navigating to next cell from:', currentCell.getField());

    const currentRow = currentCell.getRow();
    const currentColumn = currentCell.getColumn();
    const columns = state.table.getColumns().filter(col => col.getField() !== 'actions');
    const editableColumns = columns.filter(col => {
        // Check if column has an editor (is editable)
        const colDef = col.getDefinition();
        return colDef.editor && colDef.field !== 'area' && colDef.field !== 'total' && colDef.field !== 'price';
    });
    const currentColumnIndex = editableColumns.findIndex(col => col.getField() === currentColumn.getField());
    const currentRowIndex = state.table.getRows().findIndex(row => row === currentRow);

    // console.log('Current column index:', currentColumnIndex, ' row index', currentRowIndex);

    if (currentColumnIndex < editableColumns.length - 1) {
        // Move to next editable column in same row
        const nextColumn = editableColumns[currentColumnIndex + 1];
        scheduleCellEdit(() => {
            const freshRows = state.table.getRows();
            const freshRow = freshRows[currentRowIndex];
            return freshRow ? freshRow.getCell(nextColumn.getField()) : null;
        }, nextColumn.getField());
    } else {
        // Move to first editable column of next row, or create new row if at end
        const rows = state.table.getRows();
        const currentRowIndex = rows.findIndex(row => row === currentRow);

        if (currentRowIndex < rows.length - 1) {
            // Move to next row
            const nextRow = rows[currentRowIndex + 1];
            const firstEditableColumn = editableColumns[1];
            if (firstEditableColumn && nextRow) {
                scheduleCellEdit(() => {
                    const freshRows = state.table.getRows();
                    const freshRow = freshRows[currentRowIndex + 1];
                    return freshRow ? freshRow.getCell(firstEditableColumn.getField()) : null;
                }, firstEditableColumn.getField());
            }
        } else {

            // Add new row and move to first cell
            addRow();
        }
    }
}

export const navigateToPreviousCell = (currentCell) => {

    const currentRow = currentCell.getRow();
    const currentColumn = currentCell.getColumn();
    const columns = state.table.getColumns().filter(col => col.getField() !== 'actions');
    const editableColumns = columns.filter(col => {
        // Check if column has an editor (is editable)
        const colDef = col.getDefinition();
        return colDef.editor && colDef.field !== 'area' && colDef.field !== 'total' && colDef.field !== 'price';
    });
    const currentColumnIndex = editableColumns.findIndex(col => col.getField() === currentColumn.getField());
    const currentRowIndex = state.table.getRows().findIndex(row => row === currentRow);

    if (currentColumnIndex > 0) {
        // Move to previous editable column in same row
        const prevColumn = editableColumns[currentColumnIndex - 1];
        scheduleCellEdit(() => {
            const freshRows = state.table.getRows();
            const freshRow = freshRows[currentRowIndex];
            return freshRow ? freshRow.getCell(prevColumn.getField()) : null;
        }, prevColumn.getField());
    } else if (currentRowIndex > 0) {
        // Move to last editable column of previous row
        const rows = state.table.getRows();
        const prevRow = rows[currentRowIndex - 1];
        const lastEditableColumn = editableColumns[editableColumns.length - 1];
        if (lastEditableColumn && prevRow) {
            scheduleCellEdit(() => {
                const freshRows = state.table.getRows();
                const freshRow = freshRows[currentRowIndex - 1];
                return freshRow ? freshRow.getCell(lastEditableColumn.getField()) : null;
            }, lastEditableColumn.getField());
        }
    }
}

export const addRow = () => {

    // Get coating and color from previous row if it exists
    const rows = state.table.getRows();
    let previousRowData = {};

    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        previousRowData = lastRow.getData();
    }

    state.table.addRow({
        id: randomString(6),
        cm: previousRowData.cm !== undefined ? Boolean(previousRowData.cm) : false,
        coating: previousRowData.coating || "",
        color: previousRowData.color || "",
        title: "",
        formula_width_calc: "",
        formula_length_calc: "",
        area: 0,
        qty: 1,
        adj: 0,
        price: 0,
        discount: 0,
        note: "",
        total: 0
    });

    // start editing color cell of the new row
    scheduleCellEdit(() => {
        const newRow = state.table.getRows()[state.table.getRows().length - 1];
        const firstColumn = state.table.getColumns()[1];
        return newRow?.getCell(firstColumn.getField()) || null;
    }, state.table.getColumns()[1]?.getField?.() || "color");
}
