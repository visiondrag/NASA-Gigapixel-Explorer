// Label Manager - Handles labeling and annotation

class LabelManager {
    constructor() {
        this.labels = STATE.labels;
        this.labelColors = {
            star: '#fbbf24',
            galaxy: '#a78bfa',
            crater: '#f87171',
            feature: '#4a9eff',
            custom: '#10b981'
        };
    }

    createLabel(box) {
        const labelName = document.getElementById('label-name').value || 'Unlabeled';
        const category = document.getElementById('label-category').value;

        const label = {
            id: generateId(),
            name: labelName,
            category: category,
            x: box.x / (overviewCanvas?.viewState.zoom || 1),
            y: box.y / (overviewCanvas?.viewState.zoom || 1),
            width: box.width / (overviewCanvas?.viewState.zoom || 1),
            height: box.height / (overviewCanvas?.viewState.zoom || 1),
            color: this.labelColors[category] || this.labelColors.custom,
            timestamp: new Date().toISOString()
        };

        this.labels.push(label);
        STATE.labels = this.labels;
        saveState();
        this.updateLabelsList();
        updateStatistics();

        // Clear input
        document.getElementById('label-name').value = '';

        showNotification(`Label "${labelName}" created`);
    }

    deleteLabel(labelId) {
        const index = this.labels.findIndex(l => l.id === labelId);
        if (index !== -1) {
            this.labels.splice(index, 1);
            STATE.labels = this.labels;
            saveState();
            this.updateLabelsList();
            updateStatistics();

            if (overviewCanvas) {
                overviewCanvas.render();
            }

            showNotification('Label deleted');
        }
    }

    updateLabelsList() {
        const container = document.getElementById('labels-container');
        container.innerHTML = '';

        // Update count
        document.querySelector('.label-list h4').textContent = `Saved Labels (${this.labels.length})`;

        this.labels.forEach(label => {
            const item = document.createElement('div');
            item.className = 'label-item';
            item.innerHTML = `
                <div>
                    <span style="color: ${label.color}">■</span>
                    <strong>${label.name}</strong> (${label.category})
                </div>
                <div>
                    <button onclick="labelManager.goToLabel('${label.id}')">📍</button>
                    <button onclick="labelManager.deleteLabel('${label.id}')">🗑️</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    goToLabel(labelId) {
        const label = this.labels.find(l => l.id === labelId);
        if (!label || !overviewCanvas) return;

        // Center the view on this label
        const centerX = label.x + label.width / 2;
        const centerY = label.y + label.height / 2;

        const canvasWidth = overviewCanvas.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = overviewCanvas.canvas.height / (window.devicePixelRatio || 1);

        overviewCanvas.viewState.offsetX = canvasWidth / 2 - centerX * overviewCanvas.viewState.zoom;
        overviewCanvas.viewState.offsetY = canvasHeight / 2 - centerY * overviewCanvas.viewState.zoom;

        overviewCanvas.render();
        showNotification(`Navigated to "${label.name}"`);
    }

    exportLabels() {
        // Count total labels across all tiles
        let totalLabels = 0;
        Object.keys(STATE.tileLabels).forEach(key => {
            totalLabels += STATE.tileLabels[key].length;
        });

        const exportData = {
            tileLabels: STATE.tileLabels,
            metadata: {
                totalTiles: Object.keys(STATE.tileLabels).length,
                totalLabels: totalLabels,
                exportDate: new Date().toISOString(),
                imageData: imageManager.metadata ? {
                    source: imageManager.metadata.source_image,
                    dimensions: {
                        width: imageManager.metadata.original_width,
                        height: imageManager.metadata.original_height
                    }
                } : null
            }
        };

        downloadJSON(exportData, `nasa_tile_labels_${Date.now()}.json`);
        showNotification(`Exported ${totalLabels} labels from ${Object.keys(STATE.tileLabels).length} tiles`);
    }

    importLabels() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (data.tileLabels) {
                    STATE.tileLabels = data.tileLabels;
                    saveState();

                    // Update current tile's label list if on a tile
                    const currentManager = getCurrentTileManager();
                    if (currentManager) {
                        currentManager.updateTileLabelsList();
                        currentManager.render();
                    }

                    updateStatistics();

                    const totalLabels = Object.values(data.tileLabels).reduce((sum, labels) => sum + labels.length, 0);
                    showNotification(`Imported ${totalLabels} labels from ${Object.keys(data.tileLabels).length} tiles`);
                } else {
                    throw new Error('Invalid label file format');
                }
            } catch (error) {
                console.error('Import error:', error);
                showNotification('Error importing labels', 5000);
            }
        };

        input.click();
    }
}

// Global instance
const labelManager = new LabelManager();

// UI Functions
function activateDrawMode() {
    STATE.activeTool = 'draw';
    document.getElementById('draw-bbox-btn').classList.add('active');
    document.getElementById('select-mode-btn').classList.remove('active');
    if (overviewCanvas) {
        overviewCanvas.canvas.style.cursor = 'crosshair';
    }
}

function activateSelectMode() {
    STATE.activeTool = null;
    document.getElementById('draw-bbox-btn').classList.remove('active');
    document.getElementById('select-mode-btn').classList.add('active');
    if (overviewCanvas) {
        overviewCanvas.canvas.style.cursor = 'grab';
    }
}

function saveLabel() {
    if (!overviewCanvas || !overviewCanvas.drawState.currentBox) {
        showNotification('Please draw a bounding box first');
        return;
    }

    labelManager.createLabel(overviewCanvas.drawState.currentBox);
}

function exportLabels() {
    labelManager.exportLabels();
}

function importLabels() {
    labelManager.importLabels();
}
