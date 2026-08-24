/**
 * data-distributions: shared histogram renderer.
 *
 * One canvas chart used by the arrivals simulator, the binomial simulator, the
 * shape gallery, the test-comparison panel and both question interactives. It
 * draws a histogram plus any combination of:
 *   - a fitted density curve
 *   - vertical markers (mean, median, a threshold)
 *   - horizontal interval bands (mean +/- SD, IQR, range, a 95% CI)
 *   - shaded x-regions (e.g. "no patient can be here")
 *
 * Callers hand render() a spec object; nothing is retained between calls except
 * the axis configuration, so a slider can re-render on every input event.
 */

class HistChart {
    constructor(canvasId, opts = {}) {
        this.canvas = typeof canvasId === 'string'
            ? document.getElementById(canvasId)
            : canvasId;
        this.ctx = this.canvas.getContext('2d');

        this.aspect = opts.aspect || 0.52;
        this.xLabel = opts.xLabel || '';
        this.yLabel = opts.yLabel || 'Count';
        this.barColor = opts.barColor || '#8fa5c4';
        this.barStroke = opts.barStroke || '#5b7a9e';
        this.discrete = !!opts.discrete;     // integer-valued x (counts)
        this.xTickFormat = opts.xTickFormat || (v => String(Math.round(v * 10) / 10));

        this.pad = { l: 54, r: 16, t: 16, b: 42 };

        this._onResize = () => { this.resize(); if (this._last) this.render(this._last); };
        window.addEventListener('resize', this._onResize);
        this.resize();
    }

