// Template Manager for loading and rendering HTML templates
class TemplateManager {
    constructor() {
        this.templateCache = new Map();
    }

    /**
     * Load a template from a file
     * @param {string} templateName - Name of the template file (without .html extension)
     * @returns {Promise<string>} - Template HTML content
     */
    async loadTemplate(templateName) {
        // Check cache first
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }

        try {
            const templateUrl = chrome.runtime.getURL(`popup/templates/${templateName}.html`);
            const response = await fetch(templateUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load template: ${templateName}`);
            }
            
            const templateContent = await response.text();
            
            // Cache the template for future use
            this.templateCache.set(templateName, templateContent);
            
            return templateContent;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Render a template with data
     * @param {string} templateName - Name of the template file
     * @param {object} data - Data to inject into the template
     * @returns {Promise<string>} - Rendered HTML
     */
    async render(templateName, data = {}) {
        const template = await this.loadTemplate(templateName);
        return this.interpolate(template, data);
    }

    /**
     * Simple template interpolation
     * @param {string} template - Template string with {{variable}} placeholders
     * @param {object} data - Data object to interpolate
     * @returns {string} - Interpolated template
     */
    interpolate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data.hasOwnProperty(key) ? data[key] : match;
        });
    }

    /**
     * Create DOM element from template
     * @param {string} templateName - Name of the template file
     * @param {object} data - Data to inject into the template
     * @returns {Promise<HTMLElement>} - DOM element
     */
    async createElementFromTemplate(templateName, data = {}) {
        const html = await this.render(templateName, data);
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        return temp.firstElementChild;
    }

    /**
     * Replace container content with template
     * @param {HTMLElement} container - Container element to replace content
     * @param {string} templateName - Name of the template file
     * @param {object} data - Data to inject into the template
     */
    async replaceContent(container, templateName, data = {}) {
        const html = await this.render(templateName, data);
        container.innerHTML = html;
    }

    /**
     * Clear template cache (useful for development)
     */
    clearCache() {
        this.templateCache.clear();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateManager;
} else {
    window.TemplateManager = TemplateManager;
}