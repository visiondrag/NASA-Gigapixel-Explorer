// Utility Functions

function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showAILoading(show = true) {
    showLoading(show);
}

function createThumbnail(canvasElement, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvasElement, 0, 0, width, height);
    return tempCanvas.toDataURL('image/jpeg', 0.8);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    });
}

function showNotification(message, duration = 3000) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.background = 'var(--accent-blue)';
    notification.style.color = 'white';
    notification.style.padding = '1rem 1.5rem';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '3000';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function parseCoordinates(input) {
    // Parse coordinate input like "1234, 5678" or "1234 5678"
    const match = input.match(/(\d+)[,\s]+(\d+)/);
    if (match) {
        return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return null;
}

function estimateCost(tokens) {
    const costPerToken = 0.00003; // Adjust based on current pricing
    return (tokens * costPerToken).toFixed(4);
}

function updateStatistics() {
    // Count total labels across all tiles
    let totalLabels = 0;
    Object.keys(STATE.tileLabels).forEach(key => {
        totalLabels += STATE.tileLabels[key].length;
    });

    document.getElementById('stat-labels').textContent = totalLabels;
    document.getElementById('stat-tiles').textContent = STATE.loadedTiles.size;
    document.getElementById('stat-queries').textContent = STATE.aiChatHistory.length;
    document.getElementById('total-tokens').textContent = `Tokens: ${STATE.totalTokens}`;
    document.getElementById('total-cost').textContent = `Cost: $${STATE.totalCost}`;
}

function updateMetadata(data) {
    if (!data) return;

    document.getElementById('meta-source').textContent = data.source_image || '-';
    document.getElementById('meta-dimensions').textContent =
        `${data.original_width} x ${data.original_height}`;
    document.getElementById('meta-mission').textContent = data.mission || 'N/A';
    document.getElementById('meta-date').textContent = data.date || 'N/A';
    document.getElementById('meta-wavelength').textContent = data.wavelength || 'N/A';
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
