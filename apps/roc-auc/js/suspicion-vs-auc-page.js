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

function findYoudenPointWithIndex(points) {
    let best = null;
    points.forEach((p, idx) => {
        const sensitivity = p.tpr;
        const specificity = 1 - p.fpr;
        const J = sensitivity + specificity - 1;
        const distanceSquared = p.fpr * p.fpr + (1 - p.tpr) * (1 - p.tpr); // distance from (0,1)

        if (!best || J > best.J || (Math.abs(J - best.J) < 1e-6 && distanceSquared < best.distanceSquared)) {
            best = {
                index: idx,
                fpr: p.fpr,
                tpr: p.tpr,
                J,
                distanceSquared
            };
        }
    });
    return best;
}

function initSuspicionVsAucPage() {
    const points = rocPoints(); // base ROC
    const roc = new ROCCanvasRenderer('roc-canvas');
    roc.setPoints(points);
    const youden = findYoudenPointWithIndex(points);
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

        // Precompute a single red "Increasing suspicion" arrow so it stays fixed
        let suspicionArrow = null;
        if (youden) {
            const endIdx = N - 1;
            const verticalOffset = 0.12;
            const baseDeltaFpr = points[endIdx].fpr - youden.fpr;
            const baseDeltaTpr = points[endIdx].tpr - youden.tpr;
            const scaledDeltaTpr = baseDeltaTpr * 1.1;
            suspicionArrow = {
                start: { fpr: youden.fpr, tpr: Math.max(0, youden.tpr - verticalOffset) },
                end: {
                    fpr: points[endIdx].fpr,
                    tpr: Math.max(0, youden.tpr - verticalOffset + scaledDeltaTpr)
                },
                color: '#c62828',
                label: 'Increasing suspicion',
                // Positive Y offset moves label visually below the arrow, kept parallel by rotation
                labelOffset: { x: 0, y: 10 }
            };
        }

        const durationPhase1 = 3500; // ms: move along base curve from Youden toward top right
        const durationPhase2 = 3500; // ms: fade in better curve and move toward it
        const totalDuration = durationPhase1 + durationPhase2;
        // Use a single high-resolution clock for both start and step
        const startTime = (window.performance && typeof window.performance.now === 'function')
            ? window.performance.now()
            : Date.now();

        function step() {
            const now = (window.performance && typeof window.performance.now === 'function')
                ? window.performance.now()
                : Date.now();
            const elapsed = now - startTime;
            const t = Math.min(elapsed / totalDuration, 1);

            if (elapsed <= durationPhase1) {
                // Phase 1: move a point along the original ROC curve from Youden toward top-right
                const frac = elapsed / durationPhase1; // 0 -> 1
                const startIdx = youden ? youden.index : 0;
                const endIdx = N - 1;
                const idxSpan = Math.max(1, endIdx - startIdx);
                const idx = Math.min(endIdx, startIdx + Math.floor(frac * idxSpan));
                const p = points[idx];

                roc.setPoints(points);
                roc.setCurrentPoint({ fpr: p.fpr, tpr: p.tpr });

                // Red arrow roughly parallel and just below this path: "Increasing suspicion"
                if (suspicionArrow && typeof roc.setCustomArrows === 'function') {
                    roc.setCustomArrows([suspicionArrow]);
                }
            } else {
                // Phase 2: keep Youden threshold index, but move toward better model curve
                const phase2Elapsed = elapsed - durationPhase1;
                const frac2 = Math.min(phase2Elapsed / durationPhase2, 1);

                const idx = youden ? youden.index : Math.floor(0.5 * (N - 1));
                const pBase = points[idx];
                const pBetter = betterPoints[idx];

                // Interpolate current point between base and better model (movement toward better AUC)
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

                // Blue arrow, parallel to the movement toward the better curve: "Improved prediction"
                if (youden) {
                    const offsetMagnitude = 0.03;
                    const vecFpr = pBetter.fpr - pBase.fpr;
                    const vecTpr = pBetter.tpr - pBase.tpr;
                    const length = Math.sqrt(vecFpr * vecFpr + vecTpr * vecTpr) || 1;
                    const perpFpr = -vecTpr / length;
                    const perpTpr = vecFpr / length;
                    const startOffsetFpr = pBase.fpr + perpFpr * offsetMagnitude;
                    const startOffsetTpr = pBase.tpr + perpTpr * offsetMagnitude;
                    const endOffsetFpr = startOffsetFpr + vecFpr;
                    const endOffsetTpr = startOffsetTpr + vecTpr;

                    const blueArrow = {
                        start: { fpr: startOffsetFpr, tpr: startOffsetTpr },
                        end: { fpr: endOffsetFpr, tpr: endOffsetTpr },
                        color: '#1565c0',
                        label: 'Improved prediction',
                        labelOffset: { x: 0, y: 12 },
                        flipLabel: true
                    };

                    const arrows = [];
                    if (suspicionArrow) {
                        arrows.push(suspicionArrow);
                    }
                    arrows.push(blueArrow);

                    if (typeof roc.setCustomArrows === 'function') {
                        roc.setCustomArrows(arrows);
                    }
                }
            }

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // After animation completes, leave better model and its point visible
                // at the exact location reached at the end of the animation (no jump).
                roc.setPoints(points);
                if (typeof roc.setComparisonPoints === 'function') {
                    roc.setComparisonPoints(betterPoints);
                }
                // Keep the comparisonCurrentPoint where the animation left it,
                // and just clear the primary current point.
                roc.setCurrentPoint(null);
                if (typeof roc.setComparisonAlpha === 'function') {
                    roc.setComparisonAlpha(1);
                }

                // Keep arrows visible briefly at the end, then reset to a clean ROC curve
                if (youden && typeof roc.setCustomArrows === 'function') {
                    const pBase = points[youden.index];
                    const pBetter = betterPoints[youden.index];
                    const vecFpr = pBetter.fpr - pBase.fpr;
                    const vecTpr = pBetter.tpr - pBase.tpr;
                    const length = Math.sqrt(vecFpr * vecFpr + vecTpr * vecTpr) || 1;
                    const offsetMagnitude = 0.03;
                    const perpFpr = -vecTpr / length;
                    const perpTpr = vecFpr / length;
                    const startOffsetFpr = pBase.fpr + perpFpr * offsetMagnitude;
                    const startOffsetTpr = pBase.tpr + perpTpr * offsetMagnitude;
                    const endOffsetFpr = startOffsetFpr + vecFpr;
                    const endOffsetTpr = startOffsetTpr + vecTpr;

                    const blueArrow = {
                        start: { fpr: startOffsetFpr, tpr: startOffsetTpr },
                        end: { fpr: endOffsetFpr, tpr: endOffsetTpr },
                        color: '#1565c0',
                        label: 'Improved prediction',
                        labelOffset: { x: 0, y: 12 },
                        flipLabel: true
                    };

                    const arrows = [];
                    if (suspicionArrow) {
                        arrows.push(suspicionArrow);
                    }
                    arrows.push(blueArrow);

                    roc.setCustomArrows(arrows);
                }

                animating = false;
                playBtn.disabled = false;

                // After 5 seconds, reset to a clean ROC curve without arrows or labels
                setTimeout(() => {
                    roc.setComparisonPoints([]);
                    if (typeof roc.setComparisonCurrentPoint === 'function') {
                        roc.setComparisonCurrentPoint(null);
                    }
                    if (typeof roc.setComparisonAlpha === 'function') {
                        roc.setComparisonAlpha(0);
                    }
                    roc.setCurrentPoint(null);
                    if (typeof roc.setCustomArrows === 'function') {
                        roc.setCustomArrows([]);
                    }
                    // Leave just the base ROC curve visible
                    roc.setPoints(points);
                }, 5000);
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

