// Main Application Entry Point

async function initializeApp() {
    console.log('Initializing NASA Gigapixel Explorer...');

    // Load saved state
    loadState();

    // Setup image upload interface
    setupImageUpload();

    // Check if there's existing preprocessed data (sample)
    // But don't auto-load it - let user choose

    // Restore AI chat history if exists
    if (STATE.aiChatHistory.length > 0) {
        aiChatManager.renderHistory();
    }

    // Update statistics
    updateStatistics();

    console.log('NASA Gigapixel Explorer ready. Upload an image to begin.');
}

function showInstructions() {
    const instructionsHTML = `
        <div style="padding: 2rem; text-align: center;">
            <h2>Welcome to NASA Gigapixel Explorer!</h2>
            <p style="margin: 1.5rem 0;">To get started, you need to preprocess a large image:</p>
            <ol style="text-align: left; max-width: 600px; margin: 0 auto; line-height: 1.8;">
                <li>Place a large NASA image in the project directory</li>
                <li>Run: <code style="background: var(--accent-bg); padding: 0.25rem 0.5rem; border-radius: 4px;">python preprocess_image.py your_image.jpg app/data</code></li>
                <li>Refresh this page</li>
            </ol>
            <p style="margin-top: 1.5rem;">
                <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: var(--accent-blue); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 1rem;">
                    Reload Application
                </button>
            </p>
        </div>
    `;

    document.querySelector('.viewer-area').innerHTML = instructionsHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Auto-save state periodically
setInterval(() => {
    saveState();
}, 30000); // Every 30 seconds

// Before unload, save state
window.addEventListener('beforeunload', () => {
    saveState();
});

console.log('NASA Gigapixel Explorer loaded');
