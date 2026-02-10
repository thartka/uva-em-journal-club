// Lognormal Distribution Exercise
// Samples from Lognormal(s=0.98, scale=10)

class LognormalExercise {
    constructor() {
        this.histogram = new HistogramRenderer('histogram-canvas');
        this.samples = [];
        this.shape = 1.1; // shape parameter (sigma in log space)
        this.scale = 9; // scale parameter
        this.calculatedMean = 0;
        this.calculatedSD = 0;
        this.curveShown = false;
        this.samplesAdded = false;
        
        this.setupControls();
        // Show empty axes initially
        this.histogram.drawEmptyAxes();
        this.updateStatsDisplay();
    }
    
    setupControls() {
        const numSamplesSlider = document.getElementById('num-samples');
        const numSamplesValue = document.getElementById('num-samples-value');
        const addSamplesBtn = document.getElementById('add-samples-btn');
        const calculateBtn = document.getElementById('calculate-btn');
        const resetBtn = document.getElementById('reset-btn');
        const nextBtn = document.getElementById('next-btn');
        
        numSamplesSlider.addEventListener('input', (e) => {
            const numSamples = parseInt(e.target.value);
            numSamplesValue.textContent = numSamples;
            // Don't auto-update, just update the display value
        });
        
        addSamplesBtn.addEventListener('click', () => this.addSamples());
        calculateBtn.addEventListener('click', () => this.calculateStats());
        resetBtn.addEventListener('click', () => this.reset());
        nextBtn.addEventListener('click', () => {
            window.location.href = 'parametric-test.html';
        });
    }
    
    addSamples() {
        const numSamples = parseInt(document.getElementById('num-samples').value);
        
        // Generate new samples - keep ALL samples (including > 80) for calculations
        const newSamples = [];
        for (let i = 0; i < numSamples; i++) {
            newSamples.push(this.generateLognormalSample());
        }
        
        // Append to existing samples (keep all for calculations)
        this.samples = this.samples.concat(newSamples);
        
        // Filter samples for display (only <= 80) - used for histogram plotting
        const filteredSamples = this.samples.filter(sample => sample <= 80);
        const existingFilteredCount = Math.max(0, filteredSamples.length - newSamples.filter(s => s <= 80).length);
        
        this.samplesAdded = true;
        this.curveShown = false;
        this.histogram.hideCurve();
        
        // Animate the accumulation of filtered samples only (for display)
        this.histogram.setDataAnimated(filteredSamples, existingFilteredCount, () => {
            this.updateStatsDisplay();
        });
    }
    
    generateNormalSample(mean, sd) {
        // Box-Muller transform for generating normal random variables
        let u1 = Math.random();
        let u2 = Math.random();
        let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * sd + mean;
    }
    
    generateLognormalSample() {
        // Generate from lognormal distribution
        // If X ~ Normal(μ, σ), then Y = exp(X) ~ Lognormal(μ, σ)
        // For lognormal with shape s and scale, we use:
        // X ~ Normal(log(scale), s), then Y = exp(X)
        const meanLog = Math.log(this.scale);
        const normalSample = this.generateNormalSample(meanLog, this.shape);
        return Math.exp(normalSample);
    }
    
    
    calculateStats() {
        if (this.samples.length === 0) return;
        
        // Calculate mean and SD from ALL samples (including > 80)
        this.calculatedMean = this.calculateMeanFromSamples();
        this.calculatedSD = this.calculateSDFromSamples();
        
        // Show normal curve overlay (demonstrating why it's inappropriate)
        this.histogram.showNormalCurve(this.calculatedMean, this.calculatedSD);
        this.curveShown = true;
        
        // Update stats display
        this.updateStatsDisplay();
    }
    
    calculateMeanFromSamples() {
        if (this.samples.length === 0) return 0;
        const sum = this.samples.reduce((a, b) => a + b, 0);
        return sum / this.samples.length;
    }
    
    calculateSDFromSamples() {
        if (this.samples.length === 0) return 0;
        const mean = this.calculateMeanFromSamples();
        const sumSquaredDiffs = this.samples.reduce((sum, value) => {
            return sum + Math.pow(value - mean, 2);
        }, 0);
        return Math.sqrt(sumSquaredDiffs / this.samples.length);
    }
    
    updateStatsDisplay() {
        const statsDisplay = document.getElementById('stats-display');
        
        if (!this.samplesAdded || this.samples.length === 0) {
            statsDisplay.innerHTML = '<p>Adjust the slider and click "Add Random Samples" to generate samples</p>';
            return;
        }
        
        // Count displayed samples (<= 80) and total samples
        const displayedSamples = this.samples.filter(s => s <= 80).length;
        const totalSamples = this.samples.length;
        const hiddenSamples = totalSamples - displayedSamples;
        
        let html = `<p><strong>Number of Samples:</strong> ${totalSamples}`;
        if (hiddenSamples > 0) {
            html += ` (${displayedSamples} displayed, ${hiddenSamples} > 80 hidden from plot)</p>`;
        } else {
            html += `</p>`;
        }
        html += `<p><strong>True Distribution:</strong> Lognormal (s = ${this.shape}, scale = ${this.scale})</p>`;
        
        if (this.curveShown) {
            html += `<p><strong>Calculated Mean:</strong> ${this.calculatedMean.toFixed(2)} mGy (from all ${totalSamples} samples)</p>`;
            html += `<p><strong>Calculated SD:</strong> ${this.calculatedSD.toFixed(2)} mGy (from all ${totalSamples} samples)</p>`;
            html += `<p style="color: #d32f2f;"><strong>⚠️ Note:</strong> The normal curve does not fit well because the data is lognormally distributed, not normally distributed!</p>`;
            html += `<p style="color: #666;">Mean and standard deviation are not appropriate summary statistics for this distribution.</p>`;
        } else {
            html += `<p style="color: #666;">Click "Calculate Mean & SD" to see why these statistics are inappropriate for lognormal data</p>`;
        }
        
        statsDisplay.innerHTML = html;
    }
    
    reset() {
        this.samples = [];
        this.samplesAdded = false;
        this.curveShown = false;
        this.histogram.hideCurve();
        document.getElementById('num-samples').value = 100;
        document.getElementById('num-samples-value').textContent = '100';
        this.histogram.drawEmptyAxes();
        this.updateStatsDisplay();
    }
}

// Initialize when page loads
let lognormalExercise;
window.addEventListener('DOMContentLoaded', () => {
    lognormalExercise = new LognormalExercise();
});
