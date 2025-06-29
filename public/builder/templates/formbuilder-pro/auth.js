// FormBuilder Pro Authentication System
// Prevents execution in editor/iframe contexts for safety

// Enhanced detection for editor environments
function isInEditorMode() {
    return (
        window.self !== window.top || 
        window.location.href.includes('about:srcdoc') ||
        window.location.href.includes('/builder/') ||
        window.parent !== window ||
        document.referrer.includes('/builder/') ||
        window.frameElement !== null ||
        typeof window.builderMode !== 'undefined'
    );
}

if (isInEditorMode()) {
    // Create comprehensive dummy object to prevent errors in editor
    window.TemplateAuth = {
        isLoggedIn: () => true, // Always logged in for editor
        login: () => true,
        logout: () => { },
        register: () => true,
        getCurrentUser: () => ({
            id: 1,
            name: 'Admin User',
            email: 'admin@admin.com',
            role: 'admin'
        }),
        requestPasswordReset: () => true,
        getUserForms: () => [
            { id: 1, title: 'Sample Form 1', status: 'completed', responses: 45 },
            { id: 2, title: 'Sample Form 2', status: 'pending', responses: 12 }
        ],
        getAnalytics: () => ({
            totalForms: 12,
            completedForms: 8,
            pendingForms: 3,
            totalResponses: 245
        }),
        createTemplate: () => true,
        createForm: () => true
    };
    
    // Dummy global functions for editor compatibility
    window.showPage = function() { };
    window.login = function() { return true; };
    window.logout = function() { };
    window.register = function() { return true; };
    window.showSection = function() { };
    window.setTimePeriod = function() { };
    window.exportReport = function() { };
    window.generateCertificate = function() { };
    
    console.log('DocuClone template running in editor mode - authentication bypassed');
} else {
    // Full authentication system for actual usage
    
    class TemplateAuth {
        constructor() {
            this.storageKey = 'formbuilder_auth_session';
            this.usersKey = 'formbuilder_users_db';
            this.formsKey = 'formbuilder_forms_db';
            this.users = this.loadUsers();
            this.currentUser = this.loadSession();
            this.forms = this.loadForms();
            this.initializeAdminUser();
        }

        // Load users from localStorage
        loadUsers() {
            try {
                const users = localStorage.getItem(this.usersKey);
                return users ? JSON.parse(users) : {};
            } catch (e) {
                console.error('Error loading users:', e);
                return {};
            }
        }

        // Save users to localStorage
        saveUsers() {
            try {
                localStorage.setItem(this.usersKey, JSON.stringify(this.users));
            } catch (e) {
                console.error('Error saving users:', e);
            }
        }

        // Load forms from localStorage
        loadForms() {
            try {
                const forms = localStorage.getItem(this.formsKey);
                return forms ? JSON.parse(forms) : [];
            } catch (e) {
                console.error('Error loading forms:', e);
                return [];
            }
        }

        // Save forms to localStorage
        saveForms() {
            try {
                localStorage.setItem(this.formsKey, JSON.stringify(this.forms));
            } catch (e) {
                console.error('Error saving forms:', e);
            }
        }

        // Initialize admin user with fixed credentials
        initializeAdminUser() {
            const adminEmail = 'admin@admin.com';
            const adminName = 'Admin User';
            
            if (!this.users[adminEmail]) {
                this.users[adminEmail] = {
                    id: 1,
                    name: adminName,
                    email: adminEmail,
                    password: 'admin123!', // Default admin password
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    subscription: 'pro',
                    formsCreated: 0,
                    responsesReceived: 0
                };
                this.saveUsers();
            }
        }

        // Load session from localStorage
        loadSession() {
            try {
                const session = localStorage.getItem(this.storageKey);
                if (session) {
                    const sessionData = JSON.parse(session);
                    
                    // Check if session is expired
                    if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
                        this.clearSession();
                        return null;
                    }
                    
                    return sessionData;
                }
            } catch (e) {
                console.error('Error loading session:', e);
                this.clearSession();
            }
            return null;
        }

        // Save session to localStorage
        saveSession(userData, remember = false) {
            try {
                const expiresAt = remember 
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                    : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                
                const sessionData = {
                    ...userData,
                    loginTime: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString()
                };
                
                localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
                this.currentUser = sessionData;
            } catch (e) {
                console.error('Error saving session:', e);
            }
        }

        // Clear session
        clearSession() {
            try {
                localStorage.removeItem(this.storageKey);
                this.currentUser = null;
            } catch (e) {
                console.error('Error clearing session:', e);
            }
        }

        // Login method
        login(email, password, remember = false) {
            if (!email || !password) return false;
            
            const user = this.users[email.toLowerCase()];
            if (user && user.password === password) {
                this.saveSession(user, remember);
                return true;
            }
            
            return false;
        }

        // Register method
        register(userData) {
            if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
                return false;
            }
            
            const email = userData.email.toLowerCase();
            
            // Check if user already exists
            if (this.users[email]) {
                return false;
            }
            
            // Create new user
            const newUser = {
                id: Object.keys(this.users).length + 1,
                name: `${userData.firstName} ${userData.lastName}`,
                email: email,
                password: userData.password,
                role: 'user',
                createdAt: new Date().toISOString(),
                subscription: 'free',
                formsCreated: 0,
                responsesReceived: 0
            };
            
            this.users[email] = newUser;
            this.saveUsers();
            
            return true;
        }

        // Logout method
        logout() {
            this.clearSession();
        }

        // Check if user is logged in
        isLoggedIn() {
            return this.currentUser !== null;
        }

        // Get current user
        getCurrentUser() {
            return this.currentUser;
        }

        // Request password reset
        requestPasswordReset(email) {
            if (!email) return false;
            
            const user = this.users[email.toLowerCase()];
            if (user) {
                // In a real app, this would send an email
                // For demo purposes, we'll just return true
                console.log(`Password reset requested for: ${email}`);
                return true;
            }
            
            return false;
        }

        // Form management methods
        createForm(formData) {
            if (!this.isLoggedIn()) return false;
            
            const form = {
                id: Date.now().toString(),
                title: formData.title || 'Untitled Form',
                description: formData.description || '',
                fields: formData.fields || [],
                createdBy: this.currentUser.id,
                createdAt: new Date().toISOString(),
                status: 'draft',
                responses: [],
                recipients: [],
                signingOrder: formData.signingOrder || 'parallel', // parallel or sequential
                settings: {
                    requireSignature: formData.requireSignature || false,
                    allowMultipleResponses: formData.allowMultipleResponses || false,
                    notifyOnResponse: formData.notifyOnResponse || true,
                    reminderFrequency: formData.reminderFrequency || 'daily',
                    expirationDays: formData.expirationDays || 30
                }
            };
            
            this.forms.push(form);
            this.saveForms();
            
            // Update user stats
            this.currentUser.formsCreated += 1;
            this.users[this.currentUser.email].formsCreated += 1;
            this.saveUsers();
            this.saveSession(this.currentUser);
            
            return form.id;
        }

        // Send form to recipients
        sendForm(formId, recipients, message = '') {
            const form = this.getForm(formId);
            if (!form || form.createdBy !== this.currentUser.id) return false;
            
            const sentAt = new Date().toISOString();
            const updatedRecipients = recipients.map((recipient, index) => ({
                id: `recipient_${Date.now()}_${index}`,
                email: recipient.email,
                name: recipient.name || recipient.email,
                role: recipient.role || 'signer',
                order: recipient.order || index + 1,
                status: 'pending',
                sentAt: sentAt,
                signedAt: null,
                reminderCount: 0,
                accessCode: this.generateAccessCode(),
                customMessage: message
            }));
            
            form.recipients = updatedRecipients;
            form.status = 'sent';
            form.sentAt = sentAt;
            
            this.saveForms();
            
            // Simulate email notifications
            this.simulateEmailNotifications(form, updatedRecipients, 'sent');
            
            return true;
        }

        // Generate access code for signing
        generateAccessCode() {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        // Simulate email notifications
        simulateEmailNotifications(form, recipients, type) {
            console.log(`📧 Email Notification: ${type}`);
            recipients.forEach(recipient => {
                switch(type) {
                    case 'sent':
                        console.log(`📨 Sent to ${recipient.email}: "${form.title}" requires your signature`);
                        console.log(`🔗 Signing Link: ${window.location.origin}/sign/${form.id}/${recipient.accessCode}`);
                        break;
                    case 'reminder':
                        console.log(`⏰ Reminder to ${recipient.email}: "${form.title}" still needs your signature`);
                        break;
                    case 'completed':
                        console.log(`✅ Completed: ${recipient.email} signed "${form.title}"`);
                        break;
                }
            });
        }

        // Sign document
        signDocument(formId, accessCode, signatureData) {
            const form = this.getForm(formId);
            if (!form) return false;
            
            const recipient = form.recipients.find(r => r.accessCode === accessCode);
            if (!recipient || recipient.status !== 'pending') return false;
            
            recipient.status = 'completed';
            recipient.signedAt = new Date().toISOString();
            recipient.signatureData = signatureData;
            
            // Check if all required signatures are complete
            const allSigned = form.recipients.filter(r => r.role === 'signer').every(r => r.status === 'completed');
            if (allSigned) {
                form.status = 'completed';
                form.completedAt = new Date().toISOString();
            }
            
            this.saveForms();
            
            // Notify form owner
            this.simulateEmailNotifications(form, [recipient], 'completed');
            
            return true;
        }

        // Get signing status
        getSigningStatus(formId) {
            const form = this.getForm(formId);
            if (!form) return null;
            
            const totalSigners = form.recipients.filter(r => r.role === 'signer').length;
            const completedSigners = form.recipients.filter(r => r.role === 'signer' && r.status === 'completed').length;
            const pendingSigners = form.recipients.filter(r => r.status === 'pending').length;
            
            return {
                total: totalSigners,
                completed: completedSigners,
                pending: pendingSigners,
                percentage: totalSigners > 0 ? Math.round((completedSigners / totalSigners) * 100) : 0,
                recipients: form.recipients
            };
        }

        // Send reminders
        sendReminders(formId) {
            const form = this.getForm(formId);
            if (!form || form.createdBy !== this.currentUser.id) return false;
            
            const pendingRecipients = form.recipients.filter(r => r.status === 'pending');
            
            pendingRecipients.forEach(recipient => {
                recipient.reminderCount += 1;
                recipient.lastReminderAt = new Date().toISOString();
            });
            
            this.saveForms();
            this.simulateEmailNotifications(form, pendingRecipients, 'reminder');
            
            return true;
        }

        // Cancel/void document
        voidDocument(formId, reason = '') {
            const form = this.getForm(formId);
            if (!form || form.createdBy !== this.currentUser.id) return false;
            
            form.status = 'voided';
            form.voidedAt = new Date().toISOString();
            form.voidReason = reason;
            
            // Update all pending recipients
            form.recipients.forEach(recipient => {
                if (recipient.status === 'pending') {
                    recipient.status = 'voided';
                }
            });
            
            this.saveForms();
            return true;
        }

        // Get form for signing (by access code)
        getFormForSigning(formId, accessCode) {
            const form = this.getForm(formId);
            if (!form) return null;
            
            const recipient = form.recipients.find(r => r.accessCode === accessCode);
            if (!recipient) return null;
            
            return {
                form: form,
                recipient: recipient,
                canSign: recipient.status === 'pending'
            };
        }

        // Advanced DocuSign Features

        // Bulk Send functionality
        bulkSend(templateId, recipientsList, message = '') {
            if (!this.isLoggedIn()) return false;
            
            const template = this.getForm(templateId);
            if (!template || template.createdBy !== this.currentUser.id) return false;
            
            const sentForms = [];
            
            recipientsList.forEach((recipients, index) => {
                const form = {
                    ...template,
                    id: `${templateId}_bulk_${Date.now()}_${index}`,
                    title: `${template.title} - Bulk ${index + 1}`,
                    recipients: recipients.map((recipient, rIndex) => ({
                        id: `recipient_${Date.now()}_${index}_${rIndex}`,
                        email: recipient.email,
                        name: recipient.name || recipient.email,
                        role: recipient.role || 'signer',
                        order: rIndex + 1,
                        status: 'pending',
                        sentAt: new Date().toISOString(),
                        signedAt: null,
                        reminderCount: 0,
                        accessCode: this.generateAccessCode(),
                        customMessage: message
                    })),
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    isBulkSent: true,
                    bulkBatchId: `batch_${Date.now()}`
                };
                
                this.forms.push(form);
                sentForms.push(form.id);
            });
            
            this.saveForms();
            return sentForms;
        }

        // Template system
        createTemplate(formData) {
            if (!this.isLoggedIn()) return false;
            
            const template = {
                ...formData,
                id: `template_${Date.now()}`,
                isTemplate: true,
                createdBy: this.currentUser.id,
                createdAt: new Date().toISOString(),
                status: 'template',
                usageCount: 0
            };
            
            this.forms.push(template);
            this.saveForms();
            return template.id;
        }

        // Payment processing
        addPaymentToForm(formId, paymentData) {
            const form = this.getForm(formId);
            if (!form || form.createdBy !== this.currentUser.id) return false;
            
            form.payment = {
                enabled: true,
                amount: paymentData.amount,
                currency: paymentData.currency || 'USD',
                description: paymentData.description || 'Document signing fee',
                processor: paymentData.processor || 'stripe',
                required: paymentData.required || false
            };
            
            this.saveForms();
            return true;
        }

        // ID Verification
        requireIdVerification(formId, recipientEmail, verificationType = 'government_id') {
            const form = this.getForm(formId);
            if (!form) return false;
            
            const recipient = form.recipients.find(r => r.email === recipientEmail);
            if (!recipient) return false;
            
            recipient.idVerification = {
                required: true,
                type: verificationType, // 'government_id', 'selfie', 'knowledge_based'
                status: 'pending',
                attempts: 0,
                maxAttempts: 3
            };
            
            this.saveForms();
            return true;
        }

        // Conditional Logic
        addConditionalLogic(formId, fieldId, conditions) {
            const form = this.getForm(formId);
            if (!form) return false;
            
            if (!form.conditionalLogic) form.conditionalLogic = {};
            
            form.conditionalLogic[fieldId] = {
                conditions: conditions, // [{field: 'field1', operator: 'equals', value: 'yes'}]
                actions: conditions.actions // [{type: 'show', targets: ['field2', 'field3']}]
            };
            
            this.saveForms();
            return true;
        }

        // Audit Trail
        addAuditEvent(formId, eventType, details) {
            const form = this.getForm(formId);
            if (!form) return false;
            
            if (!form.auditTrail) form.auditTrail = [];
            
            form.auditTrail.push({
                id: `audit_${Date.now()}`,
                timestamp: new Date().toISOString(),
                eventType: eventType, // 'document_sent', 'document_viewed', 'document_signed', etc.
                details: details,
                ipAddress: 'xxx.xxx.xxx.xxx', // In production, get real IP
                userAgent: navigator.userAgent,
                location: 'Unknown' // In production, get geolocation
            });
            
            this.saveForms();
            return true;
        }

        // Certificate of Completion
        generateCertificate(formId) {
            const form = this.getForm(formId);
            if (!form || form.status !== 'completed') return null;
            
            return {
                documentId: formId,
                documentTitle: form.title,
                completedAt: form.completedAt,
                signers: form.recipients.filter(r => r.status === 'completed').map(r => ({
                    name: r.name,
                    email: r.email,
                    signedAt: r.signedAt,
                    ipAddress: r.ipAddress || 'xxx.xxx.xxx.xxx',
                    authMethod: r.authMethod || 'email'
                })),
                certificateId: `cert_${Date.now()}`,
                issuer: 'DocuClone',
                digitalSeal: `seal_${Date.now()}` // In production, use cryptographic seal
            };
        }

        // Advanced Analytics
        getAnalytics(timeframe = '30d') {
            const forms = this.getUserForms();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));
            
            const filteredForms = forms.filter(form => 
                new Date(form.createdAt) >= cutoffDate
            );
            
            return {
                totalDocuments: filteredForms.length,
                completedDocuments: filteredForms.filter(f => f.status === 'completed').length,
                pendingDocuments: filteredForms.filter(f => f.status === 'sent').length,
                voidedDocuments: filteredForms.filter(f => f.status === 'voided').length,
                averageSigningTime: this.calculateAverageSigningTime(filteredForms),
                completionRate: this.calculateCompletionRate(filteredForms),
                topSigners: this.getTopSigners(filteredForms),
                signingTrends: this.getSigningTrends(filteredForms)
            };
        }

        calculateAverageSigningTime(forms) {
            const completedForms = forms.filter(f => f.status === 'completed' && f.sentAt && f.completedAt);
            if (completedForms.length === 0) return 0;
            
            const totalTime = completedForms.reduce((sum, form) => {
                const sent = new Date(form.sentAt);
                const completed = new Date(form.completedAt);
                return sum + (completed - sent);
            }, 0);
            
            return Math.round(totalTime / completedForms.length / (1000 * 60 * 60)); // hours
        }

        calculateCompletionRate(forms) {
            const sentForms = forms.filter(f => f.status === 'sent' || f.status === 'completed');
            if (sentForms.length === 0) return 0;
            
            const completedForms = forms.filter(f => f.status === 'completed');
            return Math.round((completedForms.length / sentForms.length) * 100);
        }

        getTopSigners(forms) {
            const signerStats = {};
            
            forms.forEach(form => {
                if (form.recipients) {
                    form.recipients.forEach(recipient => {
                        if (recipient.status === 'completed') {
                            if (!signerStats[recipient.email]) {
                                signerStats[recipient.email] = {
                                    email: recipient.email,
                                    name: recipient.name,
                                    count: 0
                                };
                            }
                            signerStats[recipient.email].count++;
                        }
                    });
                }
            });
            
            return Object.values(signerStats)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }

        getSigningTrends(forms) {
            const trends = {};
            const completedForms = forms.filter(f => f.status === 'completed' && f.completedAt);
            
            completedForms.forEach(form => {
                const date = new Date(form.completedAt).toDateString();
                trends[date] = (trends[date] || 0) + 1;
            });
            
            return trends;
        }

        getUserForms() {
            if (!this.isLoggedIn()) return [];
            
            return this.forms.filter(form => form.createdBy === this.currentUser.id);
        }

        getForm(formId) {
            return this.forms.find(form => form.id === formId);
        }

        updateForm(formId, updates) {
            const formIndex = this.forms.findIndex(form => form.id === formId);
            if (formIndex !== -1 && this.forms[formIndex].createdBy === this.currentUser.id) {
                this.forms[formIndex] = { ...this.forms[formIndex], ...updates };
                this.saveForms();
                return true;
            }
            return false;
        }

        deleteForm(formId) {
            const formIndex = this.forms.findIndex(form => form.id === formId);
            if (formIndex !== -1 && this.forms[formIndex].createdBy === this.currentUser.id) {
                this.forms.splice(formIndex, 1);
                this.saveForms();
                return true;
            }
            return false;
        }

        submitFormResponse(formId, responseData) {
            const form = this.getForm(formId);
            if (!form) return false;
            
            const response = {
                id: Date.now().toString(),
                formId: formId,
                data: responseData,
                submittedAt: new Date().toISOString(),
                ip: 'demo', // In real app, would get actual IP
                userAgent: navigator.userAgent
            };
            
            form.responses.push(response);
            this.saveForms();
            
            return true;
        }
    }

    // Initialize authentication
    window.TemplateAuth = new TemplateAuth();

    // Global helper functions
    window.showPage = function(pageId) {
        try {
            // Hide all pages
            const pages = document.querySelectorAll('.page-content');
            pages.forEach(page => page.style.display = 'none');
            
            // Show selected page
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.style.display = 'block';
            }
        } catch (e) {
            console.error('Error showing page:', e);
        }
    };

    window.login = function(email, password, remember) {
        return TemplateAuth.login(email, password, remember);
    };

    window.logout = function() {
        TemplateAuth.logout();
    };

    window.register = function(userData) {
        return TemplateAuth.register(userData);
    };

    // Form management functions
    window.createForm = function(formData) {
        return TemplateAuth.createForm(formData);
    };

    window.getUserForms = function() {
        return TemplateAuth.getUserForms();
    };

    window.getForm = function(formId) {
        return TemplateAuth.getForm(formId);
    };

    window.updateForm = function(formId, updates) {
        return TemplateAuth.updateForm(formId, updates);
    };

    window.deleteForm = function(formId) {
        return TemplateAuth.deleteForm(formId);
    };

    // Utility functions
    window.formatDate = function(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    window.generateShareLink = function(formId) {
        return `${window.location.origin}/form/${formId}`;
    };

    // DocuSign-style workflow functions
    window.sendForm = function(formId, recipients, message) {
        return TemplateAuth.sendForm(formId, recipients, message);
    };

    window.getSigningStatus = function(formId) {
        return TemplateAuth.getSigningStatus(formId);
    };

    window.sendReminders = function(formId) {
        return TemplateAuth.sendReminders(formId);
    };

    window.voidDocument = function(formId, reason) {
        return TemplateAuth.voidDocument(formId, reason);
    };

    window.signDocument = function(formId, accessCode, signatureData) {
        return TemplateAuth.signDocument(formId, accessCode, signatureData);
    };

    window.getFormForSigning = function(formId, accessCode) {
        return TemplateAuth.getFormForSigning(formId, accessCode);
    };

    window.generateSigningLink = function(formId, accessCode) {
        return `${window.location.origin}/sign.html?form=${formId}&code=${accessCode}`;
    };
} 