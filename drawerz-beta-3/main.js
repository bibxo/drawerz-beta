 const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        const penToolBtn = document.getElementById('penTool');
        const eraserToolBtn = document.getElementById('eraserTool');
        const strokeSizeSlider = document.getElementById('strokeSize');
        const strokeSizeValue = document.getElementById('strokeSizeValue');
        const strokeColorPicker = document.getElementById('strokeColor');
        const clearActiveLayerBtn = document.getElementById('clearActiveLayerBtn');
        const clearAllLayersBtn = document.getElementById('clearAllLayersBtn');

        const animationSliders = {
            wiggleIntensity: { slider: document.getElementById('wiggleIntensity'), valueEl: document.getElementById('wiggleIntensityValue'), suffix: '' },
            breathingStroke: { slider: document.getElementById('breathingStroke'), valueEl: document.getElementById('breathingStrokeValue'), suffix: '' },
            shakeIntensity: { slider: document.getElementById('shakeIntensity'), valueEl: document.getElementById('shakeIntensityValue'), suffix: '' },
            animationSpeed: { slider: document.getElementById('animationSpeed'), valueEl: document.getElementById('animationSpeedValue'), suffix: 'x' }
        };

        const saveBtn = document.getElementById('saveBtn');
        const loadInput = document.getElementById('loadInput');
        const exportWebMBtn = document.getElementById('exportWebMBtn');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        const messageModal = document.getElementById('messageModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalCloseBtn = document.getElementById('modalCloseBtn');

        const layersListContainer = document.getElementById('layersList');
        const addLayerBtn = document.getElementById('addLayerBtn');
        const selectedLayerOpacityControl = document.getElementById('selectedLayerOpacityControl');
        const layerOpacitySlider = document.getElementById('layerOpacity');
        const layerOpacityValue = document.getElementById('layerOpacityValue');
        
        const controlPanel = document.getElementById('controlPanel');
        const controlPanelToggle = document.getElementById('controlPanelToggle');

        let isDrawing = false;
        let currentTool = 'pen';
        let currentStrokeSize = 10;
        let currentStrokeColor = '#000000';
        
        let layers = [];
        let activeLayerId = null;

        let lastX, lastY;
        let animationFrameId;
        let time = 0;
        let undoStack = [];
        let redoStack = [];

        function generateLayerId() { return Date.now() + Math.random().toString(36).substr(2, 9); }
        function getActiveLayer() { return layers.find(layer => layer.id === activeLayerId); }

        function setActiveToolButton(activeBtn) {
            [penToolBtn, eraserToolBtn].forEach(btn => btn.classList.remove('active-tool'));
            if (activeBtn) activeBtn.classList.add('active-tool');
            updateCanvasCursor(); 
        }
        
        function updateCanvasCursor() {
            const size = Math.max(2, currentStrokeSize); 
            let cursorSVG;
            if (currentTool === 'pen') {
             
                cursorSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="rgba(0,0,0,0.5)"/></svg>`;
            } else if (currentTool === 'eraser') {
             
                const outlineWidth = Math.max(1, Math.min(2, size / 10)); 
                cursorSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - outlineWidth/2}" fill="rgba(255,255,255,0.5)" stroke="rgba(0,0,0,0.7)" stroke-width="${outlineWidth}"/></svg>`;
            } else {
                canvas.style.cursor = 'default';
                return;
            }
            canvas.style.cursor = `url('data:image/svg+xml;utf8,${encodeURIComponent(cursorSVG)}') ${size/2} ${size/2}, auto`;
        }


        function saveStateForUndo() {
            undoStack.push(JSON.parse(JSON.stringify(layers))); 
            if (undoStack.length > 30) undoStack.shift();
            redoStack = []; 
            updateUndoRedoButtons();
        }
        
        function updateUndoRedoButtons() {
            undoBtn.disabled = undoStack.length === 0;
            redoBtn.disabled = redoStack.length === 0;
            undoBtn.classList.toggle('btn-disabled', undoBtn.disabled);
            redoBtn.classList.toggle('btn-disabled', redoBtn.disabled);
        }

        function showModal(title, message, customButtons = null, isCustom = false) {
            modalTitle.textContent = title;
            modalMessage.innerHTML = message;
            const buttonContainer = messageModal.querySelector('.modal-button-container');
            buttonContainer.innerHTML = ''; 
            if (isCustom && customButtons && customButtons.length > 0) {
                customButtons.forEach(btnConfig => {
                    const button = document.createElement('button');
                    button.textContent = btnConfig.text;
                    button.className = `btn modal-button ${btnConfig.class || 'btn-primary'}`;
                    button.onclick = btnConfig.action;
                    buttonContainer.appendChild(button);
                });
            } else {
                const closeButton = document.createElement('button');
                closeButton.id = 'modalCloseBtn'; 
                closeButton.className = 'btn modal-button btn-primary';
                closeButton.textContent = 'Close';
                closeButton.onclick = () => closeModal(messageModal);
                buttonContainer.appendChild(closeButton);
            }
            messageModal.classList.remove('hidden');
        }

        function closeModal(modalElement) { modalElement.classList.add('hidden'); }
        modalCloseBtn.addEventListener('click', () => closeModal(messageModal));
        messageModal.addEventListener('click', (event) => { if (event.target === messageModal) closeModal(messageModal); });

        function resizeCanvas() {
            const canvasContainer = canvas.parentElement;
            const style = getComputedStyle(canvasContainer);
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            const containerWidth = canvasContainer.clientWidth - paddingX;
            const containerHeight = canvasContainer.clientHeight - paddingY;
            canvas.width = Math.max(10, containerWidth); 
            canvas.height = Math.max(10, containerHeight);
            drawScene(); 
        }
        window.addEventListener('resize', resizeCanvas);
        
        controlPanelToggle.addEventListener('click', () => {
            controlPanel.classList.toggle('open');

            controlPanelToggle.innerHTML = controlPanel.classList.contains('open') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });


        function createNewLayer(nameSuffix = layers.length + 1, strokes = [], customAnimationSettings = null, isVisible = true, opacity = 1, isActive = false) {
            const defaultAnimSettings = {};
            for (const key in animationSliders) {
                defaultAnimSettings[key] = parseFloat(animationSliders[key].slider.defaultValue || animationSliders[key].slider.value);
            }
        
            return {
                id: generateLayerId(), name: `Layer ${nameSuffix}`, strokes: strokes,
                animationSettings: customAnimationSettings || defaultAnimSettings,
                isVisible: isVisible, opacity: opacity, isActive: isActive 
            };
        }

        function addLayer() {
            saveStateForUndo();
            const newLayer = createNewLayer(layers.length + 1);
            const activeLayerIndex = layers.findIndex(l => l.id === activeLayerId);
            if (activeLayerIndex !== -1 && activeLayerIndex < layers.length -1) layers.splice(activeLayerIndex + 1, 0, newLayer);
            else layers.push(newLayer); 
            setActiveLayer(newLayer.id); 
            renderLayersList();
            updateAnimationSlidersForActiveLayer();
        }

        function setActiveLayer(layerId) {
            const previouslyActiveLayer = getActiveLayer();
            if (previouslyActiveLayer) previouslyActiveLayer.isActive = false;
            activeLayerId = layerId;
            const currentActiveLayer = getActiveLayer();
            if (currentActiveLayer) {
                currentActiveLayer.isActive = true;
                layerOpacitySlider.value = currentActiveLayer.opacity * 100;
                layerOpacityValue.textContent = Math.round(currentActiveLayer.opacity * 100);
                selectedLayerOpacityControl.classList.remove('hidden');
            } else selectedLayerOpacityControl.classList.add('hidden');
            renderLayersList(); 
            updateAnimationSlidersForActiveLayer();
        }
        
        layerOpacitySlider.addEventListener('input', (e) => {
            const activeLayer = getActiveLayer();
            if (activeLayer) {
                activeLayer.opacity = parseFloat(e.target.value) / 100;
                layerOpacityValue.textContent = e.target.value;
                drawScene(); 
            }
        });

        function renderLayersList() {
            layersListContainer.innerHTML = ''; 
            if (layers.length === 0) {
                layersListContainer.innerHTML = '<p class="text-gray-500 text-sm p-2 text-center">No layers yet.</p>';
                selectedLayerOpacityControl.classList.add('hidden'); return;
            }
            [...layers].reverse().forEach((layer, R_index) => { 
                const index = layers.length - 1 - R_index; 
                const item = document.createElement('div');
                item.className = `layer-item ${layer.id === activeLayerId ? 'active-layer' : ''}`;
                item.dataset.layerId = layer.id;
                const visibilityBtn = document.createElement('button');
                visibilityBtn.className = 'btn btn-sm';
                visibilityBtn.innerHTML = `<i class="fas ${layer.isVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
                visibilityBtn.title = layer.isVisible ? "Hide" : "Show";
                visibilityBtn.onclick = (e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); };
                const nameSpan = document.createElement('span');
                nameSpan.className = 'layer-name'; nameSpan.textContent = layer.name; nameSpan.title = "Rename";
                nameSpan.ondblclick = (e) => { e.stopPropagation(); makeLayerNameEditable(layer.id, nameSpan); };
                const controlsDiv = document.createElement('div'); controlsDiv.className = 'layer-controls';
                const upBtn = document.createElement('button'); upBtn.className = 'btn btn-sm'; upBtn.innerHTML = '<i class="fas fa-arrow-up"></i>'; upBtn.title = "Up";
                upBtn.disabled = index === layers.length - 1; upBtn.onclick = (e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); };
                if(upBtn.disabled) upBtn.classList.add('btn-disabled');
                const downBtn = document.createElement('button'); downBtn.className = 'btn btn-sm'; downBtn.innerHTML = '<i class="fas fa-arrow-down"></i>'; downBtn.title = "Down";
                downBtn.disabled = index === 0; downBtn.onclick = (e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); };
                if(downBtn.disabled) downBtn.classList.add('btn-disabled');
                const deleteBtn = document.createElement('button'); deleteBtn.className = 'btn btn-sm btn-danger'; deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.title = "Delete";
                deleteBtn.onclick = (e) => { e.stopPropagation(); deleteLayer(layer.id); };
                controlsDiv.append(upBtn, downBtn, deleteBtn); item.append(visibilityBtn, nameSpan, controlsDiv);
                item.onclick = () => setActiveLayer(layer.id); layersListContainer.appendChild(item);
            });
            const activeLayer = getActiveLayer();
            if (activeLayer) {
                selectedLayerOpacityControl.classList.remove('hidden');
                layerOpacitySlider.value = activeLayer.opacity * 100;
                layerOpacityValue.textContent = Math.round(activeLayer.opacity * 100);
            } else selectedLayerOpacityControl.classList.add('hidden');
        }
        
        function makeLayerNameEditable(layerId, nameSpan) {
            const layer = layers.find(l => l.id === layerId); if (!layer) return;
            const input = document.createElement('input'); input.type = 'text'; input.className = 'layer-name-input'; input.value = layer.name;
            nameSpan.replaceWith(input); input.focus(); input.select();
            const saveName = () => {
                saveStateForUndo(); layer.name = input.value.trim() || `Layer ${layers.findIndex(l => l.id === layerId) + 1}`;
                input.replaceWith(nameSpan); nameSpan.textContent = layer.name; 
            };
            input.onblur = saveName; input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { input.value = layer.name; input.blur(); }};
        }

        function toggleLayerVisibility(layerId) {
            saveStateForUndo(); const layer = layers.find(l => l.id === layerId);
            if (layer) layer.isVisible = !layer.isVisible; renderLayersList(); drawScene();
        }

        function deleteLayer(layerId) {
            if (layers.length <= 1) { showModal("Action Denied", "Cannot delete the last layer."); return; }
            const layerToDelete = layers.find(l => l.id === layerId); if (!layerToDelete) return;
            showModal("Confirm Deletion", `Delete layer "${layerToDelete.name}"?`, 
            [{ text: "Delete", class: 'btn-danger', action: () => {
                saveStateForUndo(); layers = layers.filter(l => l.id !== layerId);
                if (activeLayerId === layerId) setActiveLayer(layers.length > 0 ? layers[layers.length - 1].id : null);
                renderLayersList(); drawScene(); closeModal(messageModal);
            }},{ text: "Cancel", class: 'btn', action: () => closeModal(messageModal) }], true);
        }

        function moveLayer(layerId, direction) {
            saveStateForUndo(); const index = layers.findIndex(l => l.id === layerId); if (index === -1) return;
            if (direction === 'up' && index < layers.length - 1) [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
            else if (direction === 'down' && index > 0) [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
            renderLayersList(); drawScene();
        }

        function updateAnimationSlidersForActiveLayer() {
            const activeLayer = getActiveLayer();
            if (activeLayer) {
                for (const key in animationSliders) {
                    const setting = activeLayer.animationSettings[key];
                    if (setting !== undefined) {
                        animationSliders[key].slider.value = setting;
                        animationSliders[key].valueEl.textContent = setting + (animationSliders[key].suffix || '');
                    }
                }
            } else {
                 for (const key in animationSliders) {
                    animationSliders[key].slider.value = animationSliders[key].slider.defaultValue || 0;
                    animationSliders[key].valueEl.textContent = (animationSliders[key].slider.defaultValue || 0) + (animationSliders[key].suffix || '');
                 }
            }
        }

        Object.values(animationSliders).forEach(item => {
            item.slider.addEventListener('input', (e) => {
                const activeLayer = getActiveLayer();
                if (activeLayer) {
                    const key = Object.keys(animationSliders).find(k => animationSliders[k].slider === e.target);
                    if (key) {
                        activeLayer.animationSettings[key] = parseFloat(e.target.value);
                        item.valueEl.textContent = e.target.value + (item.suffix || '');
                    }
                }
            });
        });

        function startDrawing(e) {
            const activeLayer = getActiveLayer();
            if (!activeLayer || !activeLayer.isVisible) return; 
            if (e.button !== 0 && e.type === 'mousedown') return; 
            
            saveStateForUndo(); 
            isDrawing = true;
            const { offsetX, offsetY } = getMousePos(e);
            
            activeLayer.strokes.push({
                points: [{ x: offsetX, y: offsetY }],
                color: currentTool === 'pen' ? currentStrokeColor : '#FFFFFF', 
                size: currentStrokeSize, tool: currentTool, originalSize: currentStrokeSize,
                birthTime: time, 
            });
            [lastX, lastY] = [offsetX, offsetY];
        }

        function draw(e) {
            const activeLayer = getActiveLayer();
            if (!isDrawing || !activeLayer || !activeLayer.isVisible) return;

            const { offsetX, offsetY } = getMousePos(e);
            const currentPath = activeLayer.strokes[activeLayer.strokes.length - 1];
            if (!currentPath) { isDrawing = false; return; }
            currentPath.points.push({ x: offsetX, y: offsetY });
  
            ctx.save();
            ctx.globalAlpha = activeLayer.opacity; 
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(offsetX, offsetY);
            ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentPath.color;
            ctx.lineWidth = currentPath.size;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();
            [lastX, lastY] = [offsetX, offsetY];
        }

        function stopDrawing() { if (isDrawing) isDrawing = false; }

        function getMousePos(e) {
            const rect = canvas.getBoundingClientRect();
            if (e.touches && e.touches.length > 0) {
                return { offsetX: e.touches[0].clientX - rect.left, offsetY: e.touches[0].clientY - rect.top };
            }
            return { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
        }

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing); 

        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); stopDrawing(); }, { passive: false });
        canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); stopDrawing(); }, { passive: false });


        penToolBtn.addEventListener('click', () => { currentTool = 'pen'; setActiveToolButton(penToolBtn); });
        eraserToolBtn.addEventListener('click', () => { currentTool = 'eraser'; setActiveToolButton(eraserToolBtn); });

        strokeSizeSlider.addEventListener('input', (e) => { 
            currentStrokeSize = parseInt(e.target.value); 
            strokeSizeValue.textContent = currentStrokeSize; 
            updateCanvasCursor();
        });
        strokeColorPicker.addEventListener('input', (e) => { currentStrokeColor = e.target.value; });
        
        clearActiveLayerBtn.addEventListener('click', () => { 
            const activeLayer = getActiveLayer();
            if (!activeLayer || activeLayer.strokes.length === 0) {
                showModal("Clear Layer", "Active layer is already empty.");
                return;
            }
            showModal("Confirm Clear Layer", `Clear all strokes from layer "${activeLayer.name}"?`,
            [{text: "Clear Layer", class: 'btn-danger', action: () => {
                saveStateForUndo(); 
                activeLayer.strokes = []; 
                drawScene(); closeModal(messageModal);
            }},{text: "Cancel", class: 'btn', action: () => closeModal(messageModal)}], true);
        });
        
        clearAllLayersBtn.addEventListener('click', () => {
            if (layers.every(l => l.strokes.length === 0)) {
                 showModal("Clear All Layers", "All layers are already empty.");
                return;
            }
            showModal("Confirm Clear All", "Clear strokes from ALL layers? This action affects all layers.",
            [{text: "Clear All", class: 'btn-danger', action: () => {
                saveStateForUndo(); 
                layers.forEach(layer => layer.strokes = []); 
                drawScene(); closeModal(messageModal);
            }},{text: "Cancel", class: 'btn', action: () => closeModal(messageModal)}], true);
        });


        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        undoBtn.addEventListener('click', () => {
            if (undoStack.length > 0) {
                redoStack.push(JSON.parse(JSON.stringify(layers))); 
                layers = undoStack.pop(); 
                const currentActiveStillExists = layers.find(l => l.id === activeLayerId);
                if (!currentActiveStillExists && layers.length > 0) activeLayerId = layers[layers.length - 1].id;
                else if (layers.length === 0) activeLayerId = null;
                layers.forEach(l => l.isActive = (l.id === activeLayerId));
                renderLayersList(); updateAnimationSlidersForActiveLayer(); drawScene(); updateUndoRedoButtons();
            }
        });

        redoBtn.addEventListener('click', () => {
            if (redoStack.length > 0) {
                undoStack.push(JSON.parse(JSON.stringify(layers))); 
                layers = redoStack.pop(); 
                const currentActiveStillExists = layers.find(l => l.id === activeLayerId);
                if (!currentActiveStillExists && layers.length > 0) activeLayerId = layers[layers.length - 1].id;
                else if (layers.length === 0) activeLayerId = null;
                layers.forEach(l => l.isActive = (l.id === activeLayerId));
                renderLayersList(); updateAnimationSlidersForActiveLayer(); drawScene(); updateUndoRedoButtons();
            }
        });

        function drawScene(isExporting = false) {
            ctx.fillStyle = '#FFFFFF'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            layers.forEach(layer => {
                if (!layer.isVisible || layer.strokes.length === 0) return;
                ctx.save(); ctx.globalAlpha = layer.opacity; 
                const animSettings = layer.animationSettings;
                const animSpeed = parseFloat(animSettings.animationSpeed);
                const wiggleAmp = parseFloat(animSettings.wiggleIntensity);
                const breathAmount = parseFloat(animSettings.breathingStroke);
                const shakeAmount = parseFloat(animSettings.shakeIntensity);

                layer.strokes.forEach(stroke => {
                    if (!stroke.points || stroke.points.length < 1) return;
                    ctx.save(); 

                    if (shakeAmount > 0 && !isExporting) { 
                        const shakeX = (Math.random() - 0.5) * shakeAmount * animSpeed; 
                        const shakeY = (Math.random() - 0.5) * shakeAmount * animSpeed;
                        ctx.translate(shakeX, shakeY);
                    }
                    let currentDynamicSize = stroke.originalSize;
                    if (breathAmount > 0) {
                        currentDynamicSize = stroke.originalSize + Math.sin(time * 0.1 * animSpeed + stroke.birthTime) * breathAmount;
                        currentDynamicSize = Math.max(1, currentDynamicSize);
                    }
                    ctx.beginPath();
                    if (stroke.points.length === 1) { 
                        const p = stroke.points[0];
                        ctx.arc(p.x, p.y, currentDynamicSize / 2, 0, Math.PI * 2);
                        ctx.fillStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color; ctx.fill();
                    } else { 
                        for (let i = 0; i < stroke.points.length; i++) {
                            let p = { ...stroke.points[i] }; 
                            if (wiggleAmp > 0 && i > 0) {
                                const prevP = stroke.points[i-1]; const dx = p.x - prevP.x; const dy = p.y - prevP.y;
                                const angle = Math.atan2(dy, dx); const normalAngle = angle + Math.PI / 2; 
                                const wiggleOffset = Math.sin(time * 0.1 * animSpeed + i * 0.5 + stroke.birthTime * 0.01) * wiggleAmp;
                                p.x += Math.cos(normalAngle) * wiggleOffset; p.y += Math.sin(normalAngle) * wiggleOffset;
                            }
                            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                        }
             
                        ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
                        ctx.lineWidth = currentDynamicSize;
                        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                    }
                    ctx.restore(); 
                });
                ctx.restore(); 
            });
        }

        function animate() { time += 1; drawScene(); animationFrameId = requestAnimationFrame(animate); }
        
        strokeSizeSlider.addEventListener('input', (e) => { 
            currentStrokeSize = parseInt(e.target.value); 
            strokeSizeValue.textContent = currentStrokeSize; 
            updateCanvasCursor();
        });

        saveBtn.addEventListener('click', () => {
            if (layers.length === 0 || layers.every(l => l.strokes.length === 0)) { showModal("Save Sketch", "Canvas empty."); return; }
            const dataToSave = { layers: layers, activeLayerId: activeLayerId, canvasWidth: canvas.width, canvasHeight: canvas.height };
            const jsonData = JSON.stringify(dataToSave); const blob = new Blob([jsonData], { type: 'application/octet-stream' }); 
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-'); a.download = `drawerz_sketch_${timestamp}.drz`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            showModal("Save Sketch", "Sketch saved as .drz file!");
        });

        loadInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            loadingIndicator.classList.remove('hidden'); const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.layers && Array.isArray(data.layers)) {
                        saveStateForUndo(); 
                        layers = data.layers.map(loadedLayer => {
                            const defaultAnim = {};
                            for (const key in animationSliders) defaultAnim[key] = parseFloat(animationSliders[key].slider.defaultValue || 0);
                  
                            return {
                                id: loadedLayer.id || generateLayerId(), name: loadedLayer.name || 'Loaded Layer',
                                strokes: loadedLayer.strokes || [],
                                animationSettings: { ...defaultAnim, ...(loadedLayer.animationSettings || {}) }, 
                                isVisible: loadedLayer.isVisible !== undefined ? loadedLayer.isVisible : true,
                                opacity: loadedLayer.opacity !== undefined ? loadedLayer.opacity : 1, isActive: false
                            };
                        });
                        if (data.activeLayerId && layers.find(l => l.id === data.activeLayerId)) activeLayerId = data.activeLayerId;
                        else if (layers.length > 0) activeLayerId = layers[layers.length - 1].id;
                        else activeLayerId = null;
                        layers.forEach(l => l.isActive = (l.id === activeLayerId));
                        renderLayersList(); updateAnimationSlidersForActiveLayer(); resizeCanvas(); 
                        showModal("Load Sketch", "Sketch loaded!");
                    } else showModal("Load Error", "Invalid .drz file. Missing 'layers' data.");
                } catch (error) { console.error("Load error:", error); showModal("Load Error", "Could not load sketch. " + error.message);
                } finally { loadingIndicator.classList.add('hidden'); loadInput.value = ''; }
            };
            reader.onerror = () => { showModal("Load Error", "Error reading file."); loadingIndicator.classList.add('hidden'); loadInput.value = ''; };
            reader.readAsText(file);
        });
        
        exportWebMBtn.addEventListener('click', async () => {
            if (layers.every(l => !l.isVisible || l.strokes.length === 0)) { showModal("Export Error", "No visible content."); return; }
            if (!canvas.captureStream) { showModal("Export Error", "Browser doesn't support canvas.captureStream()."); return; }
            loadingIndicator.classList.remove('hidden'); 
            const frameRate = 30; const durationSeconds = 15; const totalFrames = frameRate * durationSeconds;
            const originalAnimationTime = time; 
            const exportAnimSpeed = parseFloat(animationSliders.animationSpeed.slider.value); // Use global speed for export consistency
            if (animationFrameId) cancelAnimationFrame(animationFrameId); 
            let recordedChunks = []; let preferredMimeType = 'video/mp4; codecs="avc1.42E01E"'; 
            let actualMimeType = preferredMimeType; let fileExtension = 'mp4';
            if (!MediaRecorder.isTypeSupported(preferredMimeType)) {
                actualMimeType = 'video/webm; codecs=vp9'; fileExtension = 'webm';
                if (!MediaRecorder.isTypeSupported(actualMimeType)) actualMimeType = 'video/webm; codecs=vp8';
                if (!MediaRecorder.isTypeSupported(actualMimeType)) {
                    showModal("Export Error", "No supported WebM codec (VP9/VP8)."); loadingIndicator.classList.add('hidden'); animate(); return;
                }
            }
            const stream = canvas.captureStream(frameRate);
            const mediaRecorder = new MediaRecorder(stream, { mimeType: actualMimeType, videoBitsPerSecond: 3000000 });
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: actualMimeType }); const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-'); a.download = `drawerz_animation_${timestamp}.${fileExtension}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                loadingIndicator.classList.add('hidden'); let msg = `Exported as ${fileExtension.toUpperCase()}.`;
                if (fileExtension !== 'mp4') msg += "<br><br>Browser recorded in WebM (MP4 not fully supported).";
                showModal("Export Complete", msg); time = originalAnimationTime; animate(); 
            };
            mediaRecorder.onerror = (event) => { console.error("MediaRecorder error:", event.error); showModal("Export Error", "Recording error: " + event.error.name); loadingIndicator.classList.add('hidden'); time = originalAnimationTime; animate(); };
            mediaRecorder.start(); let currentFrame = 0;
            function recordNextFrame() {
                if (currentFrame >= totalFrames) { if (mediaRecorder.state === "recording") mediaRecorder.stop(); return; }
                time += (1 / frameRate) * exportAnimSpeed * 30; drawScene(true); currentFrame++; requestAnimationFrame(recordNextFrame); 
            } recordNextFrame(); 
        });

        function initializeApp() {
            loadingIndicator.classList.add('hidden'); messageModal.classList.add('hidden');
            setActiveToolButton(penToolBtn); 
            strokeSizeValue.textContent = strokeSizeSlider.value;
            if (layers.length === 0) { const initialLayer = createNewLayer(1); layers.push(initialLayer); setActiveLayer(initialLayer.id); }
            else setActiveLayer(layers.find(l => l.isActive)?.id || layers[0]?.id);
            renderLayersList(); updateAnimationSlidersForActiveLayer(); updateUndoRedoButtons(); 
            resizeCanvas(); animate(); 
            updateCanvasCursor();
        }
        addLayerBtn.addEventListener('click', addLayer);
        document.addEventListener('keydown', function(e) {
            const activeEl = document.activeElement;
            const isInputFocused = activeEl && (activeEl.tagName.toLowerCase() === 'input' && activeEl.type !== 'range' && activeEl.type !== 'button' && activeEl.type !== 'submit') || activeEl.tagName.toLowerCase() === 'textarea';
            if (isInputFocused) return; 
            let prevented = true; 
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') saveBtn.click();
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') document.getElementById('loadInput').click();
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') exportWebMBtn.click();
            else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Delete') { clearAllLayersBtn.click(); } // Ctrl+Shift+Delete for Clear All
            else if ((e.ctrlKey || e.metaKey) && e.code === 'Delete') { /* No default action for Ctrl+Delete, handled by Clear Layer if it had a shortcut */ }
            else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { undoBtn.click(); }
            else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { redoBtn.click(); }
            else if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) penToolBtn.click();
            else if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) eraserToolBtn.click();
            else prevented = false;
            if (prevented) e.preventDefault();
        });
        initializeApp();