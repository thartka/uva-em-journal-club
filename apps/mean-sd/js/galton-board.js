// Galton Board (Dalton Board) simulation with animated ball drops

class GaltonBoard {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.pegRows = 10; // Fixed at 10 rows
        this.numBalls = 100;
        this.maxPegsPerRow = 11; // Maximum pegs per row (for layout calculations)
        this.bins = new Array(11).fill(0);
        this.balls = [];
        this.animationId = null;
        this.ballSpeed = 8;
        this.horizontalSpeed = 6; // Speed for horizontal movement
        this.pegRadius = 4;
        this.ballRadius = 5;
        this.binWidth = 0;
        this.binHeight = 0;
        this.showCurve = false;
        this.curveMean = 0;
        this.curveSD = 0;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupControls();
    }
    
    // Get number of pegs for a given row (alternates between 11 and 10)
    getPegsPerRow(row) {
        return row % 2 === 0 ? 11 : 10;
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20;
        const aspectRatio = 1.2; // height/width ratio for vertical board
        const containerHeight = containerWidth * aspectRatio;
        
        // Set display size
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
        
        // Set actual canvas size for high DPI
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.width = containerWidth;
        this.height = containerHeight;
        
        this.calculateLayout();
        this.draw();
    }
    
    calculateLayout() {
        // Calculate spacing
        this.topMargin = 40;
        this.sideMargin = 20;
        this.binLabelHeight = 20; // Space for bin labels below bins
        this.pegBinGap = 30; // Gap between pegs and bins
        
        // Calculate available space for pegs and bins (excluding margins and labels)
        const availableHeight = this.height - this.topMargin - this.pegBinGap - this.binLabelHeight;
        
        // Maintain 2/3 pegs, 1/3 bins ratio
        this.boardHeight = availableHeight * (2/3); // Pegs area gets 2/3
        this.binHeight = availableHeight * (1/3); // Bins area gets 1/3
        
        this.boardWidth = this.width - 2 * this.sideMargin;
        
        // Calculate peg positions
        // Use max pegs per row (11) for spacing calculations to ensure proper alignment
        this.pegSpacing = this.boardHeight / (this.pegRows + 1);
        this.horizontalSpacing = this.boardWidth / this.maxPegsPerRow;
        this.pegOffset = this.horizontalSpacing / 2; // Offset for staggered rows
        
        // Calculate bin positions (11 bins) - positioned below pegs with gap
        this.binWidth = this.boardWidth / 11;
        // Last peg row is at: topMargin + pegRows * pegSpacing
        const lastPegY = this.topMargin + this.pegRows * this.pegSpacing;
        this.binTop = lastPegY + this.pegBinGap; // Start bins below last peg row with gap
        
        // Starting position for balls
        this.startX = this.width / 2;
        this.startY = this.topMargin;
    }
    
    setupControls() {
        const numBallsSlider = document.getElementById('num-balls');
        const numBallsValue = document.getElementById('num-balls-value');
        const dropBallsBtn = document.getElementById('drop-balls-btn');
        const resetBtn = document.getElementById('reset-btn');
        const nextBtn = document.getElementById('next-btn');
        
        numBallsSlider.addEventListener('input', (e) => {
            this.numBalls = parseInt(e.target.value);
            numBallsValue.textContent = this.numBalls;
        });
        
        dropBallsBtn.addEventListener('click', () => {
            // Only start if not already running and no balls are active
            if (!this.animationId && this.balls.length === 0) {
                this.startSimulation();
            }
        });
        
        const addCurveBtn = document.getElementById('add-curve-btn');
        addCurveBtn.addEventListener('click', () => {
            this.toggleNormalCurve();
        });
        
        resetBtn.addEventListener('click', () => this.reset());
        nextBtn.addEventListener('click', () => {
            window.location.href = 'normal-distribution.html';
        });
    }
    
    reset() {
        this.bins = new Array(11).fill(0);
        this.balls = [];
        this.showCurve = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.draw();
    }
    
    calculateMean() {
        const totalBalls = this.bins.reduce((a, b) => a + b, 0);
        if (totalBalls === 0) return 0;
        
        let sum = 0;
        for (let i = 0; i < this.bins.length; i++) {
            sum += i * this.bins[i];
        }
        return sum / totalBalls;
    }
    
    calculateSD() {
        const totalBalls = this.bins.reduce((a, b) => a + b, 0);
        if (totalBalls === 0) return 0;
        
        const mean = this.calculateMean();
        let sumSquaredDiffs = 0;
        for (let i = 0; i < this.bins.length; i++) {
            const diff = i - mean;
            sumSquaredDiffs += diff * diff * this.bins[i];
        }
        return Math.sqrt(sumSquaredDiffs / totalBalls);
    }
    
    toggleNormalCurve() {
        const totalBalls = this.bins.reduce((a, b) => a + b, 0);
        if (totalBalls === 0) {
            // No data yet, can't show curve
            return;
        }
        
        if (this.showCurve) {
            this.showCurve = false;
        } else {
            this.curveMean = this.calculateMean();
            this.curveSD = this.calculateSD();
            this.showCurve = true;
        }
        this.draw();
    }
    
    normalPDF(x, mean, sd) {
        if (sd === 0) return 0;
        const variance = sd * sd;
        const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
        const exponent = -Math.pow(x - mean, 2) / (2 * variance);
        return coefficient * Math.exp(exponent);
    }
    
    startSimulation() {
        if (this.animationId) return; // Already running
        
        let ballsToDrop = this.numBalls;
        let ballInterval = 40; // ms between ball drops (4x faster: 200/4 = 50)
        let lastBallTime = 0;
        
        const animate = (currentTime) => {
            // Drop new ball if needed
            if (ballsToDrop > 0 && currentTime - lastBallTime >= ballInterval) {
                this.dropBall();
                ballsToDrop--;
                lastBallTime = currentTime;
            }
            
            // Update and draw
            this.updateBalls();
            this.draw();
            
            // Continue animation if there are balls moving or more to drop
            if (this.balls.length > 0 || ballsToDrop > 0) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.animationId = null;
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    dropBall() {
        // Start at center of first row (which has 11 pegs)
        // Center of 11 pegs is at position 5 (0-indexed, so 5th peg out of 11)
        const startColumn = 5; // Middle of 11 pegs (0-10)
        const startX = this.sideMargin + (startColumn * this.horizontalSpacing) + (this.horizontalSpacing / 2);
        
        const ball = {
            x: startX,
            y: this.startY,
            targetX: startX, // Target x position for smooth movement
            row: 0,
            column: startColumn, // Start in middle column
            active: true
        };
        this.balls.push(ball);
    }
    
    updateBalls() {
        this.balls.forEach(ball => {
            if (!ball.active) return;
            
            // Move ball down continuously
            ball.y += this.ballSpeed;
            
            // Check if ball has passed a peg row
            const expectedY = this.topMargin + (ball.row + 1) * this.pegSpacing;
            if (ball.y >= expectedY) {
                // Randomly go left or right when hitting a peg
                const direction = Math.random() < 0.5 ? -0.5 : 0.5;
                ball.column += direction;
                ball.row++;
            }
            
            // Calculate target x position based on current column and row
            // This ensures smooth movement as the ball progresses
            const pegsInRow = this.getPegsPerRow(ball.row);
            const isOddRow = ball.row % 2 === 1;
            
            // Clamp column to valid range for this row
            const maxColumn = pegsInRow - 1;
            ball.column = Math.max(0, Math.min(maxColumn, ball.column));
            
            let targetX;
            if (isOddRow) {
                // Odd rows (10 pegs): pegs at integer positions, offset by half spacing
                targetX = this.sideMargin + (ball.column * this.horizontalSpacing) + this.pegOffset;
            } else {
                // Even rows (11 pegs): pegs at half-integer positions
                targetX = this.sideMargin + (ball.column * this.horizontalSpacing) + (this.horizontalSpacing / 2);
            }
            ball.targetX = targetX;
            
            // Smoothly move ball horizontally toward target position
            const dx = ball.targetX - ball.x;
            if (Math.abs(dx) > 0.1) {
                // Move toward target with smooth interpolation
                const moveX = Math.sign(dx) * Math.min(Math.abs(dx), this.horizontalSpeed);
                ball.x += moveX;
            } else {
                // Snap to target when very close for precision
                ball.x = ball.targetX;
            }
            
            // Check if ball has reached the bins
            if (ball.y >= this.binTop) {
                // Determine which bin the ball lands in
                const relativeX = ball.x - this.sideMargin;
                let binIndex = Math.floor(relativeX / this.binWidth);
                
                // Clamp to valid bin range (0-10)
                binIndex = Math.max(0, Math.min(10, binIndex));
                
                this.bins[binIndex]++;
                ball.active = false;
            }
        });
        
        // Remove inactive balls
        this.balls = this.balls.filter(ball => ball.active);
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw pegs
        this.drawPegs();
        
        // Draw bins
        this.drawBins();
        
        // Draw normal curve if enabled
        if (this.showCurve) {
            this.drawNormalCurve();
        }
        
        // Draw balls
        this.drawBalls();
        
        // Draw title
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Galton Board', this.width / 2, 25);
    }
    
    drawPegs() {
        this.ctx.fillStyle = '#666';
        
        for (let row = 0; row < this.pegRows; row++) {
            const y = this.topMargin + (row + 1) * this.pegSpacing;
            const isOddRow = row % 2 === 1;
            const pegsInRow = this.getPegsPerRow(row);
            
            // Draw alternating 11 and 10 pegs per row
            for (let peg = 0; peg < pegsInRow; peg++) {
                // Base x position for this peg
                let x = this.sideMargin + (peg * this.horizontalSpacing) + (this.horizontalSpacing / 2);
                
                // Offset odd rows (10 pegs) by half spacing to create staggered pattern
                if (isOddRow) {
                    x += this.pegOffset;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.pegRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawBins() {
        const maxBalls = Math.max(...this.bins, 1);
        
        for (let i = 0; i < 11; i++) {
            const x = this.sideMargin + i * this.binWidth;
            const barHeight = (this.bins[i] / maxBalls) * this.binHeight;
            
            // Draw bin bar (growing upward from binTop)
            const barY = this.binTop + this.binHeight - barHeight;
            this.ctx.fillStyle = '#4A90E2';
            this.ctx.fillRect(x, barY, this.binWidth - 2, barHeight);
            
            // Draw bin border
            this.ctx.strokeStyle = '#2E5C8A';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, barY, this.binWidth - 2, barHeight);
            
            // Draw bin number (below the bin)
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.bins[i].toString(),
                x + this.binWidth / 2,
                this.binTop + this.binHeight + 15
            );
        }
        
        // Draw bin separator lines
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 11; i++) {
            const x = this.sideMargin + i * this.binWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.binTop);
            this.ctx.lineTo(x, this.binTop + this.binHeight);
            this.ctx.stroke();
        }
    }
    
    drawNormalCurve() {
        const totalBalls = this.bins.reduce((a, b) => a + b, 0);
        if (totalBalls === 0 || this.curveSD === 0) return;
        
        const maxBalls = Math.max(...this.bins, 1);
        const points = 200;
        
        // Calculate the range to draw the curve over (extend beyond bins)
        const minX = -1;
        const maxX = 11;
        const step = (maxX - minX) / points;
        
        // Calculate scaling factor to match histogram
        // The area under the curve should match the total number of balls
        // Approximate: sum of PDF values * binWidth should equal totalBalls
        // So scale factor = totalBalls / (sum of PDF * binWidth)
        let pdfSum = 0;
        for (let i = 0; i <= points; i++) {
            const x = minX + i * step;
            pdfSum += this.normalPDF(x, this.curveMean, this.curveSD);
        }
        const scaleFactor = totalBalls / (pdfSum * step);
        
        this.ctx.strokeStyle = '#E57200';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        let firstPoint = true;
        for (let i = 0; i <= points; i++) {
            const x = minX + i * step;
            const pdfValue = this.normalPDF(x, this.curveMean, this.curveSD);
            
            // Scale PDF to match histogram (convert to count, then to height)
            const scaledCount = pdfValue * scaleFactor;
            const barHeight = (scaledCount / maxBalls) * this.binHeight;
            
            // Convert x (bin index) to canvas x coordinate
            // Bin centers are at: sideMargin + (binIndex + 0.5) * binWidth
            const canvasX = this.sideMargin + (x + 0.5) * this.binWidth;
            const canvasY = this.binTop + this.binHeight - barHeight;
            
            if (firstPoint) {
                this.ctx.moveTo(canvasX, canvasY);
                firstPoint = false;
            } else {
                this.ctx.lineTo(canvasX, canvasY);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawBalls() {
        this.ctx.fillStyle = '#E57200';
        this.balls.forEach(ball => {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add a highlight
            this.ctx.fillStyle = '#FFA500';
            this.ctx.beginPath();
            this.ctx.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#E57200';
        });
    }
}

// Initialize when page loads
let galtonBoard;
window.addEventListener('DOMContentLoaded', () => {
    galtonBoard = new GaltonBoard('galton-canvas');
    
    // Also allow manual start by clicking canvas (optional)
    document.getElementById('galton-canvas').addEventListener('click', () => {
        if (!galtonBoard.animationId && galtonBoard.balls.length === 0) {
            galtonBoard.startSimulation();
        }
    });
});
