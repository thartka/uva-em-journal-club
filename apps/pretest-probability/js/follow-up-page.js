(() => {
    const {
        DEFAULTS,
        defaultPostTestProbability,
        formatLikelihoodRatio,
        formatPercent,
        loadCaseState
    } = window.PretestProbability;

    const decisionSummary = document.getElementById('decision-summary');
    const outcomePanel = document.getElementById('outcome-panel');
    const outcomeHeading = document.getElementById('outcome-heading');
    const outcomeText = document.getElementById('outcome-text');
    const debriefPanel = document.getElementById('debrief-panel');
    const debriefText = document.getElementById('debrief-text');
    const replayBtn = document.getElementById('replay-btn');

    function getState() {
        return loadCaseState() || {
            pretestProbability: DEFAULTS.pretestProbability,
            posttestProbability: defaultPostTestProbability(),
            calculatedPosttestProbability: defaultPostTestProbability(),
            dimerLikelihoodRatio: DEFAULTS.dimerPositiveLikelihoodRatio,
            dimerResult: 'positive',
            ctpaOrdered: true
        };
    }

    function randomOutcome(probability) {
        return Math.random() < probability;
    }

    function renderOutcome() {
        const state = getState();
        const probability = state.posttestProbability ?? state.calculatedPosttestProbability ?? defaultPostTestProbability();
        const hasPe = randomOutcome(probability);

        decisionSummary.innerHTML = `
            <p><strong>Your earlier choices:</strong> pretest probability ${formatPercent(state.pretestProbability, 0)}, positive D-dimer LR ${formatLikelihoodRatio(state.dimerLikelihoodRatio)}, post-test probability ${formatPercent(probability, 0)}, and ${state.ctpaOrdered ? 'CTPA ordered' : 'no CTPA ordered initially'}.</p>
        `;

        if (state.ctpaOrdered) {
            outcomeHeading.textContent = hasPe ? 'CTPA positive for PE' : 'CTPA negative for PE';
            outcomeText.textContent = hasPe
                ? 'The scan identifies a small pulmonary embolism. This was an unlikely but possible outcome after a positive D-dimer.'
                : 'The scan does not show PE. The patient is treated for a respiratory infection and discharged with return precautions.';
        } else {
            outcomeHeading.textContent = hasPe ? 'Return visit with positive CTPA' : 'Return visit with negative CTPA';
            outcomeText.textContent = hasPe
                ? 'The patient returns the next day with persistent symptoms. A CTPA is obtained and shows PE.'
                : 'The patient returns the next day worried about ongoing symptoms. A CTPA is obtained and does not show PE.';
        }

        debriefText.textContent = hasPe
            ? 'A low probability is not zero. Bayesian reasoning helps make risk explicit, but rare outcomes still occur.'
            : 'This outcome illustrates why a positive D-dimer can be misleading in inflammatory illness: it modestly raises probability but often does not indicate PE.';

        outcomePanel.classList.remove('hidden');
        debriefPanel.classList.remove('hidden');
    }

    replayBtn.addEventListener('click', renderOutcome);
    renderOutcome();
})();
