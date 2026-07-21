/**
 * Q3 interactive — the Type I error rate depends on α, not sample size.
 *
 * The drug does NOTHING. We show 100 hypothetical trials as a 10×10 icon array;
 * the orange trials came back "significant" anyway — false positives, i.e. Type
 * I errors. Their expected count is round(α × 100).
 *
 * Dragging "patients per arm" changes the trial size but NOT the false-positive
 * count — the whole point. The only control that moves it is the α selector.
 * This is the deliberate contrast with Q2, where sample size drove β down.
 */

class TypeISampleSize {
    constructor(mount) {
        this.mount = mount;
        this.alpha = 0.05;
        this.n = 200;
        this.nMin = 25;
        this.nMax = 2000;
        this.cols = 10;
        this.rows = 10;
        this.lastAction = null;   // 'n' | 'alpha'

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
                Now the drug does <strong>nothing</strong>. Below are <strong>100 hypothetical trials</strong>
                of it. Each <span class="ink-alpha">orange</span> trial came back “significant” anyway — a
                false positive, i.e. a <strong>Type I error</strong>. First try to shrink the orange count by
                <strong>adding patients</strong>. Then change <strong>α</strong> and watch what actually moves it.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="legend">
                <span class="legend-item"><span class="legend-swatch" style="background:#90a4ae"></span>Correctly found no effect</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#D55E00"></span>False positive — Type I error</span>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label for="npa3">Patients per arm:</label>
                    <input type="range" id="npa3" data-role="n" min="25" max="2000" value="200" step="25">
                    <span data-role="nval">200</span>
                </div>
                <div class="control-group">
                    <label>Significance level (α):</label>
                    <div class="seg" data-role="alpha-group">
                        <button class="btn btn-secondary" type="button" data-alpha="0.01">0.01</button>
                        <button class="btn btn-primary" type="button" data-alpha="0.05">0.05</button>
                        <button class="btn btn-secondary" type="button" data-alpha="0.10">0.10</button>
                    </div>
                </div>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">Type I error risk</div>
                    <div class="param-value ink-alpha" data-role="alpha">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">False positives</div>
                    <div class="param-value ink-alpha" data-role="fp">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Patients per arm</div>
                    <div class="param-value" data-role="nbox">—</div>
                </div>
            </div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.nSlider = this.mount.querySelector('[data-role="n"]');
        this.nVal = this.mount.querySelector('[data-role="nval"]');
        this.alphaEl = this.mount.querySelector('[data-role="alpha"]');
        this.fpEl = this.mount.querySelector('[data-role="fp"]');
        this.nEl = this.mount.querySelector('[data-role="nbox"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');
        this.alphaBtns = Array.from(this.mount.querySelectorAll('[data-alpha]'));

        this.nSlider.addEventListener('input', () => {
            this.n = parseInt(this.nSlider.value, 10);
            this.lastAction = 'n';
            this._update();
        });

        this.alphaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.alpha = parseFloat(btn.dataset.alpha);
                this.lastAction = 'alpha';
                this.alphaBtns.forEach(b => {
                    const active = b === btn;
                    b.classList.toggle('btn-primary', active);
                    b.classList.toggle('btn-secondary', !active);
                });
                this._update();
            });
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
        const fp = Math.round(this.alpha * 100);

        for (let i = 0; i < this.cols * this.rows; i++) {
            const r = Math.floor(i / this.cols);
            const c = i % this.cols;
            const x = offsetX + c * cell + pad;
            const y = r * cell + pad;
            const size = cell - 2 * pad;
            ctx.fillStyle = i < fp ? '#D55E00' : '#90a4ae';
            this._roundRect(x, y, size, size, radius);
            ctx.fill();
        }
    }

    _update() {
        const fp = Math.round(this.alpha * 100);
        this.nVal.textContent = this.n;
        this.alphaEl.textContent = `${(this.alpha * 100).toFixed(0)}%`;
        this.fpEl.textContent = `${fp} / 100`;
        this.nEl.textContent = this.n;

        if (this.lastAction === 'n') {
            this.noteEl.innerHTML = `You changed the trial to <strong>${this.n} patients per arm</strong> — but the false-positive count did not move. Sample size does not change the Type I error rate.`;
        } else if (this.lastAction === 'alpha') {
            this.noteEl.innerHTML = `Setting <strong>α = ${this.alpha.toFixed(2)}</strong> changed the false-positive rate to <strong>${fp}%</strong>. α is the only lever on Type I error.`;
        } else {
            this.noteEl.innerHTML = `About <strong>${fp} of 100</strong> trials of a useless drug still look “significant.” Try the sliders: only α moves this count.`;
        }
        this._draw();
    }
}
