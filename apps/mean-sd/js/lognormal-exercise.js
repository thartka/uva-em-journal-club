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
        const backBtn = document.getElementById('back-btn');
        
        numSamplesSlider.addEventListener('input', (e) => {
            const numSamples = parseInt(e.target.value);
            numSamplesValue.textContent = numSamples;
            // Don't auto-update, just update the display value
        });
        
        addSamplesBtn.addEventListener('click', () => this.addSamples());
        calculateBtn.addEventListener('click', () => this.calculateStats());
        resetBtn.addEventListener('click', () => this.reset());
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    addSamples() {
        const numSamples = parseInt(document.getElementById('num-samples').value);
        
        // Generate new samples and filter out values greater than 80
        const newSamples = [];
        for (let i = 0; i < numSamples; i++) {
            const sample = this.generateLognormalSample();
            // Only add samples that are <= 80
            if (sample <= 80) {
                newSamples.push(sample);
            }
        }
        
        // Append to existing samples
        const existingCount = this.samples.length;
        this.samples = this.samples.concat(newSamples);
        
        this.samplesAdded = true;
        this.curveShown = false;
        this.histogram.hideCurve();
        
        // Animate the accumulation of new samples only
        this.histogram.setDataAnimated(this.samples, existingCount, () => {
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
        
        this.calculatedMean = this.histogram.calculateMean();
        this.calculatedSD = this.histogram.calculateSD();
        
        // Show normal curve overlay (demonstrating why it's inappropriate)
        this.histogram.showNormalCurve(this.calculatedMean, this.calculatedSD);
        this.curveShown = true;
        
        // Update stats display
        this.updateStatsDisplay();
    }
    
    updateStatsDisplay() {
        const statsDisplay = document.getElementById('stats-display');
        
        if (!this.samplesAdded || this.samples.length === 0) {
            statsDisplay.innerHTML = '<p>Adjust the slider and click "Add Random Samples" to generate samples</p>';
            return;
        }
        
        let html = `<p><strong>Number of Samples:</strong> ${this.samples.length}</p>`;
        html += `<p><strong>True Distribution:</strong> Lognormal (s = ${this.shape}, scale = ${this.scale})</p>`;
        
        if (this.curveShown) {
            html += `<p><strong>Calculated Mean:</strong> ${this.calculatedMean.toFixed(2)} mGy</p>`;
            html += `<p><strong>Calculated SD:</strong> ${this.calculatedSD.toFixed(2)} mGy</p>`;
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
