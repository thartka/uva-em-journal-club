/**
 * Q2 interactive — "guess the coin."
 *
 * A bag holds 10 coins: 8 fair, 1 biased toward heads (P(heads) = 0.80), and
 * 1 biased toward tails (P(heads) = 0.20). Each round the learner picks a
 * coin from the bag at random, flips it 10 times, and sees BOTH numbers:
 *   • the p-value  = P(data at least this extreme | the coin is fair)
 *   • the posterior = P(the coin is fair | this result), using the 8-in-10 prior
 * Then they call it fair or biased and the truth is revealed. The lesson: a
 * surprising result (small p-value) usually still comes from a fair coin,
 * because most coins in the bag are fair — P(data | fair) is not P(fair | data).
 */

class CoinGame {
    constructor(mount) {
        this.mount = mount;
        this.N = 10;              // flips per round
        this.PRIOR_FAIR = 0.80;  // 8 of the 10 coins in the bag are fair
        this.BIAS = 0.80;        // P(heads) for the heads-biased coin (tails-biased = 0.20)
        this.tally = { correct: 0, total: 0 };

        this._build();
        this._newCoin();
    }

    destroy() {}

    _build() {
        this.mount.innerHTML = `
            <p class="interactive-intro">
                A bag holds <strong>10 coins: 8 are fair, 1 is biased toward heads, and 1 is biased
                toward tails</strong>. Pick a coin at random, flip it 10 times, read the two
                probabilities, then decide: fair or biased?
            </p>
            <div class="buttons">
                <button type="button" class="btn btn-primary" data-role="flip">Pick a coin and flip it 10 times</button>
            </div>
            <div class="coin-row" data-role="coins"></div>
            <div class="coin-count" data-role="count"></div>
            <div class="params-display" data-role="params" hidden>
                <div class="param-box">
                    <div class="param-label">p-value: probability you would get data this extreme, given a fair coin</div>
                    <div class="param-value" data-role="p">—</div>
                </div>
                <div class="param-box">
                    <div class="param-label">Bayesian: probability this coin is fair, given this result</div>
                    <div class="param-value" data-role="post">—</div>
                </div>
            </div>
            <div data-role="guessarea" hidden>
                <p class="guess-prompt">Your call — is this coin fair?</p>
                <div class="buttons">
                    <button type="button" class="btn btn-secondary" data-role="gfair">Fair</button>
                    <button type="button" class="btn btn-secondary" data-role="gbiased">Biased</button>
                </div>
            </div>
            <div data-role="reveal"></div>
            <div class="buttons" data-role="resetrow" hidden>
                <button type="button" class="btn btn-primary" data-role="reset">Put it back and pick another coin →</button>
            </div>
            <p class="tally-line" data-role="tally"></p>
            <p class="interactive-note" data-role="note">
                Watch what happens across several coins: a low p-value often still turns out to be a fair coin.
            </p>
        `;

        this.flipBtn = this.mount.querySelector('[data-role="flip"]');
        this.coinsEl = this.mount.querySelector('[data-role="coins"]');
        this.countEl = this.mount.querySelector('[data-role="count"]');
        this.paramsEl = this.mount.querySelector('[data-role="params"]');
        this.pEl = this.mount.querySelector('[data-role="p"]');
        this.postEl = this.mount.querySelector('[data-role="post"]');
        this.guessArea = this.mount.querySelector('[data-role="guessarea"]');
        this.gFair = this.mount.querySelector('[data-role="gfair"]');
        this.gBiased = this.mount.querySelector('[data-role="gbiased"]');
        this.revealEl = this.mount.querySelector('[data-role="reveal"]');
        this.resetRow = this.mount.querySelector('[data-role="resetrow"]');
        this.resetBtn = this.mount.querySelector('[data-role="reset"]');
        this.tallyEl = this.mount.querySelector('[data-role="tally"]');
        this.noteEl = this.mount.querySelector('[data-role="note"]');

        this.flipBtn.addEventListener('click', () => this._flip());
        this.gFair.addEventListener('click', () => this._guess(true));
        this.gBiased.addEventListener('click', () => this._guess(false));
        this.resetBtn.addEventListener('click', () => this._newCoin());
    }

