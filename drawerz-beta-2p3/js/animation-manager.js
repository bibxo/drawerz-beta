export class AnimationManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isExporting = false;
        this.animationFrameId = null;
        this.strokes = [];
        this.effects = {
            'jiggle-intensity': 0,
            'jiggle-speed': 0,
            'thickness-intensity': 0,
            'float-intensity': 0,
            'sketchy-intensity': 0
        };
    }

    setEffects(effects) {
        Object.assign(this.effects, effects);
        this.updateAnimation();
    }

    updateAnimation() {
        const shouldAnimate = 
            this.effects['jiggle-intensity'] > 0 || 
            this.effects['float-intensity'] > 0 || 
            this.effects['thickness-intensity'] > 0 || 
            this.effects['sketchy-intensity'] > 0;

        if (shouldAnimate && !this.animationFrameId) {
            this.startAnimation();
        } else if (!shouldAnimate && this.animationFrameId) {
            this.stopAnimation();
        }
    }

    startAnimation() {
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }



    animate() {
        if (!this.isExporting) {
            this.draw();
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        }
    }

    draw() {
        const t = performance.now() / 1000;
        const style = getComputedStyle(document.documentElement);
        this.ctx.fillStyle = style.getPropertyValue('--canvas-bg');
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.strokes) {
            for (const stroke of this.strokes) {
                this.drawStroke(stroke, t);
            }
        }

        if (window.app?.strokeManager) {
            const currentStroke = window.app.strokeManager.getCurrentStroke();
            if (currentStroke.length > 0) {
                this.drawImmediateStroke({
                    points: currentStroke,
                    color: window.app.state.isEraser ? '#ff0000' : window.app.state.currentColor,
                    size: window.app.state.strokeSize
                });
            }
        }
    }

    drawImmediateStroke(stroke) {
        this.ctx.save();
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = stroke.size;

        const points = stroke.points;
        if (points.length === 0) {
            this.ctx.restore();
            return;
        }

        if (points.length === 1) {
            const pt = points[0];
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            return;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            const curr = points[i];
            const prev = points[i - 1];

            if (i < points.length - 1) {
                const next = points[i + 1];
                const cp1x = (prev.x + curr.x) / 2;
                const cp1y = (prev.y + curr.y) / 2;
                const cp2x = (curr.x + next.x) / 2;
                const cp2y = (curr.y + next.y) / 2;
                
                this.ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
            } else {
                this.ctx.lineTo(curr.x, curr.y);
            }
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawStrokes(strokes) {
        this.strokes = strokes;
        this.draw();
    }



    drawStroke(stroke, t) {
        if (stroke.type === 'fill') {
            this.ctx.fillStyle = stroke.color;
            for (const pt of stroke.points) {
                this.ctx.fillRect(pt.x, pt.y, 1, 1);
            }
            return;
        }

        const speedNormalized = this.effects['jiggle-speed'] / 60;
        const speedMultiplier = speedNormalized <= 0.4 
            ? speedNormalized * 2.5 
            : 1 + (speedNormalized - 0.4) * 3;
        const strokeTime = t * speedMultiplier;
        
        this.ctx.save();
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = stroke.size;

        if (this.effects['sketchy-intensity'] > 0) {
            this.drawSketchyStroke(stroke, strokeTime);
        } else {
            this.ctx.beginPath();
            
            const points = stroke.points;
            if (points.length === 1) {
                const pt = points[0];
                this.ctx.beginPath();
                this.ctx.arc(pt.x, pt.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return;
            }






            this.ctx.beginPath();
            let i = 0;

            while (i < points.length - 1) {
                const curr = points[i];
                const next = points[i + 1];
                let dx = 0, dy = 0;

                if (this.effects['jiggle-intensity'] > 0) {
                    const angle = strokeTime * 5 + i * 0.6;
                    const intensity = this.effects['jiggle-intensity'];
                    const r = intensity * (0.5 + 0.5 * Math.sin(angle * 1.3 + i));
                    dx += Math.cos(angle) * r;
                    dy += Math.sin(angle) * r;
                }

                if (this.effects['float-intensity'] > 0) {
                    const intensity = this.effects['float-intensity'];
                    dx += Math.sin(strokeTime * 2 + i * 0.1) * intensity * 2;
                    dy += Math.cos(strokeTime * 1.5 + i * 0.08) * intensity * 2;
                }

                const x1 = curr.x + dx;
                const y1 = curr.y + dy;
                const x2 = next.x + dx;
                const y2 = next.y + dy;


                let cp1x, cp1y, cp2x, cp2y;
                if (i === 0) {
                    cp1x = x1;
                    cp1y = y1;
                    cp2x = (x1 + x2) / 2;
                    cp2y = (y1 + y2) / 2;
                } else if (i === points.length - 2) {
   
                    cp1x = (x1 + x2) / 2;
                    cp1y = (y1 + y2) / 2;
                    cp2x = x2;
                    cp2y = y2;
                } else {
                    cp1x = (x1 + x2) / 2;
                    cp1y = (y1 + y2) / 2;
                    cp2x = (x1 + x2) / 2;
                    cp2y = (y1 + y2) / 2;
                }

 
                let thickness = stroke.size;
                if (this.effects['thickness-intensity'] > 0) {
                    const thicknessAdd = this.effects['thickness-intensity'] * Math.abs(Math.sin(strokeTime * 5));
                    thickness += thicknessAdd;
                }
                
                this.ctx.lineWidth = thickness;

                if (i === 0) {
                    this.ctx.moveTo(x1, y1);
                }
                
            
                this.ctx.quadraticCurveTo(cp1x, cp1y, x2, y2);
                
                i++;
            }
            
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawSketchyStroke(stroke, t) {
        const seed = stroke.phase;
        const intensity = this.effects['sketchy-intensity'];
        const scaledIntensity = Math.pow(intensity / 20, 0.7) * 15;

        const positions = [];
        for (let i = 0; i < 3; i++) {
            const positionSeed = seed + i * 1000;
            
            // use different trig functions 
            const angle = positionSeed * 0.1 + i * Math.PI * 2/3; 
            const radius = ((Math.sin(positionSeed * 0.3) + 1) / 2) * scaledIntensity; 
            
            positions.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        positions.push({ x: 0, y: 0 }); 

        const baseSpeed = 3;
        const speedVariation = Math.sin(seed * 0.1) * 0.5 + 1.5;
        const jumpSpeed = baseSpeed * speedVariation;
        

        const strokeSpecificTime = (t + seed * 0.1) * jumpSpeed;
        const cycleTime = strokeSpecificTime % 1;
        
        const currentPositionIndex = Math.floor(cycleTime * positions.length);
        const currentOffset = positions[currentPositionIndex];
        
        this.ctx.beginPath();
        for (let i = 0; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            const pointSeed = seed + i * 100;
            const roughnessScale = Math.min(scaledIntensity * 0.1, 2); // Cap roughness
            const roughnessX = (Math.sin(pointSeed * 0.3) + Math.cos(pointSeed * 0.7)) * roughnessScale;
            const roughnessY = (Math.cos(pointSeed * 0.3) + Math.sin(pointSeed * 0.7)) * roughnessScale;
            const finalX = pt.x + currentOffset.x + roughnessX;
            const finalY = pt.y + currentOffset.y + roughnessY;

            if (i === 0) this.ctx.moveTo(finalX, finalY);
            else this.ctx.lineTo(finalX, finalY);
        }
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1;
    }

    async exportAnimation(quality) {
        const bitrates = {
            high: 2500000,
            medium: 1500000,
            low: 1000000
        };



        const bitrate = bitrates[quality];
        this.isExporting = true;

        try {
            const renderCanvas = document.createElement('canvas');
            renderCanvas.width = this.canvas.width;
            renderCanvas.height = this.canvas.height;
            const renderCtx = renderCanvas.getContext('2d', {
                alpha: false,
                willReadFrequently: false,
                desynchronized: true
            });
            
            renderCtx.imageSmoothingEnabled = true;
            renderCtx.imageSmoothingQuality = 'high';
            renderCanvas.style.backgroundColor = '#FFFFFF';
            
            const stream = renderCanvas.captureStream(60);
            const mediaRecorder = await this.setupMediaRecorder(stream, bitrate);
            
            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.start();

            const fps = 60;
            const duration = 5;
            const totalFrames = fps * duration;
            let frameCount = 0;
            let lastFrameTime = performance.now();

            await new Promise((resolve) => {
                const renderFrame = () => {
                    if (frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        resolve();
                        return;
                    }

                    const currentTime = performance.now();
                    const deltaTime = (currentTime - lastFrameTime) / 1000;
                    lastFrameTime = currentTime;

                    const progress = Math.round((frameCount / totalFrames) * 100);
                    this.onExportProgress?.(progress);

                    const t = frameCount / fps;
                    
                    renderCtx.fillStyle = '#FFFFFF';
                    renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

                    for (const stroke of this.strokes) {
                        renderCtx.save();
                        renderCtx.strokeStyle = stroke.color;
                        renderCtx.lineJoin = 'round';
                        renderCtx.lineCap = 'round';

                        if (stroke.type === 'fill') {
                            renderCtx.fillStyle = stroke.color;
                            for (const pt of stroke.points) {
                                renderCtx.fillRect(pt.x, pt.y, 1, 1);
                            }
                            continue;
                        }

                        if (this.effects['sketchy-intensity'] > 0) {
                            this.drawSketchyStroke(stroke, t);
                        } else {
                            this.drawAnimatedStroke(stroke, t, renderCtx);
                        }
                        renderCtx.restore();
                    }

                    frameCount++;
                    setTimeout(() => requestAnimationFrame(renderFrame), 1000 / fps);
                };

                renderFrame();
            });

            return new Promise((resolve) => {
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
                    resolve(blob);
                };
            });
        } finally {
            this.isExporting = false;
        }
    }

    drawAnimatedStroke(stroke, t, ctx) {
        ctx.beginPath();
        
        for (let i = 1; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            const prevPt = stroke.points[i-1];
            let dx = 0, dy = 0;

            if (this.effects['jiggle-intensity'] > 0) {
                const angle = t * 5 + i * 0.6;
                const r = this.effects['jiggle-intensity'] * (0.5 + 0.5 * Math.sin(angle * 1.3 + i));
                dx += Math.cos(angle) * r;
                dy += Math.sin(angle) * r;
            }

            if (this.effects['float-intensity'] > 0) {
                dx += Math.sin(t * 2 + i * 0.1) * this.effects['float-intensity'] * 2;
                dy += Math.cos(t * 1.5 + i * 0.08) * this.effects['float-intensity'] * 2;
            }

            const prevX = prevPt.x + dx;
            const prevY = prevPt.y + dy;
            const finalX = pt.x + dx;
            const finalY = pt.y + dy;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);

            ctx.lineWidth = stroke.size;
            ctx.lineTo(finalX, finalY);
            ctx.stroke();
        }


        if (stroke.points.length === 1) {
            const pt = stroke.points[0];
            ctx.beginPath();
            ctx.lineWidth = stroke.size;
            ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    async setupMediaRecorder(stream, bitrate) {
        const supportedMimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];

        const mimeType = supportedMimeTypes.find(mime => MediaRecorder.isTypeSupported(mime));
        
        if (!mimeType) {
            throw new Error('No supported video format found');
        }

        return new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: bitrate
        });
    }

    setExportProgressCallback(callback) {
        this.onExportProgress = callback;
    }
}