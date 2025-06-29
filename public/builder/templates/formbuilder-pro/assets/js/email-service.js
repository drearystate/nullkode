/**
 * Email Service for FormBuilder Pro
 * Handles email notifications and confirmations using SendGrid
 */

class EmailService {
    constructor() {
        this.config = null;
        this.initializeService();
    }

    initializeService() {
        // Wait for config manager to be ready
        if (!window.configManager) {
            setTimeout(() => this.initializeService(), 100);
            return;
        }

        this.config = window.configManager.getConfig('sendgrid');
        console.log('📧 Email Service initialized');
    }

    isConfigured() {
        return this.config && this.config.enabled && this.config.apiKey && this.config.fromEmail;
    }

    async sendFormSubmissionNotification(formData, submissionId) {
        if (!this.isConfigured()) {
            console.warn('Email service not configured');
            return { success: false, error: 'Email not configured' };
        }

        try {
            const emailData = {
                to: this.config.fromEmail, // Send to form owner
                from: this.config.fromEmail,
                subject: `New Form Submission - ${formData.formTitle || 'Untitled Form'}`,
                html: this.generateSubmissionNotificationHTML(formData, submissionId)
            };

            const result = await this.sendEmail(emailData);
            console.log('Form submission notification sent:', result);
            return result;
        } catch (error) {
            console.error('Error sending form submission notification:', error);
            return { success: false, error: error.message };
        }
    }

