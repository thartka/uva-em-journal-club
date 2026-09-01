/**
 * data-distributions, Q1 figure: the fitted normal runs off the axis.
 *
 * A static right-skewed pediatric age distribution with a normal curve fitted
 * to its mean and SD. The curve visibly leaves the range of ages a human can
 * have, and the region below zero is shaded as impossible. The median and IQR
 * are drawn alongside as the summary that stays inside the possible range.
 * Nothing here is adjustable: it is one picture, shown once the answer is
 * revealed, and the presenter talks over it.
 */

class SkewWhiskers {
    constructor(mountId) {
        const mount = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
        mount.innerHTML =
            '<div class="canvas-container"><canvas id="sw-canvas"></canvas></div>' +
            '<p class="interactive-note" id="sw-note"></p>';

        this.chart = new HistChart('sw-canvas', {
            xLabel: 'Age (years)',
            yLabel: 'Patients',
            barColor: '#8fa5c4',
            aspect: 0.5
        });

        this.render();
    }

    /**
     * A lognormal pediatric age distribution: median 2.2 years with a heavy
     * tail of older children, which is what a pediatric ED census actually
     * looks like.
     *
     * An earlier version tried to pin the *mean* at 5 to mirror the question
     * stem exactly, using median = 5 / exp(s^2 / 2). It did not survive the
     * 21-year cap: truncating even 2% off the top of a heavy-tailed lognormal
     * removes a disproportionate share of the mean and the SD, which dragged
     * the SD down to 3.6 and left mean - 1 SD stubbornly positive, killing the
     * very thing the figure exists to show. Holding the median instead, and
     * letting the mean float, keeps SD > mean.
     */
    sample() {
        const rng = new RNG(4242);
        const out = [];
        let guard = 0;
        while (out.length < 500 && guard < 150000) {
            guard++;
            const v = rng.lognormal(2.2, 1.20);
            if (v <= 21) out.push(v);
        }
        return out;
    }

    render() {
        const data = this.sample();
        const mean = Stats.mean(data);
        const sd = Stats.sd(data);
        const med = Stats.median(data);
        const q = Stats.iqr(data);

        const lo = -9, hi = 21;

        this.chart.render({
            lo: lo, hi: hi, nBins: 30,
            data: data,
            shade: [{ from: lo, to: 0, color: 'rgba(198,40,40,0.13)' }],
            // The fitted normal replaces the mean +/- SD bars: it makes the same
            // point, and it spills into the shaded region on its own rather
            // than needing a bar drawn to show that it would.
            curve: {
                fn: x => Stats.normalDensity(x, mean, sd),
                n: data.length,
                color: '#1565c0'
            },
            bands: [
                { from: q.q1, to: q.q3, label: 'median (IQR)', color: '#2e7d32' }
            ],
            // No mean marker: the fitted curve already peaks at the mean, so a
            // vertical bar there only repeated it.
            markers: [
                { x: med, label: 'median', color: '#2e7d32', dash: [5, 4] }
            ]
        });

        const set = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = txt;
        };

        set('sw-note',
            'Mean − 1 SD is <span class="ink-impossible">' + (mean - sd).toFixed(1) +
            ' years</span>. The interval that is supposed to contain the middle two-thirds ' +
            'of your patients starts before birth. That is the tell, and you can see it ' +
            'without any normality test at all.');
    }
}
