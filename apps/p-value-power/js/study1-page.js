(() => {
    const canvas = document.getElementById('trial-canvas');
    const renderer = new IconArrayRenderer(canvas);

    const runBtn = document.getElementById('run-btn');
    const nextBtn = document.getElementById('next-btn');
    const treatRateEl = document.getElementById('treat-rate');
    const controlRateEl = document.getElementById('control-rate');
    const diffEl = document.getElementById('diff');
    const pvalBox = document.getElementById('pvalue-box');

    let trialData = null;

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        trialData = RCTSim.generateStudy1Primary();
        renderer.setData(trialData.treatment, trialData.control);

        pvalBox.className = 'pvalue-display pvalue-pending';
        pvalBox.textContent = 'p-value: calculating…';

        await renderer.animate(10000, (count, pVal) => {
            const tE = trialData.treatment.slice(0, count).reduce((s, v) => s + v, 0);
            const cE = trialData.control.slice(0, count).reduce((s, v) => s + v, 0);
            treatRateEl.textContent = `${tE}/${count} (${(tE / count * 100).toFixed(1)}%)`;
            controlRateEl.textContent = `${cE}/${count} (${(cE / count * 100).toFixed(1)}%)`;
            const d = ((tE / count - cE / count) * 100).toFixed(1);
            diffEl.textContent = `${d > 0 ? '+' : ''}${d} percentage points`;
            pvalBox.textContent = `p-value: ${pVal.toFixed(4)}`;
        });

        const p = trialData.pValue;
        const sig = p < 0.05;
        treatRateEl.textContent = `${trialData.treatEvents}/100 (${(trialData.treatRate * 100).toFixed(1)}%)`;
        controlRateEl.textContent = `${trialData.controlEvents}/100 (${(trialData.controlRate * 100).toFixed(1)}%)`;
        const d = ((trialData.treatRate - trialData.controlRate) * 100).toFixed(1);
        diffEl.textContent = `${d > 0 ? '+' : ''}${d} percentage points`;

        pvalBox.className = 'pvalue-display ' + (sig ? 'pvalue-significant' : 'pvalue-not-significant');
        pvalBox.innerHTML = sig
            ? `p = ${p.toFixed(4)} &mdash; Statistically Significant!`
            : `p = ${p.toFixed(4)} &mdash; Not Significant`;

        nextBtn.style.display = '';
    });

    nextBtn.addEventListener('click', () => {
        window.location.href = 'study1-secondary.html';
    });
})();
