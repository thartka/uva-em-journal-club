/**
 * data-distributions, Q2 figure: two peaks, both summaries blind to them.
 *
 * Ejection fraction across a heart failure population, which is bimodal for a
 * clinical reason: one peak is HFrEF and the other HFpEF. The point is where
 * the summaries land. The fitted normal peaks in the trough between the
 * groups, and the trough here is not merely sparse, it is the mildly reduced
 * band that is its own third category and the smallest of the three.
 *
 * The mean and SD appear only as that fitted curve, and the number worth
 * reading out loud is the share of patients actually inside mean +/- SD, which
 * comes in below the 68% a bell would give.
 */

class BimodalExplorer {
    constructor(mountId) {
        const mount = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
        mount.innerHTML =
            '<div class="canvas-container"><canvas id="be-canvas"></canvas></div>' +
            '<p class="interactive-note" id="be-note"></p>';

        this.chart = new HistChart('be-canvas', {
            xLabel: 'Left ventricular ejection fraction (%)',
            yLabel: 'Patients',
            barColor: '#8fa5c4',
            aspect: 0.5
        });

        this.render();
    }

    /**
     * Two normal components in equal shares: a reduced group centred near 31%
     * and a preserved group near 59%, over the 5 to 80% range an echo report
     * spans.
     */
    sample() {
        const muReduced = 31;
        const muPreserved = 59;

        const rng = new RNG(8080);
        const out = [];
        let guard = 0;
        while (out.length < 900 && guard < 90000) {
            guard++;
            const v = rng.next() < 0.5
                ? rng.normal(muReduced, 8.0)
                : rng.normal(muPreserved, 7.0);
            if (v >= 5 && v <= 80) out.push(v);
        }
        return { data: out, muReduced: muReduced, muPreserved: muPreserved };
    }

    render() {
        const { data, muReduced, muPreserved } = this.sample();
        const mean = Stats.mean(data);
        const sd = Stats.sd(data);
        const med = Stats.median(data);
        const q = Stats.iqr(data);

        this.chart.render({
            lo: 5, hi: 80, nBins: 30,
            data: data,
            // The fitted normal stands in for the mean and SD. Drawn against a
            // two-humped histogram it makes the mismatch obvious in a way the
            // bars never did: its peak sits in the gap between the groups.
            curve: {
                fn: x => Stats.normalDensity(x, mean, sd),
                n: data.length,
                color: '#1565c0'
            },
            bands: [
                { from: q.q1, to: q.q3, label: 'median (IQR)', color: '#2e7d32' }
            ],
            markers: [
                { x: med, label: 'median ' + med.toFixed(0), color: '#2e7d32', dash: [5, 4] }
            ]
        });

        const set = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = txt;
        };

        // Values stay computed rather than written in, so the sentence cannot
        // drift out of step with the figure above it.
        set('be-note',
            'The peaks are at <strong>' + muReduced.toFixed(0) + '%</strong> and <strong>' +
            muPreserved.toFixed(0) + '%</strong>, yet the mean sits at <strong>' +
            mean.toFixed(0) + '%</strong> and the median at <strong>' + med.toFixed(0) +
            '%</strong>. No common parametric distribution can actually represent this data.');
    }
}
