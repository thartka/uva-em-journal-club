/**
 * data-distributions, Q2 figure: two peaks, both summaries blind to them.
 *
 * Ejection fraction across a heart failure population, which is bimodal for a
 * clinical reason: one peak is HFrEF and the other HFpEF. The point is where
 * the summaries land. Mean and median both sit in the trough between the
 * groups, and the trough here is not merely sparse, it is the mildly reduced
 * band that is its own third category and the smallest of the three.
 *
 * The number worth reading out loud is the share of patients actually inside
 * mean +/- SD, which comes in below the 68% a bell would give even though the
 * band is wide enough to reach from one group toward the other.
 */

class BimodalExplorer {
    constructor(mountId) {
        const mount = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
        mount.innerHTML =
            '<div class="canvas-container"><canvas id="be-canvas"></canvas></div>' +
            '<div class="legend">' +
              '<span class="legend-item"><span class="legend-swatch" style="background:#1565c0"></span>mean ± SD</span>' +
              '<span class="legend-item"><span class="legend-swatch" style="background:#2e7d32"></span>median (IQR)</span>' +
            '</div>' +
            '<div class="readout">' +
              '<div class="readout-box"><h4>Mean (SD)</h4><div class="big" id="be-mean">-</div>' +
                '<div class="sub" id="be-mean-sub"></div></div>' +
              '<div class="readout-box"><h4>Median (IQR)</h4><div class="big" id="be-median">-</div>' +
                '<div class="sub" id="be-median-sub"></div></div>' +
              '<div class="readout-box"><h4>Patients within mean ± SD</h4>' +
                '<div class="big" id="be-inside">-</div>' +
                '<div class="sub">A normal distribution would hold about 68%.</div></div>' +
            '</div>' +
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

        const inside = data.filter(v => v >= mean - sd && v <= mean + sd).length;
        const pctInside = inside / data.length * 100;

        // Share of patients in the mildly reduced band, which is where both
        // summaries land.
        const midRange = data.filter(v => v >= 40 && v <= 50).length / data.length * 100;

        this.chart.render({
            lo: 5, hi: 80, nBins: 30,
            data: data,
            bands: [
                { from: mean - sd, to: mean + sd, label: 'mean ± SD', color: '#1565c0' },
                { from: q.q1, to: q.q3, label: 'median (IQR)', color: '#2e7d32' }
            ],
            markers: [
                { x: mean, label: 'mean ' + mean.toFixed(0), color: '#1565c0' },
                { x: med, label: 'median ' + med.toFixed(0), color: '#2e7d32', dash: [5, 4] }
            ]
        });

        const set = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = txt;
        };

        set('be-mean', mean.toFixed(0) + '% (' + sd.toFixed(0) + ')');
        set('be-median', med.toFixed(0) + '% (' + q.q1.toFixed(0) + '–' + q.q3.toFixed(0) + ')');
        set('be-inside', pctInside.toFixed(0) + '%');
        set('be-mean-sub',
            'Peaks at ' + muReduced.toFixed(0) + '% and ' + muPreserved.toFixed(0) + '%.');
        set('be-median-sub',
            'Mean and median differ by ' + Math.abs(mean - med).toFixed(1) + ' points.');
        set('be-note',
            'The peaks are at <strong>' + muReduced.toFixed(0) + '%</strong> and <strong>' +
            muPreserved.toFixed(0) + '%</strong>, yet the mean sits at <strong>' +
            mean.toFixed(0) + '%</strong> and the median at <strong>' + med.toFixed(0) +
            '%</strong>. Only <strong>' + midRange.toFixed(0) + '%</strong> of these patients ' +
            'actually have an ejection fraction in that range, and clinically it is neither ' +
            'HFrEF nor HFpEF but the mildly reduced band between them. Just <strong>' +
            pctInside.toFixed(0) + '%</strong> fall inside mean ± SD, against the 68% a bell ' +
            'would give. <strong>Neither summary is anywhere near either actual group.</strong>');
    }
}
