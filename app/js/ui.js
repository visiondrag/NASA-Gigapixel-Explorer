// UI Functions and Event Handlers

// Tab Management
class TabManager {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.tabsContainer = document.getElementById('detail-tabs-container');
        this.tabsList = document.getElementById('tabs-list');
        this.tabContents = document.getElementById('tab-contents');
    }

    openTab(row, col, adjacentRow = null, adjacentCol = null) {
        const tabId = `tab_${row}_${col}`;

        // Check if tab already exists
        const existingTab = this.tabs.find(t => t.id === tabId);
        if (existingTab) {
            this.activateTab(tabId);
            showNotification(`Switched to existing tab [${row}, ${col}]`);
            return;
        }

        // Create new tab
        const tab = {
            id: tabId,
            row: row,
            col: col,
            adjacentRow: adjacentRow,
            adjacentCol: adjacentCol,
            canvas: null
        };

        this.tabs.push(tab);
        this.createTabUI(tab);
        this.activateTab(tabId);
        this.loadTabContent(tab);

        // Show tabs container
        this.tabsContainer.classList.add('active');
        document.getElementById('overview-container').classList.remove('active');

        showNotification(`Opened region [${row}, ${col}] in new tab (${this.tabs.length} tabs open)`);
    }

    createTabUI(tab) {
        // Create tab button
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button';
        tabButton.dataset.tabId = tab.id;
        tabButton.innerHTML = `
            Region ${tab.row},${tab.col}
            <span class="close-tab" onclick="event.stopPropagation(); tabManager.closeTab('${tab.id}')">✕</span>
        `;
        tabButton.onclick = () => this.activateTab(tab.id);
        this.tabsList.appendChild(tabButton);

        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.dataset.tabId = tab.id;
        tabContent.innerHTML = `
            <canvas id="canvas_${tab.id}"></canvas>
        `;
        this.tabContents.appendChild(tabContent);
    }

    async loadTabContent(tab) {
        const canvas = document.getElementById(`canvas_${tab.id}`);
        if (!canvas) {
            console.error('Canvas not found for tab:', tab.id);
            return;
        }

        showLoading(true);

        try {
            // Get highest zoom level for detail view
            const maxZoomLevel = imageManager.metadata.zoom_levels - 1;

            console.log(`Loading tile [${tab.row}, ${tab.col}] at zoom level ${maxZoomLevel}`);

            // Load tile
            const tileImage = await imageManager.loadTile(maxZoomLevel, tab.row, tab.col);

            if (tileImage) {
                console.log(`Tile loaded successfully, size: ${tileImage.width}x${tileImage.height}`);

                // Store the tile image in the tab
                tab.tileImage = tileImage;

                // Load adjacent tile if specified
                if (tab.adjacentRow !== null && tab.adjacentCol !== null) {
                    const adjacentTile = await imageManager.loadTile(
                        maxZoomLevel,
                        tab.adjacentRow,
                        tab.adjacentCol
                    );
                    if (adjacentTile) {
                        tab.adjacentImage = adjacentTile;
                    }
                }

                // Create canvas manager for this tab with zoom/pan capabilities
                // DetailCanvasManager will handle canvas setup and rendering
                tab.canvasManager = new DetailCanvasManager(`canvas_${tab.id}`, tab);

                showNotification(`Loaded tile [${tab.row}, ${tab.col}]`);
            } else {
                console.error('Failed to load tile image');
                showNotification('Failed to load tile image', 5000);
            }

            showLoading(false);
        } catch (error) {
            console.error('Error loading tab content:', error);
            showLoading(false);
            showNotification(`Error loading region: ${error.message}`, 5000);
        }
    }

    activateTab(tabId) {
        // Deactivate all tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Activate selected tab
        const button = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (button) {
            button.classList.add('active');
        }

        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
        if (content) {
            content.classList.add('active');
        }

        this.activeTabId = tabId;

        // Update label list for this tab
        const activeTab = this.tabs.find(t => t.id === tabId);
        if (activeTab && activeTab.canvasManager) {
            activeTab.canvasManager.updateTileLabelsList();
        }
    }

    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        this.tabs.splice(index, 1);

        // Remove UI elements
        const button = document.querySelector(`.tab-button[data-tab-id="${tabId}"]`);
        const content = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);

        if (button) button.remove();
        if (content) content.remove();

        // If this was the active tab, activate another
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                this.activateTab(this.tabs[0].id);
            } else {
                // No more tabs, show overview
                this.tabsContainer.classList.remove('active');
                document.getElementById('overview-container').classList.add('active');
            }
        }
    }

    closeAllTabs() {
        if (this.tabs.length === 0) return;

        if (confirm('Close all detail views?')) {
            this.tabs = [];
            this.tabsList.innerHTML = '';
            this.tabContents.innerHTML = '';
            this.tabsContainer.classList.remove('active');
            document.getElementById('overview-container').classList.add('active');
        }
    }
}

