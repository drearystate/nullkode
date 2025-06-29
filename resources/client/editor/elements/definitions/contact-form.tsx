import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {EmailIcon} from '@common/icons/material/Email';

const template = `<div class="contact-form-component">
  <div class="form-container">
    <div class="form-header">
      <h2>Get In Touch</h2>
      <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
    </div>
    
    <form class="contact-form" action="/contact" method="POST">
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">First Name *</label>
          <input type="text" id="firstName" name="first_name" required>
        </div>
        <div class="form-group">
          <label for="lastName">Last Name *</label>
          <input type="text" id="lastName" name="last_name" required>
        </div>
      </div>
      
      <div class="form-group">
        <label for="email">Email Address *</label>
        <input type="email" id="email" name="email" required>
      </div>
      
      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone">
      </div>
      
      <div class="form-group">
        <label for="subject">Subject *</label>
        <select id="subject" name="subject" required>
          <option value="">Select a subject</option>
          <option value="general">General Inquiry</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" rows="5" required placeholder="Tell us about your project or inquiry..."></textarea>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="newsletter" name="newsletter" value="1">
          <span class="checkmark"></span>
          Subscribe to our newsletter for updates and tips
        </label>
      </div>
      
      <div class="form-group">
        <button type="submit" class="submit-btn">
          <span class="btn-text">Send Message</span>
          <span class="btn-loader" style="display: none;">Sending...</span>
        </button>
      </div>
    </form>
    
    <div class="success-message" style="display: none;">
      <div class="success-icon">✓</div>
      <h3>Thank You!</h3>
      <p>Your message has been sent successfully. We'll get back to you soon.</p>
    </div>
  </div>
  
  <script>
    window.ContactForm = {
      init: function() {
        const forms = document.querySelectorAll('.contact-form');
        forms.forEach(form => this.setupForm(form));
      },
      
      setupForm: function(form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSubmit(form);
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          input.addEventListener('blur', () => this.validateField(input));
          input.addEventListener('input', () => this.clearErrors(input));
        });
      },
      
      validateField: function(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';
        
        // Remove existing error
        this.clearErrors(field);
        
        if (field.required && !value) {
          isValid = false;
          message = 'This field is required';
        } else if (field.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            isValid = false;
            message = 'Please enter a valid email address';
          }
        } else if (field.type === 'tel' && value) {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            isValid = false;
            message = 'Please enter a valid phone number';
          }
        }
        
        if (!isValid) {
          this.showFieldError(field, message);
        }
        
        return isValid;
      },
      
      showFieldError: function(field, message) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
      },
      
      clearErrors: function(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
          errorElement.remove();
        }
      },
      
      handleSubmit: function(form) {
        const formData = new FormData(form);
        let isFormValid = true;
        
        // Validate all fields
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          if (!this.validateField(input)) {
            isFormValid = false;
          }
        });
        
        if (!isFormValid) {
          return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        // Simulate form submission (replace with actual endpoint)
        setTimeout(() => {
          this.showSuccess(form);
          this.resetForm(form);
        }, 1500);
      },
      
      showSuccess: function(form) {
        const container = form.closest('.form-container');
        const successMessage = container.querySelector('.success-message');
        
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          form.style.display = 'block';
          successMessage.style.display = 'none';
        }, 5000);
      },
      
      resetForm: function(form) {
        form.reset();
        
        // Reset button state
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        
        // Clear any remaining errors
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => this.clearErrors(input));
      }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.ContactForm.init();
      });
    } else {
      window.ContactForm.init();
    }
  </script>
</div>`;

const style = `.contact-form-component {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.contact-form-component .form-container {
  padding: 40px;
}

.contact-form-component .form-header {
  text-align: center;
  margin-bottom: 40px;
}

.contact-form-component .form-header h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.contact-form-component .form-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
  line-height: 1.5;
}

.contact-form-component .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.contact-form-component .form-group {
  margin-bottom: 24px;
}

.contact-form-component label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
  font-size: 14px;
}

.contact-form-component input,
.contact-form-component textarea,
.contact-form-component select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  background: #ffffff;
  color: #2c3e50;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.contact-form-component input:focus,
.contact-form-component textarea:focus,
.contact-form-component select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.contact-form-component input.error,
.contact-form-component textarea.error,
.contact-form-component select.error {
  border-color: #e74c3c;
}

.contact-form-component .error-message {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

.contact-form-component textarea {
  resize: vertical;
  min-height: 120px;
}

.contact-form-component .checkbox-group {
  margin: 24px 0;
}

.contact-form-component .checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  line-height: 1.4;
}

.contact-form-component .checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  opacity: 0;
  position: absolute;
}

.contact-form-component .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #e1e8ed;
  border-radius: 4px;
  background: #ffffff;
  flex-shrink: 0;
  position: relative;
  transition: all 0.3s ease;
}

.contact-form-component .checkbox-label input:checked + .checkmark {
  background: #3498db;
  border-color: #3498db;
}

.contact-form-component .checkbox-label input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.contact-form-component .submit-btn {
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.contact-form-component .submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5dade2, #3498db);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(52, 152, 219, 0.3);
}

.contact-form-component .submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.contact-form-component .success-message {
  text-align: center;
  padding: 40px 20px;
}

.contact-form-component .success-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px auto;
  font-size: 24px;
  color: white;
  font-weight: bold;
}

.contact-form-component .success-message h3 {
  margin: 0 0 12px 0;
  color: #27ae60;
  font-size: 24px;
}

.contact-form-component .success-message p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

@media (max-width: 768px) {
  .contact-form-component .form-container {
    padding: 24px;
  }
  
  .contact-form-component .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .contact-form-component .form-header h2 {
    font-size: 24px;
  }
  
  .contact-form-component .form-header {
    margin-bottom: 30px;
  }
}`;

export class ContactFormEl extends ArchitectElement {
  name = 'Contact Form';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'forms';
  icon = (<EmailIcon />);
  specificity = 3;
  hiddenClasses = ['contact-form-component'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'contact-form-component');
  }
} 