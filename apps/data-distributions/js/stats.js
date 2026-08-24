/**
 * data-distributions: statistics helpers.
 *
 * Pure functions: no DOM, no global state. Includes the two tests the module
 * puts head to head: Welch's t-test (parametric) and the Mann-Whitney U test
 * (non-parametric). Mann-Whitney uses the *exact* null distribution for small
 * samples, because the normal approximation is poor at the n = 5-20 range where
 * the teaching point lives.
 */

const Stats = (() => {

    /* ---------------- descriptive ---------------- */

    function mean(xs) {
        if (!xs.length) return NaN;
        let s = 0;
        for (const x of xs) s += x;
        return s / xs.length;
    }

    /** Sample variance (n - 1 denominator). */
    function variance(xs) {
        const n = xs.length;
        if (n < 2) return NaN;
        const m = mean(xs);
        let s = 0;
        for (const x of xs) s += (x - m) * (x - m);
        return s / (n - 1);
    }

    function sd(xs) {
        return Math.sqrt(variance(xs));
    }

    /**
     * Quantile by linear interpolation on order statistics
     * (the R "type 7" default, which is what most stats packages report).
     */
    function quantile(xs, p) {
        const n = xs.length;
        if (!n) return NaN;
        if (n === 1) return xs[0];
        const sorted = [...xs].sort((a, b) => a - b);
        const h = (n - 1) * p;
        const lo = Math.floor(h);
        const hi = Math.min(lo + 1, n - 1);
        return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
    }

    function median(xs) {
        return quantile(xs, 0.5);
    }

    /** Returns { q1, q3, iqr }. */
    function iqr(xs) {
        const q1 = quantile(xs, 0.25);
        const q3 = quantile(xs, 0.75);
        return { q1: q1, q3: q3, iqr: q3 - q1 };
    }

    function min(xs) { return xs.reduce((a, b) => Math.min(a, b), Infinity); }
    function max(xs) { return xs.reduce((a, b) => Math.max(a, b), -Infinity); }

    /**
     * Skewness (Fisher-Pearson g1), which drives the on-screen readouts.
     * Uses population moments in both numerator and denominator, which is the
     * conventional g1 and matches what scipy.stats.skew and R's e1071::skewness
     * (type 1) report. Note this is *not* the sample SD: dividing the cubed
     * deviations by the n-1 SD would shrink the result by ((n-1)/n)^1.5.
     */
    function skewness(xs) {
        const n = xs.length;
        if (n < 3) return NaN;
        const m = mean(xs);
        let m2 = 0, m3 = 0;
        for (const x of xs) {
            const d = x - m;
            m2 += d * d;
            m3 += d * d * d;
        }
        m2 /= n;
        m3 /= n;
        if (m2 <= 0) return 0;
        return m3 / Math.pow(m2, 1.5);
    }

    /* ---------------- normal distribution ---------------- */

    /** Standard normal PDF. */
    function normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }

    /** Standard normal CDF from Abramowitz and Stegun 26.2.17, error < 7.5e-8. */
    function normalCDF(x) {
        if (x === 0) return 0.5;
        const sign = x < 0 ? -1 : 1;
        const z = Math.abs(x);
        const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937;
        const b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419;
        const t = 1 / (1 + p * z);
        const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
        const cdf = 1 - normalPDF(z) * (b1 * t + b2 * t2 + b3 * t3 + b4 * t4 + b5 * t5);
        return sign === 1 ? cdf : 1 - cdf;
    }

    /** Inverse standard normal, by Beasley-Springer-Moro. */
    function zQuantile(p) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;
        const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
                    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
                    6.680131188771972e+01, -1.328068155288572e+01];
        const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
                   -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
        const d = [7.784695709041462e-03, 3.224671290700398e-01,
                   2.445134137142996e+00, 3.754408661907416e+00];
        const pLow = 0.02425, pHigh = 1 - pLow;
        let q, r;
        if (p < pLow) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                   ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
        }
        if (p <= pHigh) {
            q = p - 0.5; r = q * q;
            return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
                   (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
        }
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }

    /** Density of N(mu, sigma) at x. */
    function normalDensity(x, mu, sigma) {
        return normalPDF((x - mu) / sigma) / sigma;
    }

    /* ---------------- gamma and beta functions ---------------- */

    /** log of the gamma function, by the Lanczos approximation. */
    function logGamma(x) {
        const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
                   -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
        let y = x;
        let tmp = x + 5.5;
        tmp -= (x + 0.5) * Math.log(tmp);
        let ser = 1.000000000190015;
        for (let j = 0; j < 6; j++) ser += g[j] / ++y;
        return -tmp + Math.log(2.5066282746310005 * ser / x);
    }

    /** Continued fraction for the incomplete beta (Numerical Recipes betacf). */
    function _betacf(a, b, x) {
        const MAXIT = 300, EPS = 3e-16, FPMIN = 1e-300;
        const qab = a + b, qap = a + 1, qam = a - 1;
        let c = 1;
        let d = 1 - qab * x / qap;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        d = 1 / d;
        let h = d;
        for (let m = 1; m <= MAXIT; m++) {
            const m2 = 2 * m;
            let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < FPMIN) d = FPMIN;
            c = 1 + aa / c;
            if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1 / d;
            h *= d * c;
            aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < FPMIN) d = FPMIN;
            c = 1 + aa / c;
            if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1 / d;
            const del = d * c;
            h *= del;
            if (Math.abs(del - 1) < EPS) break;
        }
        return h;
    }

    /** Regularized incomplete beta I_x(a, b). */
    function betaInc(x, a, b) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
                            a * Math.log(x) + b * Math.log(1 - x));
        if (x < (a + 1) / (a + b + 2)) {
            return bt * _betacf(a, b, x) / a;
        }
        return 1 - bt * _betacf(b, a, 1 - x) / b;
    }

    /**
     * Two-sided p-value for Student's t with df degrees of freedom, via
     * the regularized incomplete beta at df / (df + t squared).
     */
    function tTwoSidedP(t, df) {
        if (!isFinite(t) || !isFinite(df) || df <= 0) return NaN;
        const x = df / (df + t * t);
        return Math.min(1, betaInc(x, df / 2, 0.5));
    }

    /* ---------------- discrete distributions ---------------- */

    /** Binomial coefficient C(n, k). */
    function choose(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        k = Math.min(k, n - k);
        let c = 1;
        for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
        return c;
    }

    /** Binomial PMF, computed in logs so large n stays numerically stable. */
    function binomPMF(k, n, p) {
        if (k < 0 || k > n) return 0;
        if (p <= 0) return k === 0 ? 1 : 0;
        if (p >= 1) return k === n ? 1 : 0;
        const logC = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
        return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
    }

    /** Poisson PMF. */
    function poissonPMF(k, lambda) {
        if (k < 0) return 0;
        if (lambda <= 0) return k === 0 ? 1 : 0;
        return Math.exp(-lambda + k * Math.log(lambda) - logGamma(k + 1));
    }

    /* ---------------- two-sample tests ---------------- */

    /**
     * Welch's two-sample t-test (does not assume equal variances).
     * Returns { t, df, p, meanA, meanB, diff }.
     */
    function welchTTest(a, b) {
        const nA = a.length, nB = b.length;
        if (nA < 2 || nB < 2) return { t: NaN, df: NaN, p: NaN };
        const mA = mean(a), mB = mean(b);
        const vA = variance(a), vB = variance(b);
        const sA = vA / nA, sB = vB / nB;
        const se = Math.sqrt(sA + sB);
        if (!se) return { t: NaN, df: NaN, p: NaN, meanA: mA, meanB: mB, diff: mA - mB };
        const t = (mA - mB) / se;
        const df = (sA + sB) * (sA + sB) /
                   ((sA * sA) / (nA - 1) + (sB * sB) / (nB - 1));
        return { t: t, df: df, p: tTwoSidedP(t, df), meanA: mA, meanB: mB, diff: mA - mB };
    }

    /** Midranks of the pooled values, ties averaged. */
    function _rank(values) {
        const idx = values.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
        const ranks = new Array(values.length);
        const tieGroups = [];
        let i = 0;
        while (i < idx.length) {
            let j = i;
            while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
            const avg = (i + j) / 2 + 1;           // ranks are 1-based
            for (let k = i; k <= j; k++) ranks[idx[k][1]] = avg;
            if (j > i) tieGroups.push(j - i + 1);
            i = j + 1;
        }
        return { ranks: ranks, tieGroups: tieGroups };
    }

    // Above this per-group size the exact table gets big and the normal
    // approximation is already accurate, so we switch over.
    const MW_EXACT_MAX = 20;

    /**
     * Exact two-sided Mann-Whitney p-value from the null distribution of U,
     * counted with the recurrence
     *     N(m, n, u) = N(m-1, n, u-n) + N(m, n-1, u)
     * with N(0, n, 0) = N(m, 0, 0) = 1. Assumes no ties.
     */
    function _mwExactP(U, m, n) {
        const uMax = m * n;
        // prev[j] holds the counts for (i-1, j); cur[j] the counts for (i, j).
        let prev = [];
        for (let j = 0; j <= n; j++) {
            const arr = new Float64Array(uMax + 1);
            arr[0] = 1;                            // N(0, j, 0) = 1
            prev.push(arr);
        }
        let cur = prev;
        for (let i = 1; i <= m; i++) {
            cur = [];
            for (let j = 0; j <= n; j++) {
                const arr = new Float64Array(uMax + 1);
                if (j === 0) {
                    arr[0] = 1;                    // N(i, 0, 0) = 1
                } else {
                    const fromLeft = cur[j - 1];   // N(i, j-1, u)
                    const fromUp = prev[j];        // N(i-1, j, u-j)
                    for (let u = 0; u <= uMax; u++) {
                        let v = fromLeft[u];
                        if (u - j >= 0) v += fromUp[u - j];
                        arr[u] = v;
                    }
                }
                cur.push(arr);
            }
            prev = cur;
        }
        const dist = cur[n];
        let total = 0;
        for (let u = 0; u <= uMax; u++) total += dist[u];
        // The null distribution is symmetric, so double the smaller tail.
        const uLow = Math.min(U, uMax - U);
        let tail = 0;
        for (let u = 0; u <= uLow; u++) tail += dist[u];
        return Math.min(1, 2 * tail / total);
    }

    /**
     * Mann-Whitney U test, two-sided. Exact for small tie-free samples,
     * otherwise the normal approximation with tie and continuity corrections.
     * Returns { U, p, z, exact }.
     */
    function mannWhitneyU(a, b) {
        const m = a.length, n = b.length;
        if (!m || !n) return { U: NaN, p: NaN, z: NaN, exact: false };

        const pooled = a.concat(b);
        const ranked = _rank(pooled);
        let rankSumA = 0;
        for (let i = 0; i < m; i++) rankSumA += ranked.ranks[i];
        const U = rankSumA - m * (m + 1) / 2;

        const hasTies = ranked.tieGroups.length > 0;
        if (!hasTies && m <= MW_EXACT_MAX && n <= MW_EXACT_MAX) {
            return { U: U, p: _mwExactP(U, m, n), z: NaN, exact: true };
        }

        const N = m + n;
        const mu = m * n / 2;
        let tieTerm = 0;
        for (const t of ranked.tieGroups) tieTerm += t * t * t - t;
        const varU = (m * n / 12) * ((N + 1) - tieTerm / (N * (N - 1)));
        if (varU <= 0) return { U: U, p: 1, z: 0, exact: false };
        const sigma = Math.sqrt(varU);
        const z = Math.max(0, Math.abs(U - mu) - 0.5) / sigma;   // continuity correction
        return { U: U, p: Math.min(1, 2 * (1 - normalCDF(z))), z: z, exact: false };
    }

    /* ---------------- binning ---------------- */

    /**
     * Bin data into nBins equal-width bins spanning [lo, hi]. Values outside
     * the range are clamped into the end bins so nothing vanishes silently
     * from the picture.
     */
    function histogram(data, lo, hi, nBins) {
        const counts = new Array(nBins).fill(0);
        const w = (hi - lo) / nBins;
        if (w <= 0) return { counts: counts, binWidth: 0, lo: lo, hi: hi };
        for (const x of data) {
            let b = Math.floor((x - lo) / w);
            if (b < 0) b = 0;
            if (b >= nBins) b = nBins - 1;
            counts[b]++;
        }
        return { counts: counts, binWidth: w, lo: lo, hi: hi };
    }

    /** Format a p-value the way a paper would. */
    function formatP(p) {
        if (!isFinite(p)) return '-';
        if (p < 0.001) return 'p < 0.001';
        return 'p = ' + p.toFixed(3);
    }

    return {
        mean: mean, variance: variance, sd: sd, quantile: quantile, median: median,
        iqr: iqr, min: min, max: max, skewness: skewness,
        normalPDF: normalPDF, normalCDF: normalCDF, normalDensity: normalDensity,
        zQuantile: zQuantile,
        logGamma: logGamma, betaInc: betaInc, tTwoSidedP: tTwoSidedP,
        choose: choose, binomPMF: binomPMF, poissonPMF: poissonPMF,
        welchTTest: welchTTest, mannWhitneyU: mannWhitneyU,
        histogram: histogram, formatP: formatP
    };
})();
