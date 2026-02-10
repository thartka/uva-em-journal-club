// Dual histogram renderer for comparing two groups

class DualHistogramRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.groupA = [];
        this.groupB = [];
        this.binsA = [];
        this.binsB = [];
        this.binCount = 30;
        this.showCurves = false;
        this.curveMeanA = 0;
        this.curveSDA = 0;
        this.curveMeanB = 0;
        this.curveSDB = 0;
        this.mannWhitneyPValue = null;
        this.tTestPValue = null;
        this.padding = { top: 20, right: 20, bottom: 40, left: 50 };
        
        // Fixed x-axis range (adjusted for lognormal data)
        this.xAxisMin = 0;
        this.xAxisMax = 100;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20;
        const aspectRatio = 0.6;
        const containerHeight = containerWidth * aspectRatio;
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.draw();
    }
    
    setData(groupA, groupB) {
        this.groupA = groupA;
        this.groupB = groupB;
        this.calculateBins();
        this.draw();
    }
    
    calculateBins() {
        this.binMin = this.xAxisMin;
        this.binMax = this.xAxisMax;
        this.binWidth = (this.binMax - this.binMin) / this.binCount;
        
        this.binsA = new Array(this.binCount).fill(0);
        this.binsB = new Array(this.binCount).fill(0);
        
        // Bin Group A
        this.groupA.forEach(value => {
            let binIndex = Math.floor((value - this.binMin) / this.binWidth);
            if (binIndex >= this.binCount) binIndex = this.binCount - 1;
            if (binIndex < 0) binIndex = 0;
            this.binsA[binIndex]++;
        });
        
        // Bin Group B
        this.groupB.forEach(value => {
            let binIndex = Math.floor((value - this.binMin) / this.binWidth);
            if (binIndex >= this.binCount) binIndex = this.binCount - 1;
            if (binIndex < 0) binIndex = 0;
            this.binsB[binIndex]++;
        });
    }
    
    calculateMean(data) {
        if (data.length === 0) return 0;
        const sum = data.reduce((a, b) => a + b, 0);
        return sum / data.length;
    }
    
    calculateSD(data) {
        if (data.length === 0) return 0;
        const mean = this.calculateMean(data);
        const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
        return Math.sqrt(avgSquaredDiff);
    }
    
    showNormalCurves(meanA, sdA, meanB, sdB) {
        this.showCurves = true;
        this.curveMeanA = meanA;
        this.curveSDA = sdA;
        this.curveMeanB = meanB;
        this.curveSDB = sdB;
        this.draw();
    }
    
    hideCurves() {
        this.showCurves = false;
        this.draw();
    }
    
    setMannWhitneyPValue(pValue) {
        this.mannWhitneyPValue = pValue;
        this.draw();
    }
    
    setTTestPValue(pValue) {
        this.tTestPValue = pValue;
        this.draw();
    }
    
    clearPValues() {
        this.mannWhitneyPValue = null;
        this.tTestPValue = null;
        this.draw();
    }
    
    drawEmptyAxes() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.clearRect(0, 0, width, height);
        
        const plotWidth = width - this.padding.left - this.padding.right;
        const plotHeight = height - this.padding.top - this.padding.bottom;
        
        this.drawAxes(width, height, plotWidth, plotHeight);
    }
    
    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.clearRect(0, 0, width, height);
        
        const plotWidth = width - this.padding.left - this.padding.right;
        const plotHeight = height - this.padding.top - this.padding.bottom;
        
        this.drawAxes(width, height, plotWidth, plotHeight);
        
        if (this.groupA.length === 0 && this.groupB.length === 0) {
            return;
        }
        
        this.drawBars(plotWidth, plotHeight);
        
        if (this.showCurves) {
            this.drawNormalCurves(plotWidth, plotHeight);
        }
        
        // Draw p-values on the plot
        this.drawPValues(width, height, plotWidth, plotHeight);
    }
    
    drawAxes(width, height, plotWidth, plotHeight) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, height - this.padding.bottom);
        this.ctx.lineTo(this.padding.left + plotWidth, height - this.padding.bottom);
        this.ctx.stroke();
        
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.padding.top);
        this.ctx.lineTo(this.padding.left, height - this.padding.bottom);
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
        this.ctx.fillText('Value', this.padding.left + plotWidth / 2, height - 10);
        
        // Y-axis ticks
        const maxFreq = Math.max(...this.binsA, ...this.binsB, 1);
        const tickCount = 5;
        for (let i = 0; i <= tickCount; i++) {
            const y = this.padding.top + plotHeight - (i / tickCount) * plotHeight;
            const value = Math.round((i / tickCount) * maxFreq);
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left - 5, y);
            this.ctx.lineTo(this.padding.left, y);
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(value.toString(), this.padding.left - 8, y + 3);
        }
        
        // X-axis ticks
        const tickCountX = 6;
        const tickValues = [0, 20, 40, 60, 80, 100];
        for (let i = 0; i < tickValues.length; i++) {
            const value = tickValues[i];
            const xAxisRange = this.xAxisMax - this.xAxisMin;
            const x = this.padding.left + ((value - this.xAxisMin) / xAxisRange) * plotWidth;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - this.padding.bottom);
            this.ctx.lineTo(x, height - this.padding.bottom + 5);
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(value.toString(), x, height - this.padding.bottom + 18);
        }
    }
    
    drawBars(plotWidth, plotHeight) {
        const maxFreq = Math.max(...this.binsA, ...this.binsB, 1);
        const xAxisRange = this.xAxisMax - this.xAxisMin;
        const barWidth = plotWidth / this.binCount;
        
        // Draw Group A bars (semi-transparent blue)
        this.ctx.fillStyle = 'rgba(74, 144, 226, 0.6)';
        this.ctx.strokeStyle = '#4A90E2';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.binsA.length; i++) {
            const barHeight = (this.binsA[i] / maxFreq) * plotHeight;
            const binCenter = this.binMin + (i + 0.5) * this.binWidth;
            const x = this.padding.left + ((binCenter - this.xAxisMin) / xAxisRange) * plotWidth - barWidth / 2;
            const y = this.padding.top + plotHeight - barHeight;
            
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
            this.ctx.strokeRect(x, y, barWidth - 1, barHeight);
        }
        
        // Draw Group B bars (semi-transparent orange)
        this.ctx.fillStyle = 'rgba(229, 114, 0, 0.6)';
        this.ctx.strokeStyle = '#E57200';
        
        for (let i = 0; i < this.binsB.length; i++) {
            const barHeight = (this.binsB[i] / maxFreq) * plotHeight;
            const binCenter = this.binMin + (i + 0.5) * this.binWidth;
            const x = this.padding.left + ((binCenter - this.xAxisMin) / xAxisRange) * plotWidth - barWidth / 2;
            const y = this.padding.top + plotHeight - barHeight;
            
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
            this.ctx.strokeRect(x, y, barWidth - 1, barHeight);
        }
    }
    
    drawNormalCurves(plotWidth, plotHeight) {
        const maxFreq = Math.max(...this.binsA, ...this.binsB, 1);
        const points = 200;
        const xAxisRange = this.xAxisMax - this.xAxisMin;
        const step = xAxisRange / points;
        
        // Draw Group A normal curve (blue, dashed)
        this.ctx.strokeStyle = '#4A90E2';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        
        let firstPoint = true;
        for (let i = 0; i <= points; i++) {
            const x = this.binMin + i * step;
            const y = this.normalPDF(x, this.curveMeanA, this.curveSDA);
            
            const scaledY = (y / this.normalPDF(this.curveMeanA, this.curveMeanA, this.curveSDA)) * maxFreq;
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
        
        // Draw Group B normal curve (orange, dashed)
        this.ctx.strokeStyle = '#E57200';
        this.ctx.beginPath();
        
        firstPoint = true;
        for (let i = 0; i <= points; i++) {
            const x = this.binMin + i * step;
            const y = this.normalPDF(x, this.curveMeanB, this.curveSDB);
            
            const scaledY = (y / this.normalPDF(this.curveMeanB, this.curveMeanB, this.curveSDB)) * maxFreq;
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
        
        // Reset line dash
        this.ctx.setLineDash([]);
    }
    
    normalPDF(x, mean, sd) {
        const variance = sd * sd;
        const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
        const exponent = -Math.pow(x - mean, 2) / (2 * variance);
        return coefficient * Math.exp(exponent);
    }
    
    formatPValue(pValue) {
        if (pValue < 0.001) {
            return '< 0.001';
        }
        return pValue.toFixed(3);
    }
    
    drawPValues(width, height, plotWidth, plotHeight) {
        // Position p-values on the right side, further right and slightly higher
        const textX = this.padding.left + plotWidth - 100; // Move further right
        let textY = this.padding.top + 15; // Start slightly higher
        
        // Draw Mann-Whitney U p-value (always shown when available)
        if (this.mannWhitneyPValue !== null) {
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Mann-Whitney U:', textX, textY);
            
            textY += 18;
            this.ctx.font = '13px sans-serif';
            const pText = `p = ${this.formatPValue(this.mannWhitneyPValue)}`;
            this.ctx.fillText(pText, textX, textY);
            
            // Add significance indicator
            if (this.mannWhitneyPValue < 0.05) {
                this.ctx.fillStyle = '#d32f2f';
                this.ctx.fillText('*', textX + this.ctx.measureText(pText).width + 5, textY);
            }
            this.ctx.fillStyle = '#333';
        }
        
        // Draw t-test p-value (only shown when normal curves are displayed)
        if (this.showCurves && this.tTestPValue !== null) {
            textY += 30;
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('t-test:', textX, textY);
            
            textY += 18;
            this.ctx.font = '13px sans-serif';
            const pText = `p = ${this.formatPValue(this.tTestPValue)}`;
            this.ctx.fillText(pText, textX, textY);
            
            // Add significance indicator
            if (this.tTestPValue < 0.05) {
                this.ctx.fillStyle = '#d32f2f';
                this.ctx.fillText('*', textX + this.ctx.measureText(pText).width + 5, textY);
            }
            this.ctx.fillStyle = '#333';
        }
    }
}
