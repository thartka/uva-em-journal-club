/**
 * data-distributions: parametric vs non-parametric comparison (page 5).
 *
 * One fixed scenario: Pathway B really is an hour slower, 30 patients per
 * group, and both tests are hunting for that difference. The learner controls
 * only the *shape* of the data and whether the difference exists at all, then
 * runs 100 studies and watches how often each test finds it.
 *
 *   - Skewed: most stays cluster near 3 hours, but a few patients board for
 *     half a day or more. Those boarders yank the mean around, so the t-test
 *     finds the real difference about 17 times in 100 while Mann-Whitney finds
 *     it about 75 times.
 *   - Normal: the two tests agree, roughly 89 and 87 out of 100. The test
 *     choice barely matters, which is the half of the lesson that stops
 *     residents reporting medians for everything.
 *
 * Set the true difference to "None" and both bars drop to the 5 or so
 * false positives out of 100 that alpha allows.
 */

const TRIALS = 100;

class TestCompare {
    constructor(opts = {}) {
        this.rng = new RNG(opts.seed || 909);

        this.shape = 'skewed';     // 'normal' | 'skewed'
        this.effect = 1.0;         // true difference in hours: 1.0 or 0
        this.n = 30;               // patients per group, fixed
        this.alpha = 0.05;

        this.chart = new HistChart('tc-canvas', {
            xLabel: 'ED length of stay (hours)',
            yLabel: 'Patients',
            aspect: 0.46
        });

        this.setupControls();
        this.refresh();
    }

    /* -------------------- data -------------------- */

    /**
     * One length of stay. Both shapes sit near the same typical stay so only
     * the shape differs; the skewed one adds a boarding tail, a small share of
     * patients who wait half a day or more.
     */
    _drawOne(group) {
        const d = group === 'B' ? this.effect : 0;
        if (this.shape === 'normal') {
            const v = this.rng.normal(4.0 + d, 1.2);
            return v < 0.1 ? 0.1 : v;
        }
        if (this.rng.next() < 0.06) return 12 + this.rng.next() * 24;
        return this.rng.lognormal(3.0 + d, 0.35);
    }

    _sample() {
        const a = [], b = [];
        for (let i = 0; i < this.n; i++) a.push(this._drawOne('A'));
        for (let i = 0; i < this.n; i++) b.push(this._drawOne('B'));
        return { a: a, b: b };
    }

    /* -------------------- controls -------------------- */

    setupControls() {
        const seg = (attr, apply) => {
            const btns = document.querySelectorAll('[' + attr + ']');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    apply(btn.getAttribute(attr));
                    btns.forEach(b => b.classList.toggle('active', b === btn));
                    this.refresh();
                });
            });
            return btns;
        };

        const shapeBtns = seg('data-shape', v => { this.shape = v; });
        shapeBtns.forEach(b =>
            b.classList.toggle('active', b.getAttribute('data-shape') === this.shape));

        const effectBtns = seg('data-effect', v => { this.effect = parseFloat(v); });
        effectBtns.forEach(b =>
            b.classList.toggle('active', parseFloat(b.getAttribute('data-effect')) === this.effect));

        const trialsBtn = document.getElementById('tc-trials-btn');
        if (trialsBtn) trialsBtn.addEventListener('click', () => this.runTrials());
    }

    /** Changing a setting redraws the sample and clears the old scores. */
    refresh() {
        const { a, b } = this._sample();
        this.draw(a, b);
        this.setScores(null, null);
    }

    /* -------------------- one sample, for the picture -------------------- */

    draw(a, b) {
        // A fixed axis per shape, so flipping settings does not make the bars
        // jump around under a rescaled x-axis.
        const hi = this.shape === 'normal' ? 10 : 36;
        this.chart.render({
            lo: 0, hi: hi, nBins: 24,
            groups: [
                { data: a, color: '#5b8ac4', label: 'Pathway A' },
                { data: b, color: '#e08a3c', label: 'Pathway B' }
            ]
        });
    }

    /* -------------------- 100 studies -------------------- */

    runTrials() {
        let tSig = 0, mSig = 0;
        for (let i = 0; i < TRIALS; i++) {
            const { a, b } = this._sample();
            if (Stats.welchTTest(a, b).p < this.alpha) tSig++;
            if (Stats.mannWhitneyU(a, b).p < this.alpha) mSig++;
        }

        // Leave the last study's patients on screen as the picture of what was
        // just run 100 times.
        const { a, b } = this._sample();
        this.draw(a, b);
        this.setScores(tSig, mSig);
    }

    setScores(t, mw) {
        const one = (fillId, numId, v) => {
            const fill = document.getElementById(fillId);
            if (fill) fill.style.width = (v === null ? 0 : v) + '%';
            const num = document.getElementById(numId);
            if (num) {
                num.innerHTML = (v === null ? '-' : v) +
                    ' <span class="score-of">of ' + TRIALS + '</span>';
            }
        };
        one('tc-fill-t', 'tc-num-t', t);
        one('tc-fill-mw', 'tc-num-mw', mw);

        const title = document.getElementById('tc-score-title');
        if (title) {
            title.textContent = this.effect === 0
                ? 'Out of 100 studies, how often did each test call it significant anyway?'
                : 'Out of 100 studies, how often did each test find the difference?';
        }
    }
}
