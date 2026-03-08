// Renders 2x2 confusion matrix with TP, FP, TN, FN counts

class ConfusionMatrixRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.counts = { TP: 0, FP: 0, TN: 0, FN: 0 };
        this.padding = 60;
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth - 20, 400);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.ctx.scale(dpr, dpr);
        this.size = size;
        this.draw();
    }

    setCounts(counts) {
        this.counts = { ...counts };
        this.draw();
    }

    draw() {
        const { ctx, size, counts, padding } = this;
        const inner = size - 2 * padding;
        const half = inner / 2;
        ctx.clearRect(0, 0, size, size);

        const cell = (col, row, label, count, fill) => {
            const px = padding + col * half;
            const py = padding + row * half;
            ctx.fillStyle = fill;
            ctx.fillRect(px + 2, py + 2, half - 4, half - 4);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 2, py + 2, half - 4, half - 4);
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, px + half / 2, py + half / 2 - 14);
            ctx.font = '18px sans-serif';
            ctx.fillText(String(count), px + half / 2, py + half / 2 + 8);
        };

        // Rows = actual (0 = negative, 1 = positive), Cols = predicted (0 = neg, 1 = pos)
        // (col=0, row=0) = TN, (col=1, row=0) = FP, (col=0, row=1) = FN, (col=1, row=1) = TP
        cell(0, 0, 'True Negative', counts.TN, 'rgba(76, 175, 80, 0.4)');
        cell(1, 0, 'False Positive', counts.FP, 'rgba(244, 67, 54, 0.4)');
        cell(0, 1, 'False Negative', counts.FN, 'rgba(244, 67, 54, 0.4)');
        cell(1, 1, 'True Positive', counts.TP, 'rgba(76, 175, 80, 0.4)');

        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Predicted Negative', padding + half / 2, padding - 8);
        ctx.fillText('Predicted Positive', padding + half + half / 2, padding - 8);
        ctx.save();
        ctx.translate(padding - 25, padding + half);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Actual Negative', 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(padding - 25, padding + half + half);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Actual Positive', 0, 0);
        ctx.restore();
    }
}
