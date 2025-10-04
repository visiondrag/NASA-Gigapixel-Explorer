// Client-Side Image Processor
// Processes large images into tiles directly in the browser

class ImageProcessor {
    constructor() {
        this.sourceImage = null;
        this.tileSize = 512;
        this.tiles = {};
        this.metadata = null;
    }

    async processUploadedImage(file) {
        updateStatus('Loading image...', 10);

        // Load the image
        const img = await this.loadImageFromFile(file);
        this.sourceImage = img;

        const width = img.naturalWidth;
        const height = img.naturalHeight;

        console.log(`Image loaded: ${width}x${height}`);
        updateStatus(`Image loaded: ${width}x${height}`, 20);

        // Generate overview
        updateStatus('Creating overview...', 30);
        const overview = await this.generateOverview(img, width, height);

        // Calculate zoom levels
        const zoomLevels = this.calculateZoomLevels(width, height);
        console.log(`Will generate ${zoomLevels} zoom levels`);

        // Generate metadata structure
        this.metadata = {
            source_image: file.name,
            original_width: width,
            original_height: height,
            tile_size: this.tileSize,
            overview: {
                image: overview.image,
                width: overview.width,
                height: overview.height
            },
            zoom_levels: zoomLevels,
            pyramid: [],
            grid: null
        };

        // Generate pyramid
        updateStatus('Generating tiles...', 40);
        await this.generatePyramid(img, width, height, zoomLevels);

        updateStatus('Complete!', 100);

        return this.metadata;
    }

    loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async generateOverview(img, width, height, maxWidth = 1440, maxHeight = 900) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        const newWidth = Math.floor(width * ratio);
        const newHeight = Math.floor(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to image object
        const overviewImg = new Image();
        await new Promise((resolve) => {
            overviewImg.onload = resolve;
            overviewImg.src = canvas.toDataURL('image/jpeg', 0.85);
        });

        return {
            image: overviewImg,
            width: newWidth,
            height: newHeight
        };
    }

    calculateZoomLevels(width, height) {
        const maxDimension = Math.max(width, height);
        const zoomLevels = Math.ceil(Math.log2(maxDimension / this.tileSize)) + 1;
        return Math.max(1, zoomLevels);
    }

    async generatePyramid(img, width, height, zoomLevels) {
        for (let level = 0; level < zoomLevels; level++) {
            const scaleFactor = 1.0 / Math.pow(2, zoomLevels - level - 1);
            const progress = 40 + (level / zoomLevels) * 55;
            updateStatus(`Generating zoom level ${level + 1}/${zoomLevels}...`, progress);

            await this.generateTilesForLevel(img, width, height, level, scaleFactor);
        }
    }

    async generateTilesForLevel(img, originalWidth, originalHeight, zoomLevel, scaleFactor) {
        const scaledWidth = Math.floor(originalWidth * scaleFactor);
        const scaledHeight = Math.floor(originalHeight * scaleFactor);

        // Create scaled canvas
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Calculate grid
        const cols = Math.ceil(scaledWidth / this.tileSize);
        const rows = Math.ceil(scaledHeight / this.tileSize);

        const levelData = {
            zoom_level: zoomLevel,
            scale_factor: scaleFactor,
            cols: cols,
            rows: rows,
            scaled_width: scaledWidth,
            scaled_height: scaledHeight,
            tiles: []
        };

        // Generate tiles for this level
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * this.tileSize;
                const y = row * this.tileSize;
                const tileWidth = Math.min(this.tileSize, scaledWidth - x);
                const tileHeight = Math.min(this.tileSize, scaledHeight - y);

                // Create tile canvas
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = tileWidth;
                tileCanvas.height = tileHeight;
                const tileCtx = tileCanvas.getContext('2d');

                // Draw tile
                tileCtx.drawImage(
                    scaledCanvas,
                    x, y, tileWidth, tileHeight,
                    0, 0, tileWidth, tileHeight
                );

                // Convert to image and store
                const tileImg = new Image();
                await new Promise((resolve) => {
                    tileImg.onload = resolve;
                    tileImg.src = tileCanvas.toDataURL('image/jpeg', 0.85);
                });

                const tileKey = `${zoomLevel}_${row}_${col}`;
                this.tiles[tileKey] = tileImg;

                levelData.tiles.push({
                    row: row,
                    col: col,
                    x: x,
                    y: y,
                    width: tileWidth,
                    height: tileHeight
                });
            }
        }

        this.metadata.pyramid.push(levelData);

        // Update grid info with highest resolution
        if (zoomLevel === this.metadata.zoom_levels - 1) {
            this.metadata.grid = {
                cols: cols,
                rows: rows
            };
        }
    }

    getTile(zoomLevel, row, col) {
        const key = `${zoomLevel}_${row}_${col}`;
        return this.tiles[key] || null;
    }
}

// Global processor instance
const imageProcessor = new ImageProcessor();

// UI Functions
function updateStatus(message, progress) {
    const statusDiv = document.getElementById('processing-status');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');

    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusText.textContent = message;
        progressBar.style.width = progress + '%';
    }
}

async function handleImageUpload(file) {
    if (!file) return;

    // Check file size (limit 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showNotification('File too large. Please use an image under 100MB.', 5000);
        return;
    }

    console.log('Processing uploaded image:', file.name);

    try {
        // Process the image
        const metadata = await imageProcessor.processUploadedImage(file);

        console.log('Processing complete', metadata);

        // Update global state
        STATE.imageData = metadata;
        imageManager.metadata = metadata;
        imageManager.overviewImage = metadata.overview.image;

        // Replace image manager's tile loading
        const originalLoadTile = imageManager.loadTile.bind(imageManager);
        imageManager.loadTile = async function(zoomLevel, row, col) {
            const tile = imageProcessor.getTile(zoomLevel, row, col);
            if (tile) {
                // Cache it
                const key = `${zoomLevel}_${row}_${col}`;
                this.tileCache.set(key, tile);
                STATE.loadedTiles.set(key, true);
                updateStatistics();
                return tile;
            }
            return null;
        };

        // Hide upload section, show viewer
        document.getElementById('upload-section').classList.remove('active');
        document.getElementById('overview-container').classList.add('active');

        // Initialize overview canvas
        if (!overviewCanvas) {
            initializeOverviewCanvas();
        }

        // Render
        updateMetadata(metadata);
        overviewCanvas.render();

        showNotification('Image loaded successfully!');

    } catch (error) {
        console.error('Error processing image:', error);
        showNotification('Error processing image: ' + error.message, 5000);
        document.getElementById('processing-status').style.display = 'none';
    }
}

// Setup drag and drop
function setupImageUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('image-upload');

    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    });
}

// Load sample image (existing preprocessed data)
async function loadSampleImage() {
    try {
        showLoading(true);

        // Load existing data
        const response = await fetch(CONFIG.DATA_PATH + 'image_data.json');
        const metadata = await response.json();

        STATE.imageData = metadata;
        imageManager.metadata = metadata;

        // Load overview
        await imageManager.loadOverview();

        // Hide upload section, show viewer
        document.getElementById('upload-section').classList.remove('active');
        document.getElementById('overview-container').classList.add('active');

        // Initialize overview canvas
        if (!overviewCanvas) {
            initializeOverviewCanvas();
        }

        // Render
        updateMetadata(metadata);
        overviewCanvas.render();

        showLoading(false);
        showNotification('Sample image loaded!');

    } catch (error) {
        console.error('Error loading sample:', error);
        showNotification('Sample image not found. Please upload your own image.', 5000);
        showLoading(false);
    }
}
