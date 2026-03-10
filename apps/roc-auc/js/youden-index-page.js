// Page 6: Youden Index demonstration

function formatYoudenMetric(v) {
    if (v === undefined || Number.isNaN(v)) return 'N/A';
    return v.toFixed(3);
}

function initYoudenIndexPage() {
    const points = rocPoints(); // { fpr, tpr, threshold }
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);

    // Find point that maximizes J = sensitivity + specificity - 1
    // Note: sensitivity = TPR, specificity = 1 - FPR
    let best = null;
    points.forEach((p) => {
        const sensitivity = p.tpr;
        const specificity = 1 - p.fpr;
        const J = sensitivity + specificity - 1;
        const distanceSquared = p.fpr * p.fpr + (1 - p.tpr) * (1 - p.tpr); // distance from (0,1)

        if (!best || J > best.J || (Math.abs(J - best.J) < 1e-6 && distanceSquared < best.distanceSquared)) {
            best = {
                threshold: p.threshold,
                fpr: p.fpr,
                tpr: p.tpr,
                sensitivity,
                specificity,
                J,
                distanceSquared
            };
        }
    });

    if (best) {
        roc.setHighlightPoints([{ fpr: best.fpr, tpr: best.tpr }]);
        roc.setYoudenPoint({ fpr: best.fpr, tpr: best.tpr });

        const thresholdEl = document.getElementById('youden-threshold');
        const sensEl = document.getElementById('youden-sensitivity');
        const specEl = document.getElementById('youden-specificity');
        const fprEl = document.getElementById('youden-fpr');
        const fnrEl = document.getElementById('youden-fnr');
        const jEl = document.getElementById('youden-j');
        const distEl = document.getElementById('youden-distance');

        if (thresholdEl) thresholdEl.textContent = best.threshold.toFixed(2);
        if (sensEl) sensEl.textContent = formatYoudenMetric(best.sensitivity);
        if (specEl) specEl.textContent = formatYoudenMetric(best.specificity);
        if (fprEl) fprEl.textContent = formatYoudenMetric(best.fpr);
        const fnr = 1 - best.tpr;
        if (fnrEl) fnrEl.textContent = formatYoudenMetric(fnr);
        if (jEl) jEl.textContent = formatYoudenMetric(best.J);
        const distance = Math.sqrt(best.distanceSquared);
        if (distEl) distEl.textContent = formatYoudenMetric(distance);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYoudenIndexPage);
} else {
    initYoudenIndexPage();
}

