import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ContactMailIcon} from '@common/icons/material/ContactMail';

const template = `<section class="contact-full-map">
  <div class="map-background">
    <iframe 
      width="100%" 
      height="100%" 
      frameborder="0" 
      marginheight="0" 
      marginwidth="0" 
      title="map" 
      scrolling="no" 
      src="https://maps.google.com/maps?width=100%&height=600&hl=en&q=New+York+(My%20Business%20Name)&ie=UTF8&t=&z=14&iwloc=B&output=embed"
      class="map-iframe">
    </iframe>
  </div>
  <div class="contact-container">
    <div class="contact-form-wrapper">
      <h2 class="form-title">Feedback</h2>
      <p class="form-description">Post-ironic portland shabby chic echo park, banjo fashion axe</p>
      <div class="form-field">
        <label for="email" class="field-label">Email</label>
        <input type="email" id="email" name="email" class="field-input">
      </div>
      <div class="form-field">
        <label for="message" class="field-label">Message</label>
        <textarea id="message" name="message" class="field-textarea"></textarea>
      </div>
      <button class="submit-button">Button</button>
      <p class="form-note">Chicharrones blog helvetica normcore iceland tousled brook viral artisan.</p>
    </div>
  </div>
</section>`;

const style = `.contact-full-map {
  color: #718096;
  position: relative;
  min-height: 600px;
}

.contact-full-map .map-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
}

.contact-full-map .map-iframe {
  filter: grayscale(1) contrast(1.2) opacity(0.4);
}

.contact-full-map .contact-container {
  max-width: 1200px;
  padding: 96px 20px;
  margin: 0 auto;
  display: flex;
  position: relative;
  z-index: 10;
}

.contact-full-map .contact-form-wrapper {
  background-color: white;
  border-radius: 8px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 40px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@media (min-width: 768px) {
  .contact-full-map .contact-form-wrapper {
    width: 50%;
    margin-left: auto;
    margin-top: 0;
  }
}

@media (min-width: 1024px) {
  .contact-full-map .contact-form-wrapper {
    width: 33.333333%;
  }
}

.contact-full-map .form-title {
  color: #1a202c;
  font-size: 18px;
  margin-bottom: 4px;
  font-weight: 500;
}

.contact-full-map .form-description {
  line-height: 1.6;
  margin-bottom: 20px;
  color: #4a5568;
}

.contact-full-map .form-field {
  position: relative;
  margin-bottom: 16px;
}

.contact-full-map .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #4a5568;
  display: block;
  margin-bottom: 4px;
}

.contact-full-map .field-input,
.contact-full-map .field-textarea {
  width: 100%;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 8px 12px;
  line-height: 2;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.contact-full-map .field-input:focus,
.contact-full-map .field-textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contact-full-map .field-textarea {
  height: 128px;
  resize: none;
  line-height: 1.5;
}

.contact-full-map .submit-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.contact-full-map .submit-button:hover {
  background-color: #5a67d8;
}

.contact-full-map .submit-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.contact-full-map .form-note {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 12px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .contact-full-map .contact-container {
    padding: 48px 16px;
  }
  
  .contact-full-map .contact-form-wrapper {
    padding: 24px;
  }
}`;

export class ContactFullMapEl extends ArchitectElement {
  name = 'Contact Full Map';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ContactMailIcon />);
  specificity = 3;
  hiddenClasses = ['contact-full-map'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'contact-full-map');
  }
} 