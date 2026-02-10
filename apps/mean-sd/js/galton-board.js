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
        this.ballsInBins = new Array(11).fill(null).map(() => []); // Array of arrays to store balls in each bin
        this.animationId = null;
        this.speed = 50; // Speed setting (0-100, default 50)
        // Initialize speeds - will be set by updateSpeedSettings()
        this.ballSpeed = 8;
        this.horizontalSpeed = 6; // Speed for horizontal movement
        this.ballInterval = 250; // ms between ball drops (will be updated by updateSpeedSettings)
        this.pegRadius = 4;
        this.ballRadius = 5;
        this.binWidth = 0;
        this.binHeight = 0;
        this.showCurve = false;
        this.curveMean = 0;
        this.curveSD = 0;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize speed settings
        this.updateSpeedSettings();
        
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
        const speedSlider = document.getElementById('speed');
        const speedValue = document.getElementById('speed-value');
        const dropBallsBtn = document.getElementById('drop-balls-btn');
        const resetBtn = document.getElementById('reset-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (numBallsSlider && numBallsValue) {
            numBallsSlider.addEventListener('input', (e) => {
                this.numBalls = parseInt(e.target.value);
                numBallsValue.textContent = this.numBalls;
            });
        }
        
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                this.speed = parseInt(e.target.value);
                // Update speed display
                if (this.speed < 25) {
                    speedValue.textContent = 'Slow';
                } else if (this.speed < 75) {
                    speedValue.textContent = 'Medium';
                } else {
                    speedValue.textContent = 'Fast';
                }
                // Update ball speed for active balls
                this.updateSpeedSettings();
            });
        }
        
        if (dropBallsBtn) {
            dropBallsBtn.addEventListener('click', () => {
                // Only start if not already running and no balls are active
                if (!this.animationId && this.balls.length === 0) {
                    this.startSimulation();
                }
            });
        }
        
        const addCurveBtn = document.getElementById('add-curve-btn');
        if (addCurveBtn) {
            addCurveBtn.addEventListener('click', () => {
                this.toggleNormalCurve();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                window.location.href = 'normal-distribution.html';
            });
        }
    }
    
    updateSpeedSettings() {
        // Calculate ball speed based on speed setting (0-100)
        // Slow (0): 2, Medium (50): 8 (original), Fast (100): 20
        // Use piecewise linear: from 0-50 and 50-100
        let ballSpeed;
        if (this.speed <= 50) {
            // Linear from 2 to 8 as speed goes from 0 to 50
            ballSpeed = 2 + (this.speed / 50) * 6;
        } else {
            // Linear from 8 to 20 as speed goes from 50 to 100
            ballSpeed = 8 + ((this.speed - 50) / 50) * 12;
        }
        this.ballSpeed = ballSpeed;
        
        // Scale horizontal speed proportionally
        // Slow (0): 1.5, Medium (50): 6 (original), Fast (100): 15
        let horizontalSpeed;
        if (this.speed <= 50) {
            // Linear from 1.5 to 6 as speed goes from 0 to 50
            horizontalSpeed = 1.5 + (this.speed / 50) * 4.5;
        } else {
            // Linear from 6 to 15 as speed goes from 50 to 100
            horizontalSpeed = 6 + ((this.speed - 50) / 50) * 9;
        }
        this.horizontalSpeed = horizontalSpeed;
        
        // Calculate ball drop interval based on speed setting
        // Slow (0): 500ms (10 balls in 5 seconds), Fast (100): 20ms (250 balls in 5 seconds)
        this.ballInterval = 500 - (this.speed / 100) * 480;
    }
    
    reset() {
        this.bins = new Array(11).fill(0);
        this.balls = [];
        this.ballsInBins = new Array(11).fill(null).map(() => []);
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
        
        // Update speed settings based on current slider value
        this.updateSpeedSettings();
        
        let ballsToDrop = this.numBalls;
        let lastBallTime = 0;
        
        const animate = (currentTime) => {
            // Drop new ball if needed - use this.ballInterval so it updates dynamically
            if (ballsToDrop > 0 && currentTime - lastBallTime >= this.ballInterval) {
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
                
                // Calculate position for ball in bin - arrange in horizontal rows
                const ballsInThisBin = this.ballsInBins[binIndex].length;
                
                // Calculate how many balls fit in a row (based on bin width and ball diameter)
                const ballDiameter = this.ballRadius * 2;
                const horizontalSpacing = ballDiameter * 0.9; // Slight overlap for visual effect
                const ballsPerRow = Math.floor((this.binWidth - 4) / horizontalSpacing); // -4 for padding
                const ballsPerRowActual = Math.max(1, ballsPerRow); // At least 1 ball per row
                
                // Determine which row this ball should be in (0-indexed from bottom)
                const rowIndex = Math.floor(ballsInThisBin / ballsPerRowActual);
                
                // Determine position within the row (0-indexed from left)
                const positionInRow = ballsInThisBin % ballsPerRowActual;
                
                // Calculate x position within the bin (centered in bin, accounting for row width)
                const rowWidth = (ballsPerRowActual - 1) * horizontalSpacing;
                const rowStartX = this.sideMargin + binIndex * this.binWidth + (this.binWidth - rowWidth) / 2;
                const binX = rowStartX + positionInRow * horizontalSpacing;
                
                // Calculate y position for this row (starting from bottom, moving up)
                const verticalSpacing = ballDiameter * 0.9; // Slight overlap for visual effect
                const binY = this.binTop + this.binHeight - (rowIndex * verticalSpacing) - this.ballRadius;
                
                // Store ball position in bin
                ball.binIndex = binIndex;
                ball.binX = binX;
                ball.binY = binY;
                ball.active = false;
                
                // Add to ballsInBins array
                this.ballsInBins[binIndex].push(ball);
            }
        });
        
        // Remove inactive balls from active array (they're now in ballsInBins)
        this.balls = this.balls.filter(ball => ball.active);
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw pegs
        this.drawPegs();
        
        // Draw bins (histogram) with 50% transparency - drawn first so balls appear on top
        this.drawBins();
        
        // Draw normal curve if enabled (also behind balls)
        if (this.showCurve) {
            this.drawNormalCurve();
        }
        
        // Draw balls (both active and in bins) - drawn last so they appear on top
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
        
        // Set global alpha to 50% transparency for histogram
        this.ctx.globalAlpha = 0.5;
        
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
        
        // Reset global alpha to 1.0 for other elements
        this.ctx.globalAlpha = 1.0;
        
        // Draw bin numbers (below the bin) - these should be fully opaque
        for (let i = 0; i < 11; i++) {
            const x = this.sideMargin + i * this.binWidth;
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.bins[i].toString(),
                x + this.binWidth / 2,
                this.binTop + this.binHeight + 15
            );
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
        
        // Set global alpha to 50% transparency for curve (same as histogram)
        this.ctx.globalAlpha = 0.5;
        
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
        
        // Reset global alpha to 1.0 for other elements
        this.ctx.globalAlpha = 1.0;
    }
    
    drawBalls() {
        // Draw active balls (falling through the board)
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
        
        // Draw balls collected in bins
        this.ctx.fillStyle = '#E57200';
        for (let binIndex = 0; binIndex < this.ballsInBins.length; binIndex++) {
            this.ballsInBins[binIndex].forEach(ball => {
                // Draw ball at its stored position in the bin
                this.ctx.beginPath();
                this.ctx.arc(ball.binX, ball.binY, this.ballRadius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add a highlight
                this.ctx.fillStyle = '#FFA500';
                this.ctx.beginPath();
                this.ctx.arc(ball.binX - 2, ball.binY - 2, 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#E57200';
            });
        }
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