    resize() {
        const container = this.canvas.parentElement;
        const cssW = Math.max(260, container.clientWidth - 2);
        const cssH = Math.round(cssW * this.aspect);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = cssW + 'px';
        this.canvas.style.height = cssH + 'px';
        this.canvas.width = Math.round(cssW * dpr);
        this.canvas.height = Math.round(cssH * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = cssW;
        this.h = cssH;
    }

    /* -------------------- scales -------------------- */

    _plot() {
        return {
            x0: this.pad.l,
            x1: this.w - this.pad.r,
            y0: this.h - this.pad.b,
            y1: this.pad.t
        };
    }

    _sx(v, lo, hi) {
        const p = this._plot();
        return p.x0 + ((v - lo) / (hi - lo)) * (p.x1 - p.x0);
    }

    _sy(v, yMax) {
        const p = this._plot();
        return p.y0 - (v / yMax) * (p.y0 - p.y1);
    }

    /**
     * spec = {
     *   lo, hi, nBins,
     *   data:   [numbers]                     one group, or
     *   groups: [{data, color, label}]        two overlaid groups
     *   counts: [numbers]                     pre-binned, overrides data
     *   curve:  {fn, n, color}                density; n scales it to counts
     *   markers:[{x, label, color, dash}]
     *   bands:  [{from, to, label, color, at}]
     *   shade:  [{from, to, color, label}]
     *   yMax, xTicks
     * }
     */
    render(spec) {
        this._last = spec;
        const ctx = this.ctx;
        const lo = spec.lo, hi = spec.hi;
        const nBins = spec.nBins || 24;
        const p = this._plot();

        ctx.clearRect(0, 0, this.w, this.h);

        // Bin the data.
        const series = [];
        if (spec.counts) {
            series.push({ counts: spec.counts, color: this.barColor, label: null });
        } else if (spec.groups) {
            for (const g of spec.groups) {
                series.push({
                    counts: Stats.histogram(g.data, lo, hi, nBins).counts,
                    color: g.color, label: g.label
                });
            }
        } else if (spec.data) {
            series.push({
                counts: Stats.histogram(spec.data, lo, hi, nBins).counts,
                color: this.barColor, label: null
            });
        }

        let yMax = spec.yMax;
        if (!yMax) {
            yMax = 1;
            for (const s of series) yMax = Math.max(yMax, ...s.counts);
            yMax *= 1.18;
        }

        // Shaded x-regions sit behind everything.
        for (const sh of (spec.shade || [])) {
            const a = this._sx(Math.max(sh.from, lo), lo, hi);
            const b = this._sx(Math.min(sh.to, hi), lo, hi);
            ctx.fillStyle = sh.color || 'rgba(198,40,40,0.10)';
            ctx.fillRect(Math.min(a, b), p.y1, Math.abs(b - a), p.y0 - p.y1);
            if (sh.label) {
                ctx.save();
                ctx.font = '600 10px -apple-system, Segoe UI, sans-serif';
                ctx.fillStyle = '#c62828';
                ctx.textAlign = 'center';
                ctx.fillText(sh.label, (a + b) / 2, p.y1 + 12);
                ctx.restore();
            }
        }

        this._drawGrid(ctx, p, yMax);

        // Bars.
        const binW = (hi - lo) / nBins;
        const pxPerBin = (p.x1 - p.x0) / nBins;
        series.forEach((s, si) => {
            ctx.fillStyle = s.color;
            ctx.globalAlpha = series.length > 1 ? 0.62 : 1;
            for (let i = 0; i < s.counts.length; i++) {
                const c = s.counts[i];
                if (!c) continue;
                const x = p.x0 + i * pxPerBin;
                const y = this._sy(c, yMax);
                const wBar = Math.max(1, pxPerBin - (this.discrete ? 3 : 1));
                ctx.fillRect(x + (pxPerBin - wBar) / 2, y, wBar, p.y0 - y);
            }
            ctx.globalAlpha = 1;
        });

        // Density curve, scaled to the count axis when n is supplied.
        if (spec.curve && typeof spec.curve.fn === 'function') {
            const n = spec.curve.n;
            let peak = 0;
            const pts = [];
            for (let i = 0; i <= 200; i++) {
                const xv = lo + (hi - lo) * (i / 200);
                const d = spec.curve.fn(xv);
                peak = Math.max(peak, d);
                pts.push([xv, d]);
            }
            const scale = n ? n * binW : (peak > 0 ? (yMax / 1.18) / peak : 0);
            ctx.beginPath();
            pts.forEach(([xv, d], i) => {
                const X = this._sx(xv, lo, hi);
                const Y = this._sy(d * scale, yMax);
                if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
            });
            ctx.strokeStyle = spec.curve.color || '#232D4B';
            ctx.lineWidth = 2.4;
            ctx.stroke();
        }

        // Interval bands, stacked in rows near the top of the plot.
        (spec.bands || []).forEach((band, i) => {
            const y = p.y1 + 12 + i * 19;
            const a = this._sx(Math.max(band.from, lo - (hi - lo)), lo, hi);
            const b = this._sx(Math.min(band.to, hi + (hi - lo)), lo, hi);
            const color = band.color || '#1565c0';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(a, y);
            ctx.lineTo(b, y);
            ctx.stroke();
            for (const cap of [a, b]) {
                ctx.beginPath();
                ctx.moveTo(cap, y - 5);
                ctx.lineTo(cap, y + 5);
                ctx.stroke();
            }
            if (band.label) {
                ctx.font = '600 11px -apple-system, Segoe UI, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(band.label, Math.min(a, b) + 4, y - 8);
            }
        });

        // Vertical markers. Each label gets its own horizontal band, because
        // mean and median frequently land within a few pixels of one another
        // (on a Poisson count they are often the same value), and drawing every
        // label at one height left them written on top of each other. Labels
        // are placed below any interval bands so the two never collide either.
        const bandRows = (spec.bands || []).length;
        const markerTop = p.y1 + 12 + bandRows * 19;
        const markerLine = 17;

        (spec.markers || []).forEach((m, i) => {
            if (!isFinite(m.x) || m.x < lo || m.x > hi) return;
            const X = this._sx(m.x, lo, hi);
            ctx.save();
            ctx.strokeStyle = m.color || '#c62828';
            ctx.lineWidth = 2.2;
            if (m.dash) ctx.setLineDash(m.dash);
            ctx.beginPath();
            ctx.moveTo(X, p.y0);
            ctx.lineTo(X, p.y1 + 4);
            ctx.stroke();
            ctx.restore();

            if (m.label) {
                const y = markerTop + i * markerLine;
                ctx.font = '700 13px -apple-system, Segoe UI, sans-serif';
                ctx.fillStyle = m.color || '#c62828';
                const rightHalf = X > (p.x0 + p.x1) / 2;
                ctx.textAlign = rightHalf ? 'right' : 'left';
                ctx.fillText(m.label, X + (rightHalf ? -6 : 6), y);
            }
        });

        this._drawAxes(ctx, p, lo, hi, yMax, spec);

        // Placeholder shown before any data exists, so the axes can be talked
        // through before the simulation is run.
        if (spec.emptyMessage) {
            ctx.font = '600 14px -apple-system, Segoe UI, sans-serif';
            ctx.fillStyle = '#8a94a0';
            ctx.textAlign = 'center';
            ctx.fillText(spec.emptyMessage, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2);
        }

        // Legend for multi-group charts.
        if (spec.groups && spec.groups.some(g => g.label)) {
            let lx = p.x0 + 8;
            const ly = p.y1 + 8;
            ctx.font = '600 11px -apple-system, Segoe UI, sans-serif';
            ctx.textAlign = 'left';
            for (const g of spec.groups) {
                if (!g.label) continue;
                ctx.fillStyle = g.color;
                ctx.fillRect(lx, ly - 8, 10, 10);
                ctx.fillStyle = '#444';
                ctx.fillText(g.label, lx + 14, ly + 1);
                lx += 18 + ctx.measureText(g.label).width;
            }
        }
    }

    _drawGrid(ctx, p, yMax) {
        const steps = 4;
        ctx.strokeStyle = '#eceff3';
        ctx.lineWidth = 1;
        for (let i = 1; i <= steps; i++) {
            const y = p.y0 - (i / steps) * (p.y0 - p.y1);
            ctx.beginPath();
            ctx.moveTo(p.x0, y);
            ctx.lineTo(p.x1, y);
            ctx.stroke();
        }
    }

    _drawAxes(ctx, p, lo, hi, yMax, spec) {
        ctx.strokeStyle = '#9aa4b0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x0, p.y1);
        ctx.lineTo(p.x0, p.y0);
        ctx.lineTo(p.x1, p.y0);
        ctx.stroke();

        ctx.font = '11px -apple-system, Segoe UI, sans-serif';
        ctx.fillStyle = '#666';

        // y ticks
        ctx.textAlign = 'right';
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const v = (yMax / 1.18) * (i / steps);
            const y = this._sy(v, yMax);
            ctx.fillText(String(Math.round(v)), p.x0 - 6, y + 4);
        }

        // x ticks
        ctx.textAlign = 'center';
        const ticks = spec.xTicks || 6;
        for (let i = 0; i <= ticks; i++) {
            const v = lo + (hi - lo) * (i / ticks);
            ctx.fillText(this.xTickFormat(v), this._sx(v, lo, hi), p.y0 + 16);
        }

        // labels
        ctx.fillStyle = '#444';
        ctx.font = '600 12px -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        if (this.xLabel) ctx.fillText(this.xLabel, (p.x0 + p.x1) / 2, this.h - 6);
        if (this.yLabel) {
            ctx.save();
            ctx.translate(13, (p.y0 + p.y1) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(this.yLabel, 0, 0);
            ctx.restore();
        }
    }
}
