// Page 4: ROC with threshold slider, one red dot, metrics

function formatMetric(v) {
    if (v === undefined || Number.isNaN(v)) return 'N/A';
    return v.toFixed(3);
}

function updateRocSliderMetrics(metrics) {
    document.getElementById('sensitivity-value').textContent = formatMetric(metrics.sensitivity);
    document.getElementById('specificity-value').textContent = formatMetric(metrics.specificity);
    document.getElementById('ppv-value').textContent = formatMetric(metrics.ppv);
    document.getElementById('npv-value').textContent = formatMetric(metrics.npv);
}

function initRocSliderPage() {
    const points = rocPoints();
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);

    const slider = document.getElementById('threshold');
    const thresholdValue = document.getElementById('threshold-value');

    function onInput() {
        const t = parseFloat(slider.value);
        thresholdValue.textContent = t.toFixed(2);
        const m = metricsAtThreshold(t);
        roc.setCurrentPoint({ fpr: m.fpr, tpr: m.tpr });
        updateRocSliderMetrics(m);
    }

    slider.addEventListener('input', onInput);
    onInput();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRocSliderPage);
} else {
    initRocSliderPage();
}
