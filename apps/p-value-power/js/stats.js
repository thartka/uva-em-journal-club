/**
 * Statistical functions for p-value/power exercise.
 * All functions are pure — no DOM or global state.
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

    /**
     * Complementary error function  erfc(x) = 1 − erf(x).
     */
    function erfc(x) {
        return 1.0 - erf(x);
    }

    function erf(x) {
        const sign = x < 0 ? -1 : 1;
        const z = Math.abs(x);
        const t = 1.0 / (1.0 + 0.3275911 * z);
        const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
        const poly = a[0] * t + a[1] * t * t + a[2] * t * t * t +
                     a[3] * t * t * t * t + a[4] * t * t * t * t * t;
        return sign * (1.0 - poly * Math.exp(-z * z));
    }

    /**
     * Chi-squared p-value for a 2×2 contingency table (1 df).
     *   a,b = treatment events / non-events
     *   c,d = control events / non-events
     * Returns two-sided p-value.
     */
    function chiSquaredP(a, b, c, d) {
        const n = a + b + c + d;
        if (n === 0) return 1.0;
        const num = n * (a * d - b * c) ** 2;
        const den = (a + b) * (c + d) * (a + c) * (b + d);
        if (den === 0) return 1.0;
        const chi2 = num / den;
        return erfc(Math.sqrt(chi2 / 2.0));
    }

    /**
     * Compute two-sided p-value from pre-generated arm data.
     *   treatmentEvents, treatmentTotal, controlEvents, controlTotal
     */
    function pValueFromCounts(tE, tN, cE, cN) {
        const a = tE;
        const b = tN - tE;
        const c = cE;
        const d = cN - cE;
        return chiSquaredP(a, b, c, d);
    }

    /**
     * Power for a two-proportion z-test (two-sided).
     *   p1, p2: true proportions per arm
     *   n:      patients per arm
     *   alpha:  significance level (default 0.05)
     */
    function power(p1, p2, n, alpha = 0.05) {
        if (p1 === p2) return alpha;
        const pBar = (p1 + p2) / 2.0;
        const zAlpha = zQuantile(1.0 - alpha / 2.0);
        const se1 = Math.sqrt(2.0 * pBar * (1.0 - pBar));
        const se2 = Math.sqrt(p1 * (1.0 - p1) + p2 * (1.0 - p2));
        if (se2 === 0) return 1.0;
        const z = (Math.sqrt(n) * Math.abs(p1 - p2) - zAlpha * se1) / se2;
        return normalCDF(z);
    }

    /**
     * Inverse normal (quantile) via Beasley-Springer-Moro approximation.
     */
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

    /**
     * Generate n Bernoulli outcomes with probability p.
     * Returns array of 0/1.
     */
    function bernoulliSample(n, p) {
        const out = new Array(n);
        for (let i = 0; i < n; i++) {
            out[i] = Math.random() < p ? 1 : 0;
        }
        return out;
    }

    return {
        normalCDF,
        erfc,
        chiSquaredP,
        pValueFromCounts,
        power,
        zQuantile,
        bernoulliSample
    };
})();
