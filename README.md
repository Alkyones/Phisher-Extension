# Phisher - AI URL Protection Extension 🤖🛡️

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

An advanced AI-powered Chrome extension that provides real-time phishing detection and URL threat analysis using neural networks to protect users from malicious websites.

Backend: [Backend Repository](https://github.com/Alkyones/Phisher-Backend)

## 📚 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [Extension Architecture](#-extension-architecture)
- [API Integration](#-api-integration)
- [User Interface](#-user-interface)
- [Security Features](#-security-features)
- [Configuration](#-configuration)
- [Development Setup](#-development-setup)
- [File Structure](#-file-structure)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [Privacy & Security](#-privacy--security)
- [License](#-license)

## 🚀 Features

### Core Functionality
- **AI-Powered URL Analysis**: Advanced neural network-based phishing detection
- **Real-time Threat Detection**: Instant analysis of URLs for potential threats
- **Smart Caching**: Efficient caching system to minimize API calls
- **Context Menu Integration**: Right-click any link to check its safety
- **Comprehensive Statistics**: Track protection metrics and threat history

### User Experience
- **Modern Dark/Light Themes**: Customizable interface themes
- **Intuitive Dashboard**: Clean, user-friendly popup interface
- **History Tracking**: Complete audit trail of analyzed URLs
- **Whitelist/Blacklist Management**: Custom allow/block lists
- **Real-time Notifications**: Instant alerts for detected threats

### Technical Features
- **Background Processing**: Non-intrusive background service worker
- **Cross-frame Protection**: Analysis across all website frames
- **Offline Capabilities**: Basic protection even without internet
- **Performance Optimized**: Minimal impact on browsing speed

## 📥 Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "Phisher - AI URL Protection"
3. Click "Add to Chrome"
4. Grant necessary permissions

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

### Required Permissions
The extension requires the following permissions:
- `activeTab`: Access current tab for URL analysis
- `storage`: Save settings and history
- `notifications`: Display threat alerts
- `contextMenus`: Add right-click menu options
- `tabs`: Access tab information
- `<all_urls>`: Analyze any website URL

## 🎯 Usage Guide

### Basic URL Analysis
1. **Automatic Protection**: The extension monitors your browsing automatically
2. **Manual Analysis**: 
   - Click the extension icon in the toolbar
   - Paste or type any URL in the analysis field
   - Click "Analyze URL" for instant results
3. **Context Menu**: Right-click any link and select "Check link safety"

### Understanding Results
- **🟢 Safe**: URL is verified as legitimate
- **🟡 Suspicious**: Potential risk detected, proceed with caution
- **🔴 Dangerous**: High threat level, avoid accessing
- **⚪ Unknown**: Insufficient data for analysis

### Managing Lists
#### Whitelist Management
- Add trusted domains that should always be considered safe
- Useful for internal company websites or trusted services
- Access via Settings → Whitelist Manager

#### Blacklist Management
- Block specific domains you want to avoid
- Manually add known malicious sites
- Access via Settings → Blacklist Manager

### Viewing History
- Access complete analysis history via the History tab
- Filter by date, threat level, or domain
- Export history for security audits

## 🏗️ Extension Architecture

### Component Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Background    │    │   Content       │    │   Popup         │
│   Service       │◄───┤   Script        │    │   Interface     │
│   Worker        │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Storage API                         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI Detection API                             │
└─────────────────────────────────────────────────────────────────┘
```

### Background Service Worker
- **File**: `background/background.js`
- **Purpose**: Handles API communication, context menus, and notifications
- **Key Functions**:
  - URL analysis coordination
  - Context menu management
  - Cross-component communication
  - Installation handling

### Content Script
- **File**: `content/content.js`
- **Purpose**: Minimal footprint monitoring (currently simplified)
- **Functionality**: Passive monitoring without interfering with page functionality

### Popup Interface
- **Files**: `popup/popup.html`, `popup/popup.js`, `popup/templateManager.js`
- **Purpose**: Main user interface for manual analysis and settings
- **Features**:
  - URL input and analysis
  - Results display
  - Settings management
  - History viewing

## 🔗 API Integration

### Development vs Production
The extension automatically switches between development and production API endpoints:

```javascript
// Development (local testing)
const apiUrl = 'http://localhost:8080';

// Production (deployed extension)
const apiUrl = 'https://your-api-domain.com';
```

### API Endpoints
- `POST /analyze`: Submit URL for threat analysis
- `GET /health`: Check API service status
- `POST /report`: Submit threat reports

### Request Format
```json
{
  "url": "https://example.com",
  "timestamp": 1703875200000,
  "userAgent": "Chrome/120.0.0.0"
}
```

### Response Format
```json
{
  "url": "https://example.com",
  "threatLevel": "safe|suspicious|dangerous",
  "confidence": 0.95,
  "reasons": ["Domain reputation check passed"],
  "analysis": {
    "aiScore": 0.92,
    "domainAge": 365,
    "sslStatus": "valid"
  }
}
```

## 🎨 User Interface

### Theme System
The extension supports both dark and light themes:

- **Dark Theme** (Default): Optimized for reduced eye strain
- **Light Theme**: Clean, professional appearance
- **Auto Theme**: Follows system preferences (future feature)

### Template System
Dynamic UI components using HTML templates:

- `initial-state.html`: Welcome screen
- `history-view.html`: Analysis history display
- `settings-view.html`: Configuration panel
- `blacklist-manager.html`: Blacklist management
- `whitelist-manager.html`: Whitelist management
- `error-display.html`: Error state handling

### Responsive Design
The interface adapts to different screen sizes and maintains usability across various display configurations.

## 🔒 Security Features

### AI-Powered Detection
- **Neural Network Analysis**: Deep learning models trained on threat patterns
- **Real-time Updates**: Continuous model improvements
- **False Positive Reduction**: Advanced algorithms minimize incorrect flags

### Privacy Protection
- **Local Processing**: Sensitive data processed locally when possible
- **Encrypted Communication**: All API calls use HTTPS encryption
- **No Personal Data**: URLs analyzed without personal identification

### Threat Categories
- **Phishing**: Fake login pages and credential theft attempts
- **Malware**: Sites hosting malicious software
- **Scams**: Fraudulent schemes and fake services
- **Suspicious**: Potentially harmful but unconfirmed threats

## ⚙️ Configuration

### Settings Options
Access via the extension popup → Settings tab:

#### Security Settings
- **Protection Level**: Basic, Standard, Strict
- **Auto-scan**: Enable/disable automatic URL scanning
- **Notifications**: Configure alert preferences

#### Privacy Settings
- **History Retention**: Set data retention period
- **Anonymous Reporting**: Contribute to threat intelligence
- **Data Sharing**: Control information sharing preferences

#### Advanced Settings
- **API Timeout**: Adjust request timeout values
- **Cache Duration**: Control how long results are cached
- **Debug Mode**: Enable detailed logging for troubleshooting

### Storage Management
The extension uses Chrome's storage API for:
- User preferences and settings
- Analysis history and statistics
- Whitelist and blacklist entries
- Theme and UI preferences

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16 or higher)
- Chrome Browser (latest version)
- Code editor (VS Code recommended)

### Local Development
1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-repo/phisher-extension.git
   cd phisher-extension
   ```

2. **Set up API Server** (for testing):
   ```bash
   # Run local API server on localhost:8080
   npm install
   npm run dev
   ```

3. **Load Extension**:
   - Open Chrome → Extensions → Developer mode
   - Click "Load unpacked" and select project folder

4. **Testing**:
   - Test popup functionality
   - Verify background script operations
   - Check content script integration

### Build Process
For production deployment:
```bash
npm run build
```
This creates a distributable package ready for Chrome Web Store submission.

### Code Structure Guidelines
- Use ES6+ features for modern JavaScript
- Follow Chrome Extension Manifest V3 best practices
- Implement proper error handling and logging
- Maintain separation of concerns between components

## 📁 File Structure

```
phisher-extension/
├── manifest.json                 # Extension configuration
├── LICENSE                      # License information
├── README.md                    # This documentation
├── background/
│   └── background.js            # Background service worker
├── content/
│   └── content.js               # Content script (simplified)
├── icons/
│   ├── icon16.png               # Extension icons (16x16)
│   ├── icon32.png               # Extension icons (32x32)
│   ├── icon48.png               # Extension icons (48x48)
│   └── icon128.png              # Extension icons (128x128)
└── popup/
    ├── popup.html               # Main popup HTML
    ├── popup.js                 # Popup functionality
    ├── templateManager.js       # Template management system
    ├── styles/
    │   ├── popup.css            # Main popup styles
    │   ├── theme.css            # Theme-specific styles
    │   └── history.css          # History view styles
    └── templates/
        ├── initial-state.html   # Welcome screen template
        ├── history-view.html    # History display template
        ├── settings-view.html   # Settings panel template
        ├── blacklist-manager.html  # Blacklist management
        ├── whitelist-manager.html  # Whitelist management
        ├── blacklist-item.html  # Individual blacklist item
        ├── whitelist-item.html  # Individual whitelist item
        ├── history-item.html    # Individual history item
        └── error-display.html   # Error state template
```

## 🤝 Contributing

We welcome contributions to improve the Phisher Extension! Here's how you can help:

### Contribution Guidelines
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- Follow existing code style and formatting
- Add comments for complex functionality
- Include unit tests for new features
- Update documentation for API changes

### Bug Reports
When reporting bugs, please include:
- Extension version
- Browser version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## 🔧 Troubleshooting

### Common Issues

#### Extension Not Loading
**Symptoms**: Extension doesn't appear in toolbar
**Solutions**:
- Check if Developer mode is enabled
- Verify all required files are present
- Check browser console for errors
- Reload the extension in chrome://extensions/

#### API Connection Issues
**Symptoms**: "Failed to analyze URL" errors
**Solutions**:
- Check internet connection
- Verify API server is running (for development)
- Check browser's network tab for request details
- Ensure API endpoints are correctly configured

#### Performance Issues
**Symptoms**: Slow response times, browser lag
**Solutions**:
- Clear extension's cached data
- Check API server performance
- Reduce analysis frequency in settings
- Update to latest extension version

#### Theme Not Applying
**Symptoms**: Theme doesn't change or appears broken
**Solutions**:
- Clear browser cache and cookies
- Reset theme settings to default
- Check CSS file integrity
- Restart browser

### Debug Mode
Enable debug mode in settings for detailed logging:
1. Open extension popup
2. Go to Settings → Advanced
3. Enable "Debug Mode"
4. Check browser console for detailed logs

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Wiki**: Comprehensive documentation and guides
- **Community Forum**: Community-driven support
- **Email Support**: direct contact for critical issues

## 🔐 Privacy & Security

### Data Handling
- **URL Analysis**: URLs are sent to our secure API for analysis
- **No Personal Data**: No personal information is collected or stored
- **Local Storage**: User preferences stored locally in browser
- **Encryption**: All data transmission uses TLS encryption

### Open Source Commitment
- Source code is publicly available for security auditing
- Regular security reviews and updates
- Community-driven security improvements
- Transparent development process

### Compliance
- Follows Chrome Web Store privacy policies
- Adheres to GDPR and privacy regulations
- Regular security assessments
- Incident response procedures in place

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ Liability limitations
- ❌ Warranty limitations

---

## 📞 Contact & Support

- **GitHub**: [Project Repository](https://github.com/Alkyones/phisher-extension)
- **Issues**: [Bug Reports & Feature Requests](https://github.com/Alkyones/phisher-extension/issues)
- **Wiki**: [Detailed Documentation](https://github.com/Alkyones/phisher-extension/wiki)
- **Email**: atakan.yildirim.fs@gmail.com

---

**🛡️ Stay Protected with AI-Powered Threat Detection!**

> Made with ❤️ by the Phisher Security Team
