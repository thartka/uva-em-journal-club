/**
 * Q3 interactive — the α / β trade-off.
 *
 * The two sampling distributions (H0 at 0, H1 at a FIXED true effect) stay put.
 * The learner drags the significance threshold. Dragging it toward the null
 * shrinks α (the orange false-positive tail of H0) but grows β (the blue
 * missed-effect area of H1), and vice versa. You cannot make both small at once
 * without more data — that is the whole point.
 */

class TradeoffCurves {
    constructor(mount) {
        this.mount = mount;
        this.d = 2.8;                     // fixed true effect, in SE units
        this.c = Stats.zQuantile(0.95);   // start at one-sided α = 0.05 (≈ 1.645)
        this.cMin = -1.0;
        this.cMax = 6.0;
        this.xMin = -4;
        this.xMax = 8;
        this.maxDens = Stats.normalPDF(0);
        this.dragging = false;

        this._build();
        this._dpr = window.devicePixelRatio || 1;
        this._onResize = () => this._resize();
        window.addEventListener('resize', this._onResize);
        this._resize();
        this._update();
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
    }

    _build() {
        this.mount.innerHTML = `
            <p class="interactive-intro">
                Now the curves are fixed and <strong>you move the threshold</strong>. Drag the red line
                (or tap the track below). Pushing it right to catch fewer false positives
                (<span class="ink-alpha">α</span>) lets more real effects slip through
                (<span class="ink-beta">β</span>). You cannot shrink both at once — that is the
                trade-off every α = 0.05 convention is balancing.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="control-group" style="margin:6px 0 0;">
                <label for="thr">Threshold:</label>
                <input type="range" id="thr" data-role="c" min="-1" max="6" value="1.645" step="0.01">
                <span data-role="cval">0.05</span>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">α (false positive)</div>
                    <div class="param-value ink-alpha" data-role="alpha">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">β (missed effect)</div>
                    <div class="param-value ink-beta" data-role="beta">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Power (1 − β)</div>
                    <div class="param-value ink-power" data-role="power">—</div>
                </div>
            </div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.cSlider = this.mount.querySelector('[data-role="c"]');
        this.cVal = this.mount.querySelector('[data-role="cval"]');
        this.alphaEl = this.mount.querySelector('[data-role="alpha"]');
        this.betaEl = this.mount.querySelector('[data-role="beta"]');
        this.powerEl = this.mount.querySelector('[data-role="power"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.cSlider.addEventListener('input', () => {
            this.c = parseFloat(this.cSlider.value);
            this._update();
        });

        // Direct drag on the canvas.
        const setFromEvent = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            let x = this._pxToX(px);
            x = Math.max(this.cMin, Math.min(this.cMax, x));
            this.c = x;
            this.cSlider.value = x;
            this._update();
        };
        this.canvas.addEventListener('pointerdown', (e) => {
            this.dragging = true;
            this.canvas.setPointerCapture(e.pointerId);
            setFromEvent(e);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (this.dragging) setFromEvent(e);
        });
        this.canvas.addEventListener('pointerup', () => { this.dragging = false; });
        this.canvas.addEventListener('pointercancel', () => { this.dragging = false; });
        this.canvas.style.touchAction = 'none';
        this.canvas.style.cursor = 'ew-resize';
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        const h = Math.min(Math.max(w * 0.5, 220), 360);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    _padL() { return 10; }
    _padR() { return 10; }

    _xToPx(x) {
        return this._padL() + (x - this.xMin) / (this.xMax - this.xMin) * (this._w - this._padL() - this._padR());
    }

    _pxToX(px) {
        return this.xMin + (px - this._padL()) / (this._w - this._padL() - this._padR()) * (this.xMax - this.xMin);
    }

    _yToPx(dens) {
        const padT = 12, padB = 30;
        const plotH = this._h - padT - padB;
        return padT + plotH - (dens / this.maxDens) * plotH * 0.94;
    }

    _curveY(x, mu) {
        return Stats.normalPDF(x - mu);
    }

    _fillRegion(mu, from, to, color) {
        const ctx = this.ctx;
        const baseY = this._yToPx(0);
        ctx.beginPath();
        ctx.moveTo(this._xToPx(from), baseY);
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
            const x = from + (to - from) * (i / steps);
            ctx.lineTo(this._xToPx(x), this._yToPx(this._curveY(x, mu)));
        }
        ctx.lineTo(this._xToPx(to), baseY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    _strokeCurve(mu, color) {
        const ctx = this.ctx;
        ctx.beginPath();
        const steps = 240;
        for (let i = 0; i <= steps; i++) {
            const x = this.xMin + (this.xMax - this.xMin) * (i / steps);
            const px = this._xToPx(x);
            const py = this._yToPx(this._curveY(x, mu));
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const baseY = this._yToPx(0);

        // Regions relative to the current threshold c.
        this._fillRegion(0, this.c, this.xMax, 'rgba(213,94,0,0.30)');       // α (H0 above threshold)
        this._fillRegion(this.d, this.xMin, this.c, 'rgba(0,114,178,0.35)'); // β (H1 below threshold)
        this._fillRegion(this.d, this.c, this.xMax, 'rgba(56,142,60,0.22)'); // power

        this._strokeCurve(0, '#232D4B');
        this._strokeCurve(this.d, '#E57200');

        ctx.beginPath();
        ctx.moveTo(this._xToPx(this.xMin), baseY);
        ctx.lineTo(this._xToPx(this.xMax), baseY);
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draggable threshold.
        const cx = this._xToPx(this.c);
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(cx, this._yToPx(0));
        ctx.lineTo(cx, this._yToPx(this.maxDens) - 2);
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Grab handle.
        ctx.beginPath();
        ctx.arc(cx, this._yToPx(this.maxDens) + 4, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#c62828';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '700 10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔', cx, this._yToPx(this.maxDens) + 4);
        ctx.textBaseline = 'alphabetic';
    }

    _update() {
        const alpha = 1 - Stats.normalCDF(this.c);
        const beta = Stats.normalCDF(this.c - this.d);
        const power = 1 - beta;

        this.cVal.textContent = alpha.toFixed(3);
        this.alphaEl.textContent = alpha < 0.001 ? '<0.001' : alpha.toFixed(3);
        this.betaEl.textContent = `${(beta * 100).toFixed(0)}%`;
        this.powerEl.textContent = `${(power * 100).toFixed(0)}%`;

        if (Math.abs(this.c - Stats.zQuantile(0.95)) < 0.03) {
            this.noteEl.textContent = 'This is the conventional α = 0.05. Drag left or right to see what you give up either way.';
        } else if (alpha < 0.02) {
            this.noteEl.textContent = 'Stricter α: fewer false positives, but β climbs — more real effects are now missed.';
        } else if (alpha > 0.12) {
            this.noteEl.textContent = 'Looser α: you catch more real effects (β falls), but false positives (α) pile up.';
        } else {
            this.noteEl.textContent = 'Notice α and β move in opposite directions — lowering one raises the other.';
        }
        this._draw();
    }
}
