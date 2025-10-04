// Canvas Manager - Handles canvas rendering and interactions

class CanvasManager {
    constructor(canvasId, isOverview = false) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isOverview = isOverview;

        this.viewState = {
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };

        this.drawState = {
            isDrawing: false,
            startX: 0,
            startY: 0,
            currentBox: null
        };

        this.setupCanvas();
        this.attachEventListeners();
    }

    setupCanvas() {
        // Set canvas size to match container
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        // Enable high-DPI rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    attachEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

        // Window resize
        window.addEventListener('resize', () => this.setupCanvas());
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Drawing is disabled on overview - only for detail tiles
        if (STATE.activeTool === 'draw' && this.isOverview) {
            showNotification('Draw mode only works on detail tile views. Open a tile first.');
            return;
        }

        if (STATE.activeTool === 'draw' && !this.isOverview) {
            this.drawState.isDrawing = true;
            this.drawState.startX = x;
            this.drawState.startY = y;
        } else {
            this.viewState.isDragging = true;
            this.viewState.lastX = x;
            this.viewState.lastY = y;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update cursor position display
        this.updateCursorPosition(x, y);

        // Show hover highlight on overview
        if (this.isOverview && !this.viewState.isDragging && !this.drawState.isDrawing) {
            this.currentHoverTile = this.getTileAtPosition(x, y);
            this.render();
        }

        if (this.viewState.isDragging) {
            const dx = x - this.viewState.lastX;
            const dy = y - this.viewState.lastY;

            this.viewState.offsetX += dx;
            this.viewState.offsetY += dy;

            this.viewState.lastX = x;
            this.viewState.lastY = y;

            this.render();
        } else if (this.drawState.isDrawing) {
            this.drawState.currentBox = {
                x: Math.min(this.drawState.startX, x),
                y: Math.min(this.drawState.startY, y),
                width: Math.abs(x - this.drawState.startX),
                height: Math.abs(y - this.drawState.startY)
            };
            this.render();
        }
    }

    onMouseUp(e) {
        if (this.drawState.isDrawing) {
            this.drawState.isDrawing = false;
            if (this.drawState.currentBox &&
                this.drawState.currentBox.width > 5 &&
                this.drawState.currentBox.height > 5) {
                // Valid box drawn
                this.onBoxComplete(this.drawState.currentBox);
            }
            this.drawState.currentBox = null;
        }

        this.viewState.isDragging = false;
        this.canvas.style.cursor = STATE.activeTool === 'draw' ? 'crosshair' : 'grab';
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = this.viewState.zoom * zoomFactor;

        // Limit zoom
        if (newZoom < 0.1 || newZoom > 10) return;

        // Zoom towards mouse position
        this.viewState.offsetX = mouseX - (mouseX - this.viewState.offsetX) * zoomFactor;
        this.viewState.offsetY = mouseY - (mouseY - this.viewState.offsetY) * zoomFactor;
        this.viewState.zoom = newZoom;

        STATE.currentZoom = newZoom;
        this.updateZoomDisplay();
        this.render();
    }

    onDoubleClick(e) {
        if (this.isOverview) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.viewState.offsetX) / this.viewState.zoom;
            const y = (e.clientY - rect.top - this.viewState.offsetY) / this.viewState.zoom;

            // Open region in detail view
            this.openRegionAtPosition(x, y);
        }
    }

    onBoxComplete(box) {
        // Override in subclass or set callback
        if (this.onLabelDrawn) {
            this.onLabelDrawn(box);
        }
    }

    getTileAtPosition(x, y) {
        if (!imageManager.metadata) return null;

        const worldX = (x - this.viewState.offsetX) / this.viewState.zoom;
        const worldY = (y - this.viewState.offsetY) / this.viewState.zoom;

        const overview = imageManager.metadata.overview;
        const original = imageManager.metadata;
        const scaleX = original.original_width / overview.width;
        const scaleY = original.original_height / overview.height;

        const originalX = worldX * scaleX;
        const originalY = worldY * scaleY;

        const tileSize = CONFIG.TILE_SIZE;
        const col = Math.floor(originalX / tileSize);
        const row = Math.floor(originalY / tileSize);

        const grid = imageManager.metadata.grid;
        if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) {
            return { row, col };
        }
        return null;
    }

    openRegionAtPosition(x, y) {
        // Calculate which tile this position falls into
        if (!imageManager.metadata) return;

        // Need to map from overview image coordinates to original image coordinates
        const overview = imageManager.metadata.overview;
        const original = imageManager.metadata;

        // Scale factor from overview to original
        const scaleX = original.original_width / overview.width;
        const scaleY = original.original_height / overview.height;

        // Convert to original image coordinates
        const originalX = x * scaleX;
        const originalY = y * scaleY;

        const tileSize = CONFIG.TILE_SIZE;
        const col = Math.floor(originalX / tileSize);
        const row = Math.floor(originalY / tileSize);

        console.log(`Opening region at overview coords (${x.toFixed(0)}, ${y.toFixed(0)}) -> original coords (${originalX.toFixed(0)}, ${originalY.toFixed(0)}) -> tile [${row}, ${col}]`);

        // Validate tile bounds
        const grid = imageManager.metadata.grid;
        if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) {
            showNotification(`Invalid tile position [${row}, ${col}]`);
            return;
        }

        // Open tab for this region
        tabManager.openTab(row, col);
    }

    updateCursorPosition(x, y) {
        const worldX = Math.floor((x - this.viewState.offsetX) / this.viewState.zoom);
        const worldY = Math.floor((y - this.viewState.offsetY) / this.viewState.zoom);

        let posText = `Position: ${worldX}, ${worldY}`;

        // Add tile info if on overview
        if (this.isOverview) {
            const tile = this.getTileAtPosition(x, y);
            if (tile) {
                posText += ` | Tile [${tile.row}, ${tile.col}]`;
            }
        }

        document.getElementById('cursor-pos').textContent = posText;
    }

    updateZoomDisplay() {
        document.getElementById('current-zoom').textContent = `Zoom: ${this.viewState.zoom.toFixed(2)}x`;
    }

    zoom(factor) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.viewState.offsetX = centerX - (centerX - this.viewState.offsetX) * factor;
        this.viewState.offsetY = centerY - (centerY - this.viewState.offsetY) * factor;
        this.viewState.zoom *= factor;

        STATE.currentZoom = this.viewState.zoom;
        this.updateZoomDisplay();
        this.render();
    }

    reset() {
        this.viewState.zoom = 1;
        this.viewState.offsetX = 0;
        this.viewState.offsetY = 0;
        STATE.currentZoom = 1;
        this.updateZoomDisplay();
        this.render();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        this.clear();

        this.ctx.save();
        this.ctx.translate(this.viewState.offsetX, this.viewState.offsetY);
        this.ctx.scale(this.viewState.zoom, this.viewState.zoom);

        if (this.isOverview && imageManager.overviewImage) {
            this.ctx.drawImage(imageManager.overviewImage, 0, 0);

            // Draw grid overlay
            if (STATE.settings.showGrid) {
                this.drawGrid();
            }

            // Draw open tabs indicators
            this.drawOpenTabsIndicators();

            // Draw hover highlight
            if (this.currentHoverTile) {
                this.drawHoverHighlight(this.currentHoverTile);
            }
        }

        // Labels are not drawn on overview - each tile handles its own labels

        // Draw current box being drawn
        if (this.drawState.currentBox) {
            this.ctx.strokeStyle = '#4a9eff';
            this.ctx.lineWidth = 2 / this.viewState.zoom;
            this.ctx.strokeRect(
                this.drawState.currentBox.x / this.viewState.zoom,
                this.drawState.currentBox.y / this.viewState.zoom,
                this.drawState.currentBox.width / this.viewState.zoom,
                this.drawState.currentBox.height / this.viewState.zoom
            );
        }

        this.ctx.restore();

        // Update minimap if this is overview
        if (this.isOverview) {
            this.renderMinimap();
        }
    }

    renderMinimap() {
        if (!STATE.settings.showMinimap || !imageManager.overviewImage) return;

        const minimapCanvas = document.getElementById('minimap-canvas');
        if (!minimapCanvas) return;

        const ctx = minimapCanvas.getContext('2d');
        const width = minimapCanvas.width;
        const height = minimapCanvas.height;

        // Clear minimap
        ctx.clearRect(0, 0, width, height);

        // Draw the overview image scaled to minimap size
        ctx.drawImage(imageManager.overviewImage, 0, 0, width, height);

        // Draw viewport rectangle
        const overview = imageManager.metadata.overview;
        const scaleX = width / overview.width;
        const scaleY = height / overview.height;

        const viewportX = -this.viewState.offsetX / this.viewState.zoom * scaleX;
        const viewportY = -this.viewState.offsetY / this.viewState.zoom * scaleY;
        const viewportWidth = (this.canvas.width / this.viewState.zoom) * scaleX;
        const viewportHeight = (this.canvas.height / this.viewState.zoom) * scaleY;

        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    }

    drawGrid() {
        if (!imageManager.metadata) return;

        const grid = imageManager.metadata.grid;

        // Map from overview to original coordinates
        const overview = imageManager.metadata.overview;
        const original = imageManager.metadata;
        const scaleX = overview.width / original.original_width;
        const scaleY = overview.height / original.original_height;
        const tileSize = CONFIG.TILE_SIZE;

        this.ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
        this.ctx.lineWidth = 2 / this.viewState.zoom;

        // Draw grid in overview coordinates
        for (let i = 0; i <= grid.cols; i++) {
            const x = i * tileSize * scaleX;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, grid.rows * tileSize * scaleY);
            this.ctx.stroke();
        }

        for (let i = 0; i <= grid.rows; i++) {
            const y = i * tileSize * scaleY;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(grid.cols * tileSize * scaleX, y);
            this.ctx.stroke();
        }

        // Draw tile labels (row, col) in each grid cell
        this.ctx.fillStyle = 'rgba(74, 158, 255, 0.6)';
        this.ctx.font = `${14 / this.viewState.zoom}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const centerX = (col + 0.5) * tileSize * scaleX;
                const centerY = (row + 0.5) * tileSize * scaleY;
                this.ctx.fillText(`[${row},${col}]`, centerX, centerY);
            }
        }
    }

    drawOpenTabsIndicators() {
        if (!imageManager.metadata || !window.tabManager) return;

        const overview = imageManager.metadata.overview;
        const original = imageManager.metadata;
        const scaleX = overview.width / original.original_width;
        const scaleY = overview.height / original.original_height;
        const tileSize = CONFIG.TILE_SIZE;

        // Draw indicators for all open tabs
        tabManager.tabs.forEach(tab => {
            const x = tab.col * tileSize * scaleX;
            const y = tab.row * tileSize * scaleY;
            const width = tileSize * scaleX;
            const height = tileSize * scaleY;

            // Draw border to show this tile is open
            this.ctx.strokeStyle = '#10b981'; // Green color
            this.ctx.lineWidth = 3 / this.viewState.zoom;
            this.ctx.strokeRect(x, y, width, height);

            // Draw "OPEN" label
            this.ctx.fillStyle = '#10b981';
            this.ctx.font = `bold ${12 / this.viewState.zoom}px sans-serif`;
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('OPEN', x + width - 5 / this.viewState.zoom, y + 5 / this.viewState.zoom);
        });
    }

    drawHoverHighlight(tile) {
        if (!imageManager.metadata) return;

        const overview = imageManager.metadata.overview;
        const original = imageManager.metadata;
        const scaleX = overview.width / original.original_width;
        const scaleY = overview.height / original.original_height;
        const tileSize = CONFIG.TILE_SIZE;

        const x = tile.col * tileSize * scaleX;
        const y = tile.row * tileSize * scaleY;
        const width = tileSize * scaleX;
        const height = tileSize * scaleY;

        // Draw semi-transparent highlight
        this.ctx.fillStyle = 'rgba(74, 158, 255, 0.2)';
        this.ctx.fillRect(x, y, width, height);

        // Draw bright border
        this.ctx.strokeStyle = 'rgba(74, 158, 255, 0.9)';
        this.ctx.lineWidth = 3 / this.viewState.zoom;
        this.ctx.strokeRect(x, y, width, height);

        // Draw "Click to open" text
        this.ctx.fillStyle = '#4a9eff';
        this.ctx.font = `bold ${16 / this.viewState.zoom}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Double-click to open`, x + width / 2, y + height / 2);
    }

    drawLabels() {
        STATE.labels.forEach(label => {
            this.ctx.strokeStyle = label.color || '#4a9eff';
            this.ctx.lineWidth = 2 / this.viewState.zoom;
            this.ctx.strokeRect(label.x, label.y, label.width, label.height);

            // Draw label text
            this.ctx.fillStyle = label.color || '#4a9eff';
            this.ctx.font = `${12 / this.viewState.zoom}px sans-serif`;
            this.ctx.fillText(label.name, label.x, label.y - 5 / this.viewState.zoom);
        });
    }
}

// Detail Canvas Manager for tab views
class DetailCanvasManager {
    constructor(canvasId, tab) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tab = tab;

        this.viewState = {
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };

        this.drawState = {
            isDrawing: false,
            startX: 0,
            startY: 0,
            currentBox: null
        };

        this.selectedLabel = null; // Currently selected label for deletion

        // Get tile key for label storage
        this.tileKey = `${tab.row}_${tab.col}`;

        // Initialize tile labels if not exists
        if (!STATE.tileLabels[this.tileKey]) {
            STATE.tileLabels[this.tileKey] = [];
        }

        this.setupCanvas();
        this.attachEventListeners();
        this.render();
    }

    setupCanvas() {
        // Get the current display size (CSS pixels)
        const rect = this.canvas.getBoundingClientRect();

        // Set the actual canvas size accounting for device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);

        // Set CSS size
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    get labels() {
        // Always return current labels for this tile
        return STATE.tileLabels[this.tileKey] || [];
    }

    attachEventListeners() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (STATE.activeTool === 'draw') {
            this.drawState.isDrawing = true;
            // Convert screen coordinates to world coordinates immediately
            this.drawState.startX = (x - this.viewState.offsetX) / this.viewState.zoom;
            this.drawState.startY = (y - this.viewState.offsetY) / this.viewState.zoom;
        } else {
            this.viewState.isDragging = true;
            this.viewState.lastX = x;
            this.viewState.lastY = y;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.drawState.isDrawing) {
            // Convert screen coordinates to world coordinates
            const worldX = (x - this.viewState.offsetX) / this.viewState.zoom;
            const worldY = (y - this.viewState.offsetY) / this.viewState.zoom;

            this.drawState.currentBox = {
                x: Math.min(this.drawState.startX, worldX),
                y: Math.min(this.drawState.startY, worldY),
                width: Math.abs(worldX - this.drawState.startX),
                height: Math.abs(worldY - this.drawState.startY)
            };
            this.render();
        } else if (this.viewState.isDragging) {
            const dx = x - this.viewState.lastX;
            const dy = y - this.viewState.lastY;

            this.viewState.offsetX += dx;
            this.viewState.offsetY += dy;

            this.viewState.lastX = x;
            this.viewState.lastY = y;

            this.render();
        }
    }

    onMouseUp(e) {
        if (this.drawState.isDrawing) {
            this.drawState.isDrawing = false;
            if (this.drawState.currentBox &&
                this.drawState.currentBox.width > 5 &&
                this.drawState.currentBox.height > 5) {
                // Save the label for this tile
                this.saveLabel(this.drawState.currentBox);
            }
            this.drawState.currentBox = null;
            this.render();
        }

        this.viewState.isDragging = false;
        this.canvas.style.cursor = STATE.activeTool === 'draw' ? 'crosshair' : 'grab';
    }

    saveLabel(box) {
        const labelName = document.getElementById('label-name').value || 'Unlabeled';
        const category = document.getElementById('label-category').value;

        const label = {
            id: generateId(),
            name: labelName,
            category: category,
            tileRow: this.tab.row,
            tileCol: this.tab.col,
            // Box is already in world coordinates
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            color: labelManager.labelColors[category] || labelManager.labelColors.custom,
            timestamp: new Date().toISOString()
        };

        // Add to tile-specific labels
        STATE.tileLabels[this.tileKey].push(label);
        saveState();
        this.updateTileLabelsList();
        updateStatistics();

        // Clear input
        document.getElementById('label-name').value = '';

        showNotification(`Label "${labelName}" created on tile [${this.tab.row}, ${this.tab.col}]`);
    }

    deleteLabel(labelId) {
        const index = STATE.tileLabels[this.tileKey].findIndex(l => l.id === labelId);
        if (index !== -1) {
            STATE.tileLabels[this.tileKey].splice(index, 1);
            saveState();
            this.updateTileLabelsList();
            updateStatistics();
            this.render();
            showNotification('Label deleted');
        }
    }

    updateTileLabelsList() {
        // Update the labels list to show only this tile's labels
        const container = document.getElementById('labels-container');
        container.innerHTML = '';

        const tileLabels = STATE.tileLabels[this.tileKey] || [];

        // Update count
        document.querySelector('.label-list h4').textContent =
            `Tile [${this.tab.row},${this.tab.col}] Labels (${tileLabels.length})`;

        tileLabels.forEach(label => {
            const item = document.createElement('div');
            item.className = 'label-item';
            item.innerHTML = `
                <div>
                    <span style="color: ${label.color}">■</span>
                    <strong>${label.name}</strong> (${label.category})
                </div>
                <div>
                    <button onclick="getCurrentTileManager().deleteLabel('${label.id}')">🗑️</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = this.viewState.zoom * zoomFactor;

        if (newZoom < 0.5 || newZoom > 10) return;

        this.viewState.offsetX = mouseX - (mouseX - this.viewState.offsetX) * zoomFactor;
        this.viewState.offsetY = mouseY - (mouseY - this.viewState.offsetY) * zoomFactor;
        this.viewState.zoom = newZoom;

        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.tab.tileImage) return;

        this.ctx.save();
        this.ctx.translate(this.viewState.offsetX, this.viewState.offsetY);
        this.ctx.scale(this.viewState.zoom, this.viewState.zoom);

        // Draw main tile
        this.ctx.drawImage(this.tab.tileImage, 0, 0, this.tab.tileImage.width, this.tab.tileImage.height);

        // Draw adjacent tile if present
        if (this.tab.adjacentImage) {
            this.ctx.drawImage(this.tab.adjacentImage,
                this.tab.tileImage.width, 0,
                this.tab.adjacentImage.width, this.tab.adjacentImage.height);
        }

        // Draw labels for this tile
        this.labels.forEach(label => {
            this.ctx.strokeStyle = label.color || '#4a9eff';
            this.ctx.lineWidth = 2 / this.viewState.zoom;
            this.ctx.strokeRect(label.x, label.y, label.width, label.height);

            // Draw label text
            this.ctx.fillStyle = label.color || '#4a9eff';
            this.ctx.font = `${12 / this.viewState.zoom}px sans-serif`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(label.name, label.x, label.y - 5 / this.viewState.zoom);
        });

        // Draw current box being drawn (in world coordinates, inside transform)
        if (this.drawState.currentBox) {
            this.ctx.strokeStyle = '#4a9eff';
            this.ctx.lineWidth = 2 / this.viewState.zoom;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(
                this.drawState.currentBox.x,
                this.drawState.currentBox.y,
                this.drawState.currentBox.width,
                this.drawState.currentBox.height
            );
            this.ctx.setLineDash([]);
        }

        this.ctx.restore();
    }
}

// Global canvas instances
let overviewCanvas = null;

function initializeOverviewCanvas() {
    overviewCanvas = new CanvasManager('overview-canvas', true);
    overviewCanvas.onLabelDrawn = (box) => {
        labelManager.createLabel(box);
    };
}
