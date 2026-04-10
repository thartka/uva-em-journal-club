(() => {
    const diffToggle = document.getElementById('diff-toggle');
    const toggleLabel = document.getElementById('toggle-label');
    const nSlider = document.getElementById('n-slider');
    const nValueEl = document.getElementById('n-value');
    const powerValueEl = document.getElementById('power-value');
    const runBtn = document.getElementById('run-btn');
    const simGrid = document.getElementById('sim-grid');
    const simSummary = document.getElementById('sim-summary');
    const nextBtn = document.getElementById('next-btn');

    function getParams() {
        const hasDiff = diffToggle.checked;
        const n = parseInt(nSlider.value, 10);
        const pTreat = hasDiff ? 0.15 : 0.20;
        const pControl = 0.20;
        return { hasDiff, n, pTreat, pControl };
    }

    function updateDisplay() {
        const { hasDiff, n, pTreat, pControl } = getParams();
        nValueEl.textContent = n;
        toggleLabel.textContent = hasDiff ? '15% vs 20%' : 'No difference';

        const pw = Stats.power(pTreat, pControl, n, 0.05);
        powerValueEl.textContent = (pw * 100).toFixed(1) + '%';
        powerValueEl.title = hasDiff
            ? ''
            : 'When there is no true difference, this equals alpha (Type I error rate).';
    }

    diffToggle.addEventListener('change', updateDisplay);
    nSlider.addEventListener('input', updateDisplay);
    updateDisplay();

    runBtn.addEventListener('click', () => {
        const { n, pTreat, pControl } = getParams();
        const trials = RCTSim.generateBatch(n, pTreat, pControl, 20);

        simGrid.innerHTML = '';
        simGrid.style.display = '';
        let sigCount = 0;

        trials.forEach((t, i) => {
            const sig = t.pValue < 0.05;
            if (sig) sigCount++;

            const card = document.createElement('div');
            card.className = 'sim-card' + (sig ? ' significant' : '');
            card.innerHTML = `
                <div class="sim-label">Trial ${i + 1}</div>
                <div class="sim-pvalue">p = ${t.pValue.toFixed(3)}</div>
            `;
            simGrid.appendChild(card);
        });

        simSummary.style.display = '';
        simSummary.textContent = `${sigCount} of 20 trials reached statistical significance (p < 0.05).`;
        nextBtn.style.display = '';
    });

    nextBtn.addEventListener('click', () => {
        window.location.href = 'post-quiz.html';
    });
})();
