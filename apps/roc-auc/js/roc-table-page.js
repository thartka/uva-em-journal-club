// Page 3: Table of 5 thresholds + ROC with 5 red dots

const TABLE_THRESHOLDS = [0.2, 0.4, 0.5, 0.6, 0.8];

function initRocTablePage() {
    const points = rocPoints();
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);
    roc.setHighlightStyle('x-black');

    const highlightPoints = TABLE_THRESHOLDS.map(t => {
        const m = metricsAtThreshold(t);
        return { fpr: m.fpr, tpr: m.tpr };
    });
    roc.setHighlightPoints(highlightPoints);

    const tbody = document.getElementById('roc-table-body');
    tbody.innerHTML = '';
    TABLE_THRESHOLDS.forEach(threshold => {
        const m = metricsAtThreshold(threshold);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${threshold.toFixed(2)}</td>
            <td>${m.tpr.toFixed(3)}</td>
            <td>${m.sensitivity.toFixed(3)}</td>
            <td>${m.fpr.toFixed(3)}</td>
            <td>${m.specificity.toFixed(3)}</td>
        `;
        tbody.appendChild(row);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRocTablePage);
} else {
    initRocTablePage();
}
