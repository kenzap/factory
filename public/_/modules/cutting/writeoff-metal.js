import { execWriteoffAction } from "../../api/exec_writeoff_action.js";
import { __html, getDimMUnit, getDimUnit, onClick, randomString, toast } from "../../helpers/global.js";
import { Visualization } from "./cutting-visualization.js";

export class WriteoffMetal {

    constructor(coil, items, settings, user, cb) {

        this.coil = coil;

        this.items = items || [];

        this.settings = settings || {};

        this.user = user || {};

        this.sheets = [];

        this.cb = cb;

        this.view();

        this.init();
    }

    view = () => {

        // init variables
        this.modal = document.querySelector(".modal");
        this.modal_cont = new bootstrap.Modal(this.modal);

        // render modal
        this.modal.classList.add('writeoff');
        this.modal.querySelector(".modal-dialog").classList.remove('modal-fullscreen');
        this.modal.querySelector(".modal-dialog").classList.add('modal-xl');
        this.modal.querySelector(".modal-content").innerHTML = `
            <div class="vertical-text d-none">${this.coil.thickness ? this.coil.thickness + getDimUnit(this.settings) : ""}</div>
            <div class="modal-header bg-light border-0"> 
                <h5 class="modal-title">
                    <i class="bi bi-scissors me-2"></i>
                    ${this.coil.supplier} / ${this.coil.width} × ${Number(this.coil.length).toLocaleString()} ${getDimUnit(this.settings)}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-1">
                <div class="form-cont writeoff-cont container" style="min-height:300px;">

                    <div class="row mb-4 g-3">
                        <div class="col-md-2 form-cont d-none-" data-type="metal">
                            <label for="width" class="form-label d-none">${__html('Width')}</label>
                            <input type="number" class="form-control border-0" id="width" placeholder="${__html('Width')}" value="${this.coil.width}" required disabled>
                        </div>
                        <div class="col-md-2 form-cont d-none-" data-type="metal">
                            <label for="length" class="form-label d-none">${__html('Length')}</label>
                            <input type="number" class="form-control border-0" id="length" placeholder="${__html('Length')}" value="" required>
                        </div>
                        <div class="col-md-2 form-cont d-none-" data-type="general">
                            <label for="qty" class="form-label d-none" >${__html('Sheets')}</label>
                            <input type="number" class="form-control border-0" style="width:8 0px;" id="qty" min="1" placeholder="${__html('Sheets')}" value="" required>
                        </div>
                        <div class="col-md-5 form-cont d-none-" data-type="general">
                            <label for="notes" class="form-label d-none">${__html('Notes')}</label>
                            <input type="text" class="form-control border-0" id="notes" placeholder="${__html('Notes')}" value="">
                        </div>
                        <div class="col-md-1 form-cont d-flex align-items-end d-none-" data-type="general">
                            <button class="btn btn-dark border-0 btn-add-sheet w-100">
                                <i class="bi bi-plus-circle me-1"></i>
                            </button>
                        </div>
                    </div>
    
                    <div class="row mb-4">
                        <div class="col-12">
                            <h6 class="mb-3 text-muted d-none">${__html('Cut Distribution')}</h6>
                            <div id="cutDistributionChart" class="sheets-list"></div>
                        </div>
                    </div>

                    <div class="row mb-4">
                        <div class="col-12">

                            <div class="cutting-visualization bg-white- p-0 mt-0 rounded- border-0">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div class="text-muted small total-taken-length">
                                       
                                    </div>
                                    <div class="text-muted small">
                                        ID: <span id="scaleDisplay-">${this.coil._id.substr(0, 3)}</span>
                                    </div>
                                </div>
                                
                                <div class="cutting-canvas-container border-0" style="overflow: auto; max-height: 620px;">
                                    <svg id="cuttingCanvas" width="800" height="600" style="min-width: 600px; background: #f8f9fa;">
                                        <!-- Sheet outline -->
                                        <rect id="sheetOutline" x="0" y="0" fill="none" stroke="#333" stroke-width="2"/>
                                        
                                        <!-- Grid lines -->
                                        <defs>
                                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="1"/>
                                            </pattern>
                                        </defs>
                                        <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" opacity="0.3"/>
                                        
                                        <!-- Items will be rendered here -->
                                        <g id="itemsGroup"></g>
                                        
                                        <!-- Labels -->
                                        <g id="labelsGroup"></g>
                                    </svg>
                                </div>
                                
                                <div class="mt-3">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6 class="small text-muted mb-2">${__html('Items')}</h6>
                                            <div id="itemsList" class="small" style="max-height: 150px; overflow-y: auto;">
                                                <!-- Items list will be populated here -->
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <h6 class="small text-muted mb-2">${__html('Statistics')}</h6>
                                            <div id="layoutStats" class="small">
                                                <div>${__html('Items')}: <span id="totalItems">0</span></div>
                                                <div>${__html('Utilization')}: <span id="utilization">0%</span></div>
                                                <div>${__html('Waste')}: <span id="wasteArea">0</span> ${getDimMUnit(this.settings)}²</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-2 text-center d-none">
                                    <button type="button" class="btn btn-sm btn-outline-secondary" id="optimizeLayout">
                                        <i class="bi bi-arrows-move me-1"></i>
                                        ${__html('Optimize Layout')}
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" id="resetLayout">
                                        <i class="bi bi-arrow-clockwise me-1"></i>
                                        ${__html('Reset')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-outline-dark btn-confirm-writeoff btn-modal">
                    <i class="bi bi-check-circle me-1"></i>
                    ${__html('Confirm')}
                </button>
                <button type="button" class="btn btn-dark btn-close-modal btn-modal" data-bs-dismiss="modal">
                    ${__html('Close')}
                </button>
            </div>
        `;

        this.modal_cont.show();

        // Event listeners
        document.getElementById('optimizeLayout').addEventListener('click', this.renderLayout);
        document.getElementById('resetLayout').addEventListener('click', this.renderLayout);
    }

