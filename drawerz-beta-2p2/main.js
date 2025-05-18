const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
const intensitySlider = document.getElementById('jiggle-intensity');
const speedSlider = document.getElementById('jiggle-speed');
const thicknessSlider = document.getElementById('thickness-intensity');
const colorPickerToggle = document.getElementById('color-picker-toggle');
const colorPickerPanel = document.querySelector('.color-picker-panel');
const colorPreview = document.querySelector('.current-color-preview');
const colorWheel = document.getElementById('color-wheel');
const colorBrightness = document.getElementById('color-brightness');
const redSlider = document.getElementById('red-slider');
const greenSlider = document.getElementById('green-slider');
const blueSlider = document.getElementById('blue-slider');
const redValue = document.getElementById('red-value');
const greenValue = document.getElementById('green-value');
const blueValue = document.getElementById('blue-value');
const hexValue = document.getElementById('hex-value');
const strokeSizeSlider = document.getElementById('stroke-size');
const canvasContainer = document.querySelector('.canvas-container');

let drawing = false;
let currentStroke = [];
let vectorStrokes = [];
let jiggleIntensity = 0;
let jiggleSpeed = 0;
let thicknessIntensity = 0;
let floatIntensity = 0;
let sketchyIntensity = 0;
let isEraser = false;
let currentColor = '#000000';
let currentStrokeSize = parseFloat(strokeSizeSlider.value);

let history = [];
let historyIndex = -1;
const maxHistory = 50;

let pointerPos = { x: null, y: null };
let showPointer = false;

let animationFrameId = null;
let isExporting = false;

let currentHue = 0;
let currentSaturation = 0;
let currentValue = 100;

function saveToHistory() {
  history = history.slice(0, historyIndex + 1);

  history.push(JSON.stringify(vectorStrokes));
  historyIndex++;
  

  if (history.length > maxHistory) {
    history.shift();
    historyIndex--;
  }
  
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  document.getElementById('undo-button').disabled = historyIndex <= 0;
  document.getElementById('redo-button').disabled = historyIndex >= history.length - 1;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    vectorStrokes = JSON.parse(history[historyIndex]);
    updateUndoRedoButtons();
    draw();
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    vectorStrokes = JSON.parse(history[historyIndex]);
    updateUndoRedoButtons();
    draw();
  }
}

saveToHistory();

//drawing logic

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  drawing = true;
  currentStroke = [getCanvasPos(e)];
});

canvas.addEventListener('pointermove', (e) => {
  e.preventDefault();
  if (!drawing) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    pointerPos.x = (e.clientX - rect.left) * scaleX;
    pointerPos.y = (e.clientY - rect.top) * scaleY;
    showPointer = true;
    draw();
  } else {
    const pos = getCanvasPos(e);
    currentStroke.push(pos);
    draw(); // Draw the full state including current stroke
  }
});

canvas.addEventListener('pointerup', (e) => {
  e.preventDefault();
  if (!drawing) return;
  drawing = false;
  if (currentStroke.length > 1) {
    // Always vectorize strokes before saving for consistency
    const vector = vectorizeStroke(currentStroke, true);

    if (isEraser) {
      vectorStrokes = vectorStrokes.filter(stroke => {
        return !strokesIntersect(stroke.points, vector);
      });
    } else {
      vectorStrokes.push({ 
        points: vector, 
        phase: Math.random() * 1000,
        color: currentColor,
        size: currentStrokeSize
      });
    }
    saveToHistory();
  }
  currentStroke = [];
  draw();
});

canvas.addEventListener('pointerleave', (e) => {
  e.preventDefault();
  showPointer = false;
  if (drawing) {
    drawing = false;
    if (currentStroke.length > 1) {
   
      const vector = (jiggleIntensity > 0 || floatIntensity > 0 || thicknessIntensity > 0 || sketchyIntensity > 0) 
        ? vectorizeStroke(currentStroke) 
        : currentStroke;
      vectorStrokes.push({ points: vector, phase: Math.random() * 1000, color: currentColor, size: currentStrokeSize });
    }
    currentStroke = [];
    draw();
  } else {
    draw();
  }
});

