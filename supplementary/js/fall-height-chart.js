/**
 * Interactive "estimated probability of ciTBI vs. fall height" chart.
 *
 * Vanilla canvas, no dependencies — matches the other Journal Club apps.
 * A slider (and dragging on the chart) moves a marker along the curve and reads
 * off the estimated probability at any fall height.
 *
 * NOTE: these points were read off the produced PNG. Replace DATA with the exact
 * height/probability values (or a model formula in _probAt) for a precise curve.
 */

const FallHeightChart = (() => {

    // [fall height (inches), estimated probability of ciTBI (%)] — from the model
    // table (heights are 0–200 cm converted to inches).
    const DATA = [
        [0.0, 11.3], [9.8, 22.7], [19.7, 40.3], [29.5, 58.7], [39.4, 74.1],
        [49.2, 82.9], [59.1, 89.1], [68.9, 93.3], [78.7, 95.9]
    ];

    class Chart {
        constructor(mount) {
            this.mount = mount;
            this.hMin = 0;
            this.hMax = 80;
            this.pMin = 0;
            this.pMax = 100;
            this.h = 30;             // current fall height (inches)

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
                <p class="chart-intro">
                    Drag the slider — or the chart itself — to read the estimated probability of
                    clinically important TBI at any fall height.
                </p>
                <div class="chart-canvas-wrap"><canvas data-role="canvas"></canvas></div>
                <div class="chart-controls">
                    <label for="fh">Fall height:</label>
                    <input type="range" id="fh" data-role="h" min="0" max="80" value="30" step="1">
                    <span data-role="hval">30 in</span>
                </div>
                <div class="chart-readouts">
                    <div class="chart-readout">
                        <div class="rl">Fall height</div>
                        <div class="rv" data-role="rh">—</div>
                    </div>
                    <div class="chart-readout">
                        <div class="rl">Est. probability of ciTBI</div>
                        <div class="rv" data-role="rp">—</div>
                    </div>
                </div>
                <p class="chart-note">Figure produced by Thomas Hartka.</p>
            `;

            this.canvas = this.mount.querySelector('[data-role="canvas"]');
            this.ctx = this.canvas.getContext('2d');
            this.slider = this.mount.querySelector('[data-role="h"]');
            this.hVal = this.mount.querySelector('[data-role="hval"]');
            this.rhEl = this.mount.querySelector('[data-role="rh"]');
            this.rpEl = this.mount.querySelector('[data-role="rp"]');

            this.slider.addEventListener('input', () => {
                this.h = parseInt(this.slider.value, 10);
                this._update();
            });

            // Drag / tap directly on the chart.
            const setFromEvent = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                let h = this._pxToH(e.clientX - rect.left);
                h = Math.max(this.hMin, Math.min(this.hMax, Math.round(h)));
                this.h = h;
                this.slider.value = h;
                this._update();
            };
            this.canvas.addEventListener('pointerdown', (e) => {
                this._dragging = true;
                this.canvas.setPointerCapture(e.pointerId);
                setFromEvent(e);
            });
            this.canvas.addEventListener('pointermove', (e) => { if (this._dragging) setFromEvent(e); });
            this.canvas.addEventListener('pointerup', () => { this._dragging = false; });
            this.canvas.addEventListener('pointercancel', () => { this._dragging = false; });
            this.canvas.style.touchAction = 'none';
            this.canvas.style.cursor = 'ew-resize';
        }

        _resize() {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            const w = rect.width - 20;
            const h = Math.min(Math.max(w * 0.6, 240), 380, Math.round((window.innerHeight || 480) * 0.6));
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.canvas.width = w * this._dpr;
            this.canvas.height = h * this._dpr;
            this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
            this._w = w;
            this._h = h;
            this._draw();
        }

        _padL() { return 46; }
        _padR() { return 16; }
        _padT() { return 34; }
        _padB() { return 42; }

        _xToPx(h) {
            return this._padL() + (h - this.hMin) / (this.hMax - this.hMin) * (this._w - this._padL() - this._padR());
        }
        _pxToH(px) {
            return this.hMin + (px - this._padL()) / (this._w - this._padL() - this._padR()) * (this.hMax - this.hMin);
        }
        _yToPx(p) {
            return this._padT() + (this.pMax - p) / (this.pMax - this.pMin) * (this._h - this._padT() - this._padB());
        }

        _probAt(h) {
            if (h <= DATA[0][0]) return DATA[0][1];
            if (h >= DATA[DATA.length - 1][0]) return DATA[DATA.length - 1][1];
            for (let i = 0; i < DATA.length - 1; i++) {
                const [x0, y0] = DATA[i], [x1, y1] = DATA[i + 1];
                if (h >= x0 && h <= x1) {
                    return y0 + (y1 - y0) * (h - x0) / (x1 - x0);
                }
            }
            return DATA[DATA.length - 1][1];
        }

        _draw() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this._w, this._h);
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';

            // Title.
            ctx.fillStyle = '#232D4B';
            ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('Estimated probability vs. fall height', (this._padL() + this._xToPx(this.hMax)) / 2, 8);

            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';

            // Y gridlines + labels.
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let p = this.pMin; p <= this.pMax; p += 20) {
                const y = this._yToPx(p);
                ctx.beginPath();
                ctx.moveTo(this._xToPx(this.hMin), y);
                ctx.lineTo(this._xToPx(this.hMax), y);
                ctx.strokeStyle = '#eee';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = '#888';
                ctx.fillText(p, this._xToPx(this.hMin) - 6, y);
            }

            // X ticks + labels.
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            for (let h = this.hMin; h <= this.hMax; h += 10) {
                const x = this._xToPx(h);
                ctx.fillStyle = '#888';
                ctx.fillText(h, x, this._yToPx(0) + 6);
            }

            // Axis titles.
            ctx.fillStyle = '#555';
            ctx.fillText('Fall height (inches)', (this._xToPx(this.hMin) + this._xToPx(this.hMax)) / 2, this._yToPx(0) + 22);
            ctx.save();
            ctx.translate(12, (this._yToPx(0) + this._yToPx(100)) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Estimated probability (%)', 0, 0);
            ctx.restore();

            // Curve.
            ctx.beginPath();
            DATA.forEach(([h, p], i) => {
                const px = this._xToPx(h), py = this._yToPx(p);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = '#0072B2';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Data markers.
            DATA.forEach(([h, p]) => {
                ctx.beginPath();
                ctx.arc(this._xToPx(h), this._yToPx(p), 3.5, 0, 2 * Math.PI);
                ctx.fillStyle = '#0072B2';
                ctx.fill();
            });

            // Current-height indicator.
            const p = this._probAt(this.h);
            const cx = this._xToPx(this.h);
            const cy = this._yToPx(p);

            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 1.5;
            // vertical to axis
            ctx.beginPath();
            ctx.moveTo(cx, this._yToPx(0));
            ctx.lineTo(cx, cy);
            ctx.stroke();
            // horizontal to y-axis
            ctx.beginPath();
            ctx.moveTo(this._xToPx(this.hMin), cy);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#E57200';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        _update() {
            const feet = (this.h / 12);
            this.hVal.textContent = `${this.h} in`;
            this.rhEl.textContent = `${this.h} in (${feet.toFixed(1)} ft)`;
            this.rpEl.textContent = `${this._probAt(this.h).toFixed(1)}%`;
            this._draw();
        }
    }

    return { Chart, DATA };
})();
