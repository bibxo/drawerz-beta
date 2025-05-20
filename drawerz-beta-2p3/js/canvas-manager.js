export class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.querySelector('.canvas-container');
        this.setupCanvas();
        this.setupCursor();
    }



    
    setupCanvas() {
        const resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        resizeObserver.observe(this.canvasContainer);
        this.resizeCanvas();
    }

    resizeCanvas() {
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const scale = Math.min(
            containerRect.width / this.canvas.width,
            containerRect.height / this.canvas.height
        );
        
        this.canvas.style.width = `${this.canvas.width * scale}px`;
        this.canvas.style.height = `${this.canvas.height * scale}px`;
    }

    getCanvasPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    clear() {
        const style = getComputedStyle(document.documentElement);
        this.ctx.fillStyle = style.getPropertyValue('--canvas-bg');
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }

    setupCursor() {
        this.canvas.addEventListener('pointermove', this.updateCursor.bind(this));
        this.canvas.addEventListener('pointerout', () => this.canvas.style.cursor = 'default');
    }

    updateCursor(e) {
        const size = window.app?.state?.strokeSize || 3;
        const cursorSize = Math.max(size, 8); 
        
        const cursor = `
            <svg width="${cursorSize * 2}" height="${cursorSize * 2}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${cursorSize}" cy="${cursorSize}" r="${size / 2}" 
                    fill="none" 
                    stroke="black" 
                    stroke-width="1"
                />
                <circle cx="${cursorSize}" cy="${cursorSize}" r="${size / 2}" 
                    fill="none" 
                    stroke="white" 
                    stroke-width="1"
                    stroke-dasharray="2,2"
                />
            </svg>
        `;

        const url = `data:image/svg+xml;base64,${btoa(cursor)}`;
        this.canvas.style.cursor = `url('${url}') ${cursorSize} ${cursorSize}, crosshair`;
    }
}