canvas.addEventListener('pointerenter', (e) => {
  showPointer = true;
  draw();
});

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function vectorizeStroke(stroke, forceVectorate = false) {
  if (!forceVectorate && jiggleIntensity <= 0 && floatIntensity <= 0 && thicknessIntensity <= 0 && sketchyIntensity <= 0) {
    return [...stroke]; 
  }

  const totalLen = strokeLength(stroke);
  const numPoints = Math.max(30, Math.min(300, Math.floor(totalLen / 5)));
  
  // Return original stroke if it's too short
  if (stroke.length <= 2) return [...stroke];
  
  const segment = totalLen / (numPoints - 1);
  let resampled = [stroke[0]];
  let d = 0, i = 1, prev = stroke[0];
  
  try {
    for (let ptIdx = 1; ptIdx < numPoints - 1; ptIdx++) {
      let target = segment * ptIdx;
      while (i < stroke.length && d + dist(prev, stroke[i]) < target) {
        d += dist(prev, stroke[i]);
        prev = stroke[i];
        i++;
      }
      if (i >= stroke.length) break;
      
      const remain = target - d;
      const dir = {
        x: stroke[i].x - prev.x,
        y: stroke[i].y - prev.y
      };
      const len = dist(prev, stroke[i]);
      if (len === 0) continue; // Skip zero-length segments
      
      const frac = remain / len;
      resampled.push({
        x: prev.x + dir.x * frac,
        y: prev.y + dir.y * frac
      });
    }
    resampled.push(stroke[stroke.length - 1]);
    return resampled;
  } catch (error) {
    console.error('Error in vectorizeStroke:', error);
    return [...stroke]; // Return original stroke if vectorization fails
  }
}

