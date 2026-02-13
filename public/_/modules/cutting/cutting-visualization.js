import { __html, getDimUnit } from "../../helpers/global.js";

export class Visualization {

    constructor(coil, items, settings) {
        this.coil = coil;
        this.items = items || [];
        this.settings = settings || {};
        this.sheets = [];
        this.optimizedSheets = 0; // Track number of sheets needed
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

        const sheetOutline = document.getElementById('sheetOutline');
        sheetOutline.setAttribute('width', this.sheetHeight);
        sheetOutline.setAttribute('height', this.sheetWidth);

        const gridRect = canvas.querySelector('rect[fill="url(#grid)"]');
        gridRect.setAttribute('width', this.sheetHeight);
        gridRect.setAttribute('height', this.sheetWidth);

        // Keep original color palette
        this.colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];

        this.renderLayout();
    }

    /**
     * Performance-optimized packing algorithm
     * Uses spatial indexing and early termination for faster placement
     */
    packItems = (items) => {
        const packed = [];

        // Sort by area (largest first)
        const sortedItems = [...items].sort((a, b) =>
            (b.formula_width_calc * b.formula_length_calc) - (a.formula_width_calc * a.formula_length_calc)
        );

        let maxXUsed = 0;

        sortedItems.forEach((item, index) => {
            const width = parseFloat(item.formula_width_calc);
            const length = parseFloat(item.formula_length_calc);
            const qty = parseInt(item.qty);
            const color = this.colors[index % this.colors.length]; // Assign color per unique item

            for (let q = 0; q < qty; q++) {
                const placement = this.findBestPlacement(packed, width, length, maxXUsed);

                if (placement) {
                    packed.push({
                        ...item,
                        x: placement.x,
                        y: placement.y,
                        width: placement.width,
                        length: placement.length,
                        rotated: placement.rotated,
                        color: color, // Use the same color for all instances of this item
                        instanceId: `${item.order_id}_${q}`
                    });

                    maxXUsed = Math.max(maxXUsed, placement.x + placement.length);
                }
            }
        });

        return packed;
    }

    /**
     * Optimized placement finder with performance improvements:
     * - Early termination when perfect spot found
     * - Candidate spot detection (corners of existing items)
     * - Coarser grid with refinement
     */
    findBestPlacement = (packed, width, length, maxXUsed) => {
        let bestPlacement = null;
        let bestScore = Infinity;

        const orientations = [
            { w: width, l: length, rotated: false },
            { w: length, l: width, rotated: true }
        ];

        for (const orientation of orientations) {
            if (orientation.w > this.coil.width || orientation.l > this.coil.length) {
                continue;
            }

            // Performance optimization: Generate candidate positions instead of full grid search
            const candidates = this.getCandidatePositions(packed, orientation, maxXUsed);

            for (const pos of candidates) {
                const { x, y } = pos;

                // Quick bounds check
                if (x + orientation.l > this.coil.length || y + orientation.w > this.coil.width) {
                    continue;
                }

                if (!this.hasOverlap(packed, x, y, orientation.l, orientation.w)) {
                    const score = this.calculatePlacementScore(x, y, orientation.l, orientation.w, maxXUsed);

                    if (score < bestScore) {
                        bestScore = score;
                        bestPlacement = {
                            x: x,
                            y: y,
                            width: orientation.w,
                            length: orientation.l,
                            rotated: orientation.rotated
                        };

                        // Early termination: if score is perfect (0 = fits in existing space at origin)
                        if (score === 0) {
                            return bestPlacement;
                        }
                    }
                }
            }
        }

        return bestPlacement;
    }

    /**
     * Generate smart candidate positions instead of full grid search
     * This dramatically reduces the number of positions to check
     */
    getCandidatePositions = (packed, orientation, maxXUsed) => {
        const candidates = new Set();

        // Always try origin
        candidates.add(this.posKey(0, 0));

        // Try positions along the maxXUsed boundary (to pack tight without extending)
        if (maxXUsed > 0 && maxXUsed + orientation.l <= this.coil.length) {
            const step = Math.max(10, orientation.w / 2);
            for (let y = 0; y <= this.coil.width - orientation.w; y += step) {
                candidates.add(this.posKey(maxXUsed, y));
            }
        }

        // Add corner positions from existing items (these are often optimal)
        packed.forEach(item => {
            const corners = [
                { x: item.x + item.length, y: item.y }, // Right edge
                { x: item.x, y: item.y + item.width },  // Bottom edge
                { x: item.x + item.length, y: item.y + item.width }, // Bottom-right corner
                { x: 0, y: item.y + item.width }, // Left edge at item bottom
                { x: item.x + item.length, y: 0 }, // Top edge at item right
            ];

            corners.forEach(corner => {
                if (corner.x + orientation.l <= this.coil.length &&
                    corner.y + orientation.w <= this.coil.width) {
                    candidates.add(this.posKey(corner.x, corner.y));
                }
            });
        });

        // Add a coarse grid as backup (much coarser than before)
        const gridStep = Math.max(20, Math.min(orientation.w, orientation.l) / 2);
        for (let y = 0; y <= this.coil.width - orientation.w; y += gridStep) {
            for (let x = 0; x <= Math.min(maxXUsed + orientation.l, this.coil.length - orientation.l); x += gridStep) {
                candidates.add(this.posKey(x, y));
            }
        }

        // Convert Set back to position objects
        return Array.from(candidates).map(key => {
            const [x, y] = key.split(',').map(Number);
            return { x, y };
        });
    }

    /**
     * Helper to create unique position key for Set
     */
    posKey = (x, y) => `${Math.round(x)},${Math.round(y)}`;

    /**
     * Optimized overlap detection
     */
    hasOverlap = (packed, x, y, length, width) => {
        const x2 = x + length;
        const y2 = y + width;

        for (let i = 0; i < packed.length; i++) {
            const p = packed[i];
            const px2 = p.x + p.length;
            const py2 = p.y + p.width;

            // Check if rectangles overlap
            if (x < px2 && x2 > p.x && y < py2 && y2 > p.y) {
                return true;
            }
        }
        return false;
    }

    /**
     * Simplified scoring - removed expensive edge-touching calculation
     * for better performance while maintaining good packing quality
     */
    calculatePlacementScore = (x, y, length, width, maxXUsed) => {
        const xEnd = x + length;
        let score = 0;

        // Primary: Minimize extension of used length
        if (xEnd > maxXUsed) {
            score += (xEnd - maxXUsed) * 1000;
        }

        // Secondary: Prefer bottom-left positioning
        score += y * 10;
        score += x * 1;

        // Bonus for positions at origin or along edges
        if (x === 0) score -= 3;
        if (y === 0) score -= 3;

        return score;
    }

    /**
     * Calculate how many sheets need to be cut based on total taken length
     */
    calculateOptimizedSheets = (totalTakenLength) => {
        if (totalTakenLength === 0) {
            return 0;
        }
        // Calculate how many full sheets are needed
        // Sheets are cut from the coil at coil.length intervals
        return Math.ceil(totalTakenLength / this.coil.length);
    }

    renderLayout = () => {
        const packedItems = this.packItems(this.items);
        const itemsGroup = document.getElementById('itemsGroup');
        const labelsGroup = document.getElementById('labelsGroup');
        const itemsList = document.getElementById('itemsList');

        // Clear previous render
        itemsGroup.innerHTML = '';
        labelsGroup.innerHTML = '';

        // Calculate total taken length
        const totalTakenLength = packedItems.length > 0
            ? Math.max(...packedItems.map(item => item.x + item.length))
            : 0;

        // Calculate optimized sheets (number of cuts needed)
        this.optimizedSheets = this.calculateOptimizedSheets(totalTakenLength);

        // Render items
        packedItems.forEach((item, index) => {
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

        // Update total taken length
        const totalTakenLengthElement = document.querySelector('.total-taken-length');
        if (totalTakenLengthElement) {
            totalTakenLengthElement.textContent = __html('Total: %1$ %2$ (%3$ sheets)', totalTakenLength.toLocaleString('en-US', { maximumFractionDigits: 0 }), getDimUnit(this.settings), this.optimizedSheets);
            document.getElementById('length').value = totalTakenLength.toFixed(0);
        }

        // Update optimized sheets count
        const optimizedSheetsElement = document.querySelector('.optimized-sheets');
        if (optimizedSheetsElement) {
            optimizedSheetsElement.textContent = this.optimizedSheets;
        }
    }
}