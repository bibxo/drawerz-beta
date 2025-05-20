export class StrokeManager {
    constructor() {
        this.strokes = [];
        this.currentStroke = [];
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.smoothingFactor = 0.65;
        this.velocityFilterWeight = 0.7;
        this.lastVelocity = 0;
        this.lastPoint = null;
        this.saveToHistory();
    }

    addPoint(point) {
        const newPoint = {
            x: point.x,
            y: point.y,
            timestamp: Date.now()
        };


        if (!this.lastPoint) {
            this.lastPoint = newPoint;
            this.currentStroke.push(newPoint);
            return;
        }

        const timeDelta = newPoint.timestamp - this.lastPoint.timestamp;
        const dist = this.distance(this.lastPoint, newPoint);
        const velocity = timeDelta ? dist / timeDelta : 0;

        const filteredVelocity = this.velocityFilterWeight * velocity +
            (1 - this.velocityFilterWeight) * this.lastVelocity;

        const smoothedPoint = {
            x: this.lastPoint.x + (newPoint.x - this.lastPoint.x) * this.smoothingFactor,
            y: this.lastPoint.y + (newPoint.y - this.lastPoint.y) * this.smoothingFactor,
            timestamp: newPoint.timestamp
        };

        const minDistance = 2;
        if (this.distance(this.lastPoint, smoothedPoint) > minDistance) {
            this.currentStroke.push(smoothedPoint);
            this.lastPoint = smoothedPoint;
            this.lastVelocity = filteredVelocity;
        }
    }

    getCurrentStroke() {
        return this.currentStroke;
    }

    finishStroke(color, size, isEraser = false) {
        if (this.currentStroke.length > 0) {
            if (isEraser) {
                this.strokes = this.strokes.filter(stroke => {
                    return !this.strokesIntersect(stroke.points, this.currentStroke);
                });
            } else {

                const optimizedPoints = this.optimizePoints(this.currentStroke);
                this.strokes.push({
                    points: optimizedPoints,
                    phase: Math.random() * 1000,
                    color: color,
                    size: size
                });
            }
            this.saveToHistory();
        }
        this.currentStroke = [];
        this.lastPoint = null;
        this.lastVelocity = 0;
    }

    strokesIntersect(stroke1, stroke2) {
        const threshold = 10;
        for (let pt1 of stroke1) {
            for (let pt2 of stroke2) {
                if (this.distance(pt1, pt2) < threshold) {
                    return true;
                }
            }
        }
        return false;
    }

    distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    getStrokes() {
        return this.strokes;
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.strokes = JSON.parse(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.strokes = JSON.parse(this.history[this.historyIndex]);
            return true;
        }
        return false;
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    saveToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.stringify(this.strokes));
        this.historyIndex++;

        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    setStrokes(strokes) {
        this.strokes = strokes;
        this.history = [];
        this.historyIndex = -1;
        this.saveToHistory();
    }

    optimizePoints(points) {
        if (points.length <= 2) return points;

        const threshold = 1;
        const result = [points[0]];
        
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            const angle = Math.abs(this.getAngle(prev, curr, next));
            const d1 = this.distance(prev, curr);
            const d2 = this.distance(curr, next);

            if (angle > 0.1 || d1 > threshold || d2 > threshold) {
                result.push(curr);
            }
        }
        
        result.push(points[points.length - 1]);
        return result;
    }

    getAngle(p1, p2, p3) {
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;
        return Math.atan2(dx1 * dy2 - dy1 * dx2, dx1 * dx2 + dy1 * dy2);
    }
}