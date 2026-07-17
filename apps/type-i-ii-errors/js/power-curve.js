/**
 * Q4 interactive — power as a function of sample size.
 *
 * Plots statistical power against patients-per-arm for a two-proportion test
 * (control event rate 20%). Sliders move the operating point along the curve
 * (sample size) and reshape it (true effect size). A dashed line marks the
 * conventional 80% target. Bigger samples and bigger effects push power up;
 * this is the lever behind "increase the sample size to raise power."
 */

class PowerCurve {
    constructor(mount) {
        this.mount = mount;
        this.controlRate = 0.20;
        this.effect = 0.05;     // absolute risk reduction
        this.n = 200;           // patients per arm
        this.nMin = 10;
        this.nMax = 1500;
        this.alpha = 0.05;

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
                The curve is the study’s <strong>power</strong> &mdash; its chance of detecting a real
                effect &mdash; at each sample size (control event rate 20%). The dashed line is the
                usual 80% target. Slide the sample size to move the dot along the curve, and change the
                true effect to reshape it.
            </p>
            <div class="canvas-container"><canvas data-role="canvas"></canvas></div>
            <div class="controls">
                <div class="control-group">
                    <label for="nps">Patients per arm:</label>
                    <input type="range" id="nps" data-role="n" min="10" max="1500" value="200" step="10">
                    <span data-role="nval">200</span>
                </div>
                <div class="control-group">
                    <label for="eff">True effect (absolute):</label>
                    <input type="range" id="eff" data-role="eff" min="1" max="12" value="5" step="1">
                    <span data-role="effval">5%</span>
                </div>
            </div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">Power at this n</div>
                    <div class="param-value" data-role="power">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">β (miss rate)</div>
                    <div class="param-value ink-beta" data-role="beta">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">n/arm for 80% power</div>
                    <div class="param-value" data-role="n80">—</div>
                </div>
            </div>
            <p class="interactive-note" data-role="note"></p>
        `;

        this.canvas = this.mount.querySelector('[data-role="canvas"]');
        this.ctx = this.canvas.getContext('2d');
        this.nSlider = this.mount.querySelector('[data-role="n"]');
        this.nVal = this.mount.querySelector('[data-role="nval"]');
        this.effSlider = this.mount.querySelector('[data-role="eff"]');
        this.effVal = this.mount.querySelector('[data-role="effval"]');
        this.powerEl = this.mount.querySelector('[data-role="power"]');
        this.betaEl = this.mount.querySelector('[data-role="beta"]');
        this.n80El = this.mount.querySelector('[data-role="n80"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.nSlider.addEventListener('input', () => {
            this.n = parseInt(this.nSlider.value, 10);
            this._update();
        });
        this.effSlider.addEventListener('input', () => {
            this.effect = parseInt(this.effSlider.value, 10) / 100;
            this._update();
        });
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width - 20;
        const h = Math.min(Math.max(w * 0.55, 240), 380);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        this._w = w;
        this._h = h;
        this._draw();
    }

    _powerAt(n) {
        const p1 = this.controlRate;
        const p2 = Math.max(0.001, this.controlRate - this.effect);
        return Stats.power(p1, p2, n, this.alpha);
    }

    _nFor80() {
        for (let n = this.nMin; n <= 20000; n += 5) {
            if (this._powerAt(n) >= 0.8) return n;
        }
        return null;
    }

    _xToPx(n) {
        const padL = 46, padR = 14;
        return padL + (n - this.nMin) / (this.nMax - this.nMin) * (this._w - padL - padR);
    }

    _yToPx(power) {
        const padT = 14, padB = 34;
        const plotH = this._h - padT - padB;
        return padT + plotH - power * plotH;
    }

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this._w, this._h);
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';

        // Y gridlines + labels (power).
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let p = 0; p <= 1.0001; p += 0.2) {
            const y = this._yToPx(p);
            ctx.beginPath();
            ctx.moveTo(this._xToPx(this.nMin), y);
            ctx.lineTo(this._xToPx(this.nMax), y);
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#888';
            ctx.fillText(`${Math.round(p * 100)}%`, this._xToPx(this.nMin) - 6, y);
        }

        // X ticks + labels.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ticks = [10, 300, 600, 900, 1200, 1500];
        ticks.forEach(t => {
            const x = this._xToPx(t);
            ctx.fillStyle = '#888';
            ctx.fillText(t, x, this._yToPx(0) + 6);
        });
        ctx.fillStyle = '#555';
        ctx.fillText('patients per arm', (this._xToPx(this.nMin) + this._xToPx(this.nMax)) / 2, this._yToPx(0) + 20);

        // 80% target line.
        const y80 = this._yToPx(0.8);
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(this._xToPx(this.nMin), y80);
        ctx.lineTo(this._xToPx(this.nMax), y80);
        ctx.strokeStyle = '#388E3C';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#388E3C';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('80% target', this._xToPx(this.nMin) + 6, y80 - 3);

        // Power curve.
        ctx.beginPath();
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const n = this.nMin + (this.nMax - this.nMin) * (i / steps);
            const px = this._xToPx(n);
            const py = this._yToPx(this._powerAt(n));
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Operating point.
        const pw = this._powerAt(this.n);
        const dotX = this._xToPx(this.n);
        const dotY = this._yToPx(pw);
        ctx.beginPath();
        ctx.moveTo(dotX, this._yToPx(0));
        ctx.lineTo(dotX, dotY);
        ctx.strokeStyle = 'rgba(229,114,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#E57200';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _update() {
        this.nVal.textContent = this.n;
        this.effVal.textContent = `${Math.round(this.effect * 100)}%`;
        const pw = this._powerAt(this.n);
        this.powerEl.textContent = `${(pw * 100).toFixed(0)}%`;
        this.betaEl.textContent = `${((1 - pw) * 100).toFixed(0)}%`;
        const n80 = this._nFor80();
        this.n80El.textContent = n80 ? `~${n80}` : '>20,000';

        if (pw >= 0.8) {
            this.noteEl.textContent = 'At this sample size the study clears 80% power — a real effect this large would usually be detected.';
        } else if (pw < 0.5) {
            this.noteEl.textContent = 'Underpowered: more than half of real effects this size would be missed. Slide the sample size up.';
        } else {
            this.noteEl.textContent = 'Below the 80% line. Increasing patients per arm (or a larger true effect) raises power.';
        }
        this._draw();
    }
}
