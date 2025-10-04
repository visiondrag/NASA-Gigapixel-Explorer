// Configuration
const CONFIG = {
    OPENAI_API_KEY: localStorage.getItem('openai_api_key') || '',
    OPENAI_MODEL: 'gpt-4o',  // Updated to current model (was gpt-4-vision-preview)
    MAX_TOKENS: 1000,
    TILE_SIZE: 512,
    DATA_PATH: 'data/',
    CACHE_ENABLED: true
};

// Application State
const STATE = {
    imageData: null,
    currentZoom: 1,
    currentPosition: { x: 0, y: 0 },
    activeTool: null,
    labels: [], // Global labels (not used for now, reserved for future)
    tileLabels: {}, // Labels per tile: { "row_col": [...labels] }
    openTabs: [],
    activeTab: null,
    aiChatHistory: [],
    totalTokens: 0,
    totalCost: 0,
    loadedTiles: new Map(),
    settings: {
        showGrid: true,
        showMinimap: true,
        tileSize: 512
    }
};

// Load saved state
function loadState() {
    const savedLabels = localStorage.getItem('labels');
    if (savedLabels) {
        STATE.labels = JSON.parse(savedLabels);
    }

    const savedTileLabels = localStorage.getItem('tileLabels');
    if (savedTileLabels) {
        STATE.tileLabels = JSON.parse(savedTileLabels);
    }

    const savedHistory = localStorage.getItem('ai_chat_history');
    if (savedHistory) {
        STATE.aiChatHistory = JSON.parse(savedHistory);
    }

    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        STATE.settings = { ...STATE.settings, ...JSON.parse(savedSettings) };
    }
}

// Save state
function saveState() {
    localStorage.setItem('labels', JSON.stringify(STATE.labels));
    localStorage.setItem('tileLabels', JSON.stringify(STATE.tileLabels));
    localStorage.setItem('ai_chat_history', JSON.stringify(STATE.aiChatHistory));
    localStorage.setItem('settings', JSON.stringify(STATE.settings));
}
