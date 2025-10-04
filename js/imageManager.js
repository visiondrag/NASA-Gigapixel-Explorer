// Image Manager - Handles loading and caching of image tiles

class ImageManager {
    constructor() {
        this.metadata = null;
        this.overviewImage = null;
        this.tileCache = new Map();
    }

    async loadImageData() {
        try {
            showLoading(true);
            const response = await fetch(CONFIG.DATA_PATH + 'image_data.json');
            this.metadata = await response.json();

            STATE.imageData = this.metadata;
            updateMetadata(this.metadata);

            // Load overview image
            await this.loadOverview();

            showLoading(false);
            return this.metadata;
        } catch (error) {
            console.error('Error loading image data:', error);
            showNotification('Error loading image data', 5000);
            showLoading(false);
            throw error;
        }
    }

    async loadOverview() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.overviewImage = img;
                resolve(img);
            };
            img.onerror = reject;
            img.src = CONFIG.DATA_PATH + this.metadata.overview.path;
        });
    }

    async loadTile(zoomLevel, row, col) {
        const key = `${zoomLevel}_${row}_${col}`;

        // Check cache
        if (this.tileCache.has(key)) {
            console.log(`Tile ${key} found in cache`);
            return this.tileCache.get(key);
        }

        // Load tile
        const tilePath = `${CONFIG.DATA_PATH}tiles/zoom_${zoomLevel}/tile_${row}_${col}.jpg`;
        console.log(`Loading tile from: ${tilePath}`);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log(`✓ Tile loaded successfully: ${tilePath} (${img.width}x${img.height})`);
                if (CONFIG.CACHE_ENABLED) {
                    this.tileCache.set(key, img);
                    STATE.loadedTiles.set(key, true);
                    updateStatistics();
                }
                resolve(img);
            };
            img.onerror = (error) => {
                console.error(`✗ Failed to load tile: ${tilePath}`, error);
                resolve(null); // Don't reject, just return null
            };
            img.src = tilePath;
        });
    }

    async loadTilesForRegion(zoomLevel, startRow, startCol, numRows, numCols) {
        const tiles = [];
        const promises = [];

        for (let row = startRow; row < startRow + numRows; row++) {
            for (let col = startCol; col < startCol + numCols; col++) {
                const promise = this.loadTile(zoomLevel, row, col).then(img => {
                    if (img) {
                        tiles.push({ row, col, img });
                    }
                });
                promises.push(promise);
            }
        }

        await Promise.all(promises);
        return tiles;
    }

    getZoomLevelData(level) {
        if (!this.metadata || !this.metadata.pyramid) return null;
        return this.metadata.pyramid[level];
    }

    getTileInfo(zoomLevel, row, col) {
        const levelData = this.getZoomLevelData(zoomLevel);
        if (!levelData) return null;

        return levelData.tiles.find(t => t.row === row && t.col === col);
    }

    clearCache() {
        this.tileCache.clear();
        STATE.loadedTiles.clear();
        updateStatistics();
        showNotification('Cache cleared');
    }
}

// Global instance
const imageManager = new ImageManager();
