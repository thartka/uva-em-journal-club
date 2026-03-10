// Fixed sepsis prediction dataset and ROC/AUC helpers
// Uses seeded RNG so all users see the same 1000 patients

class SeededRandom {
    constructor(seed = 42) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        return (this.seed >>> 0) / 4294967296;
    }
    reset(seed = 42) {
        this.seed = seed;
    }
}

let _cachedData = null;
const SEED = 42;
const N = 1000;
const EXP_MEAN = 0.10;  // mean of exponential for P(sepsis); rate = 1/mean

function generateData() {
    if (_cachedData) return _cachedData;
    const rng = new SeededRandom(SEED);
    const data = [];
    const rate = 1 / EXP_MEAN;  // 10 for mean 0.10
    for (let i = 0; i < N; i++) {
        const u = rng.next();
        const probability = Math.min(1, -Math.log(Math.max(u, 1e-10)) / rate);
        const actualPositive = rng.next() < probability ? 1 : 0;
        data.push({ probability, actualPositive });
    }
    _cachedData = data;
    return data;
}

function getData() {
    return generateData();
}

function countsAtThreshold(data, threshold) {
    let TP = 0, FP = 0, TN = 0, FN = 0;
    for (const p of data) {
        const predictedPositive = p.probability >= threshold ? 1 : 0;
        if (p.actualPositive && predictedPositive) TP++;
        else if (!p.actualPositive && predictedPositive) FP++;
        else if (!p.actualPositive && !predictedPositive) TN++;
        else FN++;
    }
    return { TP, FP, TN, FN };
}

function metricsAtThreshold(threshold) {
    const data = getData();
    const { TP, FP, TN, FN } = countsAtThreshold(data, threshold);
    const sensitivity = TP + FN > 0 ? TP / (TP + FN) : 0;
    const specificity = TN + FP > 0 ? TN / (TN + FP) : 0;
    const ppv = TP + FP > 0 ? TP / (TP + FP) : 0;
    const npv = TN + FN > 0 ? TN / (TN + FN) : 0;
    const fpr = TN + FP > 0 ? FP / (TN + FP) : 0;
    const fnr = TP + FN > 0 ? FN / (TP + FN) : 0;
    const tpr = sensitivity;
    return {
        TP, FP, TN, FN,
        sensitivity, specificity, ppv, npv,
        fpr, fnr, tpr
    };
}

function rocPoints() {
    const data = getData();
    const thresholds = [0];
    const probs = data.map(p => p.probability);
    const unique = [...new Set(probs)].sort((a, b) => a - b);
    thresholds.push(...unique);
    thresholds.push(1);
    const points = [];
    for (const t of thresholds) {
        const m = metricsAtThreshold(t);
        points.push({ fpr: m.fpr, tpr: m.tpr, threshold: t });
    }
    points.sort((a, b) => a.fpr - b.fpr);
    return points;
}

function auc() {
    const points = rocPoints();
    let area = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const w = points[i + 1].fpr - points[i].fpr;
        const h = (points[i].tpr + points[i + 1].tpr) / 2;
        area += w * h;
    }
    return area;
}

function sensitivitySpecificityCurves(numPoints = 101) {
    const result = [];
    for (let i = 0; i <= numPoints; i++) {
        const threshold = i / numPoints;
        const m = metricsAtThreshold(threshold);
        result.push({ threshold, sensitivity: m.sensitivity, specificity: m.specificity, ...m });
    }
    return result;
}
