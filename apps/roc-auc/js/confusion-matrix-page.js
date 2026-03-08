// Page 1: Confusion matrix + threshold slider + metrics + equations

function formatMetric(v) {
    if (v === undefined || Number.isNaN(v)) return 'N/A';
    return v.toFixed(3);
}

function updateMetricsDisplay(metrics) {
    document.getElementById('sensitivity-value').textContent = formatMetric(metrics.sensitivity);
    document.getElementById('specificity-value').textContent = formatMetric(metrics.specificity);
    document.getElementById('ppv-value').textContent = formatMetric(metrics.ppv);
    document.getElementById('npv-value').textContent = formatMetric(metrics.npv);
}

function initConfusionMatrixPage() {
    const matrix = new ConfusionMatrixRenderer('confusion-matrix-canvas');
    const slider = document.getElementById('threshold');
    const thresholdValue = document.getElementById('threshold-value');

    function onInput() {
        const t = parseFloat(slider.value);
        thresholdValue.textContent = t.toFixed(2);
        const m = metricsAtThreshold(t);
        matrix.setCounts({ TP: m.TP, FP: m.FP, TN: m.TN, FN: m.FN });
        updateMetricsDisplay(m);
    }

    slider.addEventListener('input', onInput);
    onInput();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfusionMatrixPage);
} else {
    initConfusionMatrixPage();
}
