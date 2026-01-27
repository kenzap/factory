import { __html, getDimUnit } from "../../helpers/global.js";

export class Visualization {

    constructor(coil, items, settings) {
        this.coil = coil;
        this.items = items || [];
        this.settings = settings || {};
        this.sheets = [];
        this.init();
    }

    init = () => {
        const canvas = document.getElementById('cuttingCanvas');

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
        if (document.getElementById('scaleDisplay')) document.getElementById('scaleDisplay').textContent = `1:${Math.round(1 / this.scale)}`;

        // Set sheet outline - rotated: width becomes height, length becomes width
        const sheetOutline = document.getElementById('sheetOutline');
        sheetOutline.setAttribute('width', this.sheetHeight); // length on X-axis
        sheetOutline.setAttribute('height', this.sheetWidth); // width on Y-axis

        // Update grid pattern to match new dimensions
        const gridRect = canvas.querySelector('rect[fill="url(#grid)"]');
        gridRect.setAttribute('width', this.sheetHeight);
        gridRect.setAttribute('height', this.sheetWidth);

        // Color palette for different items
        this.colors = ['#fff3cd']; //  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'

        this.renderLayout();
    }

    packItems = (items) => {
        const packed = [];
        const sortedItems = [...items].sort((a, b) => (b.formula_width_calc * b.formula_length_calc) - (a.formula_width_calc * a.formula_length_calc));

        // Track the maximum x position used to minimize length usage
        let maxXUsed = 0;

        sortedItems.forEach((item, itemIndex) => {
            const width = parseFloat(item.formula_width_calc);
            const length = parseFloat(item.formula_length_calc);
            const qty = parseInt(item.qty);

            for (let q = 0; q < qty; q++) {
                let placed = false;
                let bestX = 0, bestY = 0, bestRotated = false;
                let minXExtent = this.coil.length;

                const orientations = [
                    { w: width, l: length, rotated: false },
                    { w: length, l: width, rotated: true }
                ];

                for (const orientation of orientations) {
                    if (orientation.w > this.coil.width || orientation.l > this.coil.length) continue;

                    // Get all unique Y positions where items could be placed (edges of existing items)
                    const yPositions = new Set([0]);
                    packed.forEach(p => {
                        yPositions.add(p.y);
                        yPositions.add(p.y + p.width);
                    });
                    const sortedYPositions = Array.from(yPositions).filter(y => y <= this.coil.width - orientation.w).sort((a, b) => a - b);

                    // Get all unique X positions where items could be placed
                    const xPositions = new Set([0]);
                    packed.forEach(p => {
                        xPositions.add(p.x);
                        xPositions.add(p.x + p.length);
                    });
                    const sortedXPositions = Array.from(xPositions).filter(x => x <= this.coil.length - orientation.l).sort((a, b) => a - b);

                    for (const y of sortedYPositions) {
                        for (const x of sortedXPositions) {
                            const overlaps = packed.some(p =>
                                x < p.x + p.length && x + orientation.l > p.x &&
                                y < p.y + p.width && y + orientation.w > p.y
                            );

                            if (!overlaps) {
                                const xExtent = x + orientation.l;
                                if (xExtent <= maxXUsed || xExtent < minXExtent) {
                                    bestX = x;
                                    bestY = y;
                                    bestRotated = orientation.rotated;
                                    minXExtent = xExtent;
                                    placed = true;

                                    if (xExtent <= maxXUsed) break;
                                }
                            }
                        }
                        if (placed && minXExtent <= maxXUsed) break;
                    }
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
                        color: this.colors[packed.length % this.colors.length],
                        instanceId: `${item.order_id}_${q}`
                    });

                    maxXUsed = Math.max(maxXUsed, bestX + (bestRotated ? width : length));
                }
            }
        });

        return packed;
    }

    packItemsLegacy = (items) => {
        const packed = [];
        const sortedItems = [...items].sort((a, b) => (b.formula_width_calc * b.formula_length_calc) - (a.formula_width_calc * a.formula_length_calc));

        // Track the maximum x position used to minimize length usage
        let maxXUsed = 0;

        sortedItems.forEach((item, itemIndex) => {
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
                        color: this.colors[packed.length % this.colors.length],
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

        // Add cutting lines visualization
        // const cuttingLines = this.getCuttingLines(packedItems);
        // this.renderCuttingLines(itemsGroup, cuttingLines);

        // Render items
        packedItems.forEach((item) => {
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
                if (item.rotated) {
                    text.setAttribute('writing-mode', 'vertical-rl');
                    text.setAttribute('text-orientation', 'mixed');
                }
                text.textContent = item.width + '×' + item.length;

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
                        <span class="text-muted">x ${count}</span>
                    </div>
                `;
        }).join('');

        // Calculate statistics
        const totalItemArea = packedItems.reduce((sum, item) => sum + (item.width * item.length), 0);
        const sheetArea = this.coil.width * this.coil.length;
        const utilization = ((totalItemArea / sheetArea) * 100).toFixed(1);

        // Calculate maximum utilized length
        const maxLength = packedItems.length > 0
            ? Math.max(...packedItems.map(item => item.x + item.length))
            : 0;

        // Calculate waste area based on actual used sheet area (before last cut)
        const usedSheetArea = this.coil.width * maxLength;
        const wasteAreaMm2 = usedSheetArea - totalItemArea;
        const wasteArea = (wasteAreaMm2 / 1000000).toFixed(2); // Convert mm² to m²
        const length = maxLength.toFixed(0);

        this.maxLength = maxLength;

        // Update statistics display
        document.getElementById('totalItems').textContent = packedItems.length;
        document.getElementById('utilization').textContent = utilization + '%';
        document.getElementById('wasteArea').textContent = wasteArea;
        document.querySelector('.total-taken-length').innerHTML = __html('Total: %1$ %2$', maxLength.toLocaleString('en-US', { maximumFractionDigits: 0 }), getDimUnit(this.settings));
        document.getElementById('length').value = length;
    }

    getCuttingLines = (packedItems) => {
        const lines = new Set();

        // Get all unique X positions where cuts would be made
        packedItems.forEach(item => {
            lines.add(item.x + item.length);
        });

        return Array.from(lines).sort((a, b) => a - b);
    }

    renderCuttingLines = (group, cuttingLines) => {
        cuttingLines.forEach(x => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', this.MARGIN + x * this.scale);
            line.setAttribute('y1', this.MARGIN);
            line.setAttribute('x2', this.MARGIN + x * this.scale);
            line.setAttribute('y2', this.MARGIN + this.sheetWidth);
            line.setAttribute('stroke', '#664d03');
            line.setAttribute('stroke-width', '4');
            line.setAttribute('stroke-dasharray', '5,5');
            line.setAttribute('opacity', '1');

            group.appendChild(line);
        });
    }

    getUsedOrderLength() {

        return parseFloat(this.maxLength) || 0;
    }
}
