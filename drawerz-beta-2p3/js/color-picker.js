export class ColorPicker {
    constructor() {
        this.colorWheel = document.getElementById('color-wheel');
        this.colorBrightness = document.getElementById('color-brightness');
        this.colorPreview = document.querySelector('.current-color-preview');
        this.currentHue = 0;
        this.currentSaturation = 0;
        this.currentValue = 100;
        this.setupColorControls();
        this.setupEventListeners();
        this.setupColorPickerToggle();
        this.drawColorWheel();
        this.drawBrightnessSlider();
    }

    setupColorControls() {
        this.controls = {
            red: {
                slider: document.getElementById('red-slider'),
                value: document.getElementById('red-value')
            },
            green: {
                slider: document.getElementById('green-slider'),
                value: document.getElementById('green-value')
            },
            blue: {
                slider: document.getElementById('blue-slider'),
                value: document.getElementById('blue-value')
            },
            hex: document.getElementById('hex-value')
        };
    }

    setupEventListeners() {
        this.colorWheel.addEventListener('pointerdown', this.handleColorWheelInteraction.bind(this));
        this.colorWheel.addEventListener('pointermove', (e) => {
            if (e.buttons > 0) this.handleColorWheelInteraction(e);
        });

        this.colorBrightness.addEventListener('pointerdown', this.handleBrightnessInteraction.bind(this));
        this.colorBrightness.addEventListener('pointermove', (e) => {
            if (e.buttons > 0) this.handleBrightnessInteraction(e);
        });

        Object.values(this.controls).forEach(control => {
            if (control.slider) {
                control.slider.addEventListener('input', () => this.handleRgbInput());
                control.value.addEventListener('input', () => this.handleRgbInput());
            }
        });

        this.controls.hex.addEventListener('input', this.handleHexInput.bind(this));
    }

    setupColorPickerToggle() {
        const colorPickerToggle = document.getElementById('color-picker-toggle');
        const colorPickerPanel = document.querySelector('.color-picker-panel');

        colorPickerToggle.addEventListener('click', () => {
            colorPickerPanel.classList.toggle('active');
            if (colorPickerPanel.classList.contains('active')) {
                this.drawColorWheel();
                this.drawBrightnessSlider();
            }
        });

   
        document.addEventListener('click', (e) => {
            if (!colorPickerPanel.contains(e.target) && !colorPickerToggle.contains(e.target)) {
                colorPickerPanel.classList.remove('active');
            }
        });
    }

    drawColorWheel() {
        const ctx = this.colorWheel.getContext('2d');
        const width = this.colorWheel.width;
        const height = this.colorWheel.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 2;

        ctx.clearRect(0, 0, width, height);

        for (let angle = 0; angle < 360; angle++) {
            const startAngle = (angle - 2) * Math.PI / 180;
            const endAngle = (angle + 2) * Math.PI / 180;

            for (let sat = 0; sat < radius; sat++) {
                const gradientStyle = `hsl(${angle}, ${(sat / radius) * 100}%, 50%)`;
                ctx.strokeStyle = gradientStyle;
                ctx.beginPath();
                ctx.arc(centerX, centerY, sat, startAngle, endAngle);
                ctx.stroke();
            }
        }
    }

    drawBrightnessSlider() {
        const ctx = this.colorBrightness.getContext('2d');
        const width = this.colorBrightness.width;
        const height = this.colorBrightness.height;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        
        gradient.addColorStop(0, `hsl(${this.currentHue}, ${this.currentSaturation}%, 100%)`);
        gradient.addColorStop(1, 'black');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    handleColorWheelInteraction(event) {
        const rect = this.colorWheel.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const centerX = this.colorWheel.width / 2;
        const centerY = this.colorWheel.height / 2;
        
        const angle = Math.atan2(y - centerY, x - centerX);
        const distance = Math.hypot(x - centerX, y - centerY);
        const radius = this.colorWheel.width / 2;
        
        this.currentHue = ((angle * 180 / Math.PI) + 360) % 360;
        this.currentSaturation = Math.min(100, (distance / radius) * 100);
        
        const rgb = this.hsvToRgb(this.currentHue, this.currentSaturation, this.currentValue);
        this.updateColorInputs(rgb);
        this.drawBrightnessSlider();
    }

    handleBrightnessInteraction(event) {
        const rect = this.colorBrightness.getBoundingClientRect();
        const y = event.clientY - rect.top;
        this.currentValue = 100 - (y / rect.height * 100);
        this.currentValue = Math.max(0, Math.min(100, this.currentValue));
        
        const rgb = this.hsvToRgb(this.currentHue, this.currentSaturation, this.currentValue);
        this.updateColorInputs(rgb);
    }

    handleRgbInput() {
        const r = parseInt(this.controls.red.slider.value);
        const g = parseInt(this.controls.green.slider.value);
        const b = parseInt(this.controls.blue.slider.value);
        this.updateColorInputs({r, g, b});
    }

    handleHexInput(event) {
        let hex = event.target.value;
        if (hex.length === 6) {
            const rgb = this.hexToRgb(hex);
            if (rgb) {
                this.updateColorInputs(rgb);
            }
        }
    }

    updateColorInputs(rgb) {
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        
        this.controls.red.slider.value = rgb.r;
        this.controls.green.slider.value = rgb.g;
        this.controls.blue.slider.value = rgb.b;
        this.controls.red.value.value = rgb.r;
        this.controls.green.value.value = rgb.g;
        this.controls.blue.value.value = rgb.b;
        this.controls.hex.value = hex;
        this.colorPreview.style.backgroundColor = `#${hex}`;
        

        const colorChangeEvent = new CustomEvent('colorchange', {
            detail: { color: `#${hex}` }
        });
        document.dispatchEvent(colorChangeEvent);
        
        return `#${hex}`;
    }



    hsvToRgb(h, s, v) {
        h = h / 360;
        s = s / 100;
        v = v / 100;
        
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    rgbToHex(r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}