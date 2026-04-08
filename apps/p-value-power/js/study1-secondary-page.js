(() => {
    const runBtn = document.getElementById('run-btn');
    const container = document.getElementById('secondary-container');
    const summaryEl = document.getElementById('summary');
    const nextBtn = document.getElementById('next-btn');

    runBtn.addEventListener('click', () => {
        runBtn.disabled = true;

        const outcomes = RCTSim.generateStudy1Secondary();
        let sigCount = 0;

        outcomes.forEach(o => {
            const sig = o.pValue < 0.05;
            if (sig) sigCount++;

            const card = document.createElement('div');
            card.className = 'outcome-card' + (sig ? ' significant' : '');

            card.innerHTML = `
                <h4>${o.name}</h4>
                <div class="rates">
                    <span>Treatment: ${(o.treatRate * 100).toFixed(1)}%</span>
                    <span>Control: ${(o.controlRate * 100).toFixed(1)}%</span>
                </div>
                <p class="outcome-pvalue" style="color: ${sig ? '#D55E00' : '#388E3C'}">
                    p = ${o.pValue.toFixed(4)}${sig ? ' — Significant!' : ''}
                </p>
            `;
            container.appendChild(card);
        });

        container.style.display = '';
        summaryEl.style.display = '';
        summaryEl.textContent = sigCount > 0
            ? `${sigCount} of 4 secondary outcomes reached statistical significance (p < 0.05).`
            : 'None of the 4 secondary outcomes reached statistical significance.';

        nextBtn.style.display = '';
    });

    nextBtn.addEventListener('click', () => {
        window.location.href = 'study2.html';
    });
})();
