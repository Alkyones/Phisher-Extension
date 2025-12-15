// Background service worker for Chrome Extension
class BackgroundService {
    constructor() {
        // Use production API URL when extension is packaged, localhost for development
        this.apiUrl = chrome.runtime.getManifest().key ? 
            'https://your-api-domain.com' : // Production URL
            'http://localhost:8080'; // Development URL
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupContextMenus();
    }

    setupEventListeners() {
        // Listen for messages from content script and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Will respond asynchronously
        });

        // Handle installation
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                this.handleInstallation();
            }
        });
    }

    setupContextMenus() {
        try {
            chrome.contextMenus.create({
                id: 'analyzeLink',
                title: 'Check link safety',
                contexts: ['link']
            });

            chrome.contextMenus.onClicked.addListener((info, tab) => {
                this.handleContextMenuClick(info, tab);
            });
        } catch (error) {
            console.log('Context menus setup error:', error);
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.type) {
                case 'ANALYZE_URL':
                    const result = await this.analyzeUrl(request.url);
                    sendResponse({ success: true, result });
                    break;
                case 'GET_STATS':
                    const stats = await this.getStats();
                    sendResponse({ success: true, stats });
                    break;
                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleContextMenuClick(info, tab) {
        if (info.menuItemId === 'analyzeLink') {
            const linkUrl = info.linkUrl;
            // Open popup with the link URL
            chrome.action.openPopup();
        }
    }

    async handleInstallation() {
        console.log('Extension installed successfully');
        // Initialize default settings
        chrome.storage.local.set({
            stats: {
                totalChecks: 0,
                threatsBlocked: 0,
                safeUrls: 0
            }
        });
    }

    async analyzeUrl(url) {
        try {
            const response = await fetch(`${this.apiUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    }

    async getStats() {
        const result = await chrome.storage.local.get(['stats']);
        return result.stats || {
            totalChecks: 0,
            threatsBlocked: 0,
            safeUrls: 0
        };
    }
}

// Initialize the background service
const backgroundService = new BackgroundService();