/**
 * Q1 interactive — what a p-value measures (tail area under the null).
 *
 * The curve is the sampling distribution of the test statistic assuming H0 is
 * true (a standard normal centered at 0). The slider sets the TOTAL shaded
 * area (the significance level); the matching cutoff in standard deviations is
 * derived and labeled on the curve. The one-/two-tailed toggle is the point of
 * the exercise: the total stays the same, but a two-tailed test SPLITS it
 * between both tails (each half as big, cutoff further out), while a one-tailed
 * test puts it all on one side (that tail visibly larger, cutoff closer in).
 */

class PValueCurve {
    constructor(mount) {
        this.mount = mount;
        this.total = 0.05;      // TOTAL shaded area (slider, as a fraction)
        this.tails = 2;         // 1 or 2
        this.zMax = 4;          // x-axis extent (in SD units)
        this._recompute();

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

    // Area in each shaded tail, and the SD cutoff that produces it.
    _perTail() {
        return this.tails === 2 ? this.total / 2 : this.total;
    }

    _recompute() {
        this.z = Stats.zQuantile(1 - this._perTail());
    }

    _build() {
        this.mount.innerHTML = `
            <p class="interactive-intro">
                This bell curve is what the result would look like <strong>if the null hypothesis were true</strong>
                (no real effect). The slider sets the <strong>total shaded area</strong> — the p-value — and the
                matching cutoff (in standard deviations) is shown on the curve. <strong>Switch one → two tailed</strong>:
                the total stays the same, but a two-tailed test <em>splits</em> it between both tails, so the shaded
                area on one side is larger for a one-tailed test.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <label for="area">Total shaded area:</label>
                    <input type="range" id="area" data-role="a" min="1" max="40" value="5" step="0.5">
                    <span data-role="aval">5%</span>
                </div>
                <div class="control-group">
                    <label>Test type:</label>
                    <div class="seg">
                        <button type="button" class="btn btn-secondary" data-role="t2">Two-tailed</button>
                        <button type="button" class="btn btn-secondary" data-role="t1">One-tailed</button>
                    </div>
                </div>
            </div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.aSlider = this.mount.querySelector('[data-role="a"]');
        this.aVal = this.mount.querySelector('[data-role="aval"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');
        this.btn2 = this.mount.querySelector('[data-role="t2"]');
        this.btn1 = this.mount.querySelector('[data-role="t1"]');

        this.aSlider.addEventListener('input', () => {
            this.total = parseFloat(this.aSlider.value) / 100;
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

    _fmtPct(frac) {
        const pct = frac * 100;
        return (pct >= 9.95 ? pct.toFixed(0) : pct.toFixed(1)) + '%';
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
        ctx.fillText('Test statistic if H₀ were true (standard deviations from 0)', this._xToPx(0), baseY + 20);

        // Cutoff line(s) with the SD value labeled on the chart.
        const drawCutoff = (z, label) => {
            const x = this._xToPx(z);
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, padT + 14);
            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#c15400';
            ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(label, x, padT + 12);
        };
        drawCutoff(this.z, `${this.z.toFixed(2)} SD`);
        if (this.tails === 2) drawCutoff(-this.z, `-${this.z.toFixed(2)} SD`);

        // Per-tail percentage labels, drawn just above where each tail meets the
        // curve (handout-style).
        const tailPct = this._fmtPct(this._perTail());
        ctx.font = '700 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#c15400';
        ctx.textBaseline = 'bottom';
        const labelY = Math.max(padT + 30, yFor(Stats.normalPDF(this.z)) - 6);
        ctx.textAlign = 'left';
        ctx.fillText(tailPct, Math.min(this._xToPx(this.z) + 4, this._w - 42), labelY);
        if (this.tails === 2) {
            ctx.textAlign = 'right';
            ctx.fillText(tailPct, Math.max(this._xToPx(-this.z) - 4, 42), labelY);
        }
    }

    _update() {
        this._recompute();
        this.aVal.textContent = this._fmtPct(this.total);
        this.btn2.classList.toggle('active', this.tails === 2);
        this.btn1.classList.toggle('active', this.tails === 1);

        if (this.tails === 2) {
            this.noteEl.innerHTML = `Two-tailed: the total ${this._fmtPct(this.total)} is <strong>split between both tails</strong> — ${this._fmtPct(this._perTail())} in each — so the cutoff sits further out at <strong>±${this.z.toFixed(2)} SD</strong>. Switch to one-tailed and it all moves to one side.`;
        } else {
            this.noteEl.innerHTML = `One-tailed: the whole ${this._fmtPct(this.total)} sits in <strong>one tail</strong>, so that shaded area is larger and the cutoff is closer in at <strong>${this.z.toFixed(2)} SD</strong>. Switch to two-tailed to split the same total between both sides.`;
        }
        this._draw();
    }
}
