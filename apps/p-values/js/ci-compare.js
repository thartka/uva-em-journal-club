/**
 * Q4 interactive — non-significant ≠ no effect; watch precision buy significance.
 *
 * The original stroke trial (fixed curve) observed RR 0.85 — a 15% relative
 * risk reduction — but was too small to be significant (calibrated to p = 0.20
 * at n = 500). The slider runs a hypothetical follow-up trial that observes
 * the SAME RR 0.85 with however many patients the learner chooses. Precision
 * scales with √n, so the curve narrows and the 95% CI tightens until, at
 * enough patients, the CI finally excludes RR = 1 and the result turns
 * significant — the effect never changes, only the certainty about it.
 *
 * Each result is drawn as a normal curve (its sampling distribution on the
 * log-RR scale): wide/flat = imprecise, tall/narrow = precise. The darker
 * band under each curve is its 95% CI.
 */

class CICompare {
    constructor(mount) {
        this.mount = mount;
        this.rr = 0.85;          // observed risk ratio (identical in both trials)
        this.n0 = 500;           // patients in the original trial
        this.z0 = 1.2816;        // two-sided z for p = 0.20 — pins the original trial's p
        // SE = k / sqrt(n), calibrated so the original trial lands at p = 0.20.
        this.k = (Math.abs(Math.log(this.rr)) / this.z0) * Math.sqrt(this.n0);
        this.n = this.n0;        // slider: patients in the follow-up trial
        this.step = 50;
        this.rrMin = 0.45;
        this.rrMax = 1.7;

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
                The trial from the question (gray curve) saw a 15% relative risk reduction — RR 0.85 —
                but with only 500 patients it was non-significant. Drag the slider to run a follow-up
                trial that observes the <strong>same RR 0.85</strong> in more patients. Each result is
                drawn as its sampling distribution — taller and narrower means more precise — and the
                darker band is its 95% CI. How many patients does it take before the CI excludes
                “no effect”?
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <label for="npts">Patients in the follow-up trial:</label>
                    <input type="range" id="npts" data-role="npts" min="100" max="3000" value="500" step="50">
                    <span data-role="nval">500</span>
                </div>
            </div>
            <div class="ci-verdicts" data-role="verdicts"></div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.nSlider = this.mount.querySelector('[data-role="npts"]');
        this.nVal = this.mount.querySelector('[data-role="nval"]');
        this.verdictsEl = this.mount.querySelector('[data-role="verdicts"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.nSlider.addEventListener('input', () => {
            this.n = parseInt(this.nSlider.value, 10);
            this._update();
        });
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        const h = Math.min(Math.max(w * 0.5, 200), 260);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    _statsFor(n) {
        const se = this.k / Math.sqrt(n);
        const lnRR = Math.log(this.rr);
        return {
            se,
            lo: Math.exp(lnRR - 1.96 * se),
            hi: Math.exp(lnRR + 1.96 * se),
            p: 2 * (1 - Stats.normalCDF(Math.abs(lnRR) / se))
        };
    }

    // Smallest slider stop at which the follow-up trial turns significant.
    _nNeeded() {
        const nCrit = this.n0 * Math.pow(1.96 / this.z0, 2);
        return Math.ceil(nCrit / this.step) * this.step;
    }

    _fmtP(p) {
        if (p < 0.001) return '&lt; 0.001';
        return '= ' + (p < 0.095 ? p.toFixed(3) : p.toFixed(2));
    }

    // Two decimals, but never round a bound onto 1.00 from either side —
    // "CI 0.72–1.00 excludes RR 1.0" would read as a contradiction.
    _fmtRR(v) {
        return (v.toFixed(2) === '1.00' && v !== 1) ? v.toFixed(3) : v.toFixed(2);
    }

