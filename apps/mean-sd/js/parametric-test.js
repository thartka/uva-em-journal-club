// Parametric vs Non-parametric Test Exercise
// Demonstrates when t-test is significant but Mann-Whitney U is not

// Seeded random number generator
class SeededRandom {
    constructor(seed = 24) {
        this.seed = seed;
    }
    
    // Generate next random number between 0 and 1
    next() {
        // Using a simple Linear Congruential Generator
        // Parameters: a = 1664525, c = 1013904223, m = 2^32
        // Using bitwise operations for better performance and correctness
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        return (this.seed >>> 0) / 4294967296; // 2^32
    }
    
    // Reset to initial seed
    reset(seed = 24) {
        this.seed = seed;
    }
}

class ParametricTestExercise {
    constructor() {
        this.histogram = new DualHistogramRenderer('histogram-canvas');
        this.groupA = [];
        this.groupB = [];
        
        // Initialize seeded random number generator with seed 24
        this.rng = new SeededRandom(24);
        
        // Lognormal distribution parameters
        // Group A: slightly lower
        this.shapeA = 1.0;
        this.scaleA = 10;
        
        // Group B: slightly higher
        this.shapeB = 1.2;
        this.scaleB = 12;
        
        this.curvesShown = false;
        this.samplesGenerated = false;
        
        this.setupControls();
        this.histogram.drawEmptyAxes();
    }
    
    setupControls() {
        const numSamplesSlider = document.getElementById('num-samples');
        const numSamplesValue = document.getElementById('num-samples-value');
        const generateBtn = document.getElementById('generate-btn');
        const showNormalBtn = document.getElementById('show-normal-btn');
        const resetBtn = document.getElementById('reset-btn');
        const backBtn = document.getElementById('back-btn');
        
        numSamplesSlider.addEventListener('input', (e) => {
            const numSamples = parseInt(e.target.value);
            numSamplesValue.textContent = numSamples;
        });
        
        generateBtn.addEventListener('click', () => this.generateSamples());
        showNormalBtn.addEventListener('click', () => this.showNormalDistributions());
        resetBtn.addEventListener('click', () => this.reset());
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    generateNormalSample(mean, sd) {
        // Box-Muller transform using seeded random number generator
        let u1 = this.rng.next();
        let u2 = this.rng.next();
        let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * sd + mean;
    }
    
    generateLognormalSample(shape, scale) {
        const meanLog = Math.log(scale);
        const normalSample = this.generateNormalSample(meanLog, shape);
        return Math.exp(normalSample);
    }
    
    generateSamples() {
        const numSamples = parseInt(document.getElementById('num-samples').value);
        
        // Reset random number generator to seed 24 for reproducible results
        this.rng.reset(24);
        
        // Generate new samples for both groups
        this.groupA = [];
        this.groupB = [];
        
        for (let i = 0; i < numSamples; i++) {
            this.groupA.push(this.generateLognormalSample(this.shapeA, this.scaleA));
            this.groupB.push(this.generateLognormalSample(this.shapeB, this.scaleB));
        }
        
        this.samplesGenerated = true;
        this.curvesShown = false;
        this.histogram.hideCurves();
        this.histogram.setData(this.groupA, this.groupB);
        
        // Calculate and display Mann-Whitney U p-value on plot
        const mwResult = this.calculateMannWhitneyU(this.groupA, this.groupB);
        this.histogram.setMannWhitneyPValue(mwResult.pValue);
        this.histogram.setTTestPValue(null); // Clear t-test p-value
        
        this.updateStatsDisplay();
    }
    
    showNormalDistributions() {
        if (!this.samplesGenerated || this.groupA.length === 0 || this.groupB.length === 0) {
            return;
        }
        
        const meanA = this.histogram.calculateMean(this.groupA);
        const sdA = this.histogram.calculateSD(this.groupA);
        const meanB = this.histogram.calculateMean(this.groupB);
        const sdB = this.histogram.calculateSD(this.groupB);
        
        this.histogram.showNormalCurves(meanA, sdA, meanB, sdB);
        
        // Calculate and display t-test p-value on plot
        const tResult = this.calculateTTest(this.groupA, this.groupB);
        this.histogram.setTTestPValue(tResult.pValue);
        
        this.curvesShown = true;
        this.updateStatsDisplay();
    }
    
    calculateMannWhitneyU(groupA, groupB) {
        const n1 = groupA.length;
        const n2 = groupB.length;
        
        if (n1 === 0 || n2 === 0) {
            return { u: 0, z: 0, pValue: 1.0 };
        }
        
        // Combine and rank all values
        const combined = [];
        groupA.forEach((value, index) => {
            combined.push({ value, group: 'A', originalIndex: index });
        });
        groupB.forEach((value, index) => {
            combined.push({ value, group: 'B', originalIndex: index });
        });
        
        // Sort by value
        combined.sort((a, b) => a.value - b.value);
        
        // Assign ranks, handling ties
        let rank = 1;
        for (let i = 0; i < combined.length; i++) {
            if (i > 0 && combined[i].value !== combined[i - 1].value) {
                rank = i + 1;
            }
            
            // Check for ties
            let tieCount = 1;
            let j = i + 1;
            while (j < combined.length && combined[j].value === combined[i].value) {
                tieCount++;
                j++;
            }
            
            const averageRank = rank + (tieCount - 1) / 2;
            for (let k = i; k < i + tieCount; k++) {
                combined[k].rank = averageRank;
            }
            i += tieCount - 1;
            rank += tieCount;
        }
        
        // Calculate sum of ranks for group A
        const rankSumA = combined
            .filter(item => item.group === 'A')
            .reduce((sum, item) => sum + item.rank, 0);
        
        // Calculate U statistic
        const u1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - rankSumA;
        const u2 = n1 * n2 - u1;
        const u = Math.min(u1, u2);
        
        // Calculate z-score using normal approximation
        const meanU = (n1 * n2) / 2;
        const varU = (n1 * n2 * (n1 + n2 + 1)) / 12;
        const sdU = Math.sqrt(varU);
        
        // Continuity correction
        const z = (u - meanU + 0.5) / sdU;
        
        // Calculate two-tailed p-value
        const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
        
        return { u, z, pValue };
    }
    
    calculateTTest(groupA, groupB) {
        const n1 = groupA.length;
        const n2 = groupB.length;
        
        if (n1 === 0 || n2 === 0) {
            return { t: 0, df: 0, pValue: 1.0 };
        }
        
        // Calculate means
        const meanA = this.histogram.calculateMean(groupA);
        const meanB = this.histogram.calculateMean(groupB);
        
        // Calculate standard deviations (sample standard deviation)
        const sdA = this.calculateSampleSD(groupA, meanA);
        const sdB = this.calculateSampleSD(groupB, meanB);
        
        // Welch's t-test (unequal variances)
        const seA = sdA * sdA / n1;
        const seB = sdB * sdB / n2;
        const se = Math.sqrt(seA + seB);
        
        if (se === 0) {
            return { t: 0, df: n1 + n2 - 2, pValue: 1.0 };
        }
        
        const t = (meanA - meanB) / se;
        
        // Degrees of freedom (Welch-Satterthwaite equation)
        const df = Math.pow(seA + seB, 2) / (Math.pow(seA, 2) / (n1 - 1) + Math.pow(seB, 2) / (n2 - 1));
        
        // Calculate two-tailed p-value
        const pValue = 2 * (1 - this.tCDF(Math.abs(t), df));
        
        return { t, df, pValue, meanA, meanB, sdA, sdB };
    }
    
    calculateSampleSD(data, mean) {
        if (data.length <= 1) return 0;
        const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
        const sumSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0);
        return Math.sqrt(sumSquaredDiff / (data.length - 1));
    }
    
