/**
 * Configuration Manager for FormBuilder Pro
 * Handles API keys and service configuration
 */

class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.initializeServices();
    }

    loadConfig() {
        const defaultConfig = {
            stripe: {
                publishableKey: '',
                secretKey: '',
                enabled: false
            },
            paypal: {
                clientId: '',
                clientSecret: '',
                environment: 'sandbox', // sandbox or live
                enabled: false
            },
            sendgrid: {
                apiKey: '',
                fromEmail: '',
                enabled: false
            },
            pdf: {
                enabled: true, // PDF generation is always available
                watermark: 'FormBuilder Pro',
                author: 'FormBuilder Pro'
            },
            notifications: {
                email: true,
                browser: true
            }
        };

        const savedConfig = localStorage.getItem('formbuilder_config');
        if (savedConfig) {
            try {
                return { ...defaultConfig, ...JSON.parse(savedConfig) };
            } catch (e) {
                console.warn('Invalid config in localStorage, using defaults');
                return defaultConfig;
            }
        }
        return defaultConfig;
    }

    saveConfig() {
        localStorage.setItem('formbuilder_config', JSON.stringify(this.config));
        this.initializeServices();
    }

    updateConfig(service, settings) {
        this.config[service] = { ...this.config[service], ...settings };
        this.saveConfig();
        this.showNotification(`${service} configuration updated successfully`, 'success');
    }

    getConfig(service) {
        return this.config[service] || {};
    }

    isServiceEnabled(service) {
        return this.config[service]?.enabled || false;
    }

    async initializeServices() {
        // Initialize Stripe if configured
        if (this.config.stripe.enabled && this.config.stripe.publishableKey) {
            await this.initializeStripe();
        }

        // Initialize PayPal if configured
        if (this.config.paypal.enabled && this.config.paypal.clientId) {
            await this.initializePayPal();
        }

        // Initialize SendGrid if configured
        if (this.config.sendgrid.enabled && this.config.sendgrid.apiKey) {
            this.initializeSendGrid();
        }
    }

    async initializeStripe() {
        try {
            if (!window.Stripe) {
                await this.loadScript('https://js.stripe.com/v3/');
            }
            window.stripeInstance = Stripe(this.config.stripe.publishableKey);
            console.log('✅ Stripe initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Stripe:', error);
            this.showNotification('Failed to initialize Stripe payment processing', 'error');
        }
    }

    async initializePayPal() {
        try {
            const environment = this.config.paypal.environment;
            const script = `https://www.paypal.com/sdk/js?client-id=${this.config.paypal.clientId}&currency=USD&intent=capture`;
            
            if (!window.paypal) {
                await this.loadScript(script);
            }
            console.log('✅ PayPal initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize PayPal:', error);
            this.showNotification('Failed to initialize PayPal payment processing', 'error');
        }
    }

    initializeSendGrid() {
        // SendGrid is server-side, but we can validate the config
        if (this.config.sendgrid.apiKey && this.config.sendgrid.fromEmail) {
            console.log('✅ SendGrid configuration validated');
        } else {
            this.showNotification('SendGrid configuration incomplete', 'warning');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Configuration UI Methods
    openConfigModal() {
        this.createConfigModal();
    }

    createConfigModal() {
        const modalHTML = `
            <div class="modal fade" id="configModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-cog me-2"></i>API Configuration
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-12">
                                    <ul class="nav nav-tabs" role="tablist">
                                        <li class="nav-item">
                                            <a class="nav-link active" data-bs-toggle="tab" href="#stripe-tab">
                                                <i class="fab fa-stripe me-2"></i>Stripe
                                            </a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#paypal-tab">
                                                <i class="fab fa-paypal me-2"></i>PayPal
                                            </a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#email-tab">
                                                <i class="fas fa-envelope me-2"></i>Email
                                            </a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#pdf-tab">
                                                <i class="fas fa-file-pdf me-2"></i>PDF
                                            </a>
                                        </li>
                                    </ul>
                                    
                                    <div class="tab-content mt-3">
                                        ${this.createStripeTab()}
                                        ${this.createPayPalTab()}
                                        ${this.createEmailTab()}
                                        ${this.createPDFTab()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="configManager.saveAllConfigs()">
                                <i class="fas fa-save me-2"></i>Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('configModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('configModal'));
        modal.show();
    }

    createStripeTab() {
        return `
            <div class="tab-pane fade show active" id="stripe-tab">
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="stripe-enabled" 
                           ${this.config.stripe.enabled ? 'checked' : ''}>
                    <label class="form-check-label" for="stripe-enabled">
                        Enable Stripe Payment Processing
                    </label>
                </div>
                <div class="mb-3">
                    <label class="form-label">Publishable Key</label>
                    <input type="text" class="form-control" id="stripe-publishable" 
                           value="${this.config.stripe.publishableKey}" 
                           placeholder="pk_test_...">
                    <div class="form-text">Your Stripe publishable key (starts with pk_)</div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Secret Key</label>
                    <input type="password" class="form-control" id="stripe-secret" 
                           value="${this.config.stripe.secretKey}" 
                           placeholder="sk_test_...">
                    <div class="form-text">Your Stripe secret key (starts with sk_)</div>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Get your Stripe API keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank">Stripe Dashboard</a>
                </div>
            </div>
        `;
    }

    createPayPalTab() {
        return `
            <div class="tab-pane fade" id="paypal-tab">
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="paypal-enabled" 
                           ${this.config.paypal.enabled ? 'checked' : ''}>
                    <label class="form-check-label" for="paypal-enabled">
                        Enable PayPal Payment Processing
                    </label>
                </div>
                <div class="mb-3">
                    <label class="form-label">Client ID</label>
                    <input type="text" class="form-control" id="paypal-client-id" 
                           value="${this.config.paypal.clientId}" 
                           placeholder="Your PayPal Client ID">
                </div>
                <div class="mb-3">
                    <label class="form-label">Client Secret</label>
                    <input type="password" class="form-control" id="paypal-client-secret" 
                           value="${this.config.paypal.clientSecret}" 
                           placeholder="Your PayPal Client Secret">
                </div>
                <div class="mb-3">
                    <label class="form-label">Environment</label>
                    <select class="form-select" id="paypal-environment">
                        <option value="sandbox" ${this.config.paypal.environment === 'sandbox' ? 'selected' : ''}>Sandbox (Testing)</option>
                        <option value="live" ${this.config.paypal.environment === 'live' ? 'selected' : ''}>Live (Production)</option>
                    </select>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Get your PayPal credentials from <a href="https://developer.paypal.com/" target="_blank">PayPal Developer</a>
                </div>
            </div>
        `;
    }

    createEmailTab() {
        return `
            <div class="tab-pane fade" id="email-tab">
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="email-enabled" 
                           ${this.config.sendgrid.enabled ? 'checked' : ''}>
                    <label class="form-check-label" for="email-enabled">
                        Enable Email Notifications
                    </label>
                </div>
                <div class="mb-3">
                    <label class="form-label">SendGrid API Key</label>
                    <input type="password" class="form-control" id="sendgrid-api-key" 
                           value="${this.config.sendgrid.apiKey}" 
                           placeholder="SG.xxxxxx">
                </div>
                <div class="mb-3">
                    <label class="form-label">From Email Address</label>
                    <input type="email" class="form-control" id="sendgrid-from-email" 
                           value="${this.config.sendgrid.fromEmail}" 
                           placeholder="noreply@yourdomain.com">
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Get your SendGrid API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank">SendGrid Dashboard</a>
                </div>
            </div>
        `;
    }

    createPDFTab() {
        return `
            <div class="tab-pane fade" id="pdf-tab">
                <div class="mb-3">
                    <label class="form-label">PDF Watermark</label>
                    <input type="text" class="form-control" id="pdf-watermark" 
                           value="${this.config.pdf.watermark}" 
                           placeholder="Your Company Name">
                </div>
                <div class="mb-3">
                    <label class="form-label">PDF Author</label>
                    <input type="text" class="form-control" id="pdf-author" 
                           value="${this.config.pdf.author}" 
                           placeholder="Your Name">
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    PDF generation is built-in and doesn't require external API keys.
                </div>
            </div>
        `;
    }

    saveAllConfigs() {
        // Save Stripe config
        this.updateConfig('stripe', {
            enabled: document.getElementById('stripe-enabled').checked,
            publishableKey: document.getElementById('stripe-publishable').value,
            secretKey: document.getElementById('stripe-secret').value
        });

        // Save PayPal config
        this.updateConfig('paypal', {
            enabled: document.getElementById('paypal-enabled').checked,
            clientId: document.getElementById('paypal-client-id').value,
            clientSecret: document.getElementById('paypal-client-secret').value,
            environment: document.getElementById('paypal-environment').value
        });

        // Save Email config
        this.updateConfig('sendgrid', {
            enabled: document.getElementById('email-enabled').checked,
            apiKey: document.getElementById('sendgrid-api-key').value,
            fromEmail: document.getElementById('sendgrid-from-email').value
        });

        // Save PDF config
        this.updateConfig('pdf', {
            watermark: document.getElementById('pdf-watermark').value,
            author: document.getElementById('pdf-author').value
        });

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
        modal.hide();

        this.showNotification('All configurations saved successfully!', 'success');
    }
}

// Initialize global config manager
window.configManager = new ConfigManager();

console.log('🔧 Configuration Manager loaded successfully'); 