const tabManager = new TabManager();

// Panel switching
function switchPanel(panelName) {
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.panel-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`.panel-tab[onclick="switchPanel('${panelName}')"]`)?.classList.add('active');
    document.getElementById(`${panelName}-panel`)?.classList.add('active');

    if (panelName === 'chat') {
        document.getElementById('ai-chat-panel').classList.add('active');
    } else if (panelName === 'info') {
        document.getElementById('info-panel').classList.add('active');
    }
}

// Zoom controls
function zoomIn() {
    if (overviewCanvas) {
        overviewCanvas.zoom(1.2);
    }
}

function zoomOut() {
    if (overviewCanvas) {
        overviewCanvas.zoom(0.8);
    }
}

function resetView() {
    if (overviewCanvas) {
        overviewCanvas.reset();
    }
}

// Settings modal
function openSettings() {
    document.getElementById('settings-modal').classList.add('active');
    updateAPIKeyStatus();
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function updateAPIKeyStatus() {
    const statusEl = document.getElementById('api-key-status');
    if (CONFIG.OPENAI_API_KEY) {
        const masked = CONFIG.OPENAI_API_KEY.substring(0, 7) + '...' + CONFIG.OPENAI_API_KEY.substring(CONFIG.OPENAI_API_KEY.length - 4);
        statusEl.innerHTML = `✅ <strong>API Key configured:</strong> ${masked}`;
        statusEl.style.color = 'var(--accent-green, #10b981)';
    } else {
        statusEl.innerHTML = '❌ <strong>No API key set</strong> - AI features disabled';
        statusEl.style.color = 'var(--text-secondary)';
    }
}

function saveAPIKey() {
    const key = document.getElementById('openai-key-input').value.trim();
    if (key) {
        localStorage.setItem('openai_api_key', key);
        CONFIG.OPENAI_API_KEY = key;
        updateAPIKeyStatus();
        showNotification('API key saved successfully');
    } else {
        showNotification('Please enter a valid API key');
    }
}

function toggleGrid() {
    STATE.settings.showGrid = document.getElementById('show-grid').checked;
    saveState();
    if (overviewCanvas) {
        overviewCanvas.render();
    }
}

function toggleMinimap() {
    STATE.settings.showMinimap = document.getElementById('show-minimap').checked;
    const minimap = document.querySelector('.minimap');
    if (minimap) {
        minimap.style.display = STATE.settings.showMinimap ? 'block' : 'none';
    }
    saveState();
}

function clearCache() {
    if (confirm('Clear all cached tiles?')) {
        imageManager.clearCache();
    }
}

// Help modal
function openHelp() {
    document.getElementById('help-modal').classList.add('active');
}

function closeHelp() {
    document.getElementById('help-modal').classList.remove('active');
}

// Button event handlers
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('settings-btn').onclick = openSettings;
    document.getElementById('help-btn').onclick = openHelp;

    // Enter key for AI question
    document.getElementById('ai-question-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            askAI();
        }
    });

    // Load saved settings
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        document.getElementById('openai-key-input').value = savedKey;
    }

    document.getElementById('show-grid').checked = STATE.settings.showGrid;
    document.getElementById('show-minimap').checked = STATE.settings.showMinimap;
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore if typing in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    switch (e.key) {
        case ' ':
            e.preventDefault();
            activateSelectMode();
            break;
        case '+':
        case '=':
            e.preventDefault();
            zoomIn();
            break;
        case '-':
            e.preventDefault();
            zoomOut();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            resetView();
            break;
        case 'd':
        case 'D':
            e.preventDefault();
            activateDrawMode();
            break;
        case 'Escape':
            activateSelectMode();
            break;
    }
});

function closeAllTabs() {
    tabManager.closeAllTabs();
}

function openTileByNumber() {
    const row = parseInt(document.getElementById('tile-row').value);
    const col = parseInt(document.getElementById('tile-col').value);

    if (isNaN(row) || isNaN(col)) {
        showNotification('Please enter valid row and column numbers');
        return;
    }

    if (!imageManager.metadata) {
        showNotification('No image loaded');
        return;
    }

    const grid = imageManager.metadata.grid;
    if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) {
        showNotification(`Invalid tile: must be 0-${grid.rows-1} for row, 0-${grid.cols-1} for col`);
        return;
    }

    tabManager.openTab(row, col);
}

// Helper function to get current tile manager
function getCurrentTileManager() {
    if (!tabManager || !tabManager.activeTabId) {
        return null;
    }
    const activeTab = tabManager.tabs.find(t => t.id === tabManager.activeTabId);
    return activeTab ? activeTab.canvasManager : null;
}
