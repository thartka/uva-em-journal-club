/**
 * Q4 interactive — statistical vs. clinical significance.
 *
 * ED length of stay is right-skewed. A new protocol shortens the MEAN stay by a
 * clinically trivial 2 minutes (180 → 178). The canvas draws the two group
 * distributions, which sit almost perfectly on top of each other — clinically
 * the same. The slider sets the sample size and the readouts beneath update:
 * with a large enough sample the 2-minute gap becomes "statistically
 * significant," even though the distributions never change. Significance is not
 * the same as clinical importance.
 */

class SignificanceSim {
    constructor(mount) {
        this.mount = mount;
        this.sd = 180;          // within-arm SD of LOS (minutes)
        this.meanC = 180;       // control mean LOS
        this.meanT = 178;       // treatment mean LOS (2 minutes shorter)
        this.trueDiff = this.meanC - this.meanT;
        this.sigma = 0.833;     // lognormal shape → strong right skew (CV ≈ 1)
        this.nMin = 100;        // patients per arm
        this.nMax = 200000;
        this.n = 1000;
        this.xMax = 600;        // minutes shown on the x-axis

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
                ED length of stay is <strong>right-skewed</strong> — most patients leave quickly, a few
                stay a long time. A new triage protocol shortens the <strong>mean</strong> stay by just
                <strong>2 minutes</strong> (180 → 178). The two curves below — control and treatment —
                sit almost exactly on top of each other. Set the sample size and watch the p-value:
                with enough patients, this trivial gap turns “statistically significant.”
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="legend">
                <span class="legend-item"><span class="legend-swatch" style="background:#232D4B"></span>Control (mean 180 min)</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#E57200"></span>New protocol (mean 178 min)</span>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label for="npn">Total patients:</label>
                    <input type="range" id="npn" data-role="n" min="0" max="1000" value="332" step="1">
                    <span data-role="nval">2,000</span>
                </div>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">p-value</div>
                    <div class="param-value" data-role="p">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Statistically significant?</div>
                    <div class="param-value" data-role="sig">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Clinically meaningful?</div>
                    <div class="param-value" data-role="clin">—</div>
                </div>
            </div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.nSlider = this.mount.querySelector('[data-role="n"]');
        this.nVal = this.mount.querySelector('[data-role="nval"]');
        this.pEl = this.mount.querySelector('[data-role="p"]');
        this.sigEl = this.mount.querySelector('[data-role="sig"]');
        this.clinEl = this.mount.querySelector('[data-role="clin"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.nSlider.addEventListener('input', () => this._update());
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        // Cap height by viewport too, so it fits a rotated phone.
        const h = Math.min(Math.max(w * 0.5, 210), 300, Math.round((window.innerHeight || 480) * 0.6));
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    _muFor(mean) {
        // Lognormal μ so that exp(μ + σ²/2) = mean.
        return Math.log(mean) - (this.sigma * this.sigma) / 2;
    }

    _pdf(x, mu) {
        if (x <= 0) return 0;
        const s = this.sigma;
        return Math.exp(-((Math.log(x) - mu) ** 2) / (2 * s * s)) / (x * s * Math.sqrt(2 * Math.PI));
    }

    _nFromSlider() {
        const idx = parseInt(this.nSlider.value, 10) / 1000;
        return Math.round(this.nMin * Math.pow(this.nMax / this.nMin, idx));
    }

    _stats() {
        const se = this.sd * Math.sqrt(2 / this.n);
        const z = this.trueDiff / se;
        const p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
        return { se, p, significant: p < 0.05 };
    }

    _xToPx(min) {
        const padL = 14, padR = 14;
        return padL + (min / this.xMax) * (this._w - padL - padR);
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const padT = 18, padB = 34;
        const baseY = this._h - padB;
        const plotH = baseY - padT;

        const muC = this._muFor(this.meanC);
        const muT = this._muFor(this.meanT);

        // Scale so the tallest point of either curve fills ~90% of the plot.
        let maxD = 0;
        for (let x = 1; x <= this.xMax; x += 3) {
            maxD = Math.max(maxD, this._pdf(x, muC), this._pdf(x, muT));
        }
        const yFor = (d) => baseY - (d / maxD) * plotH * 0.9;

        const tracePath = (mu) => {
            ctx.beginPath();
            ctx.moveTo(this._xToPx(0), baseY);
            for (let x = 1; x <= this.xMax; x += 2) {
                ctx.lineTo(this._xToPx(x), yFor(this._pdf(x, mu)));
            }
            ctx.lineTo(this._xToPx(this.xMax), baseY);
        };

        // Control: filled navy area.
        tracePath(muC);
        ctx.fillStyle = 'rgba(35,45,75,0.22)';
        ctx.fill();
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Treatment: orange outline (lands right on top of the control curve).
        tracePath(muT);
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Baseline / x-axis.
        ctx.beginPath();
        ctx.moveTo(this._xToPx(0), baseY);
        ctx.lineTo(this._xToPx(this.xMax), baseY);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        [0, 120, 240, 360, 480, 600].forEach(t => {
            const x = this._xToPx(t);
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, baseY + 4);
            ctx.strokeStyle = '#999';
            ctx.stroke();
            ctx.fillText(t, x, baseY + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('ED length of stay (minutes)', this._xToPx(this.xMax / 2), baseY + 20);

        // Mean marker (the two means are ~2 min apart — visually one line).
        const meanX = this._xToPx(this.meanC);
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(meanX, baseY);
        ctx.lineTo(meanX, padT + 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#333';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('means: 180 vs 178 min', meanX + 6, padT + 2);
        ctx.fillText('(2 min apart)', meanX + 6, padT + 16);
    }

    _update() {
        this.n = this._nFromSlider();
        this.nVal.textContent = (this.n * 2).toLocaleString('en-US');

        const { p, significant } = this._stats();
        this.pEl.textContent = p < 0.001 ? '<0.001' : p.toFixed(3);
        this.sigEl.textContent = significant ? 'Yes' : 'No';
        this.sigEl.style.color = significant ? '#E57200' : '#888';
        this.clinEl.textContent = 'No';          // a 2-minute mean difference is never meaningful
        this.clinEl.style.color = '#888';

        if (significant) {
            this.noteEl.innerHTML = 'Now <strong>p &lt; 0.05</strong> — “statistically significant.” But the curves are unchanged: a 2-minute difference no patient would ever feel. Big samples make trivial differences significant.';
        } else {
            this.noteEl.innerHTML = 'At this size the 2-minute difference is <strong>not</strong> statistically significant. Keep adding patients and watch the p-value — the curves stay identical the whole time.';
        }
        this._draw();
    }
}
