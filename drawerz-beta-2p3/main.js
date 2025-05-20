import { CanvasManager } from './js/canvas-manager.js';
import { ColorPicker } from './js/color-picker.js';
import { StrokeManager } from './js/stroke-manager.js';
import { FileHandler } from './js/file-handler.js';
import { AnimationManager } from './js/animation-manager.js';

class DrawerzApp {
    constructor() {
        this.initializeState();
        this.initializeComponents();
        this.setupEventListeners();
        this.loadTheme();
        this.startAnimation();
    }

    initializeState() {
        this.state = {
            drawing: false,
            isEraser: false,
            currentColor: '#000000',
            strokeSize: 3,
            penPressureEnabled: false,
            effects: {
                intensity: 0,
                speed: 0,
                thickness: 0,
                float: 0,
                sketchy: 0
            }
        };
    }

    initializeComponents() {
        this.canvasManager = new CanvasManager('draw-canvas');
        this.colorPicker = new ColorPicker();
        this.strokeManager = new StrokeManager();
        this.animationManager = new AnimationManager(
            this.canvasManager.canvas, 
            this.canvasManager.ctx
        );

        this.ui = {
            strokeSize: document.getElementById('stroke-size'),
            penPressureToggle: document.getElementById('pen-pressure-toggle'),
            intensitySlider: document.getElementById('jiggle-intensity'),
            speedSlider: document.getElementById('jiggle-speed'),
            thicknessSlider: document.getElementById('thickness-intensity'),
            floatSlider: document.getElementById('float-intensity'),
            sketchySlider: document.getElementById('sketchy-intensity'),
            undoButton: document.getElementById('undo-button'),
            redoButton: document.getElementById('redo-button'),
            modeToggle: document.getElementById('mode-toggle'),
            saveButton: document.getElementById('save-button'),
            loadButton: document.getElementById('load-button'),
            exportButton: document.getElementById('export-button'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),
            exportDialog: document.getElementById('export-dialog'),
            exportQuality: document.getElementById('export-quality'),
            exportCancel: document.getElementById('export-cancel'),
            exportConfirm: document.getElementById('export-confirm'),
            exportProgress: document.getElementById('export-progress'),
            progressText: document.getElementById('progress-percentage'),
            progressFill: document.querySelector('.progress-fill')
        };

        this.updateUndoRedoButtons();
    }