    _xForRR(rr) {
        const padL = 22, padR = 22;
        const l = Math.log(rr), lMin = Math.log(this.rrMin), lMax = Math.log(this.rrMax);
        return padL + ((l - lMin) / (lMax - lMin)) * (this._w - padL - padR);
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        const padT = 40, axisY = this._h - 30;
        const xStart = this._xForRR(this.rrMin);
        const xEnd = this._xForRR(this.rrMax);
        const lMin = Math.log(this.rrMin), lMax = Math.log(this.rrMax);
        const peakH = axisY - padT - 6;

        // Null line at RR = 1.
        const x1 = this._xForRR(1.0);
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(x1, padT);
        ctx.lineTo(x1, axisY);
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#232D4B';
        ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('no effect', x1, padT - 2);

        // Sampling distributions as normal curves over log-RR. Peak height
        // grows with sqrt(n) (relative to the original trial), capped at the
        // plot height, so more patients literally reads as taller + narrower.
        const drawCurve = (se, peak, stroke, fillLight, fillDark, lo, hi) => {
            const lnMu = Math.log(this.rr);
            // One sample per pixel so narrow curves stay smooth.
            const path = () => {
                ctx.beginPath();
                ctx.moveTo(xStart, axisY);
                for (let x = xStart; x <= xEnd; x++) {
                    const l = lMin + ((x - xStart) / (xEnd - xStart)) * (lMax - lMin);
                    const z = (l - lnMu) / se;
                    ctx.lineTo(x, axisY - peak * Math.exp(-0.5 * z * z));
                }
                ctx.lineTo(xEnd, axisY);
            };

            // Light fill under the whole curve, darker band over the 95% CI.
            path();
            ctx.fillStyle = fillLight;
            ctx.fill();
            ctx.save();
            const xLo = this._xForRR(Math.max(this.rrMin, lo));
            const xHi = this._xForRR(Math.min(this.rrMax, hi));
            ctx.beginPath();
            ctx.rect(xLo, padT - 16, xHi - xLo, axisY - padT + 16);
            ctx.clip();
            path();
            ctx.fillStyle = fillDark;
            ctx.fill();
            ctx.restore();

            // Curve outline.
            ctx.beginPath();
            for (let x = xStart; x <= xEnd; x++) {
                const l = lMin + ((x - xStart) / (xEnd - xStart)) * (lMax - lMin);
                const z = (l - lnMu) / se;
                const y = axisY - peak * Math.exp(-0.5 * z * z);
                if (x === xStart) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Point estimate as a thin center line up to the peak.
            const xPt = this._xForRR(this.rr);
            ctx.beginPath();
            ctx.moveTo(xPt, axisY);
            ctx.lineTo(xPt, axisY - peak);
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        const orig = this._statsFor(this.n0);
        const next = this._statsFor(this.n);
        const sig = next.hi < 1;
        const origPeak = 0.45 * peakH;
        const nextPeak = Math.min(peakH, origPeak * Math.sqrt(this.n / this.n0));
        const nextColor = sig ? '#2e7d32' : '#E57200';
        const nextFill = sig ? 'rgba(46,125,50,' : 'rgba(229,114,0,';

        drawCurve(orig.se, origPeak, '#8a93ad', 'rgba(35,45,75,0.08)', 'rgba(35,45,75,0.16)', orig.lo, orig.hi);
        drawCurve(next.se, nextPeak, nextColor, nextFill + '0.10)', nextFill + '0.22)', next.lo, next.hi);

        // Legend (top-left) — both curves are centered on RR 0.85, so labels
        // beside the peaks would collide; fixed swatches are unambiguous.
        const legend = [
            { color: '#8a93ad', label: `Original trial (n = ${this.n0})` },
            { color: nextColor, label: `Follow-up trial (n = ${this.n.toLocaleString()})` }
        ];
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        legend.forEach((e, i) => {
            const y = 12 + i * 15;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(xStart, y);
            ctx.lineTo(xStart + 18, y);
            ctx.stroke();
            ctx.fillStyle = '#333';
            ctx.fillText(e.label, xStart + 24, y);
        });

        // Axis with RR ticks (log scale).
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xStart, axisY);
        ctx.lineTo(xEnd, axisY);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        [0.5, 0.7, 0.85, 1.0, 1.5].forEach(t => {
            const x = this._xForRR(t);
            ctx.beginPath();
            ctx.moveTo(x, axisY);
            ctx.lineTo(x, axisY + 4);
            ctx.strokeStyle = '#999';
            ctx.stroke();
            ctx.fillText(t.toFixed(2).replace(/0$/, ''), x, axisY + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('Risk ratio for mortality (log scale)', this._xForRR(1.0), axisY + 20);
    }

    _update() {
        this.nVal.textContent = this.n.toLocaleString();

        const orig = this._statsFor(this.n0);
        const next = this._statsFor(this.n);
        const sig = next.hi < 1;

        this.verdictsEl.innerHTML = '';
        const rows = [
            {
                cls: 'inconclusive',
                html: `<strong>Original trial (n = ${this.n0}):</strong> RR ${this.rr.toFixed(2)} ` +
                      `(95% CI ${this._fmtRR(orig.lo)}–${this._fmtRR(orig.hi)}), p ${this._fmtP(orig.p)} — non-significant.`
            },
            {
                cls: sig ? 'rules-out' : 'inconclusive',
                html: `<strong>Follow-up trial (n = ${this.n.toLocaleString()}):</strong> RR ${this.rr.toFixed(2)} ` +
                      `(95% CI ${this._fmtRR(next.lo)}–${this._fmtRR(next.hi)}), p ${this._fmtP(next.p)} — ` +
                      (sig
                          ? '<strong>statistically significant</strong> — the CI now excludes RR 1.0.'
                          : 'still non-significant — the CI still crosses RR 1.0.')
            }
        ];
        rows.forEach(r => {
            const div = document.createElement('div');
            div.className = 'ci-verdict ' + r.cls;
            div.innerHTML = r.html;
            this.verdictsEl.appendChild(div);
        });

        this.noteEl.innerHTML = sig
            ? `With the same 15% relative risk reduction, significance arrives at ≈ ${this._nNeeded().toLocaleString()} ` +
              'patients. The effect never changed — only the precision did. That is why a non-significant result ' +
              'from a small trial means “we don’t know yet,” not “no effect.”'
            : 'Same effect, same RR 0.85 — just not enough patients yet. Keep enrolling and watch the curve ' +
              'tighten around the point estimate.';
        this._draw();
    }
}
