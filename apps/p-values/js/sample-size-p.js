/**
 * Q3 interactive — sample size drives the p-value.
 *
 * Shows the sampling distributions of the mean BP reduction for the placebo
 * group (centered at 5 mmHg) and the treatment group (centered at 10 mmHg —
 * a fixed 5 mmHg difference, as in the question). The slider changes only the
 * sample size per arm. Each curve's spread is the standard error of its mean
 * (SD/√n), so as n grows both bells narrow and pull apart while the means
 * never move — and the p-value collapses. Jump buttons land on the two
 * trials from the question (n = 40 → p ≈ 0.30, n = 40,000 → p < 0.001).
 */

class SampleSizeP {
    constructor(mount) {
        this.mount = mount;
        this.ctrlMean = 5.0;    // FIXED true mean reduction, placebo arm (mmHg)
        this.txMean = 10.0;     // FIXED true mean reduction, treatment arm (mmHg)
        this.effect = this.txMean - this.ctrlMean;  // the 5 mmHg difference driving the p-value
        this.sd = 21.5;         // within-arm SD of the change (mmHg)
        this.nMin = 20;
        this.nMax = 100000;
        this.n = 40;            // patients per arm (slider)
        this.eMin = -7;         // axis extent (mmHg mean reduction)
        this.eMax = 22;
        this.ctrlColor = '#232D4B';   // control curve (UVA navy)
        this.txColor = '#E57200';     // treatment curve (UVA orange)

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
                Each bell curve is the sampling distribution of one group's <strong>mean</strong> BP reduction —
                <span style="color:${this.ctrlColor};font-weight:600;">placebo (true mean 5 mmHg)</span> and
                <span style="color:${this.txColor};font-weight:600;">treatment (true mean 10 mmHg)</span>,
                a fixed 5 mmHg difference. The true means never move. Only the <strong>sample size</strong> changes: as n grows, each mean
                is pinned down more precisely (SE = SD/&radic;n), the curves narrow and separate, and the
                p-value collapses.
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
                    <div class="param-label">Difference (fixed)</div>
                    <div class="param-value">5.0 mmHg</div>
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
        const h = Math.min(Math.max(w * 0.48, 200), 280);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    // SE of the mean within one arm (drives each curve's width).
    _seMean() { return this.sd / Math.sqrt(this.n); }

    // SE of the difference in means (drives the p-value).
    _seDiff() { return this.sd * Math.sqrt(2 / this.n); }

    _stats() {
        const z = this.effect / this._seDiff();
        const p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
        return { p, significant: p < 0.05 };
    }

    _xForE(e) {
        const padL = 20, padR = 20;
        return padL + ((e - this.eMin) / (this.eMax - this.eMin)) * (this._w - padL - padR);
    }

    _drawCurve(mu, se, baseY, topY, strokeColor, fillColor) {
        const ctx = this.ctx;
        const plotH = baseY - topY;
        // At huge n the true SE is far narrower than a pixel; floor the drawn
        // width at ~1.5 px so the curve stays a visible sliver instead of
        // vanishing between sample points. Stats use the real SE, not this.
        const ePerPx = (this.eMax - this.eMin) / (this._w - 40);
        const seDraw = Math.max(se, 1.5 * ePerPx);
        // Normalize to each curve's own peak so the bells always use the full
        // height — what changes with n is their width, which is the point.
        const peak = Stats.normalPDF(0) / seDraw;

        ctx.beginPath();
        ctx.moveTo(this._xForE(this.eMin), baseY);
        const steps = Math.max(240, Math.ceil(this._w * 2));
        for (let i = 0; i <= steps; i++) {
            const e = this.eMin + (i / steps) * (this.eMax - this.eMin);
            const dens = Stats.normalPDF((e - mu) / seDraw) / seDraw;
            const y = baseY - (dens / peak) * plotH;
            ctx.lineTo(this._xForE(e), y);
        }
        ctx.lineTo(this._xForE(this.eMax), baseY);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const baseY = this._h - 34;
        const topY = 26;

        const se = this._seMean();

        // Dashed guides at the two true means.
        [[this.ctrlMean, this.ctrlColor], [this.txMean, this.txColor]].forEach(([mu, color]) => {
            const x = this._xForE(mu);
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.moveTo(x, topY - 4);
            ctx.lineTo(x, baseY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Curves: placebo behind, treatment in front.
        this._drawCurve(this.ctrlMean, se, baseY, topY, this.ctrlColor, 'rgba(35, 45, 75, 0.18)');
        this._drawCurve(this.txMean, se, baseY, topY, this.txColor, 'rgba(229, 114, 0, 0.18)');

        // Mean labels along the top, nudged apart so they never collide.
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = this.ctrlColor;
        ctx.textAlign = 'right';
        ctx.fillText('placebo: 5 mmHg', this._xForE(this.ctrlMean) - 4, topY - 6);
        ctx.fillStyle = this.txColor;
        ctx.textAlign = 'left';
        ctx.fillText('treatment: 10 mmHg', this._xForE(this.txMean) + 4, topY - 6);

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
        [-5, 0, 5, 10, 15, 20].forEach(t => {
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
            this.noteEl.innerHTML = `With ${this._fmtN(this.n)} patients per arm, each group's mean is estimated so imprecisely that the two curves overlap heavily — a mean from the placebo group could easily look like one from the treatment group, so the 5 mmHg gap can't be told from noise (p = ${p.toFixed(2)}).`;
        } else {
            this.noteEl.innerHTML = `With ${this._fmtN(this.n)} patients per arm, the curves have pulled apart: each mean is now pinned down so precisely that the very same 5 mmHg gap is unmistakable (p ${p < 0.001 ? '< 0.001' : '= ' + p.toFixed(3)}). The means never moved — only the precision changed.`;
        }
        this._draw();
    }
}