    setupEventListeners() {
        this.canvasManager.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this), true);
        this.canvasManager.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this), true);
        this.canvasManager.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this), true);
        this.canvasManager.canvas.addEventListener('pointerleave', this.handlePointerLeave.bind(this), true);
        this.canvasManager.canvas.addEventListener('pointerenter', this.handlePointerEnter.bind(this), true);
        this.ui.intensitySlider.addEventListener('input', () => this.updateEffect('jiggle-intensity', this.ui.intensitySlider));
        this.ui.speedSlider.addEventListener('input', () => this.updateEffect('jiggle-speed', this.ui.speedSlider));
        this.ui.thicknessSlider.addEventListener('input', () => this.updateEffect('thickness-intensity', this.ui.thicknessSlider));
        this.ui.floatSlider.addEventListener('input', () => this.updateEffect('float-intensity', this.ui.floatSlider));
        this.ui.sketchySlider.addEventListener('input', () => this.updateEffect('sketchy-intensity', this.ui.sketchySlider));
        this.ui.strokeSize.addEventListener('input', this.updateStrokeSize.bind(this));

        // Button events
        this.ui.undoButton.addEventListener('click', this.undo.bind(this));
        this.ui.redoButton.addEventListener('click', this.redo.bind(this));
        this.ui.modeToggle.addEventListener('click', this.toggleMode.bind(this));
        this.ui.saveButton.addEventListener('click', this.saveDrawing.bind(this));
        this.ui.loadButton.addEventListener('click', this.loadDrawing.bind(this));
        this.ui.exportButton.addEventListener('click', this.showExportDialog.bind(this));
        this.ui.darkModeToggle.addEventListener('click', this.toggleDarkMode.bind(this));

        this.ui.exportCancel.addEventListener('click', () => this.ui.exportDialog.classList.remove('active'));
        this.ui.exportConfirm.addEventListener('click', this.exportAnimation.bind(this));

        
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        document.addEventListener('colorchange', (e) => {
            this.state.currentColor = e.detail.color;
        });

        document.addEventListener('pressuresupport', (e) => {
            const hasPressureSupport = e.detail.supported;
            this.ui.penPressureToggle.parentElement.style.display = 
                hasPressureSupport ? 'flex' : 'none';
            if (!hasPressureSupport) {
                this.ui.penPressureToggle.checked = false;
                this.state.penPressureEnabled = false;
            }
        });

        this.ui.penPressureToggle.addEventListener('change', () => {
            this.state.penPressureEnabled = this.ui.penPressureToggle.checked;
        });
    }

    handlePointerDown(e) {
        e.preventDefault();
        this.state.drawing = true;
        const point = this.canvasManager.getCanvasPosition(e);
        const pressure = this.state.penPressureEnabled ? e.pressure : 1;
        this.strokeManager.addPoint({
            ...point,
            pressure: pressure
        });

        this.draw();
    }

    handlePointerMove(e) {
        e.preventDefault();
        if (this.state.drawing) {
            const point = this.canvasManager.getCanvasPosition(e);
            const pressure = this.state.penPressureEnabled ? e.pressure : 1;
            this.strokeManager.addPoint({
                ...point,
                pressure: pressure
            });
            this.draw(); 
        }

        this.canvasManager.updateCursor(e);
    }

    handlePointerUp(e) {
        e.preventDefault();
        if (this.state.drawing) {
            this.state.drawing = false;
            this.strokeManager.finishStroke(
                this.state.currentColor,
                this.state.strokeSize,
                this.state.isEraser
            );
            this.updateUndoRedoButtons();
            this.draw();
        }
    }

    handlePointerLeave(e) {
        this.handlePointerUp(e);
    }

    handlePointerEnter(e) {
 
    }

    handleKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveDrawing();
                    break;
                case 'o':
                    e.preventDefault();
                    this.loadDrawing();
                    break;
            }
        } else {
            switch (e.key.toLowerCase()) {
                case 'p':
                    e.preventDefault();
                    if (this.state.isEraser) this.toggleMode();
                    break;
                case 'e':
                    e.preventDefault();
                    if (!this.state.isEraser) this.toggleMode();
                    break;
            }
        }
    }

    updateEffect(effectName, slider) {
        const effectKey = effectName.replace('jiggle-', '').replace('-intensity', '');
        this.state.effects[effectKey] = parseFloat(slider.value);

        const effectMap = {
            'jiggle-intensity': this.state.effects.intensity,
            'jiggle-speed': this.state.effects.speed,
            'thickness-intensity': this.state.effects.thickness,
            'float-intensity': this.state.effects.float,
            'sketchy-intensity': this.state.effects.sketchy
        };

        this.animationManager.setEffects(effectMap);
    }

    updateStrokeSize() {
        this.state.strokeSize = parseFloat(this.ui.strokeSize.value);
        this.canvasManager.updateCursor();
    }

    toggleMode() {
        this.state.isEraser = !this.state.isEraser;
        const icon = this.ui.modeToggle.querySelector('i');
        
        if (this.state.isEraser) {
            icon.className = 'fas fa-pen';
            this.ui.modeToggle.style.backgroundColor = '#ff0000';
        } else {
            icon.className = 'fas fa-eraser';
            this.ui.modeToggle.style.backgroundColor = '#7b5cff';
        }

        this.canvasManager.updateCursor();
    }

    async saveDrawing() {
        try {

            const drawingState = {
                canvas: {
                    width: this.canvasManager.width,
                    height: this.canvasManager.height
                },
                settings: this.state.effects,
                strokes: this.strokeManager.getStrokes()
            };

            await FileHandler.saveDrawing(drawingState);
        } catch (error) {
            console.error('Error saving drawing:', error);
            alert('Failed to save drawing');
        }
    }


    async loadDrawing() {
        try {
            const drawingData = await FileHandler.loadDrawing();
            if (!drawingData) return;

            if (drawingData.canvas) {
                this.canvasManager.canvas.width = drawingData.canvas.width;
                this.canvasManager.canvas.height = drawingData.canvas.height;
            }

            if (drawingData.settings) {
                Object.assign(this.state.effects, drawingData.settings);

                this.updateEffectSliders();
             
                const effectMap = {
                    'jiggle-intensity': drawingData.settings.intensity,
                    'jiggle-speed': drawingData.settings.speed,
                    'thickness-intensity': drawingData.settings.thickness,
                    'float-intensity': drawingData.settings.float,
                    'sketchy-intensity': drawingData.settings.sketchy
                };
                this.animationManager.setEffects(effectMap);
            }

            this.strokeManager.setStrokes(drawingData.strokes);
            this.draw();
        } catch (error) {
            console.error('Error loading drawing:', error);
            alert('Failed to load drawing');
        }
    }

    updateEffectSliders() {
        this.ui.intensitySlider.value = this.state.effects.intensity;
        this.ui.speedSlider.value = this.state.effects.speed;
        this.ui.thicknessSlider.value = this.state.effects.thickness;
        this.ui.floatSlider.value = this.state.effects.float;
        this.ui.sketchySlider.value = this.state.effects.sketchy;
    }

    showExportDialog() {
        this.ui.exportDialog.classList.add('active');
    }

    async exportAnimation() {
        const quality = this.ui.exportQuality.value;
        this.ui.exportDialog.classList.remove('active');
        this.ui.exportProgress.classList.add('active');
        this.ui.exportButton.disabled = true;

        try {
            this.animationManager.setExportProgressCallback(progress => {
                this.ui.progressText.textContent = progress;
                this.ui.progressFill.style.width = `${progress}%`;
            });

            const blob = await this.animationManager.exportAnimation(quality);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `drawerz-ani-${FileHandler.getFormattedDate()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting animation:', error);
            alert('Failed to export animation');
        } finally {
            this.ui.exportButton.disabled = false;
            this.ui.exportProgress.classList.remove('active');
        }
    }
    undo() {
        if (this.strokeManager.undo()) {
            this.updateUndoRedoButtons();
            this.draw();
        }
    }



    redo() {
        if (this.strokeManager.redo()) {
            this.updateUndoRedoButtons();
            this.draw();
        }
    }

    updateUndoRedoButtons() {
        this.ui.undoButton.disabled = !this.strokeManager.canUndo();
        this.ui.redoButton.disabled = !this.strokeManager.canRedo();
    }

    draw() {
        this.canvasManager.clear();
        this.animationManager.drawStrokes(this.strokeManager.getStrokes());
        if (this.state.drawing) {
            this.drawCurrentStroke();
        }
    }

    drawCurrentStroke() {
        const currentStroke = this.strokeManager.getCurrentStroke();
        if (currentStroke.length === 0) return;

        const ctx = this.canvasManager.ctx;
        ctx.save();
        ctx.strokeStyle = this.state.isEraser ? '#ff0000' : this.state.currentColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        
        for (let i = 1; i < currentStroke.length; i++) {
            const pt = currentStroke[i];
            const pressure = this.state.penPressureEnabled ? pt.pressure : 1;
            ctx.lineWidth = this.state.strokeSize * pressure;
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();

            if (i < currentStroke.length - 1) {
                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
            }
        }

        

        if (currentStroke.length === 1) {
            const pt = currentStroke[0];
            const pressure = this.state.penPressureEnabled ? pt.pressure : 1;
            ctx.beginPath();
            ctx.lineWidth = this.state.strokeSize * pressure;
            ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    toggleDarkMode() {
        const body = document.body;
        const icon = this.ui.darkModeToggle.querySelector('i');
        body.classList.toggle('light-mode');
        
        if (body.classList.contains('light-mode')) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    }

    loadTheme() {
        const savedMode = localStorage.getItem('theme');
        const icon = this.ui.darkModeToggle.querySelector('i');
        
        if (savedMode === 'light') {
            document.body.classList.add('light-mode');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            document.body.classList.remove('light-mode');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            if (!savedMode) {
                localStorage.setItem('theme', 'dark');
            }
        }
    }

    startAnimation() {
        this.animationManager.startAnimation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new DrawerzApp();
});
