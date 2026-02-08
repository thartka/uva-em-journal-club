// Reusable histogram rendering and statistical calculations

class HistogramRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.bins = [];
        this.binCount = 30;
        this.showCurve = false;
        this.curveMean = 0;
        this.curveSD = 0;
        this.padding = { top: 20, right: 20, bottom: 40, left: 50 };
        
        // Fixed x-axis range
        this.xAxisMin = -50;
        this.xAxisMax = 80;
        this.xAxisZero = 0; // Where x=0 falls in the range
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20;
        const aspectRatio = 0.6; // height/width ratio
        const containerHeight = containerWidth * aspectRatio;
        
        // Set actual canvas size
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Set display size for high DPI screens
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.draw();
    }
    
    setData(data) {
        this.data = data;
        this.calculateBins();
        this.draw();
    }
    
    setDataAnimated(data, startFrom = 0, onComplete) {
        // If starting from existing data, initialize with it
        if (startFrom > 0) {
            // Keep existing data and bins
            this.data = data.slice(0, startFrom);
            this.calculateBins();
            // Now we have the existing bins as starting point
        } else {
            // Start with empty bins
            this.bins = new Array(this.binCount).fill(0);
            this.data = [];
        }
        
        // Animate by adding new samples one by one to the cumulative data
        let sampleIndex = startFrom;
        const totalSamples = data.length;
        const samplesPerFrame = Math.max(1, Math.ceil((totalSamples - startFrom) / 100)); // Add multiple samples per frame for speed
        
        const animate = () => {
            if (sampleIndex < totalSamples) {
                // Add samples in batches to cumulative data
                const endIndex = Math.min(sampleIndex + samplesPerFrame, totalSamples);
                for (let i = sampleIndex; i < endIndex; i++) {
                    this.data.push(data[i]);
                }
                sampleIndex = endIndex;
                
                // Recalculate bins with ALL cumulative data (old + new)
                // This ensures bars grow to show the total distribution
                this.calculateBins();
                this.draw();
                requestAnimationFrame(animate);
            } else {
                // Finalize - ensure we have all data
                this.data = data;
                this.calculateBins();
                this.draw();
                if (onComplete) onComplete();
            }
        };
        animate();
    }
    
    drawEmptyAxes() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        const plotWidth = width - this.padding.left - this.padding.right;
        const plotHeight = height - this.padding.top - this.padding.bottom;
        
        // Draw axes only
        this.drawAxes(width, height, plotWidth, plotHeight);
    }
    
    calculateBins() {
        // Use fixed x-axis range
        this.binMin = this.xAxisMin;
        this.binMax = this.xAxisMax;
        this.binWidth = (this.binMax - this.binMin) / this.binCount;
        
        this.bins = new Array(this.binCount).fill(0);
        
        if (this.data.length === 0) {
            return;
        }
        
        // Bin the data using fixed range
        this.data.forEach(value => {
            let binIndex = Math.floor((value - this.binMin) / this.binWidth);
            if (binIndex >= this.binCount) binIndex = this.binCount - 1;
            if (binIndex < 0) binIndex = 0;
            this.bins[binIndex]++;
        });
    }
    
    calculateMean() {
        if (this.data.length === 0) return 0;
        const sum = this.data.reduce((a, b) => a + b, 0);
        return sum / this.data.length;
    }
    
    calculateSD() {
        if (this.data.length === 0) return 0;
        const mean = this.calculateMean();
        const squaredDiffs = this.data.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / this.data.length;
        return Math.sqrt(avgSquaredDiff);
    }
    
    showNormalCurve(mean, sd) {
        this.showCurve = true;
        this.curveMean = mean;
        this.curveSD = sd;
        this.draw();
    }
    
    hideCurve() {
        this.showCurve = false;
        this.draw();
    }
    
    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        const plotWidth = width - this.padding.left - this.padding.right;
        const plotHeight = height - this.padding.top - this.padding.bottom;
        
        // Always draw axes
        this.drawAxes(width, height, plotWidth, plotHeight);
        
        if (this.data.length === 0) {
            return; // Just show axes
        }
        
        // Draw histogram bars
        this.drawBars(plotWidth, plotHeight);
        
        // Draw normal curve if enabled
        if (this.showCurve) {
            this.drawNormalCurve(plotWidth, plotHeight);
        }
    }
    
    drawEmptyMessage(width, height) {
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('No data to display', width / 2, height / 2);
    }
    
    drawAxes(width, height, plotWidth, plotHeight) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        // Calculate where x=0 falls on the x-axis
        const xAxisRange = this.xAxisMax - this.xAxisMin;
        const zeroPosition = this.padding.left + ((this.xAxisZero - this.xAxisMin) / xAxisRange) * plotWidth;
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, height - this.padding.bottom);
        this.ctx.lineTo(this.padding.left + plotWidth, height - this.padding.bottom);
        this.ctx.stroke();
        
        // Y-axis at x=0
        this.ctx.beginPath();
        this.ctx.moveTo(zeroPosition, this.padding.top);
        this.ctx.lineTo(zeroPosition, height - this.padding.bottom);
        this.ctx.stroke();
        
        // Y-axis label
        this.ctx.save();
        this.ctx.translate(15, height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Frequency', 0, 0);
        this.ctx.restore();
        
        // X-axis label
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Value (mGy)', this.padding.left + plotWidth / 2, height - 10);
        
        // Y-axis ticks
        const maxFreq = Math.max(...this.bins, 1);
        const tickCount = 5;
        for (let i = 0; i <= tickCount; i++) {
            const y = this.padding.top + plotHeight - (i / tickCount) * plotHeight;
            const value = Math.round((i / tickCount) * maxFreq);
            
            // Tick mark
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left - 5, y);
            this.ctx.lineTo(this.padding.left, y);
            this.ctx.stroke();
            
            // Label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(value.toString(), this.padding.left - 8, y + 3);
        }
        
        // X-axis ticks (using fixed range)
        const tickCountX = 6; // -50, -25, 0, 25, 50, 75
        const tickValues = [-50, -25, 0, 25, 50, 75];
        for (let i = 0; i < tickValues.length; i++) {
            const value = tickValues[i];
            const xAxisRange = this.xAxisMax - this.xAxisMin;
            const x = this.padding.left + ((value - this.xAxisMin) / xAxisRange) * plotWidth;
            
            // Tick mark
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - this.padding.bottom);
            this.ctx.lineTo(x, height - this.padding.bottom + 5);
            this.ctx.stroke();
            
            // Label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(value.toString(), x, height - this.padding.bottom + 18);
        }
    }
    
    drawBars(plotWidth, plotHeight) {
        const maxFreq = Math.max(...this.bins, 1);
        const xAxisRange = this.xAxisMax - this.xAxisMin;
        const barWidth = plotWidth / this.binCount;
        
        this.ctx.fillStyle = '#4A90E2';
        this.ctx.strokeStyle = '#2E5C8A';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.bins.length; i++) {
            const barHeight = (this.bins[i] / maxFreq) * plotHeight;
            // Calculate x position based on bin's center value in fixed range
            const binCenter = this.binMin + (i + 0.5) * this.binWidth;
            const x = this.padding.left + ((binCenter - this.xAxisMin) / xAxisRange) * plotWidth - barWidth / 2;
            const y = this.padding.top + plotHeight - barHeight;
            
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
            this.ctx.strokeRect(x, y, barWidth - 1, barHeight);
        }
    }
    
    drawNormalCurve(plotWidth, plotHeight) {
        if (!this.binMin || !this.binMax) return;
        
        const maxFreq = Math.max(...this.bins, 1);
        const points = 200;
        const xAxisRange = this.xAxisMax - this.xAxisMin;
        const step = xAxisRange / points;
        
        this.ctx.strokeStyle = '#E57200';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        let firstPoint = true;
        for (let i = 0; i <= points; i++) {
            const x = this.binMin + i * step;
            const y = this.normalPDF(x, this.curveMean, this.curveSD);
            
            // Scale to match histogram
            const scaledY = (y / this.normalPDF(this.curveMean, this.curveMean, this.curveSD)) * maxFreq;
            const scaledHeight = (scaledY / maxFreq) * plotHeight;
            
            const canvasX = this.padding.left + ((x - this.xAxisMin) / xAxisRange) * plotWidth;
            const canvasY = this.padding.top + plotHeight - scaledHeight;
            
            if (firstPoint) {
                this.ctx.moveTo(canvasX, canvasY);
                firstPoint = false;
            } else {
                this.ctx.lineTo(canvasX, canvasY);
            }
        }
        
        this.ctx.stroke();
    }
    
    normalPDF(x, mean, sd) {
        const variance = sd * sd;
        const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
        const exponent = -Math.pow(x - mean, 2) / (2 * variance);
        return coefficient * Math.exp(exponent);
    }
}