    init = () => {

        this.Visualization = new Visualization(this.coil, this.items, this.settings);

        this.listeners();
    }

    listeners = () => {

        onClick('.btn-confirm-writeoff', async (e) => {

            e.preventDefault();

            if (this.sheets.length === 0) {
                alert(__html('No records added'));
                return;
            }

            // Check if any sheets don't have a type selected
            const sheetsWithoutType = this.sheets.filter(sheet => !sheet.type);
            if (sheetsWithoutType.length > 0) {
                alert(__html('Please select a type (Order/Stock/Waste) for all sheets'));
                return;
            }

            // Check if each group's total width matches coil width
            const groups = [...new Set(this.sheets.map(sheet => sheet.group))];
            for (const group of groups) {
                const groupSheets = this.sheets.filter(sheet => sheet.group === group);
                const groupTotalWidth = groupSheets.reduce((sum, sheet) => sum + sheet.width, 0);
                if (groupTotalWidth !== this.coil.width) {
                    alert(__html('Total sheet widths in group %1$ do not match coil width', group));
                    return;
                }
            }

            let total_length = this.getTotalWriteoffLength();

            // console.log('Total length to write-off:', total_length); return;

            const orderIds = [...new Set(this.items.map(item => item.order_id).filter(id => id))];

            const record = {
                // title: "Write-off from " + this.coil.supplier + ' ' + this.coil.width + ' × ' + this.coil.length + ' ' + getDimUnit(this.settings),
                title: this.items.length > 0
                    ? __html('Write-off for %1$ items from orders %2$', this.items.length, orderIds.map(id => '#' + id).join(', '))
                    : __html('Write-off from %1$ %2$ × %3$ %4$', this.coil.supplier, this.coil.width, this.coil.length, getDimUnit(this.settings)),
                qty: total_length,
                product_id: "",
                product_name: "",
                color: this.coil.color,
                coating: this.coil.coating,
                supplier: this.coil.supplier,
                thickness: this.coil.thickness,
                parameters: this.coil.parameters,
                coil_id: this.coil._id,
                origin: "c",
                time: 0,
                type: "cutting",
                sheets: this.sheets,
                user_id: this.user.id,
                order_ids: orderIds,
                items: this.items
            }

            console.log('Write-off record:', record);

            // block ui button
            e.currentTarget.disabled = true;
            e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

            // Create product bundle from the selected product
            execWriteoffAction(record, (response) => {

                if (e.currentTarget) e.currentTarget.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${__html('Confirm')}`;

                if (!response.success) {
                    alert(__html('Error: %1$', response.error));
                    return;
                }

                toast(__html('Changes applied'));

                this.modal_cont.hide();


                this.cb(response);
            });
        });

        onClick('.btn-add-sheet', (e) => {

            e.preventDefault();

            // Get values
            const length = document.getElementById('length').value;
            const qty = parseInt(document.getElementById('qty').value) || 1;
            const notes = document.getElementById('notes').value;
            const group = randomString(6);

            // Add sheet multiple times based on qty
            for (let i = 0; i < qty; i++) {

                // Calculate width per sheet, ensuring total matches coil.width
                const widthPerSheet = Math.floor(this.coil.width / qty);
                const remainder = this.coil.width % qty;

                // Add sheets with calculated widths
                const sheetWidth = i < remainder ? widthPerSheet + 1 : widthPerSheet;
                this.sheets.push({
                    width: parseFloat(sheetWidth),
                    length: parseFloat(length),
                    group: group,
                    price: this.coil.price,
                    qty: 1, // Each individual sheet has qty of 1
                    notes: notes
                });
            }

            console.log('Sheets after addition:', this.sheets);

            this.renderSheets();
        });

        // Select all text in length input when focused
        document.getElementById('length').addEventListener('focus', (e) => {
            e.target.select();
        });
    }

    getTotalWriteoffLength = () => {

        // Calculate total length by taking one sheet from each group
        const processedGroups = new Set();
        let total_length = 0;

        this.sheets.forEach(sheet => {
            if (!processedGroups.has(sheet.group)) {
                total_length += sheet.length;
                processedGroups.add(sheet.group);
            }
        });

        return total_length;
    }

    renderSheets = () => {

        const container = this.modal.querySelector('.sheets-list');

        container.innerHTML = this.sheets.map((sheet, index) => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div class="d-flex align-items-center">
                    <span class="me-2"> ${index + 1}</span>
                    <input type="number" class="form-control form-control-sm me-2 border-0" style="width: 80px;" value="${sheet.width}" data-index="${index}" data-field="width">
                    ×
                    <input type="number" class="form-control form-control-sm mx-2 border-0" style="width: 80px;" value="${sheet.length}" data-index="${index}" data-field="width" disabled>
                    <span class="me-4"> ${getDimUnit(this.settings)}</span>
                    <div class="d-flex me-2">
                        <div class="form-check form-check-inline cbo mb-0">
                            <input class="form-check-input" type="radio" name="type_${index}" id="order_${index}" value="order" ${sheet.type === 'order' ? 'checked' : ''} data-index="${index}" data-field="type">
                            <label class="form-check-label form-text mt-0" for="order_${index}">${__html('Order')}</label>
                        </div>
                        <div class="form-check form-check-inline cbs mb-0">
                            <input class="form-check-input" type="radio" name="type_${index}" id="stock_${index}" value="stock" ${sheet.type === 'stock' ? 'checked' : ''} data-index="${index}" data-field="type">
                            <label class="form-check-label form-text mt-0" for="stock_${index}">${__html('Stock')}</label>
                        </div>
                        <div class="form-check form-check-inline cbw mb-0">
                            <input class="form-check-input" type="radio" name="type_${index}" id="waste_${index}" value="waste" ${sheet.type === 'waste' ? 'checked' : ''} data-index="${index}" data-field="type">
                            <label class="form-check-label form-text mt-0" for="waste_${index}">${__html('Waste')}</label>
                        </div>
                    </div>
                    ${sheet.notes ? ` - <span class="text-muted small">${sheet.notes}</span>` : ''}
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger btn-delete-sheet" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');

        // Add type change listeners for radio buttons
        container.querySelectorAll('input[data-field="type"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'), 10);
                const newType = e.target.value;
                this.sheets[index].type = newType;
            });
        });

        // Add width change listeners
        container.querySelectorAll('input[data-field="width"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'), 10);
                const newWidth = parseFloat(e.target.value) || 0;
                this.sheets[index].width = newWidth;
            });
        });

        // Add delete listeners
        onClick('.btn-delete-sheet', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            const groupToRemove = this.sheets[index].group;
            this.sheets = this.sheets.filter(sheet => sheet.group !== groupToRemove);
            this.renderSheets();
        });

        // refresh total length display
        let total_length = this.getTotalWriteoffLength();
        document.querySelector('.total-taken-length').innerHTML = __html('Total: %1$ %2$', total_length.toLocaleString('en-US', { maximumFractionDigits: 0 }), getDimUnit(this.settings));
    }
}