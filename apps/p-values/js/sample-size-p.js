/**
 * Q3 interactive — sample size drives the p-value.
 *
 * The true effect is held FIXED at a 1 mmHg mean reduction (the same effect in
 * both trials from the question). The slider changes only the sample size per
 * arm. As n grows, the 95% confidence interval tightens around the unchanged
 * 1 mmHg point estimate and the p-value plummets — a smaller p means more
 * precise, not a larger or more important effect. Jump buttons land on the two
 * trials from the question (n = 40 → p ≈ 0.30, n = 40,000 → p < 0.001).
 */

class SampleSizeP {
    constructor(mount) {
        this.mount = mount;
        this.effect = 1.0;      // FIXED true mean reduction (mmHg)
        this.sd = 4.3;          // within-arm SD of the change (mmHg)
        this.nMin = 20;
        this.nMax = 100000;
        this.n = 40;            // patients per arm (slider)
        this.eMin = -1.0;       // effect axis extent (mmHg)
        this.eMax = 3.5;

        this._build();
        this._dpr = window.devicePixelRatio || 1;
        this._onResize = () => this._resize();
        window.addEventListener('resize', this._onResize);
        this._syncSliderFromN();
        this._resize();
        this._update();
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
    }

    _build() {
        this.mount.innerHTML = `
            <p class="interactive-intro">
                The drug's true effect is fixed at a <strong>1 mmHg</strong> reduction — the same in both trials.
                Only the <strong>sample size</strong> changes. Watch the 95% confidence interval tighten around
                that unchanged 1 mmHg estimate while the p-value collapses. A smaller p means a more
                <em>precise</em> estimate, not a bigger or more important effect.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <label for="nsize">Patients per arm:</label>
                    <input type="range" id="nsize" data-role="n" min="0" max="1000" value="0" step="1">
                    <span data-role="nval">40</span>
                </div>
                <div class="control-group">
                    <label>Jump to:</label>
                    <div class="seg">
                        <button type="button" class="btn btn-secondary" data-role="ja">Trial A (n = 40)</button>
                        <button type="button" class="btn btn-secondary" data-role="jb">Trial B (n = 40,000)</button>
                    </div>
                </div>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">Effect (fixed)</div>
                    <div class="param-value">1.0 mmHg</div>
                </div>
                <div class="param-box">
                    <div class="param-label">p-value</div>
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
        this.nSlider = this.mount.querySelector('[data-role="n"]');
        this.nVal = this.mount.querySelector('[data-role="nval"]');
        this.pEl = this.mount.querySelector('[data-role="p"]');
        this.sigEl = this.mount.querySelector('[data-role="sig"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.nSlider.addEventListener('input', () => {
            const t = parseInt(this.nSlider.value, 10) / 1000;
            this.n = Math.round(this.nMin * Math.pow(this.nMax / this.nMin, t));
            this._update();
        });
        this.mount.querySelector('[data-role="ja"]').addEventListener('click', () => {
            this.n = 40; this._syncSliderFromN(); this._update();
        });
        this.mount.querySelector('[data-role="jb"]').addEventListener('click', () => {
            this.n = 40000; this._syncSliderFromN(); this._update();
        });
    }

    _syncSliderFromN() {
        const t = Math.log(this.n / this.nMin) / Math.log(this.nMax / this.nMin);
        this.nSlider.value = Math.round(Math.max(0, Math.min(1, t)) * 1000);
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        const h = Math.min(Math.max(w * 0.42, 170), 240);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    _se() { return this.sd * Math.sqrt(2 / this.n); }

    _stats() {
        const se = this._se();
        const z = this.effect / se;
        const p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
        return { se, p, significant: p < 0.05 };
    }

    _xForE(e) {
        const padL = 20, padR = 20;
        return padL + ((e - this.eMin) / (this.eMax - this.eMin)) * (this._w - padL - padR);
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const baseY = this._h - 30;
        const midY = (baseY + 24) / 2 + 6;

        const { se, significant } = this._stats();
        const lo = this.effect - 1.96 * se;
        const hi = this.effect + 1.96 * se;
        const color = significant ? '#2e7d32' : '#888';

        // Null line at 0.
        const x0 = this._xForE(0);
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(x0, 20);
        ctx.lineTo(x0, baseY);
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#232D4B';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('no effect', x0, 18);

        // Confidence interval bar (clamped to the visible axis).
        const xLo = this._xForE(Math.max(this.eMin, lo));
        const xHi = this._xForE(Math.min(this.eMax, hi));
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xLo, midY);
        ctx.lineTo(xHi, midY);
        ctx.stroke();
        [xLo, xHi].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x, midY - 8);
            ctx.lineTo(x, midY + 8);
            ctx.stroke();
        });

        // Point estimate (fixed at 1.0).
        const xPt = this._xForE(this.effect);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xPt, midY, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Axis.
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this._xForE(this.eMin), baseY);
        ctx.lineTo(this._xForE(this.eMax), baseY);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        [-1, 0, 1, 2, 3].forEach(t => {
            const x = this._xForE(t);
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, baseY + 4);
            ctx.strokeStyle = '#999';
            ctx.stroke();
            ctx.fillText(t, x, baseY + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('Mean BP reduction (mmHg)  →  benefit', this._xForE((this.eMin + this.eMax) / 2), baseY + 20);

        // Point-estimate label.
        ctx.fillStyle = color;
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('1.0 mmHg', xPt, midY - 12);
    }

    _fmtN(n) {
        return n.toLocaleString('en-US');
    }

    _update() {
        this.nVal.textContent = this._fmtN(this.n);
        const { p, significant } = this._stats();
        this.pEl.textContent = p < 0.001 ? '<0.001' : p.toFixed(3);
        this.sigEl.textContent = significant ? 'Yes' : 'No';
        this.sigEl.style.color = significant ? '#2e7d32' : '#888';

        if (!significant) {
            this.noteEl.innerHTML = `With ${this._fmtN(this.n)} patients per arm, the 1 mmHg effect is too imprecise to separate from zero — the CI still crosses “no effect,” so p = ${p.toFixed(2)}. The effect hasn't changed; the study just isn't precise enough yet.`;
        } else {
            this.noteEl.innerHTML = `With ${this._fmtN(this.n)} patients per arm, the very same 1 mmHg effect is now “statistically significant” (p ${p < 0.001 ? '< 0.001' : '= ' + p.toFixed(3)}). Nothing about the effect changed — only the sample size. A tiny p-value reflects precision, not importance.`;
        }
        this._draw();
    }
}
