// Page 2: FNR/FPR vs probability plot + threshold slider + metrics

function formatMetric(v) {
    if (v === undefined || Number.isNaN(v)) return 'N/A';
    return v.toFixed(3);
}

function updateFprFnrMetrics(metrics) {
    document.getElementById('sensitivity-value').textContent = formatMetric(metrics.sensitivity);
    document.getElementById('specificity-value').textContent = formatMetric(metrics.specificity);
    document.getElementById('ppv-value').textContent = formatMetric(metrics.ppv);
    document.getElementById('npv-value').textContent = formatMetric(metrics.npv);
}

function initFprFnrPage() {
    const plot = new FPRFNRPlotRenderer('fpr-fnr-canvas');
    const curveData = fprFnrCurves(101);
    plot.setCurveData(curveData);

    const slider = document.getElementById('threshold');
    const thresholdValue = document.getElementById('threshold-value');

    function onInput() {
        const t = parseFloat(slider.value);
        thresholdValue.textContent = t.toFixed(2);
        plot.setThreshold(t);
        const m = metricsAtThreshold(t);
        updateFprFnrMetrics(m);
    }

    slider.addEventListener('input', onInput);
    onInput();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFprFnrPage);
} else {
    initFprFnrPage();
}
