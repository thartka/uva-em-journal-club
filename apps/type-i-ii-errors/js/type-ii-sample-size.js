/**
 * Q2 interactive — Type II error risk vs. sample size.
 *
 * A concrete, count-based view of β. The drug TRULY works (control mortality
 * 30% → treatment 20%). We show 100 hypothetical trials of a chosen size as a
 * 10×10 icon array: the blue trials missed the real effect — each is a Type II
 * error. Dragging patients-per-arm changes how many trials miss it, so students
 * see β fall as the sample grows without needing to read a sampling curve.
 */

class TypeIISampleSize {
    constructor(mount) {
        this.mount = mount;
        this.p1 = 0.30;        // control event rate
        this.p2 = 0.20;        // treatment event rate (a real, meaningful effect)
        this.alpha = 0.05;
        this.n = 100;          // patients per arm
        this.nMin = 25;
        this.nMax = 1000;
        this.cols = 10;
        this.rows = 10;
        this.missed = 0;

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
                This drug <strong>truly works</strong> — it lowers mortality from 30% to 20%. But a single
                trial can still miss a real effect by chance. Below are <strong>100 hypothetical trials</strong>
                of the size you choose. Each <span class="ink-beta">blue</span> trial missed the effect —
                that is a <strong>Type II error</strong>. Drag the number of patients and watch how many
                trials miss it.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="legend">
                <span class="legend-item"><span class="legend-swatch" style="background:#388E3C"></span>Detected the effect</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#0072B2"></span>Missed it — Type II error</span>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label for="nspa">Patients per arm:</label>
                    <input type="range" id="nspa" data-role="n" min="25" max="1000" value="100" step="25">
                    <span data-role="nval">100</span>
                </div>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">Type II error risk (β)</div>
                    <div class="param-value ink-beta" data-role="beta">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Trials that missed it</div>
                    <div class="param-value ink-beta" data-role="missed">—</div>
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
        this.nSlider = this.mount.querySelector('[data-role="n"]');
        this.nVal = this.mount.querySelector('[data-role="nval"]');
        this.betaEl = this.mount.querySelector('[data-role="beta"]');
        this.missedEl = this.mount.querySelector('[data-role="missed"]');
        this.powerEl = this.mount.querySelector('[data-role="power"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.nSlider.addEventListener('input', () => {
            this.n = parseInt(this.nSlider.value, 10);
            this._update();
        });
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        // Cap by viewport height too, so the square grid fits a rotated phone.
        const maxByHeight = Math.round((window.innerHeight || 480) * 0.6);
        this._grid = Math.max(150, Math.min(w, 360, maxByHeight));
        const h = this._grid;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    _roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);

        const grid = this._grid;
        const offsetX = (this._w - grid) / 2;
        const cell = grid / this.cols;
        const pad = cell * 0.13;
        const radius = Math.max(2, cell * 0.14);

        for (let i = 0; i < this.cols * this.rows; i++) {
            const r = Math.floor(i / this.cols);
            const c = i % this.cols;
            const x = offsetX + c * cell + pad;
            const y = r * cell + pad;
            const size = cell - 2 * pad;
            // Missed trials (Type II errors) fill first, in reading order.
            ctx.fillStyle = i < this.missed ? '#0072B2' : '#388E3C';
            this._roundRect(x, y, size, size, radius);
            ctx.fill();
        }
    }

    _update() {
        const power = Stats.power(this.p1, this.p2, this.n, this.alpha);
        const beta = 1 - power;
        this.missed = Math.round(beta * 100);

        this.nVal.textContent = this.n;
        this.betaEl.textContent = `${(beta * 100).toFixed(0)}%`;
        this.missedEl.textContent = `${this.missed} / 100`;
        this.powerEl.textContent = `${(power * 100).toFixed(0)}%`;

        if (beta > 0.5) {
            this.noteEl.textContent = 'This trial is too small — it misses the real effect more often than it finds it. A Type II error is the likely outcome.';
        } else if (beta > 0.2) {
            this.noteEl.textContent = 'Still underpowered: a real effect is missed in a meaningful share of trials. Add patients to drive β down.';
        } else if (power >= 0.8) {
            this.noteEl.textContent = 'Now well powered (β ≤ 20%) — a real effect this size is caught in most trials. This is the usual design target.';
        } else {
            this.noteEl.textContent = 'Getting there — as patients per arm rises, fewer trials miss the effect and β keeps shrinking.';
        }
        this._draw();
    }
}
