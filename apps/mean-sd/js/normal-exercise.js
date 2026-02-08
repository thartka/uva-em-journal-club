// Normal Distribution Exercise
// Samples from N(μ=14 mGy, σ=23.1 mGy)

class NormalExercise {
    constructor() {
        this.histogram = new HistogramRenderer('histogram-canvas');
        this.samples = [];
        this.mean = 14; // mGy
        this.sd = 23.1; // mGy
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
            window.location.href = 'lognormal-distribution.html';
        });
    }
    
    addSamples() {
        const numSamples = parseInt(document.getElementById('num-samples').value);
        
        // Generate new samples
        const newSamples = [];
        for (let i = 0; i < numSamples; i++) {
            newSamples.push(this.generateNormalSample(this.mean, this.sd));
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
    
    
    calculateStats() {
        if (this.samples.length === 0) return;
        
        this.calculatedMean = this.histogram.calculateMean();
        this.calculatedSD = this.histogram.calculateSD();
        
        // Show normal curve overlay
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
        html += `<p><strong>True Distribution:</strong> Normal (μ = ${this.mean} mGy, σ = ${this.sd} mGy)</p>`;
        
        if (this.curveShown) {
            html += `<p><strong>Calculated Mean:</strong> ${this.calculatedMean.toFixed(2)} mGy</p>`;
            html += `<p><strong>Calculated SD:</strong> ${this.calculatedSD.toFixed(2)} mGy</p>`;
            html += `<p style="color: #E57200;"><strong>Normal curve overlaid using calculated parameters</strong></p>`;
        } else {
            html += `<p style="color: #666;">Click "Calculate Mean & SD" to see the fitted normal distribution</p>`;
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
let normalExercise;
window.addEventListener('DOMContentLoaded', () => {
    normalExercise = new NormalExercise();
});
