/**
 * Q2 interactive — visualizing the Type II error (β).
 *
 * Two sampling distributions on a shared test-statistic axis (in standard-error
 * units): the null (H0, no effect) and the alternative (H1, a true effect of
 * size d). The significance threshold is FIXED at the one-sided α = 0.05
 * critical value. The blue area is β — the chance of landing below the
 * threshold when the effect is real, i.e. missing it (a Type II error).
 *
 * Dragging the "true effect size" slider separates the curves and shrinks β:
 * bigger real effects are easier to detect.
 *
 * The two buttons make each mistake concrete: "Make a Type I error" draws one
 * study from H0 (no true effect) that nonetheless lands past the threshold — a
 * false positive; "Make a Type II error" draws one study from H1 (a real
 * effect) that falls short of the threshold — a false negative.
 */

class TypeIICurves {
    constructor(mount) {
        this.mount = mount;
        this.d = 2.0;                       // true effect, in SE units
        this.c = Stats.zQuantile(0.95);     // one-sided α = 0.05 critical value ≈ 1.645
        this.xMin = -4;
        this.xMax = 8;
        this.maxDens = Stats.normalPDF(0);
        this.marker = null;                 // {x, type:'I'|'II'} — a single demonstrated study

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
                Two bell curves show where a study’s result tends to fall if the drug
                <strong>does nothing</strong> (navy, H<sub>0</sub>) versus if it has a
                <strong>real effect</strong> (orange, H<sub>1</sub>). The dashed line is the
                significance threshold (α = 0.05). The <span class="ink-beta">blue area</span>
                is <strong>β</strong> &mdash; the chance of missing a real effect: a Type II error.
                Slide the true effect and watch β shrink as the effect grows. Then press the
                buttons below to make each kind of error actually happen in a single study.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="legend">
                <span class="legend-item"><span class="legend-swatch" style="background:#232D4B"></span>No effect (H<sub>0</sub>)</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#E57200"></span>Real effect (H<sub>1</sub>)</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#0072B2"></span>β (missed effect)</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#388E3C"></span>Power (detected)</span>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label for="efx">True effect size:</label>
                    <input type="range" id="efx" data-role="d" min="0" max="4" value="2" step="0.1">
                    <span data-role="dval">2.0</span>
                </div>
            </div>
            <div class="buttons" style="margin-top: 4px;">
                <button class="btn btn-secondary" data-role="mk1" type="button">Make a Type I error</button>
                <button class="btn btn-secondary" data-role="mk2" type="button">Make a Type II error</button>
            </div>
            <p class="error-verdict" data-role="verdict" hidden></p>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">β (Type II error)</div>
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
        this.dSlider = this.mount.querySelector('[data-role="d"]');
        this.dVal = this.mount.querySelector('[data-role="dval"]');
        this.betaEl = this.mount.querySelector('[data-role="beta"]');
        this.powerEl = this.mount.querySelector('[data-role="power"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');
        this.verdictEl = this.mount.querySelector('[data-role="verdict"]');

        this.dSlider.addEventListener('input', () => {
            this.d = parseFloat(this.dSlider.value);
            this.marker = null;               // regions moved; the old study no longer applies
            this.verdictEl.hidden = true;
            this._update();
        });

        this.mount.querySelector('[data-role="mk1"]').addEventListener('click', () => this._makeError('I'));
        this.mount.querySelector('[data-role="mk2"]').addEventListener('click', () => this._makeError('II'));
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

    _xToPx(x) {
        const padL = 10, padR = 10;
        return padL + (x - this.xMin) / (this.xMax - this.xMin) * (this._w - padL - padR);
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

        // Shaded regions of the alternative (H1) distribution.
        this._fillRegion(this.d, this.xMin, this.c, 'rgba(0,114,178,0.35)');   // β (missed)
        this._fillRegion(this.d, this.c, this.xMax, 'rgba(56,142,60,0.30)');   // power (detected)
        // Small false-positive tail of the null for context.
        this._fillRegion(0, this.c, this.xMax, 'rgba(213,94,0,0.20)');         // α

        // Curves.
        this._strokeCurve(0, '#232D4B');
        this._strokeCurve(this.d, '#E57200');

        // Baseline axis.
        ctx.beginPath();
        ctx.moveTo(this._xToPx(this.xMin), baseY);
        ctx.lineTo(this._xToPx(this.xMax), baseY);
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Threshold line.
        const cx = this._xToPx(this.c);
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(cx, this._yToPx(0));
        ctx.lineTo(cx, this._yToPx(this.maxDens) - 4);
        ctx.strokeStyle = '#c62828';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#c62828';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('significance', cx, this._yToPx(this.maxDens) - 8);
        ctx.fillText('threshold', cx, this._yToPx(this.maxDens) + 6);

        // A single demonstrated study result (drawn last, on top).
        if (this.marker) {
            const mean = this.marker.type === 'I' ? 0 : this.d;
            const mx = this._xToPx(this.marker.x);
            const my = this._yToPx(this._curveY(this.marker.x, mean));
            const color = this.marker.type === 'I' ? '#D55E00' : '#0072B2';

            ctx.beginPath();
            ctx.moveTo(mx, baseY);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(mx, my, 6, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = '700 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('this study', mx, my - 12);
        }
    }

    /**
     * Draw one study that commits the named error, and mark where it landed.
     *   'I'  — from H0 (no effect) but past the threshold → false positive
     *   'II' — from H1 (real effect) but short of the threshold → false negative
     */
    _makeError(type) {
        if (type === 'II' && this.d < 0.5) {
            // Nothing to miss without a real effect — set a moderate one first.
            this.d = 2.0;
            this.dSlider.value = '2';
        }

        let x;
        if (type === 'I') {
            // N(0,1) truncated to (c, ∞): a no-effect study that still "rejects".
            const lo = Stats.normalCDF(this.c);
            const u = lo + Math.random() * (1 - lo);
            x = Stats.zQuantile(Math.min(0.999995, u));
        } else {
            // N(d,1) truncated to (−∞, c): a real-effect study that fails to reject.
            const hi = Stats.normalCDF(this.c - this.d);
            const u = Math.random() * hi;
            x = this.d + Stats.zQuantile(Math.max(0.000005, u));
        }

        this.marker = { x, type };
        this._showVerdict(type);
        this._update();
    }

    _showVerdict(type) {
        this.verdictEl.hidden = false;
        if (type === 'I') {
            this.verdictEl.style.borderLeftColor = '#D55E00';
            this.verdictEl.innerHTML =
                '<strong class="ink-alpha">Type I error (false positive):</strong> this study had ' +
                '<em>no</em> true effect, yet its result crossed the significance threshold — it would ' +
                'wrongly report a positive finding. This happens α = 5% of the time by chance.';
        } else {
            this.verdictEl.style.borderLeftColor = '#0072B2';
            this.verdictEl.innerHTML =
                '<strong class="ink-beta">Type II error (false negative):</strong> a real effect exists, ' +
                'but this study fell short of the threshold — it would wrongly report “no difference,” ' +
                'missing a treatment that truly works.';
        }
    }

    _update() {
        this.dVal.textContent = this.d.toFixed(1);
        const beta = Stats.normalCDF(this.c - this.d);
        const power = 1 - beta;
        this.betaEl.textContent = `${(beta * 100).toFixed(0)}%`;
        this.powerEl.textContent = `${(power * 100).toFixed(0)}%`;

        if (this.d < 0.05) {
            this.noteEl.textContent = 'With no true effect, β is undefined — there is nothing to miss. Nudge the effect up.';
        } else if (beta > 0.5) {
            this.noteEl.textContent = 'The effect is small and the curves overlap heavily — most real effects would be missed (high β).';
        } else if (power >= 0.8) {
            this.noteEl.textContent = 'The curves are well separated — a real effect this large is usually detected (power ≥ 80%).';
        } else {
            this.noteEl.textContent = 'As the true effect grows, the curves separate and β (the blue missed-effect area) shrinks.';
        }
        this._draw();
    }
}
