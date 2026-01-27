import { __html, getDimUnit } from "../../helpers/global.js";

export class Visualization {

    constructor(coil, items, settings) {
        this.coil = coil;
        this.items = items || [];
        this.settings = settings || {};
        this.sheets = [];
        this.maxSheetLength = 3000; // 3 meters in mm
        this.init();
    }

    init = () => {
        const canvas = document.getElementById('cuttingCanvas');

        this.CANVAS_HEIGHT = 400;
        this.MARGIN = 0;
        this.AVAILABLE_HEIGHT = this.CANVAS_HEIGHT - 2 * this.MARGIN;

        this.scale = this.AVAILABLE_HEIGHT / this.coil.width;
        this.sheetWidth = this.coil.width * this.scale;
        this.sheetHeight = this.coil.length * this.scale;
        this.CANVAS_WIDTH = Math.max(600, this.sheetHeight + 2 * this.MARGIN);

        canvas.setAttribute('width', this.CANVAS_WIDTH);
        canvas.setAttribute('height', this.CANVAS_HEIGHT);

        if (document.getElementById('scaleDisplay')) document.getElementById('scaleDisplay').textContent = `1:${Math.round(1 / this.scale)}`;

        const sheetOutline = document.getElementById('sheetOutline');
        sheetOutline.setAttribute('width', this.sheetHeight);
        sheetOutline.setAttribute('height', this.sheetWidth);

        const gridRect = canvas.querySelector('rect[fill="url(#grid)"]');
        gridRect.setAttribute('width', this.sheetHeight);
        gridRect.setAttribute('height', this.sheetWidth);

        this.colors = ['#fff3cd'];

        this.renderLayout();
    }

