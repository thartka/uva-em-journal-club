/**
 * Q5 interactive — statistical vs. clinical significance.
 *
 * A fixed, clinically trivial effect (a 2-minute reduction in ED length of
 * stay; outcome SD ≈ 180 min) is held constant while the learner cranks the
 * sample size. The 95% CI narrows as n grows; past a large enough n it excludes
 * zero and the result becomes "statistically significant" — yet the estimate
 * never leaves the clinically trivial zone. Significance ≠ importance.
 */

class SignificanceSim {
    constructor(mount) {
        this.mount = mount;
        this.trueDiff = 2;        // minutes (fixed, trivial)
        this.sd = 180;            // minutes (within-arm SD)
        this.meaningful = 15;     // minutes: threshold for a difference that would matter
        this.nMin = 100;
        this.nMax = 200000;
        this.n = 1000;
        this.xMin = -20;
        this.xMax = 20;

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
                A new triage protocol truly shortens ED length of stay by exactly
                <strong>2 minutes</strong> — a difference no one would notice. Drag the sample
                size up. The point estimate stays put at 2 minutes, but its
                <strong>95% confidence interval</strong> narrows. With a large enough trial it
                clears zero and becomes “statistically significant” while remaining
                <span class="ink-beta">clinically trivial</span>.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
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
        const h = Math.min(Math.max(w * 0.42, 190), 300);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    // Log-scaled sample size from the 0..1000 slider index.
    _nFromSlider() {
        const idx = parseInt(this.nSlider.value, 10) / 1000;
        const perArm = this.nMin * Math.pow(this.nMax / this.nMin, idx);
        return Math.round(perArm);
    }

    _stats() {
        const nPerArm = this.n;
        const se = this.sd * Math.sqrt(2 / nPerArm);
        const z = this.trueDiff / se;
        const p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
        const half = 1.96 * se;
        return { se, p, lo: this.trueDiff - half, hi: this.trueDiff + half };
    }

    _xToPx(min) {
        const padL = 16, padR = 16;
        return padL + (min - this.xMin) / (this.xMax - this.xMin) * (this._w - padL - padR);
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const axisY = this._h - 34;
        const ciY = this._h * 0.42;

        // Clinically meaningful zone (|diff| >= threshold).
        ctx.fillStyle = 'rgba(56,142,60,0.12)';
        ctx.fillRect(this._xToPx(this.meaningful), 10, this._xToPx(this.xMax) - this._xToPx(this.meaningful), axisY - 10);
        ctx.fillRect(this._xToPx(this.xMin), 10, this._xToPx(-this.meaningful) - this._xToPx(this.xMin), axisY - 10);
        ctx.fillStyle = '#2e7d32';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('clinically meaningful', this._xToPx((this.meaningful + this.xMax) / 2), 22);

        // Axis.
        ctx.beginPath();
        ctx.moveTo(this._xToPx(this.xMin), axisY);
        ctx.lineTo(this._xToPx(this.xMax), axisY);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#888';
        ctx.textBaseline = 'top';
        [-20, -10, 0, 10, 20].forEach(t => {
            const x = this._xToPx(t);
            ctx.beginPath();
            ctx.moveTo(x, axisY);
            ctx.lineTo(x, axisY + 4);
            ctx.stroke();
            ctx.fillText(t, x, axisY + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('reduction in ED length of stay (minutes)', this._xToPx(0), axisY + 20);

        // Null line at 0.
        const zeroX = this._xToPx(0);
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(zeroX, 10);
        ctx.lineTo(zeroX, axisY);
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#c62828';
        ctx.textBaseline = 'bottom';
        ctx.fillText('no difference', zeroX, axisY - 4);

        // Confidence interval.
        const { lo, hi, p } = this._stats();
        const significant = lo > 0 || hi < 0;
        const color = significant ? '#E57200' : '#888';
        const loX = this._xToPx(Math.max(this.xMin, lo));
        const hiX = this._xToPx(Math.min(this.xMax, hi));
        const estX = this._xToPx(this.trueDiff);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(loX, ciY);
        ctx.lineTo(hiX, ciY);
        ctx.stroke();
        // End caps (arrow if clipped at the plot edge).
        [{ x: loX, v: lo, dir: -1 }, { x: hiX, v: hi, dir: 1 }].forEach(cap => {
            ctx.beginPath();
            const clipped = (cap.v < this.xMin || cap.v > this.xMax);
            if (clipped) {
                ctx.moveTo(cap.x - cap.dir * 8, ciY - 6);
                ctx.lineTo(cap.x, ciY);
                ctx.lineTo(cap.x - cap.dir * 8, ciY + 6);
            } else {
                ctx.moveTo(cap.x, ciY - 8);
                ctx.lineTo(cap.x, ciY + 8);
            }
            ctx.stroke();
        });
        // Point estimate.
        ctx.beginPath();
        ctx.arc(estX, ciY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#232D4B';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('estimate: 2 min', estX, ciY - 12);
    }

    _update() {
        this.n = this._nFromSlider();
        const total = this.n * 2;
        this.nVal.textContent = total.toLocaleString('en-US');

        const { p, lo, hi } = this._stats();
        const significant = lo > 0 || hi < 0;
        this.pEl.textContent = p < 0.001 ? '<0.001' : p.toFixed(3);

        this.sigEl.textContent = significant ? 'Yes' : 'No';
        this.sigEl.style.color = significant ? '#E57200' : '#888';

        // The true effect (2 min) is always far below the 15-min threshold.
        this.clinEl.textContent = 'No';
        this.clinEl.style.color = '#888';

        if (significant) {
            this.noteEl.innerHTML = 'A trivial 2-minute difference is now <strong>statistically significant</strong> — purely because the sample is huge. The CI excludes zero but sits nowhere near the clinically meaningful zone.';
        } else {
            this.noteEl.textContent = 'At this size the CI still crosses zero — not yet significant. Keep enlarging the trial and watch what happens.';
        }
        this._draw();
    }
}
