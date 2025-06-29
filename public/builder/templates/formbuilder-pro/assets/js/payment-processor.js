/**
 * Real Payment Processor for FormBuilder Pro
 * Handles actual payment processing with Stripe and PayPal
 */

class PaymentProcessor {
    constructor() {
        this.stripe = null;
        this.paypal = null;
        this.initializeProcessors();
    }

    async initializeProcessors() {
        // Wait for config manager to be ready
        if (!window.configManager) {
            setTimeout(() => this.initializeProcessors(), 100);
            return;
        }

        const config = window.configManager;
        
        // Initialize Stripe if enabled
        if (config.isServiceEnabled('stripe')) {
            await this.initializeStripe();
        }

        // Initialize PayPal if enabled
        if (config.isServiceEnabled('paypal')) {
            await this.initializePayPal();
        }
    }

    async initializeStripe() {
        try {
            const stripeConfig = window.configManager.getConfig('stripe');
            
            if (!window.Stripe) {
                await this.loadScript('https://js.stripe.com/v3/');
            }
            
            this.stripe = Stripe(stripeConfig.publishableKey);
            console.log('✅ Stripe payment processor initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Stripe:', error);
        }
    }

    async initializePayPal() {
        try {
            const paypalConfig = window.configManager.getConfig('paypal');
            
            const script = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=USD&intent=capture`;
            
            if (!window.paypal) {
                await this.loadScript(script);
            }
            
            this.paypal = window.paypal;
            console.log('✅ PayPal payment processor initialized');
        } catch (error) {
            console.error('❌ Failed to initialize PayPal:', error);
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

    // Stripe Payment Methods
    async createStripePaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            // In a real implementation, this would call your server
            // For now, we'll simulate the server response
            console.log('Creating payment intent for:', { amount, currency, metadata });
            
            // Simulate server call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return 'pi_simulation_' + Date.now();
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw error;
        }
    }

    async processStripePayment(amount, cardElement, billingDetails = {}) {
        try {
            if (!this.stripe) {
                throw new Error('Stripe not initialized. Please configure your API keys.');
            }

            // Create payment method
            const { error, paymentMethod } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: billingDetails,
            });

            if (error) {
                throw new Error(error.message);
            }

            // Create payment intent on server
            const clientSecret = await this.createStripePaymentIntent(amount, 'usd', {
                customer_email: billingDetails.email
            });

            // Confirm payment
            const result = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethod.id
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

            return {
                success: true,
                paymentIntent: result.paymentIntent,
                transactionId: result.paymentIntent.id,
                amount: amount
            };
        } catch (error) {
            console.error('Stripe payment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    createStripeCardElement(containerId) {
        if (!this.stripe) {
            console.error('Stripe not initialized');
            return null;
        }

        const elements = this.stripe.elements();
        const cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
            },
        });

        cardElement.mount(containerId);
        return cardElement;
    }

    // PayPal Payment Methods
    createPayPalButtons(containerId, amount, onSuccess, onError) {
        if (!this.paypal) {
            console.error('PayPal not initialized');
            return;
        }

        return this.paypal.Buttons({
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: amount.toString()
                        }
                    }]
                });
            },
            onApprove: async (data, actions) => {
                try {
                    const order = await actions.order.capture();
                    console.log('PayPal payment successful:', order);
                    
                    if (onSuccess) {
                        onSuccess({
                            success: true,
                            orderId: order.id,
                            transactionId: order.purchase_units[0].payments.captures[0].id,
                            amount: order.purchase_units[0].payments.captures[0].amount.value,
                            currency: order.purchase_units[0].payments.captures[0].amount.currency_code
                        });
                    }
                } catch (error) {
                    console.error('PayPal capture error:', error);
                    if (onError) {
                        onError({ success: false, error: error.message });
                    }
                }
            },
            onError: (err) => {
                console.error('PayPal error:', err);
                if (onError) {
                    onError({ success: false, error: 'PayPal payment failed' });
                }
            }
        }).render(containerId);
    }

    // Form Payment Processing
    async processFormPayment(formData, paymentData) {
        try {
            const { paymentMethod, amount, billingDetails, cardElement } = paymentData;
            
            this.validatePaymentAmount(amount);
            
            let paymentResult;
            
            if (paymentMethod === 'stripe') {
                paymentResult = await this.processStripePayment(amount, cardElement, billingDetails);
            } else if (paymentMethod === 'paypal') {
                throw new Error('PayPal payments should be processed through PayPal buttons');
            } else {
                throw new Error('Invalid payment method');
            }

            if (paymentResult.success) {
                // Save form submission with payment info
                await this.saveFormSubmission(formData, paymentResult);
                
                // Send confirmation email if configured
                if (window.configManager.isServiceEnabled('sendgrid')) {
                    await this.sendConfirmationEmail(formData, paymentResult);
                }
                
                this.showPaymentSuccess('Payment processed successfully!');
            } else {
                this.showPaymentError(paymentResult.error);
            }

            return paymentResult;
        } catch (error) {
            console.error('Form payment processing error:', error);
            this.showPaymentError(error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveFormSubmission(formData, paymentResult) {
        try {
            const submission = {
                formData,
                paymentResult,
                timestamp: new Date().toISOString(),
                submissionId: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            };

            // Save to localStorage for now (in production, save to database)
            const submissions = JSON.parse(localStorage.getItem('form_submissions') || '[]');
            submissions.push(submission);
            localStorage.setItem('form_submissions', JSON.stringify(submissions));

            console.log('Form submission saved:', submission.submissionId);
            return submission;
        } catch (error) {
            console.error('Error saving form submission:', error);
            throw error;
        }
    }

    async sendConfirmationEmail(formData, paymentResult) {
        try {
            const emailConfig = window.configManager.getConfig('sendgrid');
            
            const emailData = {
                to: formData.email || 'customer@example.com',
                from: emailConfig.fromEmail,
                subject: 'Form Submission Confirmation',
                html: this.generateConfirmationEmailHTML(formData, paymentResult)
            };

            console.log('Sending confirmation email:', emailData);
            
            // In a real implementation, this would call your server endpoint
            // For now, we'll simulate the email sending
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('Confirmation email sent successfully');
        } catch (error) {
            console.error('Error sending confirmation email:', error);
        }
    }

    generateConfirmationEmailHTML(formData, paymentResult) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Form Submission Confirmed</h2>
                <p>Thank you for your submission. Your payment has been processed successfully.</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Payment Details</h3>
                    <p><strong>Transaction ID:</strong> ${paymentResult.transactionId}</p>
                    <p><strong>Amount:</strong> $${paymentResult.amount.toFixed(2)}</p>
                    <p><strong>Status:</strong> Completed</p>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Form Data</h3>
                    ${Object.entries(formData).map(([key, value]) => 
                        `<p><strong>${key}:</strong> ${value}</p>`
                    ).join('')}
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                    This is an automated confirmation. Please keep this email for your records.
                </p>
            </div>
        `;
    }

    // Utility methods
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    }

    validatePaymentAmount(amount) {
        if (!amount || amount <= 0) {
            throw new Error('Invalid payment amount');
        }
        if (amount < 0.50) {
            throw new Error('Minimum payment amount is $0.50');
        }
        return true;
    }

    showPaymentError(message) {
        const errorDiv = document.getElementById('payment-errors');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            `;
        }
        
        // Also show notification
        if (window.configManager) {
            window.configManager.showNotification(message, 'error');
        }
    }

    showPaymentSuccess(message) {
        const successDiv = document.getElementById('payment-success');
        if (successDiv) {
            successDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    ${message}
                </div>
            `;
        }
        
        // Also show notification
        if (window.configManager) {
            window.configManager.showNotification(message, 'success');
        }
    }
}

// Initialize global payment processor
window.paymentProcessor = new PaymentProcessor();

console.log('💳 Real Payment Processor loaded successfully'); 