function strokeLength(stroke) {
  let len = 0;
  for (let i = 1; i < stroke.length; i++) {
    len += dist(stroke[i - 1], stroke[i]);
  }
  return len;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function strokesIntersect(stroke1, stroke2) {
  const threshold = 10;
  for (let pt1 of stroke1) {
    for (let pt2 of stroke2) {
      if (dist(pt1, pt2) < threshold) {
        return true;
      }
    }
  }
  return false;
}

// juggle
function getSketchyJitter(t, strokeIdx, ptIdx, intensity) {
  const seed = Math.sin((t * 1000 + strokeIdx * 100 + ptIdx * 13) % 10000);
  const x = (Math.sin(seed * 999 + ptIdx) * 2 - 1) * intensity;
  const y = (Math.cos(seed * 777 + ptIdx) * 2 - 1) * intensity;
  return { x, y };
}

function getRandomOffset(seed, intensity) {
  const x = (Math.sin(seed * 123.456) * 2 - 1) * intensity;
  const y = (Math.cos(seed * 654.321) * 2 - 1) * intensity;
  return { x, y };
}

function getPerturbedPoints(points, seed, amount) {
  return points.map((pt, i) => {
    const px = pt.x + (Math.sin(seed + i * 17.3) * 2 - 1) * amount;
    const py = pt.y + (Math.cos(seed + i * 11.7) * 2 - 1) * amount;
    return { x: px, y: py };
  });
}

function draw() {
  const style = getComputedStyle(document.documentElement);
  ctx.fillStyle = style.getPropertyValue('--canvas-bg');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const t = performance.now() / 1000; 

  for (let s = 0; s < vectorStrokes.length; s++) {
    const stroke = vectorStrokes[s];

    if (stroke.type === 'fill') {
      // Handle fill strokes
      ctx.fillStyle = stroke.color;
      for (const pt of stroke.points) {
        ctx.fillRect(pt.x, pt.y, 1, 1);
      }
      continue;
    }

    if (sketchyIntensity <= 0 && jiggleIntensity <= 0 && floatIntensity <= 0 && thicknessIntensity <= 0) {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const strokeTime = t * jiggleSpeed + stroke.phase;

    if (sketchyIntensity > 0) {
      // Make time progression extremely slow
      const cycleTime = 12; // Even longer cycle
      const baseSpeed = 0.1; // Very slow base speed
      const adjustedSpeed = Math.max(0.02, Math.min(0.5, (jiggleSpeed || 1) * baseSpeed));
      const time = Math.floor((strokeTime * adjustedSpeed)); // Floor to get distinct frames
      const frame = time % cycleTime;
      
      // Generate random offsets based on stroke's phase
      const seed = stroke.phase;
      let offsetX = 0, offsetY = 0;
      
      // Only show displacement in frames 0, 3, 6 (more time in original position)
      if (frame === 0 || frame === 3 || frame === 6) {
        const positionSeed = seed + frame * 1000;
        offsetX = (Math.sin(positionSeed * 123.456) * 2 - 1) * sketchyIntensity * 2;
        offsetY = (Math.cos(positionSeed * 654.321) * 2 - 1) * sketchyIntensity * 2;
      }

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      // Almost no internal variation
      const subtleAmount = sketchyIntensity * 0.005; // Extremely subtle
      for (let i = 0; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        const subtleX = Math.sin(seed + i * 0.1) * subtleAmount;
        const subtleY = Math.cos(seed + i * 0.1) * subtleAmount;
        
        const finalX = pt.x + offsetX + subtleX;
        const finalY = pt.y + offsetY + subtleY;

        if (i === 0) ctx.moveTo(finalX, finalY);
        else ctx.lineTo(finalX, finalY);
      }

      ctx.stroke();
      ctx.restore();
    } else {
      drawStrokeLayer(ctx, stroke, strokeTime, { x: 0, y: 0 }, 1);
    }

    if (thicknessIntensity > 0) {
      drawThicknessStroke(stroke);
    }
  }

  if (drawing && currentStroke.length > 1) {
    ctx.save();
    ctx.strokeStyle = isEraser ? '#ff0000' : currentColor;
    ctx.lineWidth = currentStrokeSize;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < currentStroke.length; i++) {
      const pt = currentStroke[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  if (showPointer && !isEraser && pointerPos.x !== null && pointerPos.y !== null) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pointerPos.x, pointerPos.y, currentStrokeSize / 2, 0, 2 * Math.PI);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawStrokeLayer(ctx, stroke, t, offset, alpha) {
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  ctx.beginPath();

  const seed = Math.floor(t * 10); 
  const sketchFrame = seed % 3;
  const sketchScale = sketchFrame === 2 ? 0.2 : 2;
  
  for (let i = 0; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    
 
    const sketchyX = offset.x * sketchScale;
    const sketchyY = offset.y * sketchScale;

    const angle = t + i * 0.6;
    const r = jiggleIntensity * (0.5 + 0.5 * Math.sin(angle * 1.3 + i));
    const jiggleX = Math.cos(angle) * r;
    const jiggleY = Math.sin(angle) * r;
    
    const floatX = Math.sin(t * 0.2 + i * 0.1) * floatIntensity;
    const floatY = Math.cos(t * 0.15 + i * 0.08) * floatIntensity;

    const finalX = pt.x + jiggleX + floatX + sketchyX;
    const finalY = pt.y + jiggleY + floatY + sketchyY;

    if (i === 0) ctx.moveTo(finalX, finalY);
    else ctx.lineTo(finalX, finalY);
  }

  ctx.stroke();
  ctx.restore();
}

function drawThicknessStroke(stroke, effectiveSpeed = jiggleSpeed, effectiveThickness = thicknessIntensity) {
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  let t = effectiveSpeed > 0 ? performance.now() / (1000 / effectiveSpeed) + stroke.phase : 0;
  const thickness = stroke.size + effectiveThickness * Math.sin(t);
  ctx.lineWidth = thickness;
  ctx.beginPath();
  for (let i = 0; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.restore();
}

intensitySlider.addEventListener('input', () => {
  jiggleIntensity = parseFloat(intensitySlider.value);
});
thicknessSlider.addEventListener('input', () => {
  thicknessIntensity = parseFloat(thicknessSlider.value);
});
document.getElementById('float-intensity').addEventListener('input', (e) => {
  floatIntensity = parseFloat(e.target.value);
});
speedSlider.addEventListener('input', () => {
  jiggleSpeed = parseFloat(speedSlider.value);
});
document.getElementById('sketchy-intensity').addEventListener('input', (e) => {
  sketchyIntensity = parseFloat(e.target.value);
});
strokeSizeSlider.addEventListener('input', () => {
  currentStrokeSize = parseFloat(strokeSizeSlider.value);
});

function animate() {
  if (!isExporting) {

    if (jiggleIntensity > 0 || floatIntensity > 0 || thicknessIntensity > 0 || sketchyIntensity > 0 || drawing || showPointer) {
      draw();
      animationFrameId = requestAnimationFrame(animate);
    } else {

      draw();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  } else {
    animationFrameId = requestAnimationFrame(animate);
  }
}


intensitySlider.addEventListener('input', () => {
  jiggleIntensity = parseFloat(intensitySlider.value);
  if (!animationFrameId) animate();
});

thicknessSlider.addEventListener('input', () => {
  thicknessIntensity = parseFloat(thicknessSlider.value);
  if (!animationFrameId) animate();
});

document.getElementById('float-intensity').addEventListener('input', (e) => {
  floatIntensity = parseFloat(e.target.value);
  if (!animationFrameId) animate();
});

speedSlider.addEventListener('input', () => {
  jiggleSpeed = parseFloat(speedSlider.value);
  if (!animationFrameId) animate();
});

document.getElementById('sketchy-intensity').addEventListener('input', (e) => {
  sketchyIntensity = parseFloat(e.target.value);
  if (!animationFrameId) animate();
});

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});

resizeObserver.observe(canvasContainer);
resizeCanvas();

function resizeCanvas() {
  const containerRect = canvasContainer.getBoundingClientRect();
  const scale = Math.min(
    containerRect.width / canvas.width,
    containerRect.height / canvas.height
  );
  
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}

animate();

const modeToggleButton = document.getElementById('mode-toggle');
const modeToggleIcon = modeToggleButton.querySelector('i');
modeToggleIcon.className = 'fas fa-eraser';  
modeToggleButton.style.backgroundColor = '#7b5cff';

document.getElementById('mode-toggle').addEventListener('click', toggleMode);


document.addEventListener('keydown', (e) => {
  // Handle modifier key shortcuts (Ctrl/Cmd)
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        break;
      case 'y':
        e.preventDefault();
        redo();
        break;
      case 's':
        e.preventDefault();
        saveDrawing();
        break;
      case 'o':
        e.preventDefault();
        loadDrawing();
        break;
    }
  } else {
    // Handle single key shortcuts
    switch (e.key.toLowerCase()) {
      case 'p':
        e.preventDefault();
        if (isEraser) {
          toggleMode();
        }
        break;
      case 'e':
        e.preventDefault();
        if (!isEraser) {
          toggleMode();
        }
        break;
    }
  }
});

function toggleMode() {
  isEraser = !isEraser;
  const button = document.getElementById('mode-toggle');
  const icon = button.querySelector('i');
  if (isEraser) {
    icon.className = 'fas fa-pen';
    button.style.backgroundColor = '#ff0000';
  } else {
    icon.className = 'fas fa-eraser';
    button.style.backgroundColor = '#7b5cff';
  }
}


document.getElementById('undo-button').addEventListener('click', undo);
document.getElementById('redo-button').addEventListener('click', redo);

function updateColorInputs(rgb) {
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    
    redSlider.value = rgb.r;
    greenSlider.value = rgb.g;
    blueSlider.value = rgb.b;
    redValue.value = rgb.r;
    greenValue.value = rgb.g;
    blueValue.value = rgb.b;
    hexValue.value = hex;
    colorPreview.style.backgroundColor = `#${hex}`;
    currentColor = `#${hex}`;
}

// hsv to rgb conversion
function hsvToRgb(h, s, v) {
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

function rgbToHex(r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}


function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function drawColorWheel() {
    const ctx = colorWheel.getContext('2d');
    const width = colorWheel.width;
    const height = colorWheel.height;
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

function drawBrightnessSlider() {
    const ctx = colorBrightness.getContext('2d');
    const width = colorBrightness.width;
    const height = colorBrightness.height;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    
    gradient.addColorStop(0, `hsl(${currentHue}, ${currentSaturation}%, 100%)`);
    gradient.addColorStop(1, 'black');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

colorWheel.addEventListener('pointerdown', handleColorWheelInteraction);
colorWheel.addEventListener('pointermove', (e) => {
    if (e.buttons > 0) handleColorWheelInteraction(e);
});

function handleColorWheelInteraction(e) {
    const rect = colorWheel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = colorWheel.width / 2;
    const centerY = colorWheel.height / 2;
    
    const angle = Math.atan2(y - centerY, x - centerY);
    const distance = Math.hypot(x - centerX, y - centerY);
    const radius = colorWheel.width / 2;
    
    currentHue = ((angle * 180 / Math.PI) + 360) % 360;
    currentSaturation = Math.min(100, (distance / radius) * 100);
    
    const rgb = hsvToRgb(currentHue, currentSaturation, currentValue);
    updateColorInputs(rgb);
    drawBrightnessSlider();
}

colorBrightness.addEventListener('pointerdown', handleBrightnessInteraction);
colorBrightness.addEventListener('pointermove', (e) => {
    if (e.buttons > 0) handleBrightnessInteraction(e);
});

function handleBrightnessInteraction(e) {
    const rect = colorBrightness.getBoundingClientRect();
    const y = e.clientY - rect.top;
    currentValue = 100 - (y / rect.height * 100);
    currentValue = Math.max(0, Math.min(100, currentValue));
    
    const rgb = hsvToRgb(currentHue, currentSaturation, currentValue);
    updateColorInputs(rgb);
}

function handleRgbInput() {
    const r = parseInt(redSlider.value);
    const g = parseInt(greenSlider.value);
    const b = parseInt(blueSlider.value);
    updateColorInputs({r, g, b});
}

redSlider.addEventListener('input', handleRgbInput);
greenSlider.addEventListener('input', handleRgbInput);
blueSlider.addEventListener('input', handleRgbInput);
redValue.addEventListener('input', handleRgbInput);
greenValue.addEventListener('input', handleRgbInput);
blueValue.addEventListener('input', handleRgbInput);

hexValue.addEventListener('input', (e) => {
    let hex = e.target.value;
    if (hex.length === 6) {
        const rgb = hexToRgb(hex);
        if (rgb) {
            updateColorInputs(rgb);
        }
    }
});

colorPickerToggle.addEventListener('click', () => {
    colorPickerPanel.classList.toggle('active');
    if (colorPickerPanel.classList.contains('active')) {
        drawColorWheel();
        drawBrightnessSlider();
    }
});

document.addEventListener('click', (e) => {
    if (!colorPickerPanel.contains(e.target) && !colorPickerToggle.contains(e.target)) {
        colorPickerPanel.classList.remove('active');
    }
});

drawColorWheel();
drawBrightnessSlider();
updateColorInputs({r: 0, g: 0, b: 0});

const exportDialog = document.getElementById('export-dialog');
const exportQuality = document.getElementById('export-quality');
const exportCancel = document.getElementById('export-cancel');
const exportConfirm = document.getElementById('export-confirm');

function showExportDialog() {
  exportDialog.classList.add('active');
}

function hideExportDialog() {
  exportDialog.classList.remove('active');
}

exportCancel.addEventListener('click', hideExportDialog);

exportConfirm.addEventListener('click', () => {
  const quality = exportQuality.value;
  
  const bitrates = {
    high: 2500000,    // 2.5 
    medium: 1500000,  //1.5 
    low: 1000000      // 1 
  };
  
  const bitrate = bitrates[quality];

  exportAnimation(bitrate);
  hideExportDialog();
});

document.getElementById('export-button').addEventListener('click', showExportDialog);

function exportAnimation(bitrate) {
  const button = document.getElementById('export-button');
  const progressContainer = document.getElementById('export-progress');
  const progressText = document.getElementById('progress-percentage');
  const progressFill = document.querySelector('.progress-fill');
  
  progressContainer.classList.add('active');
  button.disabled = true;
  isExporting = true;

  try {
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = canvas.width;
    renderCanvas.height = canvas.height;
    const renderCtx = renderCanvas.getContext('2d');

    const supportedMimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];

    let selectedMimeType = null;
    for (const mime of supportedMimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    if (!selectedMimeType) {
      throw new Error('WebM format is not supported in your browser');
    }

    const fps = 30;
    const duration = 5; 
    const totalFrames = fps * duration;
    
    const stream = renderCanvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: bitrate
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.start();

    mediaRecorder.onstop = () => {
      try {
        const blob = new Blob(chunks, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawerz-ani-${getFormattedDate()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } finally {
        button.disabled = false;
        isExporting = false;
        progressContainer.classList.remove('active');
      }
    };

    let frameCount = 0;

    function renderFrame() {
      if (frameCount >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const progress = Math.round((frameCount / totalFrames) * 100);
      progressText.textContent = progress;
      progressFill.style.width = `${progress}%`;

      renderCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg');
      renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

      const t = (frameCount / fps);


      for (const stroke of vectorStrokes) {
        const strokeTime = t * jiggleSpeed + stroke.phase;
        
        if (sketchyIntensity > 0 || jiggleIntensity > 0 || floatIntensity > 0) {
          renderCtx.save();
          renderCtx.strokeStyle = stroke.color;
          renderCtx.lineWidth = stroke.size;
          renderCtx.lineJoin = 'round';
          renderCtx.lineCap = 'round';
          renderCtx.beginPath();

          for (let i = 0; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
 
            let dx = 0, dy = 0;

            if (sketchyIntensity > 0) {
              const sketchSeed = Math.floor(strokeTime * 10);
              dx += Math.sin(sketchSeed + i * 0.1) * sketchyIntensity * 2;
              dy += Math.cos(sketchSeed * 1.1 + i * 0.1) * sketchyIntensity * 2;
            }

            if (jiggleIntensity > 0) {
              const angle = strokeTime + i * 0.6;
              const r = jiggleIntensity * (0.5 + 0.5 * Math.sin(angle * 1.3 + i));
              dx += Math.cos(angle) * r;
              dy += Math.sin(angle) * r;
            }

            if (floatIntensity > 0) {
              dx += Math.sin(strokeTime * 0.2 + i * 0.1) * floatIntensity;
              dy += Math.cos(strokeTime * 0.15 + i * 0.08) * floatIntensity;
            }

            const finalX = pt.x + dx;
            const finalY = pt.y + dy;

            if (i === 0) renderCtx.moveTo(finalX, finalY);
            else renderCtx.lineTo(finalX, finalY);
          }

          renderCtx.stroke();
          renderCtx.restore();
        } else {

          renderCtx.save();
          renderCtx.strokeStyle = stroke.color;
          renderCtx.lineWidth = stroke.size;
          renderCtx.lineJoin = 'round';
          renderCtx.lineCap = 'round';
          renderCtx.beginPath();
          
          for (let i = 0; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            if (i === 0) renderCtx.moveTo(pt.x, pt.y);
            else renderCtx.lineTo(pt.x, pt.y);
          }
          
          renderCtx.stroke();
          renderCtx.restore();
        }

 
        if (thicknessIntensity > 0) {
          renderCtx.save();
          renderCtx.strokeStyle = stroke.color;
          renderCtx.lineJoin = 'round';
          renderCtx.lineCap = 'round';
          const thickness = stroke.size + thicknessIntensity * Math.sin(strokeTime);
          renderCtx.lineWidth = thickness;
          renderCtx.beginPath();
          
          for (let i = 0; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            if (i === 0) renderCtx.moveTo(pt.x, pt.y);
            else renderCtx.lineTo(pt.x, pt.y);
          }
          
          renderCtx.stroke();
          renderCtx.restore();
        }
      }

      frameCount++;
      requestAnimationFrame(renderFrame);
    }


    renderFrame();

    const cancelButton = document.getElementById('export-cancel');
    const cancelHandler = () => {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      button.disabled = false;
      isExporting = false;
      progressContainer.classList.remove('active');
      hideExportDialog();
      cancelButton.removeEventListener('click', cancelHandler);
    };
    cancelButton.addEventListener('click', cancelHandler);

  } catch (error) {
    console.error('Error in export:', error);
    alert('Error starting export: ' + error.message);
    button.disabled = false;
    isExporting = false;
    progressContainer.classList.remove('active');
  }
}

function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function saveDrawing() {
  const drawingData = {
    version: "1.0",
    canvas: {
      width: canvas.width,
      height: canvas.height
    },
    settings: {
      jiggleIntensity,
      jiggleSpeed,
      thicknessIntensity,
      floatIntensity,
      sketchyIntensity
    },
    strokes: vectorStrokes
  };

  const jsonString = JSON.stringify(drawingData);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drawerz-illustration-${getFormattedDate()}.drz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadDrawing() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.drz';
  
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const drawingData = JSON.parse(event.target.result);
        
        if (!drawingData.version || !drawingData.strokes) {
          throw new Error('Invalid file format');
        }

        if (drawingData.canvas) {
          canvas.width = drawingData.canvas.width;
          canvas.height = drawingData.canvas.height;
        }

        if (drawingData.settings) {
          jiggleIntensity = drawingData.settings.jiggleIntensity;
          jiggleSpeed = drawingData.settings.jiggleSpeed;
          thicknessIntensity = drawingData.settings.thicknessIntensity;
          floatIntensity = drawingData.settings.floatIntensity;
          sketchyIntensity = drawingData.settings.sketchyIntensity || 0;

          intensitySlider.value = jiggleIntensity;
          speedSlider.value = jiggleSpeed;
          thicknessSlider.value = thicknessIntensity;
          document.getElementById('float-intensity').value = floatIntensity;
          document.getElementById('sketchy-intensity').value = sketchyIntensity;
        }

        vectorStrokes = drawingData.strokes;

        history = [];
        historyIndex = -1;
        saveToHistory();

        draw();
      } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file. Make sure this is a valid .drz file.');
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

document.getElementById('save-button').addEventListener('click', saveDrawing);
document.getElementById('load-button').addEventListener('click', loadDrawing);

document.addEventListener('keydown', (e) => {
  // Handle modifier key shortcuts (Ctrl/Cmd)
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        break;
      case 'y':
        e.preventDefault();
        redo();
        break;
      case 's':
        e.preventDefault();
        saveDrawing();
        break;
      case 'o':
        e.preventDefault();
        loadDrawing();
        break;
    }
  } else {
    // Handle single key shortcuts
    switch (e.key.toLowerCase()) {
      case 'p':
        e.preventDefault();
        if (isEraser) {
          toggleMode();
        }
        break;
      case 'e':
        e.preventDefault();
        if (!isEraser) {
          toggleMode();
        }
        break;
    }
  }
});

const darkModeToggle = document.getElementById('dark-mode-toggle');
darkModeToggle.addEventListener('click', () => {
  const body = document.body;
  const icon = darkModeToggle.querySelector('i');
  body.classList.toggle('light-mode');
  
  if (body.classList.contains('light-mode')) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
    localStorage.setItem('theme', 'light');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
    localStorage.setItem('theme', 'dark');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const savedMode = localStorage.getItem('theme');
  if (savedMode === 'light') {
    document.body.classList.add('light-mode');
    const icon = darkModeToggle.querySelector('i');
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  }
});