    normalCDF(z) {
        // Approximation of standard normal CDF
        // Using Abramowitz and Stegun approximation
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2.0);
        
        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1.0 + sign * y);
    }
    
    tCDF(t, df) {
        // Approximation of t-distribution CDF
        // Returns P(T <= t) where T follows t-distribution with df degrees of freedom
        
        // For large df, use normal approximation
        if (df > 100) {
            return this.normalCDF(t);
        }
        
        // For smaller df, use normal approximation with correction
        // This is a simplified approach - for production use a proper statistical library
        const x = Math.abs(t);
        let p = this.normalCDF(x);
        
        // Adjust for t-distribution (t-distribution has heavier tails than normal)
        if (df < 30 && df > 1) {
            // Correction factor - t-distribution is more spread out
            const correction = 1 + (0.25 / df) * (x * x / (1 + x * x / df));
            p = p * correction;
            // Ensure p doesn't exceed 1
            p = Math.min(p, 0.9999);
        }
        
        // Handle negative t values
        if (t < 0) {
            return 1 - p;
        }
        
        // Return P(T <= t)
        return p;
    }
    
    formatPValue(pValue) {
        if (pValue < 0.001) {
            return '< 0.001';
        }
        return pValue.toFixed(3);
    }
    
    getSignificanceStars(pValue) {
        if (pValue < 0.001) return '***';
        if (pValue < 0.01) return '**';
        if (pValue < 0.05) return '*';
        return '';
    }
    
    updateStatsDisplay() {
        // Stats display removed - p-values are now shown on the plot
        // This method is kept for compatibility but does nothing
    }
    
    reset() {
        this.groupA = [];
        this.groupB = [];
        this.samplesGenerated = false;
        this.curvesShown = false;
        this.histogram.hideCurves();
        this.histogram.clearPValues();
        document.getElementById('num-samples').value = 5;
        document.getElementById('num-samples-value').textContent = '5';
        this.histogram.drawEmptyAxes();
        this.updateStatsDisplay();
    }
}

// Initialize when page loads
let parametricTestExercise;
window.addEventListener('DOMContentLoaded', () => {
    parametricTestExercise = new ParametricTestExercise();
});
