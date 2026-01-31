import { __html, getCookie } from "../../helpers/global.js";
import { calculate } from "../../helpers/price.js";

export const sketchEditor = (cell, settings, order, cb) => {

    let row = cell.getRow().getData();

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
             <iframe id="isketch" style="width:100%;height:100%;" frameborder="0" src="${(getCookie("test") ? "http://localhost:3000/www/" : "https://skarda.design")}?iframe=1&consent=1&qty=${row.qty || 1}&coating=${row.coating || ''}&color=${row.color || ''}${row.sketch ? '&sketch=' + row.sketch : ''}&lang=lv&note=${encodeURIComponent(row.note || '')}&static=true${row._id ? '&_id=' + encodeURIComponent(row._id) : ''}${row.inputs ? '&inputs=' + encodeURIComponent(JSON.stringify(row.inputs)) : ''}${row.input_fields_values ? '&input_fields_values=' + encodeURIComponent(JSON.stringify(row.input_fields_values)) : ''}${row.input_fields ? '&input_fields=' + encodeURIComponent(JSON.stringify(row.input_fields)) : ''}${row.orientation ? '&orientation=' + encodeURIComponent(row.orientation) : ''}${row.position ? '&position=' + encodeURIComponent(row.position) : ''}&title=${encodeURIComponent((row.color || '') + ' ' + (row.coating || '') + ' ' + (row.title || ''))}&id=${order.id || ''}-${row.id || ''}&time=${Math.floor(Date.now() / 1000)}"></iframe>
        `;

    modal.querySelector(".modal-header").classList.add('bg-light');
    modal.querySelector(".modal-footer").classList.add('d-none');
    modal.querySelector(".modal-body").classList.add('p-0');

    modal_cont.show();

    const messageHandler = (event) => {

        modal_cont.hide();

        let data = JSON.parse(event.data);

        console.log(data);

        switch (data.cmd) {

            case 'confirm':

                // Update the current row with the sketch data
                const currentRowData = cell.getRow().getData();
                const updatedRowData = { ...currentRowData };

                updatedRowData.sketch_attached = true;

                if (data.coating) {
                    updatedRowData.coating = data.coating;
                }

                if (data.color) {
                    updatedRowData.color = data.color;
                }

                if (data.qty) {
                    updatedRowData.qty = parseFloat(data.qty);
                }

                if (data.input_fields_values) {
                    updatedRowData.input_fields_values = data.input_fields_values;
                }

                // calculate width and length using input_fields_values
                if (data.input_fields_values) {
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

                // Update the row in the table
                cell.getRow().update(updatedRowData);

                // console.log(updatedRowData);

                cb(event.data);

                break;

            case 'delete':

                // Remove sketch data from the row
                break;
        }

        window.removeEventListener('message', messageHandler, true);
    };

    window.addEventListener('message', messageHandler, true);
}