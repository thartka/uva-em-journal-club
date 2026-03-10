// Page 5: ROC with shaded AUC, display AUC, threshold-independent message

function initAucPage() {
    const points = rocPoints();
    const aucVal = auc();
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);
    roc.setFillArea(true);
    roc.setAUC(aucVal);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAucPage);
} else {
    initAucPage();
}