    _newCoin() {
        // Draw a coin from the bag in secret.
        this.isFair = Math.random() < this.PRIOR_FAIR;
        if (this.isFair) {
            this.pHeads = 0.5;
            this.direction = null;
        } else {
            this.direction = Math.random() < 0.5 ? 'heads' : 'tails';
            this.pHeads = this.direction === 'heads' ? this.BIAS : 1 - this.BIAS;
        }

        // Reset UI to the "ready to flip" state.
        this.coinsEl.innerHTML = '';
        this.countEl.textContent = '';
        this.paramsEl.hidden = true;
        this.guessArea.hidden = true;
        this.gFair.disabled = false;
        this.gBiased.disabled = false;
        this.revealEl.innerHTML = '';
        this.resetRow.hidden = true;
        this.flipBtn.hidden = false;
        this.flipBtn.disabled = false;
        this._renderTally();
    }

    _flip() {
        this.flipBtn.disabled = true;
        this.flipBtn.hidden = true;

        // Ten flips of the secret coin.
        let heads = 0;
        this.coinsEl.innerHTML = '';
        for (let i = 0; i < this.N; i++) {
            const isHead = Math.random() < this.pHeads;
            if (isHead) heads++;
            const chip = document.createElement('span');
            chip.className = 'coin-chip ' + (isHead ? 'heads' : 'tails');
            chip.textContent = isHead ? 'H' : 'T';
            this.coinsEl.appendChild(chip);
        }
        this.k = heads;
        this.countEl.textContent = `${heads} heads, ${this.N - heads} tails`;

        // p-value: two-sided — a result at least this lopsided in either
        // direction, under a fair coin. Matches the framing in question 2.
        const p = Stats.coinPValueTwoSided(heads, this.N);

        // Posterior P(fair | data) via Bayes with the 80% prior.
        const lFair = Stats.binomPMF(heads, this.N, 0.5);
        const lBiased = 0.5 * Stats.binomPMF(heads, this.N, this.BIAS)
                      + 0.5 * Stats.binomPMF(heads, this.N, 1 - this.BIAS);
        const postFair = (this.PRIOR_FAIR * lFair) /
                         (this.PRIOR_FAIR * lFair + (1 - this.PRIOR_FAIR) * lBiased);

        this.pValue = p;
        this.postFair = postFair;
        this.pEl.textContent = (p * 100).toFixed(1) + '%';
        this.postEl.textContent = (postFair * 100).toFixed(0) + '%';
        this.paramsEl.hidden = false;
        this.guessArea.hidden = false;
    }

    _guess(guessFair) {
        const correct = (guessFair === this.isFair);
        this.tally.total++;
        if (correct) this.tally.correct++;

        this.gFair.disabled = true;
        this.gBiased.disabled = true;

        const truth = this.isFair
            ? 'This coin was actually <strong>FAIR</strong> (P(heads) = 0.50).'
            : `This coin was actually <strong>BIASED toward ${this.direction}</strong> (P(heads) = ${this.pHeads.toFixed(2)}).`;

        let lesson;
        if (this.pValue < 0.05 && this.isFair) {
            lesson = `The result looked surprising (p = ${(this.pValue * 100).toFixed(1)}%), yet the coin was fair. A small p-value is <em>not</em> the chance the coin is biased — 8 of the 10 coins in the bag are fair, so this result probably still came from a fair one (P(fair | data) = ${(this.postFair * 100).toFixed(0)}%).`;
        } else if (this.pValue >= 0.05 && !this.isFair) {
            lesson = `The result did not look surprising (p = ${(this.pValue * 100).toFixed(1)}%), but the coin was biased. A large p-value is not proof the coin is fair — the flips just did not happen to reveal the bias.`;
        } else {
            lesson = `p-value = ${(this.pValue * 100).toFixed(1)}% is P(this result | fair). The chance the coin is actually fair given this result is ${(this.postFair * 100).toFixed(0)}% — a different question, and it depends on how many of the coins in the bag are biased.`;
        }

        this.revealEl.innerHTML = `
            <div class="reveal-box ${correct ? 'right' : 'wrong'}">
                <span class="verdict">${correct ? '✓ You got it' : '✗ Not this time'}</span>
                ${truth}<br><span style="font-weight:400">${lesson}</span>
            </div>`;

        this.resetRow.hidden = false;
        this._renderTally();
    }

    _renderTally() {
        this.tallyEl.textContent = this.tally.total > 0
            ? `You've correctly identified ${this.tally.correct} of ${this.tally.total} coins.`
            : '';
    }
}
