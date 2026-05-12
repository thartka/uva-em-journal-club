(() => {
    const {
        DEFAULTS,
        defaultPostTestProbability,
        formatPercent,
        loadCaseState
    } = window.PretestProbability;

    const decisionSummary = document.getElementById('decision-summary');
    const outcomePanel = document.getElementById('outcome-panel');
    const outcomeHeading = document.getElementById('outcome-heading');
    const outcomeText = document.getElementById('outcome-text');
    const debriefPanel = document.getElementById('debrief-panel');
    const debriefText = document.getElementById('debrief-text');
    const returnNote = document.getElementById('return-note');
    const showResultBtn = document.getElementById('show-result-btn');

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

    const state = getState();

    function renderDecisionSummary() {
        const probability = state.posttestProbability ?? state.calculatedPosttestProbability ?? defaultPostTestProbability();

        decisionSummary.innerHTML = `
            <p><strong>Your earlier choices:</strong></p>
            <p>Pretest probability: <span class="choice-value">${formatPercent(state.pretestProbability, 0)}</span></p>
            <p>Post-test probability: <span class="choice-value">${formatPercent(probability, 0)}</span></p>
            <p>CTA pulmonary with contrast: <span class="choice-value">${state.ctpaOrdered ? 'Accepted' : 'Discontinued'}</span></p>
        `;

        if (!state.ctpaOrdered) {
            returnNote.classList.remove('hidden');
        }
    }

    function renderOutcome() {
        const probability = state.posttestProbability ?? state.calculatedPosttestProbability ?? defaultPostTestProbability();
        const hasPe = randomOutcome(probability);

        outcomeHeading.textContent = 'Radiology Report';
        outcomeText.innerHTML = hasPe
            ? `
                <div class="radiology-report">
                    <p><strong>Exam:</strong> CTA pulmonary with contrast.</p>
                    <p><strong>Indication:</strong> Hemoptysis. Evaluate for pulmonary embolism.</p>
                    <p><strong>Findings:</strong> There is a small filling defect within a segmental pulmonary artery branch, compatible with acute pulmonary embolism. No CT evidence of right heart strain. Mild bronchial wall thickening is present.</p>
                    <p><strong>Impression:</strong> Positive for acute pulmonary embolism.</p>
                </div>
            `
            : `
                <div class="radiology-report">
                    <p><strong>Exam:</strong> CTA pulmonary with contrast.</p>
                    <p><strong>Indication:</strong> Hemoptysis. Evaluate for pulmonary embolism.</p>
                    <p><strong>Findings:</strong> No pulmonary arterial filling defect is identified. No CT evidence of right heart strain. Mild bronchial wall thickening is present.</p>
                    <p><strong>Impression:</strong> No pulmonary embolism.</p>
                </div>
            `;

        debriefText.textContent = hasPe
            ? 'A low probability is not zero. Bayesian reasoning helps make risk explicit, but rare outcomes still occur.'
            : 'This outcome illustrates why a positive D-dimer can be misleading in inflammatory illness: it modestly raises probability but often does not indicate PE.';

        outcomePanel.classList.remove('hidden');
        debriefPanel.classList.remove('hidden');
        showResultBtn.disabled = true;
    }

    showResultBtn.addEventListener('click', renderOutcome);
    renderDecisionSummary();
})();
