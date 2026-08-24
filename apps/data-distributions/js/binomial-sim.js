/**
 * data-distributions: binomial simulator (page 3).
 *
 * Inpatient mortality, counted a day at a time. Each day a fixed number of
 * patients are admitted and each one independently either survives or does
 * not; the histogram tallies the deaths per day over a year of days. The
 * normal-approximation overlay is there to be watched failing: at a high
 * mortality percentage with plenty of admissions it tracks the bars closely,
 * and for a rare outcome it runs off below zero into deaths that cannot
 * happen.
 */

class BinomialSim {
    constructor(opts = {}) {
        this.rng = new RNG(opts.seed || 5150);

        this.n = 40;            // admissions per day
        this.p = 0.05;          // probability of death
        this.days = 365;        // fixed: one year of days, no slider
        this.showNormal = false;

        this.chart = new HistChart('binom-canvas', {
            xLabel: 'Admitted patients who did not survive, in one day',
            yLabel: 'Days',
            discrete: true,
            barColor: '#a4879f',
            xTickFormat: v => String(Math.round(v))
        });

        this.setupControls();
        this.run();
    }

    setupControls() {
        const bind = (id, valId, fmt, onChange) => {
            const el = document.getElementById(id);
            const out = document.getElementById(valId);
            if (!el) return;
            el.addEventListener('input', e => {
                const v = parseFloat(e.target.value);
                if (out) out.textContent = fmt(v);
                onChange(v);
                this.run();
            });
            if (out) out.textContent = fmt(parseFloat(el.value));
        };

        bind('binom-n', 'binom-n-value', v => String(v), v => { this.n = v; });
        // The slider carries whole percents; the model wants a probability.
        bind('binom-p', 'binom-p-value', v => v.toFixed(0) + '%', v => { this.p = v / 100; });

        const normBtn = document.getElementById('binom-normal-btn');
        if (normBtn) {
            normBtn.addEventListener('click', () => {
                this.showNormal = !this.showNormal;
                normBtn.textContent = this.showNormal
                    ? 'Hide normal approximation'
                    : 'Overlay normal approximation';
                this.run();
            });
        }

        const runBtn = document.getElementById('binom-run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.rng.reset(this.rng.seed ^ 0x85ebca6b);
                this.run();
            });
        }
    }

    run() {
        const deaths = [];
        for (let i = 0; i < this.days; i++) {
            deaths.push(this.rng.binomial(this.n, this.p));
        }

        const mu = this.n * this.p;
        const sigma = Math.sqrt(this.n * this.p * (1 - this.p));

        // Show a window around the action rather than the whole 0..n range.
        const hi = Math.min(this.n, Math.ceil(mu + 4 * sigma + 2));
        const lo = Math.max(0, Math.floor(mu - 4 * sigma - 2));
        const nb = hi - lo + 1;

        const counts = new Array(nb).fill(0);
        for (const d of deaths) {
            const i = d - lo;
            if (i >= 0 && i < nb) counts[i]++;
        }

        const spec = {
            lo: lo - 0.5,
            hi: hi + 0.5,
            nBins: nb,
            counts: counts,
            markers: [
                { x: Stats.median(deaths), label: 'median ' + Stats.median(deaths).toFixed(1),
                  color: '#2e7d32', dash: [5, 4] }
            ],
            xTicks: Math.min(nb - 1, 10)
        };

        if (this.showNormal) {
            spec.curve = {
                fn: x => Stats.normalDensity(x, mu, sigma),
                n: this.days,
                color: '#232D4B'
            };
        }

        this.chart.render(spec);
    }
}
