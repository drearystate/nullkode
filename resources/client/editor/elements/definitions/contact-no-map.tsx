import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ContactMailIcon} from '@common/icons/material/ContactMail';

const template = `<section class="contact-no-map">
  <div class="contact-container">
    <div class="contact-header">
      <h1 class="header-title">Contact Us</h1>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify.</p>
    </div>
    <div class="form-wrapper">
      <div class="form-grid">
        <div class="form-field half-width">
          <div class="field-inner">
            <label for="name" class="field-label">Name</label>
            <input type="text" id="name" name="name" class="field-input">
          </div>
        </div>
        <div class="form-field half-width">
          <div class="field-inner">
            <label for="email" class="field-label">Email</label>
            <input type="email" id="email" name="email" class="field-input">
          </div>
        </div>
        <div class="form-field full-width">
          <div class="field-inner">
            <label for="message" class="field-label">Message</label>
            <textarea id="message" name="message" class="field-textarea"></textarea>
          </div>
        </div>
        <div class="form-field full-width">
          <button class="submit-button">Button</button>
        </div>
        <div class="contact-footer">
          <a class="contact-email">example@email.com</a>
          <p class="contact-address">49 Smith St.<br>Saint Cloud, MN 56301</p>
          <div class="social-links">
            <a class="social-link">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
            <a class="social-link">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
              </svg>
            </a>
            <a class="social-link">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
              </svg>
            </a>
            <a class="social-link">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.contact-no-map {
  color: #718096;
  position: relative;
}

.contact-no-map .contact-container {
  max-width: 1200px;
  padding: 96px 20px;
  margin: 0 auto;
}

.contact-no-map .contact-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 48px;
}

.contact-no-map .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .contact-no-map .header-title {
    font-size: 30px;
  }
}

.contact-no-map .header-description {
  margin: 0 auto;
  line-height: 1.6;
  font-size: 16px;
  max-width: 66.666667%;
  color: #4a5568;
}

.contact-no-map .form-wrapper {
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 768px) {
  .contact-no-map .form-wrapper {
    width: 66.666667%;
  }
}

@media (min-width: 1024px) {
  .contact-no-map .form-wrapper {
    width: 50%;
  }
}

.contact-no-map .form-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -8px;
}

.contact-no-map .form-field {
  padding: 8px;
}

.contact-no-map .half-width {
  width: 50%;
}

.contact-no-map .full-width {
  width: 100%;
}

.contact-no-map .field-inner {
  position: relative;
}

.contact-no-map .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #4a5568;
  display: block;
  margin-bottom: 4px;
}

.contact-no-map .field-input,
.contact-no-map .field-textarea {
  width: 100%;
  background-color: #f7fafc;
  background-opacity: 0.5;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 8px 12px;
  line-height: 2;
  transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.contact-no-map .field-input:focus,
.contact-no-map .field-textarea:focus {
  border-color: #667eea;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contact-no-map .field-textarea {
  height: 128px;
  resize: none;
  line-height: 1.5;
}

.contact-no-map .submit-button {
  display: flex;
  margin: 0 auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.contact-no-map .submit-button:hover {
  background-color: #5a67d8;
}

.contact-no-map .submit-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.contact-no-map .contact-footer {
  padding: 8px;
  width: 100%;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.contact-no-map .contact-email {
  color: #667eea;
  text-decoration: none;
}

.contact-no-map .contact-email:hover {
  color: #5a67d8;
}

.contact-no-map .contact-address {
  line-height: 1.4;
  margin: 20px 0;
  color: #4a5568;
}

.contact-no-map .social-links {
  display: inline-flex;
  gap: 16px;
}

.contact-no-map .social-link {
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.2s ease;
}

.contact-no-map .social-link:hover {
  color: #667eea;
}

.contact-no-map .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .contact-no-map .contact-container {
    padding: 48px 16px;
  }
  
  .contact-no-map .header-description {
    max-width: 100%;
  }
  
  .contact-no-map .form-wrapper {
    width: 100%;
  }
  
  .contact-no-map .half-width {
    width: 100%;
  }
}`;

export class ContactNoMapEl extends ArchitectElement {
  name = 'Contact No Map';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ContactMailIcon />);
  specificity = 3;
  hiddenClasses = ['contact-no-map'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'contact-no-map');
  }
} 