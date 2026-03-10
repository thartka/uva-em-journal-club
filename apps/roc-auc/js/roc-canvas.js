// Reusable ROC curve canvas: curve, optional red points, optional fill, optional AUC label

class ROCCanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    this.points = [];
    this.comparisonPoints = [];
    this.highlightPoints = [];
    this.currentPoint = null;
    this.comparisonCurrentPoint = null;
    this.youdenPoint = null;
        this.fillArea = false;
        this.aucValue = null;
    this.comparisonAlpha = 1;
    this.highlightStyle = 'dot-red';
    this.customArrows = [];
        this.padding = { top: 20, right: 20, bottom: 45, left: 50 };
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20;
        const aspectRatio = 0.85;
        const containerHeight = containerWidth * aspectRatio;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = containerHeight + 'px';
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.draw();
    }

    setPoints(points) {
        this.points = points;
        this.draw();
    }

  setComparisonPoints(points) {
    this.comparisonPoints = points || [];
    this.draw();
  }

  setCustomArrows(arrows) {
    this.customArrows = Array.isArray(arrows) ? arrows : [];
    this.draw();
  }

  setHighlightStyle(style) {
    this.highlightStyle = style || 'dot-red';
    this.draw();
  }

    setHighlightPoints(points) {
        this.highlightPoints = points || [];
        this.draw();
    }

    setCurrentPoint(point) {
        this.currentPoint = point;
        this.draw();
    }

  setComparisonCurrentPoint(point) {
    this.comparisonCurrentPoint = point;
    this.draw();
  }

    setFillArea(fill) {
        this.fillArea = !!fill;
        this.draw();
    }

    setAUC(value) {
        this.aucValue = value;
        this.draw();
    }

    setYoudenPoint(point) {
        this.youdenPoint = point || null;
        this.draw();
    }

  setComparisonAlpha(alpha) {
    this.comparisonAlpha = Math.max(0, Math.min(1, alpha));
    this.draw();
  }

    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const plotWidth = width - this.padding.left - this.padding.right;
        const plotHeight = height - this.padding.top - this.padding.bottom;

        this.ctx.clearRect(0, 0, width, height);

        const toX = (fpr) => this.padding.left + fpr * plotWidth;
        const toY = (tpr) => this.padding.top + plotHeight - tpr * plotHeight;

        // Fill under curve first (so it's behind)
        if (this.fillArea && this.points.length >= 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(toX(0), toY(0));
            for (const p of this.points) {
                this.ctx.lineTo(toX(p.fpr), toY(p.tpr));
            }
            this.ctx.lineTo(toX(1), toY(0));
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(229, 114, 0, 0.25)';
            this.ctx.fill();
        }

        // Diagonal reference line
        this.ctx.strokeStyle = '#999';
        this.ctx.setLineDash([4, 4]);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(toX(0), toY(0));
        this.ctx.lineTo(toX(1), toY(1));
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Comparison ROC curve (better model), if provided
        if (this.comparisonPoints && this.comparisonPoints.length >= 2 && this.comparisonAlpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.comparisonAlpha;
            this.ctx.strokeStyle = '#1565c0';
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(toX(this.comparisonPoints[0].fpr), toY(this.comparisonPoints[0].tpr));
            for (let i = 1; i < this.comparisonPoints.length; i++) {
                this.ctx.lineTo(toX(this.comparisonPoints[i].fpr), toY(this.comparisonPoints[i].tpr));
            }
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Primary ROC curve (current model)
        if (this.points.length >= 2) {
            this.ctx.strokeStyle = '#E57200';
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(toX(this.points[0].fpr), toY(this.points[0].tpr));
            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(toX(this.points[i].fpr), toY(this.points[i].tpr));
            }
            this.ctx.stroke();
        }

        // Highlight points on primary curve
        const dotRadius = 6;
        if (this.highlightStyle === 'x-black') {
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            const arm = dotRadius + 2;
            for (const p of this.highlightPoints) {
                const x = toX(p.fpr);
                const y = toY(p.tpr);
                this.ctx.beginPath();
                this.ctx.moveTo(x - arm, y - arm);
                this.ctx.lineTo(x + arm, y + arm);
                this.ctx.moveTo(x - arm, y + arm);
                this.ctx.lineTo(x + arm, y - arm);
                this.ctx.stroke();
            }
        } else {
            this.ctx.fillStyle = '#c62828';
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            for (const p of this.highlightPoints) {
                const x = toX(p.fpr);
                const y = toY(p.tpr);
                this.ctx.beginPath();
                this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }

        // Single current point (threshold slider) on primary curve
        if (this.currentPoint) {
            const x = toX(this.currentPoint.fpr);
            const y = toY(this.currentPoint.tpr);
            this.ctx.fillStyle = '#c62828';
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, dotRadius + 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Current point on comparison curve (blue)
        if (this.comparisonCurrentPoint && this.comparisonAlpha > 0) {
            const x = toX(this.comparisonCurrentPoint.fpr);
            const y = toY(this.comparisonCurrentPoint.tpr);
            this.ctx.fillStyle = '#1565c0';
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, dotRadius + 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Arrow from Youden point toward ideal top-left (0,1)
        if (this.youdenPoint) {
            const startX = toX(this.youdenPoint.fpr);
            const startY = toY(this.youdenPoint.tpr);
            const endX = toX(0);
            const endY = toY(1);

            this.ctx.strokeStyle = '#1565c0';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();

            // Arrowhead at the (0,1) corner end
            const angle = Math.atan2(endY - startY, endX - startX);
            const arrowLength = 12;
            const angleOffset = Math.PI / 7;

            const leftX = endX - arrowLength * Math.cos(angle - angleOffset);
            const leftY = endY - arrowLength * Math.sin(angle - angleOffset);
            const rightX = endX - arrowLength * Math.cos(angle + angleOffset);
            const rightY = endY - arrowLength * Math.sin(angle + angleOffset);

            this.ctx.beginPath();
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(leftX, leftY);
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(rightX, rightY);
            this.ctx.stroke();
        }

        // Custom labeled arrows for specific pages
        if (this.customArrows && this.customArrows.length > 0) {
            this.customArrows.forEach((arrow) => {
                if (!arrow || !arrow.start || !arrow.end) return;
                const startX = toX(arrow.start.fpr);
                const startY = toY(arrow.start.tpr);
                const endX = toX(arrow.end.fpr);
                const endY = toY(arrow.end.tpr);

                const color = arrow.color || '#000';
                const label = arrow.label || '';

                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();

                // Arrowhead at the end
                const angle = Math.atan2(endY - startY, endX - startX);
                const arrowLength = 12;
                const angleOffset = Math.PI / 7;
                const leftX = endX - arrowLength * Math.cos(angle - angleOffset);
                const leftY = endY - arrowLength * Math.sin(angle - angleOffset);
                const rightX = endX - arrowLength * Math.cos(angle + angleOffset);
                const rightY = endY - arrowLength * Math.sin(angle + angleOffset);

                this.ctx.beginPath();
                this.ctx.moveTo(endX, endY);
                this.ctx.lineTo(leftX, leftY);
                this.ctx.moveTo(endX, endY);
                this.ctx.lineTo(rightX, rightY);
                this.ctx.stroke();

                if (label) {
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;
                    const labelOffsetX = arrow.labelOffset && typeof arrow.labelOffset.x === 'number'
                        ? arrow.labelOffset.x
                        : 0;
                    const labelOffsetY = arrow.labelOffset && typeof arrow.labelOffset.y === 'number'
                        ? arrow.labelOffset.y
                        : -10;

                    this.ctx.save();
                    this.ctx.translate(midX + labelOffsetX, midY + labelOffsetY);
                    // Rotate text so it is parallel to the arrow direction
                    let textAngle = angle;
                    if (arrow.flipLabel) {
                        textAngle += Math.PI; // 180 degrees
                    }
                    this.ctx.rotate(textAngle);
                    this.ctx.fillStyle = color;
                    this.ctx.font = 'bold 14px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(label, 0, 0);
                    this.ctx.restore();
                }
            });
        }

        // Axes
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.padding.top);
        this.ctx.lineTo(this.padding.left, height - this.padding.bottom);
        this.ctx.lineTo(this.padding.left + plotWidth, height - this.padding.bottom);
        this.ctx.stroke();

        // Axis labels
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('False Positive Rate (1 - Specificity)', this.padding.left + plotWidth / 2, height - 10);
        this.ctx.save();
        this.ctx.translate(18, this.padding.top + plotHeight / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('True Positive Rate (Sensitivity)', 0, 0);
        this.ctx.restore();

        // Y-axis ticks 0, 0.5, 1
        [0, 0.5, 1].forEach((v) => {
            const y = toY(v);
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

        // AUC text on plot if set (positioned in lower-right quadrant, larger)
        if (this.aucValue != null && this.fillArea) {
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 28px sans-serif';
            this.ctx.textAlign = 'center';
            const labelX = this.padding.left + plotWidth * 0.65;
            const labelY = this.padding.top + plotHeight * 0.8;
            this.ctx.fillText('AUC = ' + this.aucValue.toFixed(3), labelX, labelY);
        }
    }
}
