// Feature Detection - CV2-based algorithms (placeholder for now)

class FeatureDetector {
    constructor() {
        this.threshold = 50;
    }

    async detectFeatures(canvas) {
        // Placeholder for OpenCV.js feature detection
        // This will be implemented when OpenCV.js is loaded

        showNotification('Feature detection in progress...', 2000);

        // Simple brightness-based detection as placeholder
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const features = [];
        const blockSize = 20; // Analyze in 20x20 blocks

        for (let y = 0; y < canvas.height; y += blockSize) {
            for (let x = 0; x < canvas.width; x += blockSize) {
                let sumBrightness = 0;
                let count = 0;

                for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
                    for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                        const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        sumBrightness += brightness;
                        count++;
                    }
                }

                const avgBrightness = sumBrightness / count;

                // Detect bright regions
                if (avgBrightness > 200) {
                    features.push({
                        x: x,
                        y: y,
                        width: blockSize,
                        height: blockSize,
                        brightness: avgBrightness,
                        type: 'bright_region'
                    });
                }
            }
        }

        return features;
    }

    async findSimilar(templateBox, targetCanvas) {
        // Placeholder for template matching
        showNotification('Searching for similar features...', 2000);

        // This would use OpenCV template matching
        // For now, return empty array
        return [];
    }

    setSensitivity(value) {
        this.threshold = value;
    }
}

// Global instance
const featureDetector = new FeatureDetector();

// UI Functions
async function runFeatureDetection() {
    // Check if we have an active detail tile
    if (!tabManager || !tabManager.activeTabId) {
        showNotification('Please open a tile first. Feature detection only works on detail tiles.', 5000);
        return;
    }

    const activeTab = tabManager.tabs.find(t => t.id === tabManager.activeTabId);
    if (!activeTab || !activeTab.canvasManager) {
        showNotification('No active tile canvas found', 5000);
        return;
    }

    const canvas = document.getElementById(`canvas_${activeTab.id}`);
    if (!canvas) return;

    showLoading(true);

    try {
        const features = await featureDetector.detectFeatures(canvas);

        showLoading(false);

        if (features.length === 0) {
            showNotification('No features detected');
            return;
        }

        // Add detected features as labels to the active tile
        const tileKey = `${activeTab.row}_${activeTab.col}`;
        if (!STATE.tileLabels[tileKey]) {
            STATE.tileLabels[tileKey] = [];
        }

        features.slice(0, 50).forEach((feature, i) => { // Limit to 50
            const label = {
                id: generateId(),
                name: `Detected_${i + 1}`,
                category: 'feature',
                tileRow: activeTab.row,
                tileCol: activeTab.col,
                x: feature.x,
                y: feature.y,
                width: feature.width,
                height: feature.height,
                color: '#10b981',
                timestamp: new Date().toISOString(),
                auto_detected: true
            };

            STATE.tileLabels[tileKey].push(label);
        });

        saveState();
        activeTab.canvasManager.updateTileLabelsList();
        updateStatistics();
        activeTab.canvasManager.render();

        showNotification(`Detected ${features.length} features on tile [${activeTab.row}, ${activeTab.col}] (showing first 50)`);
    } catch (error) {
        console.error('Feature detection error:', error);
        showLoading(false);
        showNotification('Error during feature detection', 5000);
    }
}

async function findSimilar() {
    showNotification('Similar feature search not yet implemented', 3000);

    // This would:
    // 1. Select a labeled region as template
    // 2. Search across all tiles for similar patterns
    // 3. Propose regions for user review
}

// Update sensitivity
document.addEventListener('DOMContentLoaded', () => {
    const sensitivitySlider = document.getElementById('sensitivity');
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener('input', (e) => {
            featureDetector.setSensitivity(parseInt(e.target.value));
        });
    }
});
