// Page 8: Animation of higher suspicion (moving along a curve)
// versus better prediction (higher AUC / better curve)

function createBetterModelPoints(basePoints) {
    // Construct a synthetic "better" ROC curve by moving points toward (0,1)
    // while preserving ordering. This is purely for visualization.
    return basePoints.map(p => {
        const fpr = p.fpr;
        const tpr = p.tpr;
        // Nonlinear transform that bends curve up/left
        const betterFpr = Math.pow(fpr, 1.4);
        const betterTpr = 1 - Math.pow(1 - tpr, 1.4);
        return { fpr: betterFpr, tpr: betterTpr };
    });
}

function initSuspicionVsAucPage() {
    const points = rocPoints(); // base ROC
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);
    // Ensure comparison curve starts hidden
    if (typeof roc.setComparisonAlpha === 'function') {
        roc.setComparisonAlpha(0);
    }

    const playBtn = document.getElementById('play-animation-btn');
    if (!playBtn) return;

    let animating = false;

    playBtn.addEventListener('click', () => {
        if (animating) return;
        animating = true;
        playBtn.disabled = true;

        const N = points.length;
        if (N < 2) {
            animating = false;
            playBtn.disabled = false;
            return;
        }

        const betterPoints = createBetterModelPoints(points);

        const durationPhase1 = 3500; // ms: move along base curve
        const durationPhase2 = 3500; // ms: fade in better curve and morph point
        const totalDuration = durationPhase1 + durationPhase2;
        const nowFn = (window.performance && typeof window.performance.now === 'function')
            ? () => window.performance.now()
            : () => Date.now();
        const startTime = nowFn();

        function step(timestamp) {
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / totalDuration, 1);

            if (elapsed <= durationPhase1) {
                // Phase 1: move a point along the original ROC curve
                const frac = elapsed / durationPhase1; // 0 -> 1
                const idx = Math.min(N - 1, Math.floor(frac * (N - 1)));
                const p = points[idx];
                roc.setPoints(points);
                roc.setCurrentPoint({ fpr: p.fpr, tpr: p.tpr });
            } else {
                // Phase 2: keep a fixed threshold index, but morph to better model
                const phase2Elapsed = elapsed - durationPhase1;
                const frac2 = Math.min(phase2Elapsed / durationPhase2, 1);

                // Index roughly in the middle of the curve to illustrate
                const idx = Math.floor(0.5 * (N - 1));
                const pBase = points[idx];
                const pBetter = betterPoints[idx];

                // Interpolate current point between base and better model
                const curFpr = pBase.fpr + (pBetter.fpr - pBase.fpr) * frac2;
                const curTpr = pBase.tpr + (pBetter.tpr - pBase.tpr) * frac2;

                // For phase 2 we draw both curves: base (orange) and better (blue)
                roc.setPoints(points);
                if (typeof roc.setComparisonPoints === 'function') {
                    roc.setComparisonPoints(betterPoints);
                }
                roc.setCurrentPoint({ fpr: curFpr, tpr: curTpr });
                if (typeof roc.setComparisonCurrentPoint === 'function') {
                    roc.setComparisonCurrentPoint({ fpr: pBetter.fpr, tpr: pBetter.tpr });
                }
                if (typeof roc.setComparisonAlpha === 'function') {
                    roc.setComparisonAlpha(frac2); // fade in better curve
                }
            }

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // After animation completes, leave better model and its point visible
                roc.setPoints(points);
                if (typeof roc.setComparisonPoints === 'function') {
                    roc.setComparisonPoints(betterPoints);
                }
                const finalIdx = Math.floor(0.5 * (N - 1));
                const finalBetter = betterPoints[finalIdx];
                roc.setCurrentPoint(null);
                if (typeof roc.setComparisonCurrentPoint === 'function') {
                    roc.setComparisonCurrentPoint({ fpr: finalBetter.fpr, tpr: finalBetter.tpr });
                }
                if (typeof roc.setComparisonAlpha === 'function') {
                    roc.setComparisonAlpha(1);
                }

                animating = false;
                playBtn.disabled = false;
            }
        }

        requestAnimationFrame(step);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSuspicionVsAucPage);
} else {
    initSuspicionVsAucPage();
}

