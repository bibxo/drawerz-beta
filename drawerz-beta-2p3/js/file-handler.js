export class FileHandler {
    static FILE_VERSION = "1.0";
    static FILE_EXTENSION = ".drz";
    static FILE_MIME_TYPE = "application/drawerz";


    static async saveDrawing(drawingState) {
        try {
            const effectMap = {
                'jiggle-intensity': drawingState.settings.intensity,
                'jiggle-speed': drawingState.settings.speed,
                'thickness-intensity': drawingState.settings.thickness,
                'float-intensity': drawingState.settings.float,
                'sketchy-intensity': drawingState.settings.sketchy
            };

            const drawingData = {
                version: this.FILE_VERSION,
                canvas: drawingState.canvas,
                settings: effectMap,
                strokes: drawingState.strokes
            };

            const jsonString = JSON.stringify(drawingData);
            const blob = new Blob([jsonString], { type: this.FILE_MIME_TYPE });
            const url = URL.createObjectURL(blob);
            
            const filename = `drawerz-illustration-${this.getFormattedDate()}${this.FILE_EXTENSION}`;
            await this.downloadFile(url, filename);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error saving drawing:', error);
            throw new Error('Failed to save drawing');
        }
    }

    static async loadDrawing() {
        try {
            const file = await this.openFilePicker(this.FILE_EXTENSION);
            if (!file) return null;

            const content = await this.readFileAsText(file);
            const drawingData = JSON.parse(content);
            
            if (!this.validateFileFormat(drawingData)) {
                throw new Error('Invalid file format');
            }

            const settings = {
                intensity: drawingData.settings['jiggle-intensity'] ?? 0,
                speed: drawingData.settings['jiggle-speed'] ?? 0,
                thickness: drawingData.settings['thickness-intensity'] ?? 0,
                float: drawingData.settings['float-intensity'] ?? 0,
                sketchy: drawingData.settings['sketchy-intensity'] ?? 0
            };

            return {
                ...drawingData,
                settings
            };
        } catch (error) {
            console.error('Error loading drawing:', error);
            throw new Error('Failed to load drawing');
        }
    }

    static validateFileFormat(data) {
        return (
            data.version &&
            data.strokes &&
            data.canvas?.width &&
            data.canvas?.height &&
            data.settings
        );
    }

    static async downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    static openFilePicker(extension) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = extension;
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                resolve(file || null);
            };

            input.click();
        });
    }

    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    static getFormattedDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}