    packItems = (items) => {
        const packed = [];
        const sortedItems = [...items].sort((a, b) => (b.formula_width_calc * b.formula_length_calc) - (a.formula_width_calc * a.formula_length_calc));
        const sheets = [];
        let currentSheetStart = 0;

        // Create virtual sheets of max 3m length
        while (currentSheetStart < this.coil.length) {
            const sheetEnd = Math.min(currentSheetStart + this.maxSheetLength, this.coil.length);
            sheets.push({
                start: currentSheetStart,
                end: sheetEnd,
                length: sheetEnd - currentSheetStart,
                actualLength: 0, // Track actual used length
                items: []
            });
            currentSheetStart = sheetEnd;
        }

        // Pack items into sheets
        sortedItems.forEach((item) => {
            const width = parseFloat(item.formula_width_calc);
            const length = parseFloat(item.formula_length_calc);
            const qty = parseInt(item.qty);

            for (let q = 0; q < qty; q++) {
                let placed = false;

                // Try to place item in existing sheets
                for (const sheet of sheets) {
                    if (placed) break;

                    const orientations = [
                        { w: width, l: length, rotated: false },
                        { w: length, l: width, rotated: true }
                    ];

                    for (const orientation of orientations) {
                        if (placed) break;

                        // Check if item fits in sheet dimensions
                        if (orientation.w > this.coil.width || orientation.l > sheet.length) continue;

                        // Get positions from existing items in this sheet
                        const xPositions = new Set([0]);
                        const yPositions = new Set([0]);

                        sheet.items.forEach(p => {
                            xPositions.add(p.x - sheet.start);
                            xPositions.add(p.x - sheet.start + p.length);
                            yPositions.add(p.y);
                            yPositions.add(p.y + p.width);
                        });

                        // Sort X positions (length) to minimize sheet length
                        const sortedXPositions = Array.from(xPositions)
                            .filter(x => x <= sheet.length - orientation.l)
                            .sort((a, b) => a - b);

                        // Sort Y positions (width) 
                        const sortedYPositions = Array.from(yPositions)
                            .filter(y => y <= this.coil.width - orientation.w)
                            .sort((a, b) => a - b);

                        // Try X positions first (prioritize minimizing length)
                        for (const x of sortedXPositions) {
                            if (placed) break;
                            for (const y of sortedYPositions) {
                                const globalX = sheet.start + x;

                                // Check overlaps within this sheet
                                const overlaps = sheet.items.some(p =>
                                    globalX < p.x + p.length && globalX + orientation.l > p.x &&
                                    y < p.y + p.width && y + orientation.w > p.y
                                );

                                if (!overlaps) {
                                    const packedItem = {
                                        ...item,
                                        x: globalX,
                                        y: y,
                                        width: orientation.rotated ? length : width,
                                        length: orientation.rotated ? width : length,
                                        rotated: orientation.rotated,
                                        color: this.colors[packed.length % this.colors.length],
                                        instanceId: `${item.order_id}_${q}`,
                                        sheetIndex: sheets.indexOf(sheet)
                                    };

                                    packed.push(packedItem);
                                    sheet.items.push(packedItem);

                                    // Update actual used length for this sheet
                                    sheet.actualLength = Math.max(sheet.actualLength, x + orientation.l);

                                    placed = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });

        // Optimize sheet lengths based on actual usage
        this.optimizeSheetLengths(sheets);

        return packed;
    }

    packItemsLegacy = (items) => {
        const packed = [];
        const sortedItems = [...items].sort((a, b) => (b.formula_width_calc * b.formula_length_calc) - (a.formula_width_calc * a.formula_length_calc));
        const sheets = [];
        let currentSheetStart = 0;

        // Create virtual sheets of max 3m length
        while (currentSheetStart < this.coil.length) {
            const sheetEnd = Math.min(currentSheetStart + this.maxSheetLength, this.coil.length);
            sheets.push({
                start: currentSheetStart,
                end: sheetEnd,
                length: sheetEnd - currentSheetStart,
                actualLength: 0, // Track actual used length
                items: []
            });
            currentSheetStart = sheetEnd;
        }

        // Pack items into sheets
        sortedItems.forEach((item) => {
            const width = parseFloat(item.formula_width_calc);
            const length = parseFloat(item.formula_length_calc);
            const qty = parseInt(item.qty);

            for (let q = 0; q < qty; q++) {
                let placed = false;

                // Try to place item in existing sheets
                for (const sheet of sheets) {
                    if (placed) break;

                    const orientations = [
                        { w: width, l: length, rotated: false },
                        { w: length, l: width, rotated: true }
                    ];

                    for (const orientation of orientations) {
                        if (placed) break;

                        // Check if item fits in sheet dimensions
                        if (orientation.w > this.coil.width || orientation.l > sheet.length) continue;

                        // Get positions from existing items in this sheet
                        const yPositions = new Set([0]);
                        const xPositions = new Set([0]);

                        sheet.items.forEach(p => {
                            yPositions.add(p.y);
                            yPositions.add(p.y + p.width);
                            xPositions.add(p.x - sheet.start);
                            xPositions.add(p.x - sheet.start + p.length);
                        });

                        const sortedYPositions = Array.from(yPositions)
                            .filter(y => y <= this.coil.width - orientation.w)
                            .sort((a, b) => a - b);

                        const sortedXPositions = Array.from(xPositions)
                            .filter(x => x <= sheet.length - orientation.l)
                            .sort((a, b) => a - b);

                        for (const y of sortedYPositions) {
                            if (placed) break;
                            for (const x of sortedXPositions) {
                                const globalX = sheet.start + x;

                                // Check overlaps within this sheet
                                const overlaps = sheet.items.some(p =>
                                    globalX < p.x + p.length && globalX + orientation.l > p.x &&
                                    y < p.y + p.width && y + orientation.w > p.y
                                );

                                if (!overlaps) {
                                    const packedItem = {
                                        ...item,
                                        x: globalX,
                                        y: y,
                                        width: orientation.rotated ? length : width,
                                        length: orientation.rotated ? width : length,
                                        rotated: orientation.rotated,
                                        color: this.colors[packed.length % this.colors.length],
                                        instanceId: `${item.order_id}_${q}`,
                                        sheetIndex: sheets.indexOf(sheet)
                                    };

                                    packed.push(packedItem);
                                    sheet.items.push(packedItem);

                                    // Update actual used length for this sheet
                                    sheet.actualLength = Math.max(sheet.actualLength, x + orientation.l);

                                    placed = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });

        // Optimize sheet lengths based on actual usage
        this.optimizeSheetLengths(sheets);

        return packed;
    }

    optimizeSheetLengths = (sheets) => {
        // Adjust sheet lengths and positions based on actual usage
        let currentStart = 0;

        sheets.forEach(sheet => {
            if (sheet.items.length > 0) {
                // Set sheet length to actual used length (rounded up to nearest 10mm for practical cutting)
                sheet.optimizedLength = Math.ceil(sheet.actualLength / 10) * 10;
            } else {
                // Empty sheet - remove it
                sheet.optimizedLength = 0;
            }

            // Update sheet boundaries
            sheet.optimizedStart = currentStart;
            sheet.optimizedEnd = currentStart + sheet.optimizedLength;

            // Update item positions to reflect new sheet boundaries
            sheet.items.forEach(item => {
                const relativeX = item.x - sheet.start;
                item.x = sheet.optimizedStart + relativeX;
            });

            currentStart = sheet.optimizedEnd;
        });

        // Store optimized sheets for rendering
        this.optimizedSheets = sheets.filter(sheet => sheet.optimizedLength > 0);
    }

    renderLayout = () => {
        const packedItems = this.packItems(this.items);
        const itemsGroup = document.getElementById('itemsGroup');
        const labelsGroup = document.getElementById('labelsGroup');
        const itemsList = document.getElementById('itemsList');

        itemsGroup.innerHTML = '';
        labelsGroup.innerHTML = '';

        // Add cutting lines between optimized sheets
        this.renderOptimizedSheetBoundaries(itemsGroup);

        // Render items
        packedItems.forEach((item) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', this.MARGIN + item.x * this.scale);
            rect.setAttribute('y', this.MARGIN + item.y * this.scale);
            rect.setAttribute('width', item.length * this.scale);
            rect.setAttribute('height', item.width * this.scale);
            rect.setAttribute('fill', item.color);
            rect.setAttribute('stroke', '#333');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('opacity', '0.7');
            rect.setAttribute('title', `${item.title} (${item.width}×${item.length})${item.rotated ? ' - Rotated' : ''}`);

            itemsGroup.appendChild(rect);

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

        // Calculate metrics based on optimized sheets
        const totalItemArea = packedItems.reduce((sum, item) => sum + (item.width * item.length), 0);
        const totalOptimizedArea = this.optimizedSheets ?
            this.optimizedSheets.reduce((sum, sheet) => sum + (sheet.optimizedLength * this.coil.width), 0) : 0;
        const totalOptimizedLength = this.optimizedSheets ?
            this.optimizedSheets.reduce((sum, sheet) => sum + sheet.optimizedLength, 0) : 0;

        const utilization = totalOptimizedArea > 0 ? ((totalItemArea / totalOptimizedArea) * 100).toFixed(1) : '0.0';
        const wasteAreaMm2 = totalOptimizedArea - totalItemArea;
        const wasteArea = (wasteAreaMm2 / 1000000).toFixed(2);

        this.maxLength = totalOptimizedLength;

        document.getElementById('totalItems').textContent = packedItems.length;
        document.getElementById('utilization').textContent = utilization + '%';
        document.getElementById('wasteArea').textContent = wasteArea;
        document.querySelector('.total-taken-length').innerHTML = __html('Total: %1$ %2$ (%3$ sheets)', totalOptimizedLength.toLocaleString('en-US', { maximumFractionDigits: 0 }), getDimUnit(this.settings), this.optimizedSheets?.length || 0);
        document.getElementById('length').value = totalOptimizedLength.toFixed(0);
    }

    renderOptimizedSheetBoundaries = (group) => {
        // Draw vertical lines between optimized sheets
        if (this.optimizedSheets) {
            this.optimizedSheets.forEach((sheet, index) => {
                if (index > 0) { // Don't draw line before first sheet
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', this.MARGIN + sheet.optimizedStart * this.scale);
                    line.setAttribute('y1', this.MARGIN);
                    line.setAttribute('x2', this.MARGIN + sheet.optimizedStart * this.scale);
                    line.setAttribute('y2', this.MARGIN + this.sheetWidth);
                    line.setAttribute('stroke', '#dc3545');
                    line.setAttribute('stroke-width', '3');
                    line.setAttribute('stroke-dasharray', '10,5');
                    line.setAttribute('opacity', '0.8');

                    group.appendChild(line);
                }
            });
        }
    }

    renderSheetBoundaries = (group) => {
        // Draw vertical lines every 3 meters (original method - kept for compatibility)
        for (let x = this.maxSheetLength; x < this.coil.length; x += this.maxSheetLength) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', this.MARGIN + x * this.scale);
            line.setAttribute('y1', this.MARGIN);
            line.setAttribute('x2', this.MARGIN + x * this.scale);
            line.setAttribute('y2', this.MARGIN + this.sheetWidth);
            line.setAttribute('stroke', '#dc3545');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-dasharray', '10,5');
            line.setAttribute('opacity', '0.8');

            group.appendChild(line);
        }
    }

    getCuttingLines = (packedItems) => {
        const lines = new Set();

        // Add optimized sheet boundaries instead of fixed 3m boundaries
        if (this.optimizedSheets) {
            this.optimizedSheets.forEach(sheet => {
                lines.add(sheet.optimizedEnd);
            });
        }

        // Add item end positions within each sheet
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
