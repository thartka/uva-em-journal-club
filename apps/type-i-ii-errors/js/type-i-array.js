/**
 * Q1 interactive — "The false-positive factory."
 *
 * Runs batches of 20 trials of a drug that has NO real effect. Each trial
 * compares two arms with identical true event rates; ~5% land at p < 0.05 by
 * chance. Accumulating batches shows the false-positive rate converging on α.
 * Makes concrete that a Type I error rate IS the significance level.
 */

class TypeIArray {
    constructor(mount, options = {}) {
        this.mount = mount;
        this.nPerArm = options.nPerArm || 200;
        this.trueRate = options.trueRate || 0.20; // identical in both arms → null is true
        this.alpha = 0.05;
        this.trialsPerBatch = 20;

        this.cumTrials = 0;
        this.cumSignificant = 0;

        this._build();
        this._renderGrid([]);
        this._updateTally();
    }

    _build() {
        this.mount.innerHTML = `
            <p class="interactive-intro">
                Each card below is one clinical trial of a drug that in truth does
                <strong>nothing</strong> (both arms have an identical ${Math.round(this.trueRate * 100)}%
                event rate, ${this.nPerArm} patients per arm). Any card that turns orange
                reached <strong>p &lt; 0.05</strong> &mdash; a false positive, a Type I error.
                Run several batches and watch the running rate settle near α = 0.05 (1 in 20).
            </p>
            <div class="buttons" style="margin-top:0;">
                <button class="btn btn-primary" data-role="run">Run 20 trials</button>
                <button class="btn btn-secondary" data-role="reset">Reset</button>
            </div>
            <div class="fp-grid" data-role="grid"></div>
            <div class="params-display">
                <div class="param-box">
                    <div class="param-label">This batch</div>
                    <div class="param-value" data-role="batch">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Cumulative false positives</div>
                    <div class="param-value" data-role="cum">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Running rate</div>
                    <div class="param-value" data-role="rate">—</div>
                </div>
            </div>
            <p class="interactive-note" data-role="note">
                Expected rate with a truly inert drug: about 5% (α). No matter how
                careful the trial, that false-positive floor never goes away.
            </p>
        `;

        this.gridEl = this.mount.querySelector('[data-role="grid"]');
        this.batchEl = this.mount.querySelector('[data-role="batch"]');
        this.cumEl = this.mount.querySelector('[data-role="cum"]');
        this.rateEl = this.mount.querySelector('[data-role="rate"]');

        this.mount.querySelector('[data-role="run"]').addEventListener('click', () => this._runBatch());
        this.mount.querySelector('[data-role="reset"]').addEventListener('click', () => this._reset());
    }

    _runBatch() {
        const results = [];
        for (let i = 0; i < this.trialsPerBatch; i++) {
            const tE = Stats.binomialCount(this.nPerArm, this.trueRate);
            const cE = Stats.binomialCount(this.nPerArm, this.trueRate);
            const p = Stats.pValueFromCounts(tE, this.nPerArm, cE, this.nPerArm);
            results.push({ p, sig: p < this.alpha });
        }
        const batchSig = results.filter(r => r.sig).length;
        this.cumTrials += this.trialsPerBatch;
        this.cumSignificant += batchSig;

        this._renderGrid(results);
        this.batchEl.textContent = `${batchSig} / 20 "significant"`;
        this._updateTally();
    }

    _reset() {
        this.cumTrials = 0;
        this.cumSignificant = 0;
        this._renderGrid([]);
        this.batchEl.textContent = '—';
        this._updateTally();
    }

    _renderGrid(results) {
        this.gridEl.innerHTML = '';
        for (let i = 0; i < this.trialsPerBatch; i++) {
            const r = results[i];
            const card = document.createElement('div');
            card.className = 'fp-card' + (r && r.sig ? ' significant' : '');
            const label = document.createElement('div');
            label.className = 'fp-label';
            label.textContent = `Trial ${i + 1}`;
            const val = document.createElement('div');
            val.className = 'fp-pvalue';
            val.textContent = r ? `p = ${r.p.toFixed(3)}` : '—';
            card.appendChild(label);
            card.appendChild(val);
            this.gridEl.appendChild(card);
        }
    }

    _updateTally() {
        if (this.cumTrials === 0) {
            this.cumEl.textContent = '—';
            this.rateEl.textContent = '—';
            return;
        }
        const rate = this.cumSignificant / this.cumTrials;
        this.cumEl.textContent = `${this.cumSignificant} / ${this.cumTrials}`;
        this.rateEl.textContent = `${(rate * 100).toFixed(1)}%`;
    }
}
