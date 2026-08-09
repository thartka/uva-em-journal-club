/**
 * Statistical functions for the p-values module.
 * All functions are pure — no DOM or global state.
 * (Mirrors apps/type-i-ii-errors/js/stats.js, plus exact binomial helpers
 *  used by the coin game.)
 */

const Stats = (() => {

    /**
     * Standard normal CDF  Φ(x)
     * Abramowitz & Stegun rational approximation (|error| < 7.5e-8).
     */
    function normalCDF(x) {
        if (x === 0) return 0.5;
        const sign = x < 0 ? -1 : 1;
        const z = Math.abs(x);

        const b1 = 0.319381530;
        const b2 = -0.356563782;
        const b3 = 1.781477937;
        const b4 = -1.821255978;
        const b5 = 1.330274429;
        const p = 0.2316419;

        const t = 1.0 / (1.0 + p * z);
        const t2 = t * t;
        const t3 = t2 * t;
        const t4 = t3 * t;
        const t5 = t4 * t;
        const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2.0 * Math.PI);
        const cdf = 1.0 - pdf * (b1 * t + b2 * t2 + b3 * t3 + b4 * t4 + b5 * t5);

        return sign === 1 ? cdf : 1.0 - cdf;
    }

    /** Standard normal PDF  φ(x). */
    function normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
    }

    /** Binomial coefficient  C(n, k). */
    function choose(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        k = Math.min(k, n - k);
        let c = 1;
        for (let i = 0; i < k; i++) {
            c = c * (n - i) / (i + 1);
        }
        return c;
    }

    /** Binomial PMF  P(X = k) for X ~ Binomial(n, p). */
    function binomPMF(k, n, p) {
        if (k < 0 || k > n) return 0;
        return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }

    /** P(X >= k) for X ~ Binomial(n, p). */
    function binomTailUpper(k, n, p) {
        let s = 0;
        for (let i = k; i <= n; i++) s += binomPMF(i, n, p);
        return s;
    }

    /** P(X <= k) for X ~ Binomial(n, p). */
    function binomTailLower(k, n, p) {
        let s = 0;
        for (let i = 0; i <= k; i++) s += binomPMF(i, n, p);
        return s;
    }

    /**
     * Two-sided p-value for a fair-coin test given `k` heads in `n` flips:
     * the probability, under a fair coin, of a result at least this lopsided
     * in either direction. For k = 8, n = 10 this returns ≈ 0.109.
     */
    function coinPValueTwoSided(k, n) {
        const hi = Math.max(k, n - k);
        const lo = n - hi;
        return Math.min(1, binomTailUpper(hi, n, 0.5) + binomTailLower(lo, n, 0.5));
    }

    /** Inverse normal (quantile) via Beasley-Springer-Moro approximation. */
    function zQuantile(p) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        if (p === 0.5) return 0;

        const a = [
            -3.969683028665376e+01, 2.209460984245205e+02,
            -2.759285104469687e+02, 1.383577518672690e+02,
            -3.066479806614716e+01, 2.506628277459239e+00
        ];
        const b = [
            -5.447609879822406e+01, 1.615858368580409e+02,
            -1.556989798598866e+02, 6.680131188771972e+01,
            -1.328068155288572e+01
        ];
        const c = [
            -7.784894002430293e-03, -3.223964580411365e-01,
            -2.400758277161838e+00, -2.549732539343734e+00,
             4.374664141464968e+00, 2.938163982698783e+00
        ];
        const d = [
            7.784695709041462e-03, 3.224671290700398e-01,
            2.445134137142996e+00, 3.754408661907416e+00
        ];

        const pLow = 0.02425;
        const pHigh = 1 - pLow;
        let q, r;

        if (p < pLow) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                   ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
        } else if (p <= pHigh) {
            q = p - 0.5;
            r = q * q;
            return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
                   (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                    ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
        }
    }

    /** Number of events in n Bernoulli(p) trials. */
    function binomialCount(n, p) {
        let count = 0;
        for (let i = 0; i < n; i++) {
            if (Math.random() < p) count++;
        }
        return count;
    }

    return {
        normalCDF,
        normalPDF,
        choose,
        binomPMF,
        binomTailUpper,
        binomTailLower,
        coinPValueTwoSided,
        zQuantile,
        binomialCount
    };
})();
