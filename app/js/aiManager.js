// AI Manager - Handles OpenAI Vision API integration

class AIChatManager {
    constructor() {
        this.history = STATE.aiChatHistory;
        this.canvas = document.getElementById('ai-chat-canvas');
        this.renderHistory();
    }

    async queryImage(imageData, userQuestion, imageType = 'full') {
        if (!CONFIG.OPENAI_API_KEY) {
            showNotification('Please set your OpenAI API key in settings', 5000);
            return null;
        }

        // Convert canvas to base64
        const base64Image = imageData.toDataURL ?
            imageData.toDataURL('image/jpeg', 0.8).split(',')[1] :
            imageData;

        const payload = {
            model: CONFIG.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are an expert in analyzing NASA space imagery. Provide detailed, scientific observations about astronomical and planetary features."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userQuestion
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: CONFIG.MAX_TOKENS
        };

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                answer: data.choices[0].message.content,
                imageType: imageType,
                timestamp: new Date().toISOString(),
                tokens: data.usage.total_tokens,
                cost: estimateCost(data.usage.total_tokens)
            };
        } catch (error) {
            console.error('OpenAI API Error:', error);
            return { error: error.message };
        }
    }

    addMessage(question, answer, imageThumbnail, metadata) {
        const entry = {
            id: Date.now(),
            question: question,
            answer: answer,
            image: imageThumbnail,
            timestamp: new Date().toISOString(),
            imageType: metadata.imageType,
            tokens: metadata.tokens,
            cost: metadata.cost
        };

        this.history.push(entry);
        STATE.aiChatHistory = this.history;

        // Update totals
        STATE.totalTokens += metadata.tokens;
        STATE.totalCost = parseFloat(STATE.totalCost) + parseFloat(metadata.cost);

        saveState();
        this.renderMessage(entry);
        updateStatistics();
    }

    renderMessage(entry) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message';
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
                <span class="metadata">${entry.imageType} | ${entry.tokens} tokens | $${entry.cost}</span>
            </div>
            <div class="message-image">
                <img src="${entry.image}" alt="Query image">
            </div>
            <div class="message-question">
                <strong>Q:</strong> ${this.escapeHtml(entry.question)}
            </div>
            <div class="message-answer">
                <strong>A:</strong> ${this.formatAnswer(entry.answer)}
            </div>
            <div class="message-actions">
                <button onclick="aiChatManager.copyAnswer(${entry.id})">Copy</button>
                <button onclick="aiChatManager.exportMessage(${entry.id})">Export</button>
            </div>
        `;
        this.canvas.appendChild(messageDiv);
        this.canvas.scrollTop = this.canvas.scrollHeight;
    }

    renderHistory() {
        this.canvas.innerHTML = '';
        this.history.forEach(entry => this.renderMessage(entry));
    }

    copyAnswer(entryId) {
        const entry = this.history.find(e => e.id === entryId);
        if (entry) {
            copyToClipboard(entry.answer);
        }
    }

    exportMessage(entryId) {
        const entry = this.history.find(e => e.id === entryId);
        if (entry) {
            downloadJSON(entry, `ai_response_${entryId}.json`);
        }
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all AI chat history?')) {
            this.history = [];
            STATE.aiChatHistory = [];
            STATE.totalTokens = 0;
            STATE.totalCost = 0;
            this.canvas.innerHTML = '';
            saveState();
            updateStatistics();
            showNotification('Chat history cleared');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAnswer(text) {
        // Simple formatting: convert line breaks and bold markers
        return this.escapeHtml(text)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
}

// Global instance
const aiChatManager = new AIChatManager();

// UI Functions
async function askAI() {
    const userQuestion = document.getElementById('ai-question-input').value.trim();
    if (!userQuestion) {
        showNotification('Please enter a question');
        return;
    }

    // Check if API key is set
    if (!CONFIG.OPENAI_API_KEY) {
        showNotification('Please set your OpenAI API key in Settings first', 5000);
        return;
    }

    const imageSource = document.querySelector('input[name="image-source"]:checked').value;

    let imageData;
    if (imageSource === 'full') {
        imageData = document.getElementById('overview-canvas');
    } else {
        // Get active tab canvas or overview if no tab is active
        const activeTab = document.querySelector('.tab-content.active canvas');
        imageData = activeTab || document.getElementById('overview-canvas');
    }

    if (!imageData) {
        showNotification('No image available to analyze');
        return;
    }

    console.log('Sending AI query...', { question: userQuestion, imageSource: imageSource });

    showAILoading(true);

    const result = await aiChatManager.queryImage(imageData, userQuestion, imageSource);

    showAILoading(false);

    if (result && result.error) {
        console.error('AI query error:', result.error);
        showNotification(`AI Error: ${result.error}`, 5000);
        return;
    }

    if (!result) {
        console.error('AI query returned null');
        showNotification('AI query failed - no response', 5000);
        return;
    }

    console.log('AI response received:', { tokens: result.tokens, cost: result.cost });

    // Create thumbnail of queried image
    const thumbnail = createThumbnail(imageData, 200, 150);

    aiChatManager.addMessage(userQuestion, result.answer, thumbnail, {
        imageType: result.imageType,
        tokens: result.tokens,
        cost: result.cost
    });

    // Clear input
    document.getElementById('ai-question-input').value = '';

    // Switch to chat panel if not already active
    switchPanel('chat');

    showNotification('AI response received');
}

function clearChatHistory() {
    aiChatManager.clearHistory();
}
