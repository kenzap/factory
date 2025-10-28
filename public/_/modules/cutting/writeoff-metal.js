import { createProductBundle } from "../../api/create_product_bundle.js";
import { __html, getDimUnit, onClick, toast } from "../../helpers/global.js";

export class WriteoffMetal {

    constructor(coil, items, settings, cb) {

        this.coil = coil;

        this.items = items || [];

        this.settings = settings || {};

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
        this.modal.querySelector(".modal-title").innerHTML = `
            ${this.coil.supplier} / ${this.coil.width} × ${this.coil.length} ${getDimUnit(this.settings)}
        `;


        this.modal.querySelector(".modal-content").innerHTML = `
            <div class="vertical-text d-none">${this.coil.thickness ? this.coil.thickness + getDimUnit(this.settings) : ""}</div>
            <div class="modal-header bg-light border-0"> 
            <h5 class="modal-title">
                <i class="bi bi-scissors me-2"></i>
                ${this.coil.supplier} / ${this.coil.width} × ${this.coil.length} ${getDimUnit(this.settings)}
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
                                    <div class="text-muted small">
                                        Sheet: ${this.coil.width} × ${this.coil.length} ${getDimUnit(this.settings)}
                                    </div>
                                    <div class="text-muted small">
                                        Scale: <span id="scaleDisplay">1:100</span>
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
                                            <h6 class="small text-muted mb-2">${__html('Items to Cut')}</h6>
                                            <div id="itemsList" class="small" style="max-height: 150px; overflow-y: auto;">
                                                <!-- Items list will be populated here -->
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <h6 class="small text-muted mb-2">${__html('Layout Statistics')}</h6>
                                            <div id="layoutStats" class="small">
                                                <div>Total items: <span id="totalItems">0</span></div>
                                                <div>Material utilization: <span id="utilization">0%</span></div>
                                                <div>Waste area: <span id="wasteArea">0</span> ${getDimUnit(this.settings)}²</div>
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

    initVisualization = () => {
        const canvas = document.getElementById('cuttingCanvas');
        const itemsGroup = document.getElementById('itemsGroup');
        const labelsGroup = document.getElementById('labelsGroup');
        const itemsList = document.getElementById('itemsList');
        const layoutStats = document.getElementById('layoutStats');

        this.CANVAS_HEIGHT = 400; // Reduced from 600 to 400
        this.MARGIN = 0;
        this.AVAILABLE_HEIGHT = this.CANVAS_HEIGHT - 2 * this.MARGIN; // 400px for sheet width

        // Calculate scale based on sheet width fitting in available height
        this.scale = this.AVAILABLE_HEIGHT / this.coil.width;

        this.sheetWidth = this.coil.width * this.scale; // Will be ~400px
        this.sheetHeight = this.coil.length * this.scale; // Can be very long
        this.CANVAS_WIDTH = Math.max(600, this.sheetHeight + 2 * this.MARGIN); // Reduced from 800 to 600

        // Update canvas dimensions
        canvas.setAttribute('width', this.CANVAS_WIDTH);
        canvas.setAttribute('height', this.CANVAS_HEIGHT);

        // Update scale display
        document.getElementById('scaleDisplay').textContent = `1:${Math.round(1 / this.scale)}`;

        // Set sheet outline - rotated: width becomes height, length becomes width
        const sheetOutline = document.getElementById('sheetOutline');
        sheetOutline.setAttribute('width', this.sheetHeight); // length on X-axis
        sheetOutline.setAttribute('height', this.sheetWidth); // width on Y-axis

        // Update grid pattern to match new dimensions
        const gridRect = canvas.querySelector('rect[fill="url(#grid)"]');
        gridRect.setAttribute('width', this.sheetHeight);
        gridRect.setAttribute('height', this.sheetWidth);

        // Color palette for different items
        this.colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];

        this.renderLayout();
    }

    packItems = (items) => {
        const packed = [];
        const sortedItems = [...items].sort((a, b) => (b.formula_width_calc * b.formula_length_calc) - (a.formula_width_calc * a.formula_length_calc));

        // Track the maximum x position used to minimize length usage
        let maxXUsed = 0;

        sortedItems.forEach((item, index) => {
            const width = parseFloat(item.formula_width_calc);
            const length = parseFloat(item.formula_length_calc);
            const qty = parseInt(item.qty);

            for (let q = 0; q < qty; q++) {
                let placed = false;
                let bestX = 0, bestY = 0, bestRotated = false;
                let minXExtent = this.coil.length; // Start with maximum possible length

                // Try both normal and rotated orientations
                const orientations = [
                    { w: width, l: length, rotated: false },
                    { w: length, l: width, rotated: true }
                ];

                for (const orientation of orientations) {
                    // Check if the orientation fits within the coil dimensions
                    if (orientation.w > this.coil.width || orientation.l > this.coil.length) continue;

                    // Try to find the position that minimizes the extension of coil length usage
                    for (let y = 0; y <= this.coil.width - orientation.w; y += 10) {
                        for (let x = 0; x <= this.coil.length - orientation.l; x += 10) {
                            const overlaps = packed.some(p =>
                                x < p.x + p.length && x + orientation.l > p.x &&
                                y < p.y + p.width && y + orientation.w > p.y
                            );

                            if (!overlaps) {
                                const xExtent = x + orientation.l;
                                // Prefer positions that don't extend the used length, or extend it minimally
                                if (xExtent <= maxXUsed || xExtent < minXExtent) {
                                    bestX = x;
                                    bestY = y;
                                    bestRotated = orientation.rotated;
                                    minXExtent = xExtent;
                                    placed = true;

                                    // If we can fit within already used length, break immediately
                                    if (xExtent <= maxXUsed) break;
                                }
                            }
                        }
                        // If we found a position within already used length, break
                        if (placed && minXExtent <= maxXUsed) break;
                    }
                    // If we found a good position, break from orientation loop
                    if (placed && minXExtent <= maxXUsed) break;
                }

                if (placed) {
                    packed.push({
                        ...item,
                        x: bestX,
                        y: bestY,
                        width: bestRotated ? length : width,
                        length: bestRotated ? width : length,
                        rotated: bestRotated,
                        color: this.colors[index % this.colors.length],
                        instanceId: `${item.order_id}_${q}`
                    });

                    // Update the maximum x position used
                    maxXUsed = Math.max(maxXUsed, bestX + (bestRotated ? width : length));
                }
            }
        });

        return packed;
    }

    renderLayout = () => {
        const packedItems = this.packItems(this.items);
        const itemsGroup = document.getElementById('itemsGroup');
        const labelsGroup = document.getElementById('labelsGroup');
        const itemsList = document.getElementById('itemsList');

        // Clear previous render
        itemsGroup.innerHTML = '';
        labelsGroup.innerHTML = '';

        // Render items
        packedItems.forEach((item, index) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', this.MARGIN + item.x * this.scale); // length position
            rect.setAttribute('y', this.MARGIN + item.y * this.scale); // width position
            rect.setAttribute('width', item.length * this.scale); // length as width
            rect.setAttribute('height', item.width * this.scale); // width as height
            rect.setAttribute('fill', item.color);
            rect.setAttribute('stroke', '#333');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('opacity', '0.7');
            rect.setAttribute('title', `${item.title} (${item.width}×${item.length})${item.rotated ? ' - Rotated' : ''}`);

            itemsGroup.appendChild(rect);

            // Add text label if item is large enough
            if (item.length * this.scale > 30 && item.width * this.scale > 20) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', this.MARGIN + item.x * this.scale + (item.length * this.scale) / 2);
                text.setAttribute('y', this.MARGIN + item.y * this.scale + (item.width * this.scale) / 2);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('font-size', '12');
                text.setAttribute('fill', '#333');
                text.textContent = item.width + '×' + item.length + (item.rotated ? ' ↻' : '');

                labelsGroup.appendChild(text);
            }
        });

        // Update items list
        const itemCounts = {};
        packedItems.forEach(item => {
            const key = item.order_id;
            itemCounts[key] = (itemCounts[key] || 0) + 1;
        });

        itemsList.innerHTML = Object.entries(itemCounts).map(([orderId, count]) => {
            const item = this.items.find(i => i.order_id === orderId);
            return `
                    <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                        <span>${item.title}</span>
                        <span class="text-muted">${count}×</span>
                    </div>
                `;
        }).join('');

        // Calculate statistics
        const totalItemArea = packedItems.reduce((sum, item) => sum + (item.width * item.length), 0);
        const sheetArea = this.coil.width * this.coil.length;
        const utilization = ((totalItemArea / sheetArea) * 100).toFixed(1);
        const wasteArea = (sheetArea - totalItemArea).toFixed(0);

        document.getElementById('totalItems').textContent = packedItems.length;
        document.getElementById('utilization').textContent = utilization + '%';
        document.getElementById('wasteArea').textContent = wasteArea;
    }

    init = () => {

        this.initVisualization();

        this.listeners();
    }

    statusBadge(entry) {

        if (!entry.status) return `< span class= "item-status status-primary" > ${__html('Published')}</span > `;
        if (entry.status == 'waiting') return `< span class= "item-status status-warning" > ${__html('Waiting')}</span > `;
    }

    listeners = () => {

        onClick('.btn-add-bundle-record', async (e) => {
            e.preventDefault();

            const bundle_id = this.product_bundle?._id || this.product_bundle._id;
            const color = document.querySelector('#productColor').value.trim();
            const coating = document.querySelector('#productCoating').value.trim();
            const qty = parseInt(document.querySelector('#qty').value.trim(), 10) || 1;
            const orderId = this.orderId;

            // console.log('Add bundle record:', { bundle_id, color, coating, qty, orderId });

            if (!bundle_id) {
                alert(__html('Please select a product'));
                return;
            }

            // Create product bundle from the selected product
            createProductBundle(
                {
                    product_id: this.product_id,
                    product_color: this.color,
                    product_coating: this.coating,
                    bundle_id: bundle_id,
                    bundle_color: color,
                    bundle_coating: coating,
                    bundle_qty: qty
                }, (response) => {

                    if (!response.success) {
                        alert(__html('Error: %1$', response.error));
                        return;
                    }

                    toast(__html('Changes applied'));

                    // this.modal_cont.hide();
                    this.data();

                    response.orderId = this.orderId;

                    this.cb(response);
                });
        });

        onClick('.btn-add-sheet', (e) => {

            e.preventDefault();

            // Get values
            const length = document.getElementById('length').value;
            const qty = parseInt(document.getElementById('qty').value) || 1;
            const notes = document.getElementById('notes').value;

            // Add sheet multiple times based on qty
            for (let i = 0; i < qty; i++) {
                // Calculate width per sheet, ensuring total matches coil.width
                const widthPerSheet = Math.floor(this.coil.width / qty);
                const remainder = this.coil.width % qty;

                // Add sheets with calculated widths
                const sheetWidth = i < remainder ? widthPerSheet + 1 : widthPerSheet;
                this.sheets.push({
                    width: sheetWidth,
                    length: length,
                    qty: 1, // Each individual sheet has qty of 1
                    notes: notes
                });
            }

            console.log('Sheets after addition:', this.sheets);

            this.renderSheets();
        });
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
            this.sheets.splice(index, 1);
            this.renderSheets();
        });
    }
}