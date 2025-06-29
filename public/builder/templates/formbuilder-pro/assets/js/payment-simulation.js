/**
 * Payment Simulation Library
 * Provides local payment processing simulation for standalone operation
 * No external dependencies or API calls required
 */

// Simulated Stripe object for local operation
window.Stripe = function(publishableKey) {
    console.log('🎭 Using simulated Stripe for local operation');
    
    return {
        elements: function() {
            return {
                create: function(type, options) {
                    console.log('📝 Creating simulated Stripe element:', type);
                    return {
                        mount: function(selector) {
                            const container = document.querySelector(selector);
                            if (container) {
                                container.innerHTML = `
                                    <div class="stripe-element-simulation">
                                        <div class="alert alert-info">
                                            <i class="fas fa-info-circle me-2"></i>
                                            <strong>Demo Mode:</strong> This is a simulated payment form for demonstration purposes.
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Card Number</label>
                                            <input type="text" class="form-control" placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242">
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <label class="form-label">Expiry</label>
                                                <input type="text" class="form-control" placeholder="MM/YY" value="12/25">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">CVC</label>
                                                <input type="text" class="form-control" placeholder="123" value="123">
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }
                        },
                        on: function(event, callback) {
                            // Simulate card validation
                            setTimeout(() => {
                                callback({ complete: true, error: null });
                            }, 100);
                        }
                    };
                }
            };
        },
        confirmCardPayment: function(clientSecret, paymentMethodData) {
            console.log('💳 Simulating Stripe payment confirmation');
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        paymentIntent: {
                            id: 'pi_simulation_' + Date.now(),
                            status: 'succeeded',
                            amount: 2000,
                            currency: 'usd'
                        }
                    });
                }, 2000);
            });
        },
        createPaymentMethod: function(data) {
            console.log('🔧 Creating simulated payment method');
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        paymentMethod: {
                            id: 'pm_simulation_' + Date.now(),
                            type: 'card',
                            card: { brand: 'visa', last4: '4242' }
                        }
                    });
                }, 1000);
            });
        }
    };
};

// Simulated PayPal object for local operation
window.paypal = {
    Buttons: function(config) {
        console.log('🏦 Using simulated PayPal for local operation');
        
        return {
            render: function(selector) {
                const container = document.querySelector(selector);
                if (container) {
                    container.innerHTML = `
                        <div class="paypal-simulation">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>Demo Mode:</strong> This is a simulated PayPal button for demonstration purposes.
                            </div>
                            <button class="btn btn-warning btn-lg w-100" onclick="simulatePayPalPayment()">
                                <i class="fab fa-paypal me-2"></i>Pay with PayPal (Simulated)
                            </button>
                        </div>
                    `;
                }
            }
        };
    },
    Orders: {
        create: function(orderData) {
            console.log('📦 Creating simulated PayPal order');
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        id: 'order_simulation_' + Date.now(),
                        status: 'CREATED',
                        intent: 'CAPTURE'
                    });
                }, 1000);
            });
        },
        capture: function(orderId) {
            console.log('💰 Capturing simulated PayPal order');
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        id: orderId,
                        status: 'COMPLETED',
                        purchase_units: [{
                            payments: {
                                captures: [{
                                    id: 'capture_simulation_' + Date.now(),
                                    status: 'COMPLETED',
                                    amount: { currency_code: 'USD', value: '20.00' }
                                }]
                            }
                        }]
                    });
                }, 1500);
            });
        }
    }
};

// Global PayPal simulation function
window.simulatePayPalPayment = function() {
    const loadingButton = document.querySelector('.paypal-simulation button');
    const originalText = loadingButton.innerHTML;
    
    loadingButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing Payment...';
    loadingButton.disabled = true;
    
    setTimeout(() => {
        loadingButton.innerHTML = '<i class="fas fa-check me-2"></i>Payment Successful!';
        loadingButton.className = 'btn btn-success btn-lg w-100';
        
        // Show success message
        setTimeout(() => {
            alert('PayPal payment simulation completed successfully!\n\nIn a real implementation, this would process the actual payment.');
            loadingButton.innerHTML = originalText;
            loadingButton.className = 'btn btn-warning btn-lg w-100';
            loadingButton.disabled = false;
        }, 2000);
    }, 2000);
};

// SendGrid simulation for email functionality
window.sendGridSimulation = {
    send: function(emailData) {
        console.log('📧 Simulating email send via SendGrid');
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('✅ Email simulation completed:', emailData);
                resolve({
                    success: true,
                    messageId: 'msg_simulation_' + Date.now()
                });
            }, 1000);
        });
    }
};

console.log('🎭 Payment simulation library loaded successfully'); 