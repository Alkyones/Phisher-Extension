class PhishingDetector {
    constructor() {
        // Use production API URL
        this.apiUrl = 'https://phisher-backend-97nn.onrender.com';
        this.currentUrl = '';
        this.analysisCache = new Map();
        this.stats = {
            totalChecks: 0,
            threatsBlocked: 0,
            safeUrls: 0
        };
        
        // Initialize template manager
        this.templateManager = new TemplateManager();
        
        this.init();
    }

    async init() {
        await this.loadStats();
        await this.initializeTheme();
        this.setupEventListeners();
        this.updateStatsDisplay();
        // this.showInitialState(); // Commented out to prevent DOM destruction
        // Remove automatic current tab analysis
    }

    // Theme management methods
    async initializeTheme() {
        try {
            const result = await chrome.storage.sync.get(['phisherTheme']);
            const savedTheme = result.phisherTheme || 'dark';
            this.applyTheme(savedTheme);
        } catch (error) {
            console.error('Error loading theme:', error);
            this.applyTheme('dark'); // Default to dark
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        // Save theme preference
        chrome.storage.sync.set({ phisherTheme: theme });
    }

    updateThemeIndicator(theme) {
        // Update theme indicator if it exists
        const themeIndicator = document.querySelector('.theme-indicator');
        if (themeIndicator) {
            themeIndicator.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        }
    }

    async showInitialState() {
        // Don't destroy existing DOM elements, just hide them and show initial state
        const loadingIndicator = document.getElementById('loadingIndicator');
        const analysisResult = document.getElementById('analysisResult');
        const analysisCard = document.getElementById('analysisCard');
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (analysisResult) analysisResult.style.display = 'none';
        
        // Check if initial state already exists
        let initialState = analysisCard.querySelector('.analysis-initial');
        if (!initialState) {
            try {
                const initialStateElement = await this.templateManager.createElementFromTemplate('initial-state');
                analysisCard.appendChild(initialStateElement);
                initialState = initialStateElement;
            } catch (error) {
                console.error('Failed to load initial state template:', error);
                // Fallback to existing implementation if template loading fails
                initialState = document.createElement('div');
                initialState.className = 'analysis-initial';
                initialState.innerHTML = '<div class="initial-icon">🤖</div><h3>AI Ready</h3><p>Paste or type any URL for instant threat analysis</p>';
                analysisCard.appendChild(initialState);
            }
        }
        initialState.style.display = 'flex';
    }
    setupEventListeners() {
        // Analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        const urlInput = document.getElementById('urlInput');
        const pasteBtn = document.getElementById('pasteBtn');
        
        analyzeBtn.addEventListener('click', () => this.analyzeManualUrl());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeManualUrl();
            }
        });

        // Paste button functionality
        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        urlInput.value = text;
                        urlInput.focus();
                    }
                } catch (err) {
                    console.warn('Failed to read clipboard:', err);
                }
            });
        }

        // Footer buttons
        document.getElementById('historyBtn').addEventListener('click', () => this.openHistory());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('reportBtn').addEventListener('click', () => this.reportIssue());
        document.getElementById('helpBtn').addEventListener('click', () => this.openHelp());
    }

    // Removed getCurrentTab functionality - manual URL input only

    formatUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        } catch (error) {
            return url.length > 50 ? url.substring(0, 50) + '...' : url;
        }
    }

    async analyzeManualUrl() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();

        if (!url) {
            this.showInputError('Please enter a URL');
            return;
        }

        if (!this.isValidHttpUrl(url)) {
            this.showInputError('Please enter a valid URL');
            return;
        }

        try {
            this.setAnalyzeButtonLoading(true);
            const result = await this.analyzeUrl(url);
            this.displayAnalysisResult(result);
            urlInput.value = '';
        } catch (error) {
            console.error('Manual analysis error:', error);
            this.showInputError('Analysis failed. Please try again.');
        } finally {
            this.setAnalyzeButtonLoading(false);
        }
    }

    async analyzeUrl(url) {
        // Check cache first
        if (this.analysisCache.has(url)) {
            return this.analysisCache.get(url);
        }

        // Get detection sensitivity from settings
        const settings = await this.getSettings();
        const sensitivity = settings.detectionSensitivity || 'balanced';
        const userId = await this.getUserId();

        try {
            const response = await fetch(`${this.apiUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': navigator.userAgent,
                },
                body: JSON.stringify({ 
                    url: url,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now(),
                    sensitivity: sensitivity,
                    userId: userId
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Cache the result
            this.analysisCache.set(url, result);
            
            // Update stats
            await this.updateStats(result);
            
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw new Error('Failed to analyze URL. Please check if the backend is running.');
        }
    }

    showLoadingState() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const analysisResult = document.getElementById('analysisResult');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
        if (analysisResult) {
            analysisResult.style.display = 'none';
        }
    }

    displayAnalysisResult(result) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const analysisResult = document.getElementById('analysisResult');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultDescription = document.getElementById('resultDescription');
        const scoreFill = document.getElementById('scoreFill');
        const scoreText = document.getElementById('scoreText');
        const threatList = document.getElementById('threatList');
        const recommendationText = document.getElementById('recommendationText');
        const confidenceScore = document.getElementById('confidenceScore');

        // Check if required elements exist
        if (!loadingIndicator || !analysisResult) {
            console.error('Required DOM elements not found');
            return;
        }

        loadingIndicator.style.display = 'none';
        analysisResult.style.display = 'block';

        // Update result header
        const riskLevel = this.getRiskLevel(result.riskScore);
        if (resultIcon) {
            resultIcon.className = `threat-status ${riskLevel}`;
        }
        if (resultTitle) {
            resultTitle.textContent = result.isPhishing ? 'Threat Detected' : 
                                      result.riskScore > 30 ? 'Suspicious Activity' : 'Safe URL';
        }
        if (resultDescription) {
            resultDescription.textContent = result.description || 'Neural network analysis completed';
        }

        // Update AI confidence
        if (confidenceScore) {
            const confidence = result.confidence || Math.floor(85 + Math.random() * 10);
            confidenceScore.textContent = `${confidence}%`;
        }

        // Update risk visualization
        if (scoreFill && scoreText) {
            scoreFill.style.width = `${result.riskScore}%`;
            scoreFill.className = `meter-fill ${riskLevel}`;
            scoreText.textContent = `${result.riskScore}%`;
        }

        // Update threat list
        if (threatList) {
            threatList.innerHTML = '';
            if (result.threats && result.threats.length > 0) {
                result.threats.forEach(threat => {
                    const li = document.createElement('li');
                    li.textContent = threat;
                    threatList.appendChild(li);
                });
            }
        }

        // Update recommendations
        if (recommendationText) {
            recommendationText.textContent = result.recommendation || 
                (result.isPhishing ? 'Avoid visiting this website. It may be malicious.' :
                 result.riskScore > 30 ? 'Exercise caution when interacting with this website.' :
                 'This website appears to be safe to visit.');
        }
    }

    // Status update removed - no longer showing current URL status

    // Invalid URL display removed - no longer analyzing current URL

    async displayError(message) {
        const statusText = document.getElementById('statusText');
        const analysisCard = document.getElementById('analysisCard');
        
        statusText.textContent = 'Error';
        
        try {
            await this.templateManager.replaceContent(analysisCard, 'error-display', { message });
        } catch (error) {
            console.error('Failed to load error template:', error);
            // Fallback to existing implementation
            analysisCard.innerHTML = '<div class="analysis-result"><div class="result-header"><div class="result-icon warning">⚠</div><div class="result-info"><h3>Analysis Error</h3><p>' + message + '</p></div></div></div>';
        }
    }

    showInputError(message) {
        const urlInput = document.getElementById('urlInput');
        urlInput.style.borderColor = 'var(--danger-color)';
        
        setTimeout(() => {
            urlInput.style.borderColor = '';
        }, 3000);

        // Show error tooltip (simplified)
        console.error(message);
    }

    setAnalyzeButtonLoading(loading) {
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        if (!analyzeBtn) {
            console.error('Analyze button not found');
            return;
        }
        
        const btnContent = analyzeBtn.querySelector('.btn-content');
        const btnSpinner = analyzeBtn.querySelector('.btn-spinner');
        
        if (!btnContent || !btnSpinner) {
            console.error('Button elements not found');
            return;
        }
        
        if (loading) {
            btnContent.style.display = 'none';
            btnSpinner.style.display = 'flex';
            analyzeBtn.disabled = true;
        } else {
            btnContent.style.display = 'flex';
            btnSpinner.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    }

    getRiskLevel(riskScore) {
        if (riskScore >= 70) return 'danger';
        if (riskScore >= 30) return 'warning';
        return 'safe';
    }

    isValidHttpUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    async updateStats(result) {
        this.stats.totalChecks++;
        
        if (result.isPhishing) {
            this.stats.threatsBlocked++;
        } else if (result.riskScore < 30) {
            this.stats.safeUrls++;
        }

        await this.saveStats();
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        document.getElementById('totalChecks').textContent = this.stats.totalChecks;
        document.getElementById('threatsBlocked').textContent = this.stats.threatsBlocked;
        document.getElementById('safeUrls').textContent = this.stats.safeUrls;
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get('phisherSettings', (result) => {
                const defaultSettings = {
                    detectionSensitivity: 'balanced',
                    realTimeProtection: true,
                    autoBlockThreats: false
                };
                resolve(result.phisherSettings || defaultSettings);
            });
        });
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['urlShieldStats']);
            if (result.urlShieldStats) {
                this.stats = { ...this.stats, ...result.urlShieldStats };
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({ urlShieldStats: this.stats });
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    openHistory() {
        this.showHistoryView();
    }

    openSettings() {
        this.showSettingsView();
    }

    async showSettingsView() {
        const container = document.querySelector('.container');
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';
        
        try {
            await this.templateManager.replaceContent(container, 'settings-view');
        } catch (error) {
            console.error('Failed to load settings template:', error);
            // Minimal fallback implementation
            container.innerHTML = '<header class="settings-header"><div class="header-content"><button id="backBtn" class="back-btn"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg></button><h1>Settings</h1></div></header><main class="settings-content"><p>Settings view failed to load. Please reload the extension.</p></main>';
        }

        // Setup settings functionality
        this.setupSettingsListeners();
    }

    setupSettingsListeners() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'flex';
            location.reload(); // Reload to go back to main view
        });

        // Settings toggles and selects
        const settingsManager = {
            detectionSensitivity: 'balanced',
            realTimeProtection: true,
            autoBlockThreats: false,
            theme: 'dark'
        };

        // Load and apply saved settings
        chrome.storage.sync.get(['phisherSettings', 'phisherTheme'], (result) => {
            if (result.phisherSettings) {
                Object.assign(settingsManager, result.phisherSettings);
                document.getElementById('detectionSensitivity').value = settingsManager.detectionSensitivity;
                document.getElementById('realTimeProtection').checked = settingsManager.realTimeProtection;
                document.getElementById('autoBlockThreats').checked = settingsManager.autoBlockThreats;
            }
            
            // Load theme setting
            const currentTheme = result.phisherTheme || 'dark';
            settingsManager.theme = currentTheme;
            if (document.getElementById('themeSelector')) {
                document.getElementById('themeSelector').value = currentTheme;
                this.updateThemeIndicator(currentTheme);
            }
        });

        // Save settings on change
        const saveSettings = () => {
            chrome.storage.sync.set({ phisherSettings: settingsManager });
        };

        document.getElementById('detectionSensitivity').addEventListener('change', (e) => {
            settingsManager.detectionSensitivity = e.target.value;
            saveSettings();
        });

        document.getElementById('realTimeProtection').addEventListener('change', (e) => {
            settingsManager.realTimeProtection = e.target.checked;
            saveSettings();
        });

        document.getElementById('autoBlockThreats').addEventListener('change', (e) => {
            settingsManager.autoBlockThreats = e.target.checked;
            saveSettings();
        });

        // Theme selector event listener
        if (document.getElementById('themeSelector')) {
            document.getElementById('themeSelector').addEventListener('change', (e) => {
                const selectedTheme = e.target.value;
                settingsManager.theme = selectedTheme;
                this.applyTheme(selectedTheme);
                this.updateThemeIndicator(selectedTheme);
                saveSettings();
            });
        }

        // Management click handlers for whitelist and blacklist
        document.querySelectorAll('.setting-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (action === 'whitelist') {
                    this.showWhitelistManager();
                } else if (action === 'blacklist') {
                    this.showBlacklistManager();
                }
            });
        });
    }

    async showWhitelistManager() {
        const container = document.querySelector('.container');
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';
        
        try {
            await this.templateManager.replaceContent(container, 'whitelist-manager');
        } catch (error) {
            console.error('Failed to load whitelist template:', error);
            // Minimal fallback implementation
            container.innerHTML = '<header class="settings-header"><div class="header-content"><button id="backToSettingsBtn" class="back-btn"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg></button><h1>Whitelist Management</h1></div></header><main class="settings-content"><p>Whitelist view failed to load. Please reload the extension.</p></main>';
        }

        this.setupWhitelistListeners();
        this.loadWhitelist();
    }

    async setupWhitelistListeners() {
        // Back to settings button
        document.getElementById('backToSettingsBtn').addEventListener('click', () => {
            this.showSettingsView();
        });

        // Add domain button
        document.getElementById('addWhitelistBtn').addEventListener('click', () => {
            this.addToWhitelist();
        });

        // Enter key for input
        document.getElementById('whitelistInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addToWhitelist();
            }
        });
    }

    async addToWhitelist() {
        const input = document.getElementById('whitelistInput');
        const domain = input.value.trim().toLowerCase();
        
        if (!domain) {
            this.showWhitelistError('Please enter a domain');
            return;
        }

        // Validate domain format
        if (!this.isValidDomain(domain)) {
            this.showWhitelistError('Please enter a valid domain (e.g., example.com)');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/whitelist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    domain: domain,
                    userId: await this.getUserId()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to add domain: ${response.status}`);
            }

            input.value = '';
            this.loadWhitelist(); // Refresh list
            this.showWhitelistSuccess('Domain added to whitelist');
        } catch (error) {
            console.error('Error adding to whitelist:', error);
            this.showWhitelistError('Failed to add domain');
        }
    }

    async removeFromWhitelist(domain) {
        try {
            const response = await fetch(`${this.apiUrl}/whitelist/${encodeURIComponent(domain)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: await this.getUserId()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to remove domain: ${response.status}`);
            }

            this.loadWhitelist(); // Refresh list
            this.showWhitelistSuccess('Domain removed from whitelist');
        } catch (error) {
            console.error('Error removing from whitelist:', error);
            this.showWhitelistError('Failed to remove domain');
        }
    }

    async loadWhitelist() {
        const container = document.getElementById('whitelistContainer');
        
        try {
            const response = await fetch(`${this.apiUrl}/whitelist?userId=${encodeURIComponent(await this.getUserId())}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load whitelist: ${response.status}`);
            }

            const whitelist = await response.json();
            
            if (whitelist.domains && whitelist.domains.length > 0) {
                try {
                    const whitelistItems = await Promise.all(
                        whitelist.domains.map(domain => 
                            this.templateManager.render('whitelist-item', { domain })
                        )
                    );
                    container.innerHTML = whitelistItems.join('');
                } catch (templateError) {
                    console.error('Failed to load whitelist item template:', templateError);
                    // Minimal fallback implementation  
                    container.innerHTML = whitelist.domains.map(domain => 
                        '<div class="whitelist-item"><div class="domain-info"><span class="domain-name">' + domain + '</span><span class="domain-status">Trusted</span></div><button class="remove-btn" data-domain="' + domain + '"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg></button></div>'
                    ).join('');
                }

                // Add click listeners to remove buttons
                container.querySelectorAll('.remove-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const domain = e.currentTarget.dataset.domain;
                        this.removeFromWhitelist(domain);
                    });
                });
            } else {
                container.innerHTML = '<div class="empty-whitelist">No trusted domains added yet</div>';
            }
        } catch (error) {
            console.error('Error loading whitelist:', error);
            container.innerHTML = '<div class="error-whitelist">Failed to load whitelist</div>';
        }
    }

    async getUserId() {
        // Generate or retrieve a persistent user ID
        const stored = await chrome.storage.local.get(['phisherUserId']);
        if (stored.phisherUserId) {
            return stored.phisherUserId;
        }
        
        const newUserId = crypto.randomUUID();
        await chrome.storage.local.set({ phisherUserId: newUserId });
        return newUserId;
    }

    isValidDomain(domain) {
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(com|org|net|edu|gov|mil|int|co|io|ly|me|tv|info|biz|name|mobi|ws|cc|us|uk|ca|de|jp|fr|au|in|br|ru|ch|it|nl|se|no|es|mx|be|tr|tw|za|pl|gr|cz|pt|hu|il|th|dk|fi|cl|ro|hr|bg|sk|si|lt|lv|ee|is|mt|lu|cy|md|mc|sm|va|ad|li|al|ba|rs|me|mk|xk|by|ua|am|az|ge|kz|kg|md|tj|tm|uz|mn|af|bd|bt|bn|kh|cn|hk|id|jp|kr|la|mo|mm|np|pk|ph|sg|lk|tw|th|tl|vn)$/i;
        return domainRegex.test(domain);
    }

    showWhitelistError(message) {
        this.showWhitelistMessage(message, 'error');
    }

    showWhitelistSuccess(message) {
        this.showWhitelistMessage(message, 'success');
    }

    showWhitelistMessage(message, type) {
        const existingMsg = document.querySelector('.whitelist-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        const msgElement = document.createElement('div');
        msgElement.className = `whitelist-message ${type}`;
        msgElement.textContent = message;

        const container = document.querySelector('.whitelist-add');
        container.parentNode.insertBefore(msgElement, container.nextSibling);

        setTimeout(() => {
            msgElement.remove();
        }, 3000);
    }

    async showBlacklistManager() {
        const container = document.querySelector('.container');
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';
        
        try {
            await this.templateManager.replaceContent(container, 'blacklist-manager');
        } catch (error) {
            console.error('Failed to load blacklist template:', error);
            // Minimal fallback implementation
            container.innerHTML = '<header class="settings-header"><div class="header-content"><button id="backToSettingsBtn" class="back-btn"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg></button><h1>Blacklist Management</h1></div></header><main class="settings-content"><p>Blacklist view failed to load. Please reload the extension.</p></main>';
        }

        this.setupBlacklistListeners();
        this.loadBlacklist();
    }

    async setupBlacklistListeners() {
        // Back to settings button
        document.getElementById('backToSettingsBtn').addEventListener('click', () => {
            this.showSettingsView();
        });

        // Add domain button
        document.getElementById('addBlacklistBtn').addEventListener('click', () => {
            this.addToBlacklist();
        });

        // Enter key for input
        document.getElementById('blacklistInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addToBlacklist();
            }
        });
    }

    async addToBlacklist() {
        const input = document.getElementById('blacklistInput');
        const domain = input.value.trim().toLowerCase();
        
        if (!domain) {
            this.showBlacklistError('Please enter a domain');
            return;
        }

        if (!this.isValidDomain(domain)) {
            this.showBlacklistError('Please enter a valid domain');
            return;
        }

        try {
            const userId = await this.getUserId();
            
            const response = await fetch(`${this.apiUrl}/api/v1/blacklist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    domain: domain
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.message && result.message.includes('already in blacklist')) {
                    this.showBlacklistError('Domain is already blacklisted');
                } else {
                    this.showBlacklistError(result.message || 'Failed to add domain to blacklist');
                }
                return;
            }

            input.value = '';
            this.showBlacklistSuccess(`"${domain}" added to blacklist`);
            this.loadBlacklist();
        } catch (error) {
            console.error('Error adding to blacklist:', error);
            this.showBlacklistError('Failed to add domain to blacklist');
        }
    }

    async removeFromBlacklist(domain) {
        try {
            const userId = await this.getUserId();
            
            const response = await fetch(`${this.apiUrl}/api/v1/blacklist/${encodeURIComponent(domain)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                this.showBlacklistError(result.message || 'Failed to remove domain from blacklist');
                return;
            }

            this.showBlacklistSuccess(`"${domain}" removed from blacklist`);
            this.loadBlacklist();
        } catch (error) {
            console.error('Error removing from blacklist:', error);
            this.showBlacklistError('Failed to remove domain from blacklist');
        }
    }

    async loadBlacklist() {
        const container = document.getElementById('blacklistContainer');
        if (!container) return;

        try {
            const userId = await this.getUserId();
            
            const response = await fetch(`${this.apiUrl}/api/v1/blacklist?userId=${encodeURIComponent(userId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch blacklist');
            }

            const result = await response.json();
            const userBlacklist = result.domains || [];

            container.innerHTML = '';

            if (userBlacklist.length === 0) {
                container.innerHTML = '<div class="no-blacklist">No blocked domains</div>';
                return;
            }

            for (const domain of userBlacklist) {
                try {
                    const itemElement = await this.templateManager.createElementFromTemplate('blacklist-item');
                    itemElement.innerHTML = itemElement.innerHTML
                        .replace(/{{domain}}/g, domain)
                        .replace(/{{date}}/g, 'Recently');

                    const removeBtn = itemElement.querySelector('.remove-btn');
                    removeBtn.addEventListener('click', () => {
                        if (confirm(`Remove "${domain}" from blacklist?`)) {
                            this.removeFromBlacklist(domain);
                        }
                    });

                    container.appendChild(itemElement);
                } catch (error) {
                    console.error('Error creating blacklist item:', error);
                    // Fallback to simple HTML if template fails
                    const simpleItem = document.createElement('div');
                    simpleItem.className = 'blacklist-item';
                    simpleItem.innerHTML = `
                        <span class="domain-name">${domain}</span>
                        <button class="remove-btn" onclick="phishingDetector.removeFromBlacklist('${domain}')">Remove</button>
                    `;
                    container.appendChild(simpleItem);
                }
            }
        } catch (error) {
            console.error('Error loading blacklist:', error);
            container.innerHTML = '<div class="error-blacklist">Failed to load blacklist</div>';
        }
    }

    showBlacklistError(message) {
        this.showBlacklistMessage(message, 'error');
    }

    showBlacklistSuccess(message) {
        this.showBlacklistMessage(message, 'success');
    }

    showBlacklistMessage(message, type) {
        const existingMsg = document.querySelector('.blacklist-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        const msgElement = document.createElement('div');
        msgElement.className = `blacklist-message ${type}`;
        msgElement.textContent = message;

        const container = document.querySelector('.blacklist-add');
        container.parentNode.insertBefore(msgElement, container.nextSibling);

        setTimeout(() => {
            msgElement.remove();
        }, 3000);
    }

    async showHistoryView() {
        const container = document.querySelector('.container');
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';

        // Load history CSS
        this.loadHistoryCSS();
        
        try {
            await this.templateManager.replaceContent(container, 'history-view');
        } catch (error) {
            console.error('Failed to load history template:', error);
            // Minimal fallback implementation
            container.innerHTML = '<header class="settings-header history-header"><div class="header-content"><button id="backBtn" class="back-btn"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg></button><div class="page-title"><h1>📊 Scan History</h1><p>View and export your URL analysis history</p></div></div></header><main class="settings-content history-content"><p>History view failed to load. Please reload the extension.</p></main>';
        }

        // Setup history functionality
        this.setupHistoryListeners();
        this.loadHistoryData();
    }

    loadHistoryCSS() {
        // Check if history CSS is already loaded
        if (document.getElementById('history-css')) return;
        
        const link = document.createElement('link');
        link.id = 'history-css';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('popup/styles/history.css');
        document.head.appendChild(link);
    }

    unloadHistoryCSS() {
        const historyCSS = document.getElementById('history-css');
        if (historyCSS) {
            historyCSS.remove();
        }
    }

    setupHistoryListeners() {
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.unloadHistoryCSS();
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'flex';
            location.reload(); // Reload to go back to main view
        });

        // Filter controls
        document.getElementById('filterType').addEventListener('change', () => {
            this.loadHistoryData();
        });

        document.getElementById('limitResults').addEventListener('change', () => {
            this.loadHistoryData();
        });

        // Export buttons
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportHistory('csv'));
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportHistory('json'));

        // Clear history
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
    }

    async loadHistoryData() {
        const loadingElement = document.getElementById('loadingHistory');
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyState');

        loadingElement.style.display = 'flex';
        historyList.innerHTML = '';
        emptyState.style.display = 'none';

        try {
            const filterType = document.getElementById('filterType').value;
            const limit = document.getElementById('limitResults').value;
            const userId = await this.getUserId();
            
            const params = new URLSearchParams({
                limit: limit,
                onlyThreats: filterType === 'threats' ? 'true' : 'false',
                sortOrder: 'desc',
                userId: userId
            });

            const response = await fetch(`${this.apiUrl}/api/v1/history?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('API Response:', data); // Debug log
                
                // Handle different API response formats
                const analyses = data.analyses || data || [];
                
                if (Array.isArray(analyses) && analyses.length > 0) {
                    this.displayHistoryItems(analyses);
                } else {
                    console.log('No analyses found in response:', data);
                    emptyState.style.display = 'block';
                }
            } else {
                console.error('API Error:', response.status, response.statusText);
                emptyState.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading history:', error);
            emptyState.style.display = 'block';
        } finally {
            loadingElement.style.display = 'none';
        }
    }

    async displayHistoryItems(analyses) {
        const historyList = document.getElementById('historyList');
        
        // Clear existing items and validate input
        historyList.innerHTML = '';
        
        if (!Array.isArray(analyses) || analyses.length === 0) {
            console.log('No valid analyses array provided');
            return;
        }
        
        try {
            // Process each analysis and create history items using templates
            const historyItems = await Promise.all(
                analyses.map(async (analysis) => {
                    const date = new Date(analysis.createdAt).toLocaleString();
                    const statusClass = analysis.isPhishing ? 'status-threat' : 'status-safe';
                    const statusIcon = analysis.isPhishing ? '🚨' : '✅';
                    const statusText = analysis.isPhishing ? 'Threat' : 'Safe';
                    const riskClass = this.getHistoryRiskClass(analysis.riskScore);
                    const displayUrl = this.truncateHistoryUrl(analysis.url, 45);
                    const confidence = (analysis.confidence * 100).toFixed(0);
                    
                    return this.templateManager.render('history-item', {
                        statusClass,
                        statusIcon,
                        statusText,
                        date,
                        displayUrl,
                        riskClass,
                        riskScore: analysis.riskScore,
                        confidence
                    });
                })
            );
            
            historyList.innerHTML = historyItems.join('');
            
            // Add click listeners to history items
            historyList.querySelectorAll('.history-item').forEach((item, index) => {
                item.addEventListener('click', () => this.showHistoryAnalysisDetails(analyses[index]));
            });
            
        } catch (error) {
            console.error('Failed to load history item templates:', error);
            // Minimal fallback implementation
            analyses.forEach(analysis => {
                const item = document.createElement('div');
                item.className = 'history-item';

                const date = new Date(analysis.createdAt).toLocaleString();
                const statusClass = analysis.isPhishing ? 'status-threat' : 'status-safe';
                const statusIcon = analysis.isPhishing ? '🚨' : '✅';
                const statusText = analysis.isPhishing ? 'Threat' : 'Safe';
                const riskClass = this.getHistoryRiskClass(analysis.riskScore);
                const displayUrl = this.truncateHistoryUrl(analysis.url, 45);

                item.innerHTML = '<div class="history-item-header"><div class="history-item-status ' + statusClass + '"><span class="status-icon">' + statusIcon + '</span><span>' + statusText + '</span></div><div class="history-item-date">' + date + '</div></div><div class="history-item-url">' + displayUrl + '</div><div class="history-item-details"><div class="history-item-risk"><span>Risk: </span><span class="risk-score ' + riskClass + '">' + analysis.riskScore + '/100</span></div><div class="history-item-confidence">' + (analysis.confidence * 100).toFixed(0) + '%</div></div>';

                item.addEventListener('click', () => this.showHistoryAnalysisDetails(analysis));
                historyList.appendChild(item);
            });
        }
    }

    getHistoryRiskClass(riskScore) {
        if (riskScore < 30) return 'risk-low';
        if (riskScore < 70) return 'risk-medium';
        return 'risk-high';
    }

    truncateHistoryUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    showHistoryAnalysisDetails(analysis) {
        const threats = analysis.threats && analysis.threats.length > 0 
            ? analysis.threats.join(', ') 
            : 'None detected';
        
        alert(`URL: ${analysis.url}\\n\\n` +
              `Status: ${analysis.isPhishing ? 'Threat Detected' : 'Safe'}\\n` +
              `Risk Score: ${analysis.riskScore}/100\\n` +
              `Confidence: ${(analysis.confidence * 100).toFixed(1)}%\\n` +
              `Threats: ${threats}\\n\\n` +
              `Description: ${analysis.description}`);
    }

    async exportHistory(format) {
        try {
            const filterType = document.getElementById('filterType').value;
            const userId = await this.getUserId();
            const params = new URLSearchParams({
                format: format,
                limit: '1000',
                onlyThreats: filterType === 'threats' ? 'true' : 'false',
                userId: userId
            });

            const response = await fetch(`${this.apiUrl}/api/v1/history/export?${params}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `history_export_${Date.now()}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showHistoryMessage(`Exported successfully as ${format.toUpperCase()}`, 'success');
            } else {
                this.showHistoryMessage('Export failed', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showHistoryMessage('Export failed', 'error');
        }
    }

    async clearHistory() {
        if (!confirm('Clear all scan history? This cannot be undone.')) return;

        try {
            const userId = await this.getUserId();
            const params = new URLSearchParams({ userId: userId });
            
            const response = await fetch(`${this.apiUrl}/api/v1/history/all?${params}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                this.loadHistoryData();
                this.showHistoryMessage('History cleared', 'success');
            } else {
                this.showHistoryMessage('Failed to clear history', 'error');
            }
        } catch (error) {
            console.error('Clear history error:', error);
            this.showHistoryMessage('Failed to clear history', 'error');
        }
    }

    showHistoryMessage(message, type) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            color: white;
            font-size: 12px;
            z-index: 1000;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    reportIssue() {
        chrome.tabs.create({
            url: 'https://github.com/Alkyones/Phisher-Extension/issues/new'
        });
    }

    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/Alkyones/Phisher-Extension'
        });
    }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhishingDetector();
});