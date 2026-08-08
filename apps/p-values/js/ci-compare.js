/**
 * Q4 interactive — non-significant ≠ no effect; read the CI.
 *
 * Two trials, both non-significant (their 95% CIs cross RR = 1), but they mean
 * very different things:
 *   • Study A (small trial): wide CI — compatible with big benefit AND with harm.
 *   • Study B (large trial): tight CI — hugs "no effect," excluding any big effect.
 * The slider sets the smallest clinically important benefit (a risk ratio
 * threshold). A study is "inconclusive" if its CI still reaches past that
 * threshold; it "rules out a meaningful effect" if its whole CI sits inside the
 * unimportant zone. Same non-significant verdict, opposite conclusions — the CI
 * tells them apart, the p-value alone cannot.
 */

class CICompare {
    constructor(mount) {
        this.mount = mount;
        // Each study stored as risk ratio + SE on the log scale (both non-significant).
        this.studies = [
            { name: 'Study A — small trial', rr: 0.75, se: 0.208 },   // wide:  CI ≈ 0.50–1.13, p ≈ 0.17
            { name: 'Study B — large trial', rr: 0.97, se: 0.021 }    // tight: CI ≈ 0.93–1.01, p ≈ 0.15
        ];
        this.mid = 0.90;        // smallest clinically important benefit (RR threshold)
        this.rrMin = 0.4;
        this.rrMax = 2.0;

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
                Both trials are <strong>non-significant</strong> — each 95% CI crosses “no effect” (risk ratio 1.0).
                Drag the slider to set the smallest mortality benefit you'd call clinically meaningful, and read
                what each trial can actually say. Same p-verdict, very different conclusions.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <label for="mid">Meaningful benefit if RR ≤:</label>
                    <input type="range" id="mid" data-role="mid" min="0.70" max="0.98" value="0.90" step="0.01">
                    <span data-role="midval">0.90</span>
                </div>
            </div>
            <div class="ci-verdicts" data-role="verdicts"></div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.midSlider = this.mount.querySelector('[data-role="mid"]');
        this.midVal = this.mount.querySelector('[data-role="midval"]');
        this.verdictsEl = this.mount.querySelector('[data-role="verdicts"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.midSlider.addEventListener('input', () => {
            this.mid = parseFloat(this.midSlider.value);
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

    _statsFor(s) {
        const lnRR = Math.log(s.rr);
        const lo = Math.exp(lnRR - 1.96 * s.se);
        const hi = Math.exp(lnRR + 1.96 * s.se);
        const p = 2 * (1 - Stats.normalCDF(Math.abs(lnRR) / s.se));
        return { lo, hi, p };
    }

    _verdict(s) {
        const { lo, hi, p } = this._statsFor(s);
        if (hi < 1) return { kind: 'rules-out', p, lo, hi, text: 'a statistically significant benefit.' };
        if (lo > 1) return { kind: 'inconclusive', p, lo, hi, text: 'a statistically significant harm.' };
        // Non-significant (CI crosses 1).
        if (lo > this.mid) {
            return {
                kind: 'rules-out', p, lo, hi,
                text: `<strong>non-significant, and its CI (${lo.toFixed(2)}–${hi.toFixed(2)}) excludes a meaningful benefit</strong> — genuinely consistent with no important effect.`
            };
        }
        return {
            kind: 'inconclusive', p, lo, hi,
            text: `<strong>non-significant, but its CI (${lo.toFixed(2)}–${hi.toFixed(2)}) still includes a meaningful benefit</strong> — inconclusive, not evidence of “no effect.”`
        };
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
        const rowYs = [padT + 24, padT + 74];

        // Meaningful-benefit shaded region (RR <= mid), left of the threshold.
        const xBenefit = this._xForRR(this.mid);
        const xLeft = this._xForRR(this.rrMin);
        ctx.fillStyle = 'rgba(46,125,50,0.10)';
        ctx.fillRect(Math.min(xLeft, xBenefit), padT, Math.abs(xBenefit - xLeft), axisY - padT);

        // Threshold (MID) line.
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(xBenefit, padT);
        ctx.lineTo(xBenefit, axisY);
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#2e7d32';
        ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('◄ meaningful benefit', (Math.min(xLeft, xBenefit) + xBenefit) / 2, padT - 2);

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
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('no effect', x1, padT - 2);

        // Study CIs.
        this.studies.forEach((s, i) => {
            const v = this._verdict(s);
            const color = v.kind === 'rules-out' ? '#2e7d32' : '#E57200';
            const y = rowYs[i];
            const xLo = this._xForRR(Math.max(this.rrMin, v.lo));
            const xHi = this._xForRR(Math.min(this.rrMax, v.hi));
            const xPt = this._xForRR(s.rr);

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(xLo, y);
            ctx.lineTo(xHi, y);
            ctx.stroke();
            [xLo, xHi].forEach(x => {
                ctx.beginPath();
                ctx.moveTo(x, y - 8);
                ctx.lineTo(x, y + 8);
                ctx.stroke();
            });
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(xPt, y, 6, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#333';
            ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(s.name, xLeft, y - 11);
        });

        // Axis with RR ticks (log scale).
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this._xForRR(this.rrMin), axisY);
        ctx.lineTo(this._xForRR(this.rrMax), axisY);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        [0.5, 0.7, 1.0, 1.5, 2.0].forEach(t => {
            const x = this._xForRR(t);
            ctx.beginPath();
            ctx.moveTo(x, axisY);
            ctx.lineTo(x, axisY + 4);
            ctx.strokeStyle = '#999';
            ctx.stroke();
            ctx.fillText(t.toFixed(1), x, axisY + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('Risk ratio for mortality (log scale)', this._xForRR(1.0), axisY + 20);
    }

    _update() {
        this.midVal.textContent = this.mid.toFixed(2);

        this.verdictsEl.innerHTML = '';
        this.studies.forEach(s => {
            const v = this._verdict(s);
            const div = document.createElement('div');
            div.className = 'ci-verdict ' + v.kind;
            div.innerHTML = `<strong>${s.name}:</strong> RR ${s.rr.toFixed(2)} (95% CI ${v.lo.toFixed(2)}–${v.hi.toFixed(2)}), p = ${v.p.toFixed(2)} — ${v.text}`;
            this.verdictsEl.appendChild(div);
        });

        this.noteEl.innerHTML = 'Both trials are non-significant, yet only the small one is truly “inconclusive.” The large trial’s tight CI rules out any meaningful benefit — the confidence interval, not the p-value, tells you which is which.';
        this._draw();
    }
}
