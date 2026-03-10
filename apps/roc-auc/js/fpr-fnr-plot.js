// Canvas: left y = Sensitivity, right y = Specificity, x = probability threshold; vertical line at threshold

class FPRFNRPlotRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.curveData = [];
        this.currentThreshold = 0.5;
        this.padding = { top: 25, right: 55, bottom: 45, left: 55 };
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20;
        const aspectRatio = 0.65;
        const containerHeight = containerWidth * aspectRatio;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.draw();
    }

    setCurveData(data) {
        this.curveData = data || [];
        this.draw();
    }

    setThreshold(t) {
        this.currentThreshold = t;
        this.draw();
    }

    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const plotWidth = width - this.padding.left - this.padding.right;
        const plotHeight = height - this.padding.top - this.padding.bottom;

        this.ctx.clearRect(0, 0, width, height);

        const toX = (thresh) => this.padding.left + thresh * plotWidth;
        const toYLeft = (sensitivity) => this.padding.top + plotHeight - sensitivity * plotHeight;
        const toYRight = (specificity) => this.padding.top + plotHeight - specificity * plotHeight;

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.padding.top);
        this.ctx.lineTo(this.padding.left, height - this.padding.bottom);
        this.ctx.moveTo(this.padding.left + plotWidth, this.padding.top);
        this.ctx.lineTo(this.padding.left + plotWidth, height - this.padding.bottom);
        this.ctx.moveTo(this.padding.left, height - this.padding.bottom);
        this.ctx.lineTo(this.padding.left + plotWidth, height - this.padding.bottom);
        this.ctx.stroke();

        if (this.curveData.length >= 2) {
            this.ctx.strokeStyle = '#1565c0';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(toX(this.curveData[0].threshold), toYLeft(this.curveData[0].sensitivity));
            for (let i = 1; i < this.curveData.length; i++) {
                this.ctx.lineTo(toX(this.curveData[i].threshold), toYLeft(this.curveData[i].sensitivity));
            }
            this.ctx.stroke();

            this.ctx.strokeStyle = '#c62828';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(toX(this.curveData[0].threshold), toYRight(this.curveData[0].specificity));
            for (let i = 1; i < this.curveData.length; i++) {
                this.ctx.lineTo(toX(this.curveData[i].threshold), toYRight(this.curveData[i].specificity));
            }
            this.ctx.stroke();
        }

        const vx = this.padding.left + this.currentThreshold * plotWidth;
        if (vx >= this.padding.left && vx <= this.padding.left + plotWidth) {
            this.ctx.strokeStyle = '#E57200';
            this.ctx.setLineDash([6, 4]);
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(vx, this.padding.top);
            this.ctx.lineTo(vx, height - this.padding.bottom);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Probability threshold', this.padding.left + plotWidth / 2, height - 10);

        this.ctx.save();
        this.ctx.translate(18, this.padding.top + plotHeight / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Sensitivity', 0, 0);
        this.ctx.restore();

        this.ctx.save();
        this.ctx.translate(width - 18, this.padding.top + plotHeight / 2);
        this.ctx.rotate(Math.PI / 2);
        this.ctx.fillText('Specificity', 0, 0);
        this.ctx.restore();

        [0, 0.5, 1].forEach((v) => {
            const y = toYLeft(v);
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left - 5, y);
            this.ctx.lineTo(this.padding.left, y);
            this.ctx.stroke();
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(v.toFixed(1), this.padding.left - 8, y + 3);
        });
        [0, 0.5, 1].forEach((v) => {
            const x = toX(v);
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - this.padding.bottom);
            this.ctx.lineTo(x, height - this.padding.bottom + 5);
            this.ctx.stroke();
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(v.toFixed(1), x, height - this.padding.bottom + 18);
        });
        [0, 0.5, 1].forEach((v) => {
            const y = toYRight(v);
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left + plotWidth, y);
            this.ctx.lineTo(this.padding.left + plotWidth + 5, y);
            this.ctx.stroke();
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(v.toFixed(1), this.padding.left + plotWidth + 8, y + 3);
        });

        this.ctx.fillStyle = '#1565c0';
        this.ctx.fillRect(this.padding.left + plotWidth / 2 - 80, this.padding.top - 18, 12, 3);
        this.ctx.fillStyle = '#333';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Sensitivity', this.padding.left + plotWidth / 2 - 64, this.padding.top - 12);
        this.ctx.fillStyle = '#c62828';
        this.ctx.fillRect(this.padding.left + plotWidth / 2 - 10, this.padding.top - 18, 12, 3);
        this.ctx.fillStyle = '#333';
        this.ctx.fillText('Specificity', this.padding.left + plotWidth / 2 + 6, this.padding.top - 12);
    }
}
