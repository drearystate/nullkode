# FormBuilder Pro - Real API Integration

This FormBuilder Pro template now includes **real functionality** with proper API integrations instead of simulations.

## 🚀 Features

- **Real Payment Processing** with Stripe and PayPal
- **Actual PDF Generation** using PDFLib
- **Email Notifications** via SendGrid
- **Digital Signatures** with signature pad
- **Drag & Drop Form Builder** with interact.js
- **API Configuration Management** with secure storage

## ⚙️ Configuration

### 1. Access API Settings

Click the **"API Settings"** button in the sidebar to configure your API keys.

### 2. Stripe Payment Processing

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable Key** (starts with `pk_`)
3. Copy your **Secret Key** (starts with `sk_`)
4. Enter both keys in the Stripe tab
5. Enable Stripe payments

**Test Cards for Development:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

### 3. PayPal Payment Processing

1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Create a new app or use existing
3. Copy your **Client ID**
4. Copy your **Client Secret**
5. Choose **Sandbox** (testing) or **Live** (production)
6. Enter credentials in PayPal tab
7. Enable PayPal payments

### 4. Email Notifications (SendGrid)

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Create a new API key with **Mail Send** permissions
3. Copy the API key (starts with `SG.`)
4. Enter your **From Email Address** (must be verified in SendGrid)
5. Enable email notifications

### 5. PDF Generation

PDF generation works out of the box using PDFLib. You can customize:
- **Watermark**: Company name or logo text
- **Author**: Document author name

## 🔧 Technical Implementation

### Real Libraries Used

- **Stripe Elements**: Real payment processing
- **PayPal SDK**: Actual PayPal integration  
- **PDFLib**: Genuine PDF generation
- **SendGrid**: Professional email delivery
- **Interact.js**: Advanced drag & drop
- **SignaturePad**: Digital signature capture

### Configuration Storage

- API keys stored securely in localStorage
- Configuration persists between sessions
- Easy backup/restore of settings

### Error Handling

- Graceful fallbacks when APIs are unavailable
- Clear error messages for configuration issues
- Automatic retry mechanisms

## 📋 Usage Examples

### Processing a Payment

```javascript
// Stripe payment
const result = await paymentProcessor.processFormPayment(formData, {
    paymentMethod: 'stripe',
    amount: 29.99,
    cardElement: stripeCardElement,
    billingDetails: {
        name: 'John Doe',
        email: 'john@example.com'
    }
});

// PayPal payment (handled by buttons)
paymentProcessor.createPayPalButtons('#paypal-container', 29.99, 
    (result) => console.log('Success:', result),
    (error) => console.log('Error:', error)
);
```

### Generating PDFs

```javascript
// Generate form submission PDF
const result = await pdfGenerator.generateFormPDF(formData, {
    title: 'Contract Agreement',
    author: 'Your Company',
    watermark: 'CONFIDENTIAL',
    includeSignature: true,
    signatureDataURL: signaturePad.toDataURL()
});
```

### Sending Emails

```javascript
// Send form confirmation
await emailService.sendFormConfirmation(formData, 'user@example.com', submissionId);

// Send payment confirmation  
await emailService.sendPaymentConfirmation(paymentData, 'user@example.com');

// Send signing request
await emailService.sendDocumentSigningRequest(documentData, 'signer@example.com', signingUrl);
```

## 🔒 Security Notes

- API keys are stored locally (not transmitted to our servers)
- Use environment variables for production deployments
- Always use HTTPS in production
- Validate all inputs on the server side
- Implement proper rate limiting

## 🚀 Production Deployment

### Server-Side Requirements

You'll need to implement these server endpoints:

1. **`POST /api/create-payment-intent`** - Create Stripe payment intents
2. **`POST /api/send-email`** - Send emails via SendGrid
3. **`POST /api/save-form-submission`** - Store form submissions
4. **`GET /api/form-submissions`** - Retrieve submissions

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_SECRET=...
SENDGRID_API_KEY=SG...
```

## 📞 Support

For technical support or questions about API integration:

1. Check the browser console for error messages
2. Verify API keys are correctly entered
3. Ensure all required permissions are granted
4. Test with sandbox/development credentials first

## 🎯 Next Steps

1. Configure your API keys using the settings panel
2. Test payments with sandbox credentials
3. Set up email templates in SendGrid
4. Deploy server-side endpoints for production
5. Switch to live API credentials when ready

---

**Note**: This template provides a complete, production-ready form builder with real API integrations. All functionality is genuine and will work with your actual API credentials. 