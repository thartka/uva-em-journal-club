/**
 * data-distributions: seeded pseudo-random generator and distribution samplers.
 *
 * Everything on the teaching pages is drawn from a *seeded* generator so the
 * histogram on the projector is pixel-identical to the one on every resident's
 * phone. Call `new RNG(seed)` and reuse it; call `.reset()` to redraw the same
 * sample. No DOM, no globals.
 */

class RNG {
    constructor(seed = 24) {
        this._seed0 = seed >>> 0;
        this.seed = seed >>> 0;
        this._spare = null;
    }

    /** mulberry32: small, fast, and far better distributed than an LCG. */
    next() {
        this.seed = (this.seed + 0x6D2B79F5) >>> 0;
        let t = this.seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    reset(seed) {
        this.seed = (seed === undefined ? this._seed0 : seed) >>> 0;
        this._spare = null;
    }

    /** Uniform on [lo, hi). */
    uniform(lo = 0, hi = 1) {
        return lo + (hi - lo) * this.next();
    }

    /** Integer on [lo, hi] inclusive. */
    int(lo, hi) {
        return lo + Math.floor(this.next() * (hi - lo + 1));
    }

    /** Standard normal, Box-Muller with the second deviate cached. */
    normal(mean = 0, sd = 1) {
        if (this._spare !== null) {
            const z = this._spare;
            this._spare = null;
            return mean + sd * z;
        }
        let u1 = this.next();
        // Guard against log(0).
        if (u1 < 1e-12) u1 = 1e-12;
        const u2 = this.next();
        const r = Math.sqrt(-2 * Math.log(u1));
        const theta = 2 * Math.PI * u2;
        this._spare = r * Math.sin(theta);
        return mean + sd * r * Math.cos(theta);
    }

    /** Lognormal with the given median (= exp(meanlog)) and log-scale SD. */
    lognormal(median, sdlog) {
        return median * Math.exp(this.normal(0, sdlog));
    }

    /** Exponential with the given mean (1 / rate). */
    exponential(mean) {
        let u = this.next();
        if (u < 1e-12) u = 1e-12;
        return -mean * Math.log(u);
    }

    /** Gamma(shape, scale) by Marsaglia and Tsang, with the shape<1 boost. */
    gamma(shape, scale = 1) {
        if (shape < 1) {
            const u = Math.max(this.next(), 1e-12);
            return this.gamma(shape + 1, scale) * Math.pow(u, 1 / shape);
        }
        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        for (;;) {
            const z = this.normal();
            const v = 1 + c * z;
            if (v <= 0) continue;
            const v3 = v * v * v;
            const u = this.next();
            const z2 = z * z;
            if (u < 1 - 0.0331 * z2 * z2) return d * v3 * scale;
            if (Math.log(u) < 0.5 * z2 + d * (1 - v3 + Math.log(v3))) return d * v3 * scale;
        }
    }

    /** Poisson count by Knuth's product method (fine for the rates used here). */
    poisson(lambda) {
        if (lambda <= 0) return 0;
        if (lambda > 60) {
            // Normal approximation with rounding; only used far outside the sliders.
            return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
        }
        const limit = Math.exp(-lambda);
        let p = 1;
        let k = 0;
        do {
            k++;
            p *= this.next();
        } while (p > limit);
        return k - 1;
    }

    /** Number of successes in n independent Bernoulli(p) trials. */
    binomial(n, p) {
        let count = 0;
        for (let i = 0; i < n; i++) {
            if (this.next() < p) count++;
        }
        return count;
    }

    /** Pick one element of `arr`. */
    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
}
