// Page 5: ROC with shaded AUC, display AUC, threshold-independent message

function initAucPage() {
    const points = rocPoints();
    const aucVal = auc();
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);
    roc.setFillArea(true);
    roc.setAUC(aucVal);

    document.getElementById('auc-value').textContent = aucVal.toFixed(3);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAucPage);
} else {
    initAucPage();
}
