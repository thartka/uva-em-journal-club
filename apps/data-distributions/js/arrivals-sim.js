/**
 * data-distributions: ED arrivals simulator (page 2).
 *
 * One simulation, two readouts. Patients arrive at a constant average rate; the
 * top panel tallies how many arrive in each hour (Poisson) and the bottom panel
 * tallies the minutes between consecutive arrivals (exponential). Same patients,
 * same data, two very different shapes, and neither of them a bell.
 */

class ArrivalsSim {
    constructor(opts = {}) {
        this.rng = new RNG(opts.seed || 71);

        this.rate = 6;        // patients per hour
        this.hours = 365;     // fixed: no slider, one long stretch of ED time

        this.countChart = new HistChart('arrivals-count-canvas', {
            xLabel: 'Patients arriving in one hour',
            yLabel: 'Hours',
            discrete: true,
            barColor: '#8fa5c4',
            xTickFormat: v => String(Math.round(v))
        });

        this.gapChart = new HistChart('arrivals-gap-canvas', {
            xLabel: 'Minutes between consecutive arrivals',
            yLabel: 'Arrivals',
            barColor: '#c9a227',
            xTickFormat: v => String(Math.round(v))
        });

        // Nothing is drawn until Simulate is pressed, and nothing changes after
        // that until it is pressed again. Moving the rate slider re-ranges the
        // empty axes but never redraws a run behind the presenter's back.
        this.hasRun = false;

        this.setupControls();
        this.showEmpty();
    }

    /** Labelled but empty axes, with a prompt in place of the data. */
    showEmpty() {
        const rate = this.rate;
        const cHi = Math.max(6, Math.ceil(rate + 4 * Math.sqrt(rate) + 1));
        this.countChart.render({
            lo: -0.5, hi: cHi + 0.5, nBins: cHi + 1,
            counts: new Array(cHi + 1).fill(0),
            xTicks: Math.min(cHi, 10),
            emptyMessage: 'Press "Simulate arrivals" to run the ED'
        });
        this.gapChart.render({
            lo: 0, hi: 60 / rate * 4, nBins: 26,
            counts: new Array(26).fill(0),
            emptyMessage: 'Press "Simulate arrivals" to run the ED'
        });
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
                // The plots only ever change on a button press. Before the first
                // run we still re-range the empty axes to match the new setting.
                if (!this.hasRun) this.showEmpty();
            });
            if (out) out.textContent = fmt(parseFloat(el.value));
        };

        bind('arr-rate', 'arr-rate-value', v => v + '/hr', v => { this.rate = v; });

        const reRun = document.getElementById('arr-run-btn');
        if (reRun) {
            reRun.addEventListener('click', () => {
                this.rng.reset(this.rng.seed ^ 0x9e3779b9);
                this.hasRun = true;
                this.run();
            });
        }
    }

    /** Simulate `hours` hours of arrivals; collect counts per hour and gaps. */
    simulate() {
        const perHour = [];
        const gaps = [];
        const meanGapMin = 60 / this.rate;

        for (let h = 0; h < this.hours; h++) {
            // Counts per hour come straight from the Poisson process.
            perHour.push(this.rng.poisson(this.rate));
        }

        // Waiting times between arrivals, from the same process.
        const nGaps = Math.max(60, Math.round(this.rate * this.hours));
        for (let i = 0; i < nGaps; i++) {
            gaps.push(this.rng.exponential(meanGapMin));
        }

        return { perHour: perHour, gaps: gaps };
    }

    run() {
        const { perHour, gaps } = this.simulate();

        /* ---- counts per hour: Poisson ---- */
        const cHi = Math.max(6, Math.ceil(this.rate + 4 * Math.sqrt(this.rate) + 1));
        const counts = new Array(cHi + 1).fill(0);
        for (const c of perHour) counts[Math.min(c, cHi)]++;

        this.countChart.render({
            lo: -0.5,
            hi: cHi + 0.5,
            nBins: cHi + 1,
            counts: counts,
            markers: [
                { x: Stats.median(perHour), label: 'median ' + Stats.median(perHour).toFixed(1),
                  color: '#2e7d32', dash: [5, 4] }
            ],
            xTicks: Math.min(cHi, 10)
        });

        /* ---- gaps: exponential ---- */
        const gHi = Math.max(10, Stats.quantile(gaps, 0.99));
        this.gapChart.render({
            lo: 0,
            hi: gHi,
            nBins: 26,
            data: gaps,
            markers: [
                { x: Stats.median(gaps), label: 'median ' + Stats.median(gaps).toFixed(1) + ' min',
                  color: '#2e7d32', dash: [5, 4] }
            ]
        });
    }
}
