/**
 * data-distributions: non-parametric data gallery (page 4).
 *
 * Three non-normal ED variables from the handout, each drawn with its median
 * (IQR) laid over the histogram, and an optional fitted normal curve so the
 * misfit can be seen rather than asserted.
 *
 * Mean and SD are deliberately not drawn on these plots: the page is about what
 * to report when the data are not normal. The mean still appears in the numeric
 * readout beneath the chart, because the gap between it and the median is the
 * evidence of skew.
 *
 * Samples are drawn from a fixed seed so the projector and every resident's
 * phone show the identical histogram.
 */

const SHAPES = [
    {
        key: 'los',
        tab: 'ED length of stay',
        title: 'ED length of stay: right-skewed',
        xLabel: 'Length of stay (hours)',
        n: 1500,
        lo: 0, hi: 26, nBins: 30,
        floor: 0,
        draw: rng => rng.lognormal(3.4, 0.72),
        note: 'A long right tail of boarded patients drags the mean above the median. ' +
              'Report the median with IQR, and notice that the tail, not the typical ' +
              'patient, is what moved the mean.'
    },
    {
        key: 'stroke',
        tab: 'Age of stroke',
        title: 'Age at stroke presentation: left-skewed',
        xLabel: 'Age (years)',
        n: 1100,
        lo: 20, hi: 100, nBins: 32,
        floor: null,
        ceiling: 100,
        draw: rng => 100 - rng.gamma(4.2, 5.6),
        note: 'The mirror image: most patients are older, with a tail reaching down into ' +
              'younger ages. The mean is pulled <em>below</em> the median here.'
    },
    {
        key: 'appy',
        tab: 'Age of appendicitis',
        title: 'Age at appendicitis presentation: bimodal',
        xLabel: 'Age (years)',
        n: 900,
        lo: 0, hi: 90, nBins: 30,
        floor: 0,
        // Close to an even split on purpose. Tip the mixture past 50% either way
        // and the median stops falling in the valley and lands inside the
        // nearer peak, which loses the point of the panel.
        draw: rng => (rng.next() < 0.48
            ? rng.normal(15, 5.5)
            : rng.normal(58, 12)),
        note: 'Two separate peaks. Mean and median both land in the <em>valley between ' +
              'them</em>, describing an age at which relatively few patients actually ' +
              'present. No single number works. This one needs the figure.'
    }
];

class ShapeGallery {
    constructor() {
        this.chart = new HistChart('gallery-canvas', {
            xLabel: '',
            yLabel: 'Patients',
            barColor: '#8fa5c4'
        });

        // Both overlays start off: the bare histogram goes up first, and the
        // presenter adds each summary on top when they get to it.
        this.showMedianIQR = false;
        this.showNormal = false;

        this.cache = {};
        this.current = SHAPES[0].key;

        this.setupTabs();
        this.setupToggles();
        this.render();
    }

    /** Sample a shape once and keep it, so redraws never reshuffle the data. */
    dataFor(shape) {
        if (this.cache[shape.key]) return this.cache[shape.key];
        const rng = new RNG(1234);
        const out = [];
        let guard = 0;
        while (out.length < shape.n && guard < shape.n * 60) {
            guard++;
            let v = shape.draw(rng);
            if (shape.floor !== null && shape.floor !== undefined && v < shape.floor) continue;
            if (shape.ceiling !== undefined && v > shape.ceiling) continue;
            out.push(v);
        }
        this.cache[shape.key] = out;
        return out;
    }

    setupTabs() {
        const strip = document.getElementById('gallery-tabs');
        if (!strip) return;
        strip.innerHTML = '';
        SHAPES.forEach(s => {
            const b = document.createElement('button');
            b.className = 'tab-btn' + (s.key === this.current ? ' active' : '');
            b.textContent = s.tab;
            b.dataset.key = s.key;
            b.addEventListener('click', () => {
                this.current = s.key;
                strip.querySelectorAll('.tab-btn').forEach(x =>
                    x.classList.toggle('active', x.dataset.key === s.key));
                this.render();
            });
            strip.appendChild(b);
        });
    }

    setupToggles() {
        const wire = (id, prop, onLabel, offLabel) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const paint = () => {
                btn.textContent = this[prop] ? onLabel : offLabel;
                btn.classList.toggle('active', this[prop]);
            };
            btn.addEventListener('click', () => {
                this[prop] = !this[prop];
                paint();
                this.render();
            });
            paint();
        };
        wire('gal-medianiqr-btn', 'showMedianIQR', 'Hide median (IQR)', 'Show median (IQR)');
        wire('gal-normal-btn', 'showNormal', 'Hide normal curve', 'Fit a normal curve');
    }

    render() {
        const shape = SHAPES.find(s => s.key === this.current);
        const data = this.dataFor(shape);

        const mean = Stats.mean(data);
        const sd = Stats.sd(data);
        const med = Stats.median(data);
        const q = Stats.iqr(data);
        const skew = Stats.skewness(data);

        this.chart.xLabel = shape.xLabel;

        const bands = [];
        const markers = [];
        if (this.showMedianIQR) {
            bands.push({
                from: q.q1, to: q.q3,
                label: 'median (IQR)',
                color: '#2e7d32'
            });
            markers.push({ x: med, label: 'median ' + med.toFixed(1), color: '#2e7d32', dash: [5, 4] });
        }

        const spec = {
            lo: shape.lo, hi: shape.hi, nBins: shape.nBins,
            data: data,
            bands: bands,
            markers: markers
        };

        if (this.showNormal) {
            spec.curve = {
                fn: x => Stats.normalDensity(x, mean, sd),
                n: data.length,
                color: '#232D4B'
            };
        }

        this.chart.render(spec);

        const set = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };

        set('gallery-title', shape.title);
        set('gallery-stats',
            '<span class="ink-mean">Mean ' + mean.toFixed(1) + ' (SD ' + sd.toFixed(1) + ')</span>' +
            ' &nbsp;&middot;&nbsp; ' +
            '<span class="ink-median">Median ' + med.toFixed(1) +
            ' (IQR ' + q.q1.toFixed(1) + '–' + q.q3.toFixed(1) + ')</span>' +
            ' &nbsp;&middot;&nbsp; skewness ' + skew.toFixed(2));
    }
}
