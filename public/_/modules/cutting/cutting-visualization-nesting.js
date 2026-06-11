export class NestingVisualization {

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d') || null;
        this.currentKey = '';
    }

    clear(message = 'Waiting for preview', details = '') {
        if (!this.ctx || !this.canvas) return;

        const width = Math.max(this.canvas?.parentElement?.clientWidth || 960, 640);
        const height = Math.max(Math.round(width * 0.58), 360);
        this.resizeCanvas(width, height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, width, height);
        this.drawGrid(width, height);

        this.ctx.fillStyle = '#495057';
        this.ctx.font = '500 20px system-ui';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, width / 2, height / 2 - 10);

        if (details) {
            this.ctx.fillStyle = '#adb5bd';
            this.ctx.font = '400 13px system-ui';
            this.ctx.fillText(details, width / 2, height / 2 + 20);
        }
    }

    async renderSheet(sheet) {
        if (!sheet?.svg) {
            this.currentKey = '';
            this.clear('Waiting for preview', 'Preview will appear once nesting starts.');
            return;
        }

        const svg = String(sheet.svg);
        const key = `${sheet.index}:${svg.length}:${svg.slice(0, 64)}:${svg.slice(-64)}`;
        if (this.currentKey === key) return;

        const bounds = this.extractBounds(svg);
        const containerWidth = Math.max(this.canvas?.parentElement?.clientWidth || 960, 640);
        const panelHeight = this.canvas?.parentElement?.parentElement?.clientHeight || 0;

        const naturalHeight = Math.round(containerWidth * (bounds.height / bounds.width));

        let targetWidth = containerWidth;
        let targetHeight = naturalHeight;

        // Scale down to fit panel height when the sheet is taller than the visible area
        if (panelHeight > 100 && naturalHeight > panelHeight) {
            targetHeight = panelHeight;
            targetWidth = Math.round(targetHeight * (bounds.width / bounds.height));
        }

        targetWidth = Math.max(targetWidth, 360);
        targetHeight = Math.max(targetHeight, 360);

        this.resizeCanvas(targetWidth, targetHeight);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, targetWidth, targetHeight);
        this.drawGrid(targetWidth, targetHeight);

        const image = await this.loadSvgImage(this.styleSvg(svg));
        this.ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
        this.currentKey = key;
    }

    resizeCanvas(width, height) {
        if (!this.canvas || !this.ctx) return;

        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    drawGrid(width, height) {
        const step = 32;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= height; y += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    extractBounds(svg) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const root = doc.documentElement;

        const viewBox = String(root?.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
        if (viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3]) && viewBox[2] > 0 && viewBox[3] > 0) {
            return { width: viewBox[2], height: viewBox[3] };
        }

        const width = Number(root?.getAttribute('width')) || 1200;
        const height = Number(root?.getAttribute('height')) || 700;
        return { width, height };
    }

    styleSvg(svg) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const root = doc.documentElement;

        // Sheet background: neutral light surface instead of flat gray
        root.querySelectorAll('[fill="#D3D3D3"], [fill="#d3d3d3"]').forEach(el => {
            el.setAttribute('fill', '#f0f4f9');
            el.setAttribute('stroke', '#9db0c8');
        });

        // Placed items: ERP primary blue, clearly visible
        root.querySelectorAll('[fill="#7A7A7A"], [fill="#7a7a7a"]').forEach(el => {
            el.setAttribute('fill', '#0d6ef8');
            el.setAttribute('fill-opacity', '0.65');
            el.setAttribute('stroke', '#0856c8');
            el.removeAttribute('stroke-opacity');
        });

        // Dashed cut-down outlines: match item color, subtle
        root.querySelectorAll('[stroke-dasharray]').forEach(el => {
            if (el.getAttribute('fill') === 'none') {
                el.setAttribute('stroke', '#0d6ef8');
                el.setAttribute('stroke-opacity', '0.45');
            }
        });

        // Hide collision/overlap debug lines — not useful in the UI preview
        root.querySelectorAll('#collision_lines, [id="collision_lines"]').forEach(el => {
            el.setAttribute('display', 'none');
        });

        return new XMLSerializer().serializeToString(doc);
    }

    loadSvgImage(svg) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Failed to load nesting preview'));
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        });
    }
}
