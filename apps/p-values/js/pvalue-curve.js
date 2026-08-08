/**
 * Q1 interactive — what a p-value measures (tail area under the null).
 *
 * Draws the sampling distribution of the test statistic assuming H0 is true
 * (a standard normal centered at 0). The slider sets the observed statistic z;
 * the shaded tail area IS the p-value — the probability, if H0 were true, of a
 * result at least this extreme. A one-/two-tailed toggle shows why the same
 * observed statistic yields different p-values depending on the test.
 */

class PValueCurve {
    constructor(mount) {
        this.mount = mount;
        this.z = 1.96;          // observed test statistic (slider)
        this.tails = 2;         // 1 or 2
        this.zMax = 4;          // x-axis extent (in SD units)

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
                This bell curve is what the result would look like <strong>if the null hypothesis were true</strong>
                (no real effect). Drag the slider to set the <strong>observed</strong> test statistic, and watch the
                shaded area: that area <em>is</em> the p-value — the chance of a result at least this extreme when
                nothing is really going on. Toggle one- vs two-tailed to see the same statistic give a different p.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <label for="zobs">Observed statistic (SDs from 0):</label>
                    <input type="range" id="zobs" data-role="z" min="0" max="4" value="1.96" step="0.01">
                    <span data-role="zval">1.96</span>
                </div>
                <div class="control-group">
                    <label>Test type:</label>
                    <div class="seg">
                        <button type="button" class="btn btn-secondary" data-role="t2">Two-tailed</button>
                        <button type="button" class="btn btn-secondary" data-role="t1">One-tailed</button>
                    </div>
                </div>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">Shaded tail area = p-value</div>
                    <div class="param-value" data-role="p">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Significant? (p &lt; 0.05)</div>
                    <div class="param-value" data-role="sig">—</div>
                </div>
            </div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.zSlider = this.mount.querySelector('[data-role="z"]');
        this.zVal = this.mount.querySelector('[data-role="zval"]');
        this.pEl = this.mount.querySelector('[data-role="p"]');
        this.sigEl = this.mount.querySelector('[data-role="sig"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');
        this.btn2 = this.mount.querySelector('[data-role="t2"]');
        this.btn1 = this.mount.querySelector('[data-role="t1"]');

        this.zSlider.addEventListener('input', () => {
            this.z = parseFloat(this.zSlider.value);
            this._update();
        });
        this.btn2.addEventListener('click', () => { this.tails = 2; this._update(); });
        this.btn1.addEventListener('click', () => { this.tails = 1; this._update(); });
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

    _pValue() {
        const upper = 1 - Stats.normalCDF(this.z);   // P(Z >= z)
        return this.tails === 2 ? Math.min(1, 2 * upper) : upper;
    }

    _xToPx(z) {
        const padL = 16, padR = 16;
        return padL + ((z + this.zMax) / (2 * this.zMax)) * (this._w - padL - padR);
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const padT = 16, padB = 34;
        const baseY = this._h - padB;
        const plotH = baseY - padT;
        const peak = Stats.normalPDF(0);
        const yFor = (d) => baseY - (d / peak) * plotH * 0.9;

        const step = 0.02;

        // Shaded tail(s) first (so the outline draws on top).
        const shadeTail = (from, to) => {
            ctx.beginPath();
            ctx.moveTo(this._xToPx(from), baseY);
            for (let x = from; x <= to; x += step) {
                ctx.lineTo(this._xToPx(x), yFor(Stats.normalPDF(x)));
            }
            ctx.lineTo(this._xToPx(to), baseY);
            ctx.closePath();
            ctx.fillStyle = 'rgba(229,114,0,0.35)';
            ctx.fill();
        };
        shadeTail(this.z, this.zMax);
        if (this.tails === 2) shadeTail(-this.zMax, -this.z);

        // Full curve outline.
        ctx.beginPath();
        ctx.moveTo(this._xToPx(-this.zMax), baseY);
        for (let x = -this.zMax; x <= this.zMax; x += step) {
            ctx.lineTo(this._xToPx(x), yFor(Stats.normalPDF(x)));
        }
        ctx.lineTo(this._xToPx(this.zMax), baseY);
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Baseline / x-axis.
        ctx.beginPath();
        ctx.moveTo(this._xToPx(-this.zMax), baseY);
        ctx.lineTo(this._xToPx(this.zMax), baseY);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ticks.
        ctx.fillStyle = '#888';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        [-4, -3, -2, -1, 0, 1, 2, 3, 4].forEach(t => {
            const x = this._xToPx(t);
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, baseY + 4);
            ctx.strokeStyle = '#999';
            ctx.stroke();
            ctx.fillText(t === 0 ? '0' : (t > 0 ? '+' + t : t), x, baseY + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('Test statistic if H₀ were true (SDs from 0)', this._xToPx(0), baseY + 20);

        // Observed-statistic marker line(s).
        const drawMarker = (z) => {
            const x = this._xToPx(z);
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, padT + 2);
            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
        };
        drawMarker(this.z);
        if (this.tails === 2) drawMarker(-this.z);

        // Observed label.
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#c15400';
        ctx.fillText(`observed = ${this.z >= 0 ? '+' : ''}${this.z.toFixed(2)}`, this._xToPx(this.z) + 6, padT + 2);
    }

    _update() {
        this.zVal.textContent = this.z.toFixed(2);
        this.btn2.classList.toggle('active', this.tails === 2);
        this.btn1.classList.toggle('active', this.tails === 1);

        const p = this._pValue();
        const sig = p < 0.05;
        this.pEl.textContent = p < 0.001 ? '<0.001' : p.toFixed(3);
        this.sigEl.textContent = sig ? 'Yes' : 'No';
        this.sigEl.style.color = sig ? '#E57200' : '#888';

        const tailWord = this.tails === 2 ? 'either direction' : 'this direction';
        if (this.z < 0.01) {
            this.noteEl.innerHTML = 'An observed statistic of 0 is exactly what the null predicts — essentially the whole distribution is “this extreme or more,” so the p-value is near 1.';
        } else {
            this.noteEl.innerHTML = `If the null hypothesis were true, a result at least this far from 0 (in ${tailWord}) would happen about <strong>${(p * 100).toFixed(1)}%</strong> of the time. That shaded area is the p-value — it measures surprise under the null, not the chance the null is true.`;
        }
        this._draw();
    }
}
