import { __html, getCookie } from "../../helpers/global.js";

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

                // Update price and total from sketch data
                if (data.price) {
                    updatedRowData.price = parseFloat(data.price);
                }
                if (data.total) {
                    updatedRowData.total = parseFloat(data.total);
                }
                if (data.qty) {
                    updatedRowData.qty = parseFloat(data.qty);
                }
                if (data.input_fields_values) {
                    updatedRowData.input_fields_values = data.input_fields_values;
                }

                // Update width from formula_width
                if (data.formula_width && !isNaN(data.formula_width)) {
                    updatedRowData.formula_width_calc = parseInt(data.formula_width);
                }

                // Update length - check if formula_length is a direct value or needs to be resolved from input_fields_values
                if (data.formula_length) {
                    if (!isNaN(data.formula_length)) {
                        // Direct numeric value
                        updatedRowData.formula_length_calc = parseInt(data.formula_length);
                    } else if (data.input_fields_values) {
                        // Formula references an input field, try to resolve it
                        Object.keys(data.input_fields_values).forEach(key => {
                            if (data.formula_length.includes(key.replace('input', ''))) {
                                updatedRowData.formula_length_calc = parseInt(data.input_fields_values[key]);
                            }
                        });
                    }
                }

                // Calculate area if both width and length are available
                if (updatedRowData.formula_width_calc && updatedRowData.formula_length_calc) {
                    updatedRowData.area = (updatedRowData.formula_width_calc * updatedRowData.formula_length_calc / 1000000).toFixed(3);
                }

                // Update the row in the table
                cell.getRow().update(updatedRowData);

                console.log(updatedRowData);

                cb(event.data);

                // updateExtra(locid, extra);
                break;

            case 'delete':
                console.log('delete');
                // document.getElementById("attach-sketch").classList.remove("open");
                // updateExtra(locid, "");
                break;
        }

        window.removeEventListener('message', messageHandler, true);
    };

    window.addEventListener('message', messageHandler, true);
}