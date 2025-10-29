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

        // Track vertical strips - each strip represents a section between cuts
        const strips = [];
        let currentX = 0;

        // Process items by creating vertical strips
        for (const item of sortedItems) {
            const width = parseFloat(item.formula_width_calc);
            const length = parseFloat(item.formula_length_calc);
            const qty = parseInt(item.qty);

            for (let q = 0; q < qty; q++) {
                let placed = false;
                let bestStripIndex = -1;
                let bestY = 0;
                let bestRotated = false;
                let bestItemLength = 0;

                // Try both orientations
                const orientations = [
                    { w: width, l: length, rotated: false },
                    { w: length, l: width, rotated: true }
                ];

                for (const orientation of orientations) {
                    if (orientation.w > this.coil.width) continue;

                    // Try to fit in existing strips
                    for (let stripIndex = 0; stripIndex < strips.length; stripIndex++) {
                        const strip = strips[stripIndex];

                        // Check if item fits in the strip width
                        if (strip.x + orientation.l <= strip.x + strip.width) {
                            // Find available Y position in this strip
                            let y = 0;
                            let canFit = true;

                            // Check for overlaps with existing items in this strip
                            const stripItems = packed.filter(p =>
                                p.x >= strip.x && p.x + p.length <= strip.x + strip.width
                            );

                            // Sort strip items by Y position
                            stripItems.sort((a, b) => a.y - b.y);

                            for (const stripItem of stripItems) {
                                if (y + orientation.w <= stripItem.y) {
                                    // Found space before this item
                                    break;
                                }
                                y = stripItem.y + stripItem.width;
                            }

                            // Check if there's enough space at this Y position
                            if (y + orientation.w <= this.coil.width) {
                                bestStripIndex = stripIndex;
                                bestY = y;
                                bestRotated = orientation.rotated;
                                bestItemLength = orientation.l;
                                placed = true;
                                break;
                            }
                        }
                    }

                    if (placed) break;
                }

                // If not placed in existing strips, create a new strip
                if (!placed) {
                    for (const orientation of orientations) {
                        if (orientation.w > this.coil.width || currentX + orientation.l > this.coil.length) continue;

                        // Create new strip
                        const newStrip = {
                            x: currentX,
                            width: orientation.l,
                            maxY: orientation.w
                        };

                        strips.push(newStrip);
                        bestStripIndex = strips.length - 1;
                        bestY = 0;
                        bestRotated = orientation.rotated;
                        bestItemLength = orientation.l;
                        currentX += orientation.l;
                        placed = true;
                        break;
                    }
                }

                if (placed) {
                    const strip = strips[bestStripIndex];
                    packed.push({
                        ...item,
                        x: strip.x,
                        y: bestY,
                        width: bestRotated ? length : width,
                        length: bestItemLength,
                        rotated: bestRotated,
                        color: this.colors[packed.length % this.colors.length],
                        instanceId: `${item.order_id}_${q}`
                    });

                    // Update strip's max Y usage
                    strip.maxY = Math.max(strip.maxY, bestY + (bestRotated ? length : width));
                }
            }
        }

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
        const cuttingLines = this.getCuttingLines(packedItems);
        this.renderCuttingLines(itemsGroup, cuttingLines);

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