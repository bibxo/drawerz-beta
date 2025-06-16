# Drawerz Beta 3 - Animated Sketchpad & Layering Tool

A powerful, browser-based drawing and animation application that combines intuitive sketching tools with advanced layer management and dynamic animation effects. Create stunning animated artwork and export it as high-quality MP4 videos or GIFs.

## 🎨 Features

### Core Drawing Tools
- **Pen Tool**: Smooth, pressure-sensitive drawing with customizable stroke sizes (1-100px)
- **Eraser Tool**: Precise erasing with visual cursor feedback
- **Color Picker**: Full spectrum color selection for strokes
- **Dynamic Cursors**: Visual feedback showing tool size and type

### Advanced Layer System
- **Multi-Layer Support**: Unlimited layers with individual controls
- **Layer Management**: Add, delete, rename, reorder, and toggle visibility
- **Opacity Control**: Per-layer opacity adjustment (0-100%)
- **Layer Isolation**: Work on individual layers without affecting others

### Animation Effects (Per Layer)
- **Wiggle Animation**: Add organic movement to strokes
- **Breathing Stroke**: Dynamic stroke width animation
- **Shake Effect**: Random position jitter for hand-drawn feel
- **Animation Speed Control**: Adjust playback speed (0.1x - 5x)

### Export Capabilities
- **MP4 Export**: High-quality video export (1920x1080, 30fps, 15 seconds)
- **GIF Export**: Optimized animated GIF creation (10fps, 15 seconds)
- **Native Save Format**: Custom .drz format preserving all layer and animation data

### File Import Support
- **Native Format**: Load .drz files with full fidelity
- **SVG Import**: Import vector graphics from SVG files
- **Format Recognition**: Automatic file type detection and appropriate handling

### User Experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Keyboard Shortcuts**: Professional workflow shortcuts
- **Undo/Redo**: 30-level history with visual feedback
- **Modal Confirmations**: Safe operations with user confirmation
- **Loading Indicators**: Clear progress feedback for long operations

## 🛠️ Technology Stack

### Frontend Technologies
- **HTML5 Canvas**: High-performance 2D graphics rendering
- **Vanilla JavaScript**: Pure ES6+ implementation without framework dependencies
- **CSS3**: Modern styling with Flexbox and Grid layouts
- **Pointer Events API**: Multi-touch and stylus support

### Animation & Graphics
- **RequestAnimationFrame**: Smooth 60fps animation loop
- **Canvas 2D Context**: Hardware-accelerated drawing operations
- **Mathematical Functions**: Sine waves for organic animation effects
- **SVG Parsing**: DOM-based SVG import and conversion

### Export Technologies
- **FFmpeg.wasm**: Browser-based video encoding for MP4 export
- **GIF.js**: Client-side GIF generation and optimization
- **SharedArrayBuffer**: High-performance memory sharing for video processing
- **Web Workers**: Background processing for export operations

### Browser APIs
- **Service Worker**: COOP/COEP header injection for SharedArrayBuffer support
- **File API**: Local file reading and writing
- **Blob API**: Binary data handling for exports
- **Pointer Capture**: Enhanced drawing input handling

### Performance Optimizations
- **Event Coalescing**: Smooth drawing with high-frequency input
- **Layer Caching**: Efficient redraw operations
- **Memory Management**: Automatic cleanup of temporary resources
- **Responsive Canvas**: Dynamic resolution adjustment

## 🚀 Getting Started

### Online Usage
1. Open the application in a modern web browser
2. The app loads instantly - no installation required
3. Start drawing immediately with the default pen tool
4. Use the control panel to adjust settings and manage layers

### Offline Usage
1. The application works offline after the first load
2. Service Worker caches all necessary resources
3. All features available without internet connection
4. Files save/load locally through browser APIs

### System Requirements
- **Browser**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Memory**: 2GB RAM minimum (4GB recommended for video export)
- **Storage**: 100MB free space for temporary export files
- **Features**: JavaScript enabled, Service Workers supported

## 📖 How to Use

### Basic Drawing
1. **Select Tool**: Click Pen (P) or Eraser (E) tools
2. **Adjust Size**: Use the stroke size slider (1-100px)
3. **Choose Color**: Click the color picker for stroke color
4. **Draw**: Click and drag on the canvas to create strokes

### Layer Management
1. **Add Layer**: Click "Add Layer" button or use existing layer
2. **Select Layer**: Click on layer in the layers panel
3. **Rename**: Double-click layer name to edit
4. **Reorder**: Use up/down arrows to change layer order
5. **Visibility**: Toggle eye icon to show/hide layers
6. **Opacity**: Adjust layer opacity with the slider

### Animation Setup
1. **Select Layer**: Choose the layer to animate
2. **Adjust Effects**: Use sliders in Animation Effects panel
   - Wiggle Intensity: 0-20 (stroke movement)
   - Breathing Stroke: 0-20 (width variation)
   - Shake Intensity: 0-10 (position jitter)
   - Animation Speed: 0.1x-5x (playback speed)

### Exporting Your Work
1. **MP4 Export**: Click "Export MP4" for high-quality video
2. **GIF Export**: Click "Export GIF" for web-friendly animation
3. **Save Project**: Click "Save" to download .drz file
4. **Wait for Processing**: Large exports may take several minutes

### File Operations
1. **Save**: Ctrl+S or click Save button
2. **Load**: Ctrl+O or click Load button
3. **Import SVG**: Use Load button and select SVG file
4. **Export**: Ctrl+E for MP4 or use Export buttons

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `P` | Select Pen Tool |
| `E` | Select Eraser Tool |
| `Ctrl+S` | Save Project |
| `Ctrl+O` | Open/Load File |
| `Ctrl+E` | Export MP4 |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+Z` | Redo (Alternative) |
| `Ctrl+Delete` | Clear Active Layer |
| `Ctrl+Shift+Delete` | Clear All Layers |

## 🚨 Known Limitations

### MP4 Export Requirements
- Requires `SharedArrayBuffer` support
- Needs COOP/COEP headers (handled by Service Worker)
- May require page reload on first use
- Large memory usage during export

### Performance Considerations
- Complex animations may impact performance on older devices
- Video export is CPU-intensive and may take time
- Large numbers of layers can affect rendering speed
- Mobile devices may have memory limitations

### File Size Limits
- Browser memory limits apply to large projects
- Export file sizes depend on animation complexity
- GIF exports are larger than MP4 for same content

## 🛠️ Development

### Project Structure
```
drawerz-beta/
├── index.html          # Main application HTML
├── script.js           # Core application logic
├── styles.css          # Application styling
├── sw.js              # Service Worker for COOP/COEP
```

### Key Components
- **Drawing Engine**: Canvas-based rendering system
- **Layer Manager**: Multi-layer composition and management
- **Animation System**: Real-time effect processing
- **Export Pipeline**: FFmpeg.wasm and GIF.js integration
- **File Handler**: Import/export functionality

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across browsers
5. Submit a pull request

## 🆘 Support

### Troubleshooting
- **MP4 Export Issues**: Try reloading the page to activate Service Worker
- **Performance Problems**: Reduce animation complexity or layer count
- **File Loading Errors**: Ensure file format is supported (.drz or .svg)
- **Mobile Issues**: Use landscape orientation for better experience

### Browser Issues
- Clear browser cache if experiencing loading problems
- Ensure JavaScript is enabled
- Check that Service Workers are not blocked
- Verify sufficient available memory

### Contact
For support, feature requests, or bug reports, please contact the development team.

---

**Drawerz Beta 3** - Where creativity meets technology. Create, animate, and share your digital artwork with professional-grade tools in your browser.
