/**
 * Q4 interactive — statistical vs. clinical significance.
 *
 * Both arms are fixed at 200,000 patients. ED length of stay is right-skewed
 * (control mean 180 min). The slider moves the treatment mean — i.e. how much
 * the new protocol shortens the average stay. With a sample this large, almost
 * any reduction is "statistically significant," so "significant?" reads Yes
 * across nearly the whole range while "clinically meaningful?" only turns Yes
 * once the difference is genuinely large — and the orange curve has visibly
 * pulled away from the navy one. Significance is not the same as importance.
 */

class SignificanceSim {
    constructor(mount) {
        this.mount = mount;
        this.n = 200000;        // patients per arm (FIXED)
        this.sd = 180;          // within-arm SD of LOS (minutes)
        this.meanC = 180;       // control mean LOS
        this.reduction = 2;     // minutes shorter under the new protocol (slider)
        this.sigma = 0.833;     // lognormal shape → strong right skew (CV ≈ 1)
        this.meaningful = 30;   // minutes: a rough "would this matter?" line
        this.xMax = 600;        // minutes shown on the x-axis
        this.maxReduction = 60; // matches the slider max

        // Fixed y-scale: the tallest the treatment curve ever gets (at the
        // largest reduction). Holding it constant means the control curve is
        // drawn at the same height every frame and never appears to change.
        this._maxDensity = this._peakDensity(this.meanC - this.maxReduction);

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
                ED length of stay is <strong>right-skewed</strong>, with a control mean of 180 min.
                Both arms have <strong>200,000 patients</strong>. Drag the slider to change how much
                the new protocol shortens the <strong>mean</strong> stay, and watch the readouts: with a
                sample this large, almost any reduction is “statistically significant” — but only a large
                one is clinically meaningful, and only then do the curves visibly separate.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="legend">
                <span class="legend-item"><span class="legend-swatch" style="background:#232D4B"></span>Control (mean 180 min)</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#E57200"></span>New protocol</span>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label for="redu">Reduction in mean stay:</label>
                    <input type="range" id="redu" data-role="r" min="0" max="60" value="2" step="1">
                    <span data-role="rval">2 min</span>
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
        this.rSlider = this.mount.querySelector('[data-role="r"]');
        this.rVal = this.mount.querySelector('[data-role="rval"]');
        this.pEl = this.mount.querySelector('[data-role="p"]');
        this.sigEl = this.mount.querySelector('[data-role="sig"]');
        this.clinEl = this.mount.querySelector('[data-role="clin"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.rSlider.addEventListener('input', () => {
            this.reduction = parseInt(this.rSlider.value, 10);
            this._update();
        });
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
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
        return Math.log(mean) - (this.sigma * this.sigma) / 2;
    }

    _pdf(x, mu) {
        if (x <= 0) return 0;
        const s = this.sigma;
        return Math.exp(-((Math.log(x) - mu) ** 2) / (2 * s * s)) / (x * s * Math.sqrt(2 * Math.PI));
    }

    _peakDensity(mean) {
        const mu = this._muFor(mean);
        let m = 0;
        for (let x = 1; x <= this.xMax; x += 2) m = Math.max(m, this._pdf(x, mu));
        return m;
    }

    _stats() {
        const se = this.sd * Math.sqrt(2 / this.n);
        const z = this.reduction / se;
        const p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
        return { p, significant: p < 0.05 };
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

        const meanT = this.meanC - this.reduction;
        const muC = this._muFor(this.meanC);
        const muT = this._muFor(meanT);

        const yFor = (d) => baseY - (d / this._maxDensity) * plotH * 0.9;

        const tracePath = (mu) => {
            ctx.beginPath();
            ctx.moveTo(this._xToPx(0), baseY);
            for (let x = 1; x <= this.xMax; x += 2) {
                ctx.lineTo(this._xToPx(x), yFor(this._pdf(x, mu)));
            }
            ctx.lineTo(this._xToPx(this.xMax), baseY);
        };

        // Control: filled navy.
        tracePath(muC);
        ctx.fillStyle = 'rgba(35,45,75,0.22)';
        ctx.fill();
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Treatment: orange outline, shifts left as the reduction grows.
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

        // Mean markers.
        const drawMean = (mean, color) => {
            const x = this._xToPx(mean);
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, padT + 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
        };
        drawMean(this.meanC, '#232D4B');
        drawMean(meanT, '#E57200');

        // Numeric annotation (top-left, so it never collides with the lines).
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#232D4B';
        ctx.fillText('Control mean: 180 min', this._xToPx(0) + 6, padT + 2);
        ctx.fillStyle = '#c15400';
        ctx.fillText(`New mean: ${meanT} min  (−${this.reduction})`, this._xToPx(0) + 6, padT + 18);
    }

    _update() {
        this.rVal.textContent = `${this.reduction} min`;
        const { p, significant } = this._stats();
        const meaningful = this.reduction >= this.meaningful;

        this.pEl.textContent = this.reduction === 0 ? '1.00' : (p < 0.001 ? '<0.001' : p.toFixed(3));
        this.sigEl.textContent = significant ? 'Yes' : 'No';
        this.sigEl.style.color = significant ? '#E57200' : '#888';
        this.clinEl.textContent = meaningful ? 'Yes' : 'No';
        this.clinEl.style.color = meaningful ? '#2e7d32' : '#888';

        if (this.reduction === 0) {
            this.noteEl.innerHTML = 'No difference between the groups — so even with 200,000 patients per arm, the result is <strong>not</strong> statistically significant.';
        } else if (!significant) {
            this.noteEl.innerHTML = `Even with 200,000 patients per arm, a ${this.reduction}-minute difference is not <em>quite</em> statistically significant (p = ${p.toFixed(2)}).`;
        } else if (!meaningful) {
            this.noteEl.innerHTML = `A ${this.reduction}-minute reduction is <strong>statistically significant</strong> — but with 200,000 patients per arm, almost any difference is. Clinically, ${this.reduction} minutes barely registers, and the curves are still on top of each other.`;
        } else {
            this.noteEl.innerHTML = `A ${this.reduction}-minute reduction is statistically significant <strong>and</strong> clinically meaningful — the difference is finally large enough to matter, and you can see the curves separate.`;
        }
        this._draw();
    }
}
