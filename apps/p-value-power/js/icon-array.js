/**
 * Canvas-based icon-array renderer for animated RCT display.
 * Draws two side-by-side grids of person icons, colored by outcome.
 */

class IconArrayRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.cols = options.cols || 10;
        this.rows = options.rows || 10;
        this.nPerArm = this.cols * this.rows;

        this.colorEvent = options.colorEvent || '#D55E00';
        this.colorNoEvent = options.colorNoEvent || '#0072B2';
        this.colorPending = options.colorPending || '#e0e0e0';

        this.treatmentData = null;
        this.controlData = null;
        this.revealedCount = 0;
        this.animationId = null;

        this._dpr = window.devicePixelRatio || 1;
        this._onResize = this._resize.bind(this);
        window.addEventListener('resize', this._onResize);
        this._resize();
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        const h = Math.min(w * 0.55, 500);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._width = w;
        this._height = h;
        this.draw();
    }

    setData(treatmentArr, controlArr) {
        this.treatmentData = treatmentArr;
        this.controlData = controlArr;
        this.revealedCount = 0;
    }

    /**
     * Animate reveal over durationMs.
     * onProgress(revealedCount, pValue) called each step.
     * Returns a Promise that resolves when done.
     */
    animate(durationMs = 10000, onProgress) {
        return new Promise(resolve => {
            if (!this.treatmentData || !this.controlData) return resolve();
            this.revealedCount = 0;
            const total = this.nPerArm;
            const interval = durationMs / total;
            let last = 0;
            const step = (ts) => {
                if (!last) last = ts;
                const elapsed = ts - last;
                const target = Math.min(total, Math.floor(elapsed / interval) + 1);
                if (target > this.revealedCount) {
                    this.revealedCount = target;
                    this.draw();

                    if (onProgress && this.revealedCount >= 5) {
                        const tE = this.treatmentData.slice(0, this.revealedCount).reduce((s, v) => s + v, 0);
                        const cE = this.controlData.slice(0, this.revealedCount).reduce((s, v) => s + v, 0);
                        const n = this.revealedCount;
                        const pVal = Stats.pValueFromCounts(tE, n, cE, n);
                        onProgress(this.revealedCount, pVal);
                    }
                }
                if (this.revealedCount < total) {
                    this.animationId = requestAnimationFrame(step);
                } else {
                    this.animationId = null;
                    resolve();
                }
            };
            this.animationId = requestAnimationFrame(step);
        });
    }

    draw() {
        const ctx = this.ctx;
        const w = this._width;
        const h = this._height;
        ctx.clearRect(0, 0, w, h);

        const gap = w * 0.06;
        const gridW = (w - gap) / 2;
        const labelH = 28;
        const availH = h - labelH - 10;

        const cellW = gridW / this.cols;
        const cellH = availH / this.rows;
        const iconSize = Math.min(cellW, cellH) * 0.7;

        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';

        ctx.fillStyle = '#232D4B';
        ctx.fillText('Treatment', gridW / 2, 18);
        ctx.fillText('Control', gridW + gap + gridW / 2, 18);

        this._drawGrid(0, labelH, gridW, cellW, cellH, iconSize, this.treatmentData);
        this._drawGrid(gridW + gap, labelH, gridW, cellW, cellH, iconSize, this.controlData);
    }

    _drawGrid(offsetX, offsetY, gridW, cellW, cellH, iconSize, data) {
        const ctx = this.ctx;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const idx = r * this.cols + c;
                const cx = offsetX + c * cellW + cellW / 2;
                const cy = offsetY + r * cellH + cellH / 2;

                if (idx >= this.revealedCount || !data) {
                    this._drawPerson(cx, cy, iconSize, this.colorPending);
                } else {
                    const color = data[idx] === 1 ? this.colorEvent : this.colorNoEvent;
                    this._drawPerson(cx, cy, iconSize, color);
                }
            }
        }
    }

    _drawPerson(cx, cy, size, color) {
        const ctx = this.ctx;
        const headR = size * 0.22;
        const bodyTop = cy - size * 0.12;
        const bodyBot = cy + size * 0.35;

        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.30, headR, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, bodyTop);
        ctx.lineTo(cx - size * 0.22, bodyBot);
        ctx.lineTo(cx + size * 0.22, bodyBot);
        ctx.closePath();
        ctx.fill();
    }
}