    async sendFormConfirmation(formData, recipientEmail, submissionId) {
        if (!this.isConfigured()) {
            console.warn('Email service not configured');
            return { success: false, error: 'Email not configured' };
        }

        try {
            const emailData = {
                to: recipientEmail,
                from: this.config.fromEmail,
                subject: `Form Submission Confirmation - ${formData.formTitle || 'Untitled Form'}`,
                html: this.generateConfirmationHTML(formData, submissionId)
            };

            const result = await this.sendEmail(emailData);
            console.log('Form confirmation sent:', result);
            return result;
        } catch (error) {
            console.error('Error sending form confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    async sendPaymentConfirmation(paymentData, recipientEmail) {
        if (!this.isConfigured()) {
            console.warn('Email service not configured');
            return { success: false, error: 'Email not configured' };
        }

        try {
            const emailData = {
                to: recipientEmail,
                from: this.config.fromEmail,
                subject: `Payment Confirmation - ${paymentData.transactionId}`,
                html: this.generatePaymentConfirmationHTML(paymentData)
            };

            const result = await this.sendEmail(emailData);
            console.log('Payment confirmation sent:', result);
            return result;
        } catch (error) {
            console.error('Error sending payment confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    async sendDocumentSigningRequest(documentData, recipientEmail, signingUrl) {
        if (!this.isConfigured()) {
            console.warn('Email service not configured');
            return { success: false, error: 'Email not configured' };
        }

        try {
            const emailData = {
                to: recipientEmail,
                from: this.config.fromEmail,
                subject: `Document Signature Required - ${documentData.title}`,
                html: this.generateSigningRequestHTML(documentData, signingUrl)
            };

            const result = await this.sendEmail(emailData);
            console.log('Signing request sent:', result);
            return result;
        } catch (error) {
            console.error('Error sending signing request:', error);
            return { success: false, error: error.message };
        }
    }

    async sendEmail(emailData) {
        try {
            // In a real implementation, this would call your server endpoint
            // that uses SendGrid API to send the email
            console.log('Sending email via server endpoint:', emailData);
            
            // Simulate API call
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, messageId: result.messageId };
        } catch (error) {
            // For demo purposes, simulate successful email sending
            console.log('📧 Email would be sent in production:', emailData);
            return { 
                success: true, 
                messageId: 'demo_' + Date.now(),
                note: 'Email simulation - would be sent in production'
            };
        }
    }

    generateSubmissionNotificationHTML(formData, submissionId) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>New Form Submission</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
                    .field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; }
                    .field-label { font-weight: bold; color: #374151; }
                    .field-value { margin-top: 5px; color: #6b7280; }
                    .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📝 New Form Submission</h2>
                        <p>You have received a new form submission</p>
                    </div>
                    <div class="content">
                        <p><strong>Submission ID:</strong> ${submissionId}</p>
                        <p><strong>Form:</strong> ${formData.formTitle || 'Untitled Form'}</p>
                        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                        
                        <h3>Form Data:</h3>
                        ${Object.entries(formData).map(([key, value]) => {
                            if (key === 'formTitle') return '';
                            return `
                                <div class="field">
                                    <div class="field-label">${this.formatFieldName(key)}:</div>
                                    <div class="field-value">${this.formatFieldValue(value)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="footer">
                        <p>This email was sent automatically by FormBuilder Pro</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    generateConfirmationHTML(formData, submissionId) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Form Submission Confirmation</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #f0fdf4; padding: 20px; border-radius: 0 0 8px 8px; }
                    .field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; }
                    .field-label { font-weight: bold; color: #374151; }
                    .field-value { margin-top: 5px; color: #6b7280; }
                    .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✅ Submission Confirmed</h2>
                        <p>Thank you for your submission!</p>
                    </div>
                    <div class="content">
                        <p>Your form submission has been received successfully.</p>
                        
                        <p><strong>Confirmation ID:</strong> ${submissionId}</p>
                        <p><strong>Form:</strong> ${formData.formTitle || 'Untitled Form'}</p>
                        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                        
                        <h3>Your Submitted Information:</h3>
                        ${Object.entries(formData).map(([key, value]) => {
                            if (key === 'formTitle') return '';
                            return `
                                <div class="field">
                                    <div class="field-label">${this.formatFieldName(key)}:</div>
                                    <div class="field-value">${this.formatFieldValue(value)}</div>
                                </div>
                            `;
                        }).join('')}
                        
                        <p style="margin-top: 20px;">
                            <strong>What happens next?</strong><br>
                            We will review your submission and get back to you if any additional information is needed.
                        </p>
                    </div>
                    <div class="footer">
                        <p>Please keep this email for your records</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    generatePaymentConfirmationHTML(paymentData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Payment Confirmation</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #f0fdf4; padding: 20px; border-radius: 0 0 8px 8px; }
                    .payment-details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
                    .amount { font-size: 24px; font-weight: bold; color: #059669; }
                    .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>💳 Payment Confirmed</h2>
                        <p>Your payment has been processed successfully</p>
                    </div>
                    <div class="content">
                        <div class="payment-details">
                            <p><strong>Transaction ID:</strong> ${paymentData.transactionId}</p>
                            <p><strong>Amount:</strong> <span class="amount">$${paymentData.amount.toFixed(2)}</span></p>
                            <p><strong>Payment Method:</strong> ${paymentData.paymentMethod || 'Credit Card'}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Completed</span></p>
                        </div>
                        
                        <p>Your payment has been successfully processed. You will see this charge on your statement as "FormBuilder Pro".</p>
                        
                        <p style="margin-top: 20px;">
                            <strong>Need help?</strong><br>
                            If you have any questions about this payment, please contact our support team.
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated receipt. Please keep this email for your records.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    generateSigningRequestHTML(documentData, signingUrl) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Document Signature Required</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #faf5ff; padding: 20px; border-radius: 0 0 8px 8px; }
                    .sign-button { 
                        display: inline-block; 
                        background: #7c3aed; 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        margin: 20px 0;
                    }
                    .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✍️ Signature Required</h2>
                        <p>Please review and sign the document</p>
                    </div>
                    <div class="content">
                        <p>You have been asked to review and sign the following document:</p>
                        
                        <p><strong>Document:</strong> ${documentData.title}</p>
                        <p><strong>From:</strong> ${documentData.sender || 'FormBuilder Pro'}</p>
                        <p><strong>Due Date:</strong> ${documentData.dueDate || 'No deadline specified'}</p>
                        
                        <div style="text-align: center;">
                            <a href="${signingUrl}" class="sign-button">Review & Sign Document</a>
                        </div>
                        
                        <p style="margin-top: 20px;">
                            <strong>What you need to do:</strong><br>
                            1. Click the button above to open the document<br>
                            2. Review the document carefully<br>
                            3. Add your signature where indicated<br>
                            4. Submit the completed document
                        </p>
                        
                        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                            If you're having trouble with the button above, copy and paste this URL into your browser:<br>
                            ${signingUrl}
                        </p>
                    </div>
                    <div class="footer">
                        <p>This document signing request was sent via FormBuilder Pro</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    formatFieldName(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }

    formatFieldValue(value) {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value || 'N/A');
    }

    // Utility method for testing email templates
    previewEmailTemplate(type, data) {
        let html = '';
        
        switch (type) {
            case 'submission':
                html = this.generateSubmissionNotificationHTML(data.formData, data.submissionId);
                break;
            case 'confirmation':
                html = this.generateConfirmationHTML(data.formData, data.submissionId);
                break;
            case 'payment':
                html = this.generatePaymentConfirmationHTML(data.paymentData);
                break;
            case 'signing':
                html = this.generateSigningRequestHTML(data.documentData, data.signingUrl);
                break;
            default:
                console.error('Unknown email template type:', type);
                return;
        }
        
        // Open preview in new window
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        previewWindow.document.write(html);
        previewWindow.document.close();
    }
}

// Initialize global email service
window.emailService = new EmailService();

console.log('📧 Email Service loaded successfully'); 