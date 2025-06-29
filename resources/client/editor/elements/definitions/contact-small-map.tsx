import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ContactMailIcon} from '@common/icons/material/ContactMail';

const template = `<section class="contact-small-map">
  <div class="contact-container">
    <div class="contact-layout">
      <div class="map-section">
        <iframe 
          width="100%" 
          height="100%" 
          class="map-iframe" 
          frameborder="0" 
          title="map" 
          marginheight="0" 
          marginwidth="0" 
          scrolling="no" 
          src="https://maps.google.com/maps?width=100%&height=600&hl=en&q=New+York+(My%20Business%20Name)&ie=UTF8&t=&z=14&iwloc=B&output=embed">
        </iframe>
        <div class="contact-info">
          <div class="info-section">
            <h2 class="info-title">ADDRESS</h2>
            <p class="info-text">Photo booth tattooed prism, portland taiyaki hoodie neutra typewriter</p>
          </div>
          <div class="info-section">
            <h2 class="info-title">EMAIL</h2>
            <a class="info-link">example@email.com</a>
            <h2 class="info-title info-title-spaced">PHONE</h2>
            <p class="info-text">123-456-7890</p>
          </div>
        </div>
      </div>
      <div class="form-section">
        <h2 class="form-title">Feedback</h2>
        <p class="form-description">Post-ironic portland shabby chic echo park, banjo fashion axe</p>
        <div class="form-field">
          <label for="name" class="field-label">Name</label>
          <input type="text" id="name" name="name" class="field-input">
        </div>
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
  </div>
</section>`;

const style = `.contact-small-map {
  color: #718096;
  position: relative;
}

.contact-small-map .contact-container {
  max-width: 1200px;
  padding: 96px 20px;
  margin: 0 auto;
}

.contact-small-map .contact-layout {
  display: flex;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .contact-small-map .contact-layout {
    flex-wrap: nowrap;
  }
}

.contact-small-map .map-section {
  background-color: #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  padding: 40px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  position: relative;
  width: 100%;
  margin-bottom: 40px;
  min-height: 400px;
}

@media (min-width: 640px) {
  .contact-small-map .map-section {
    margin-right: 40px;
    margin-bottom: 0;
  }
}

@media (min-width: 768px) {
  .contact-small-map .map-section {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .contact-small-map .map-section {
    width: 66.666667%;
  }
}

.contact-small-map .map-iframe {
  position: absolute;
  top: 0;
  left: 0;
  filter: grayscale(1) contrast(1.2) opacity(0.4);
}

.contact-small-map .contact-info {
  background-color: white;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.contact-small-map .info-section {
  padding: 0 24px;
  width: 100%;
  margin-top: 16px;
}

@media (min-width: 1024px) {
  .contact-small-map .info-section {
    width: 50%;
    margin-top: 0;
  }
  
  .contact-small-map .info-section:first-child {
    margin-top: 0;
  }
}

.contact-small-map .info-title {
  font-weight: 600;
  color: #1a202c;
  letter-spacing: 0.1em;
  font-size: 12px;
  text-transform: uppercase;
}

.contact-small-map .info-title-spaced {
  margin-top: 16px;
}

.contact-small-map .info-text {
  margin-top: 4px;
  color: #4a5568;
  line-height: 1.6;
}

.contact-small-map .info-link {
  color: #667eea;
  line-height: 1.6;
  text-decoration: none;
}

.contact-small-map .info-link:hover {
  color: #5a67d8;
}

.contact-small-map .form-section {
  background-color: white;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 32px 0;
  margin-top: 32px;
}

@media (min-width: 768px) {
  .contact-small-map .form-section {
    width: 50%;
    margin-left: auto;
    padding: 32px 0;
    margin-top: 0;
  }
}

@media (min-width: 1024px) {
  .contact-small-map .form-section {
    width: 33.333333%;
  }
}

.contact-small-map .form-title {
  color: #1a202c;
  font-size: 18px;
  margin-bottom: 4px;
  font-weight: 500;
}

.contact-small-map .form-description {
  line-height: 1.6;
  margin-bottom: 20px;
  color: #4a5568;
}

.contact-small-map .form-field {
  position: relative;
  margin-bottom: 16px;
}

.contact-small-map .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #4a5568;
  display: block;
  margin-bottom: 4px;
}

.contact-small-map .field-input,
.contact-small-map .field-textarea {
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

.contact-small-map .field-input:focus,
.contact-small-map .field-textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contact-small-map .field-textarea {
  height: 128px;
  resize: none;
  line-height: 1.5;
}

.contact-small-map .submit-button {
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

.contact-small-map .submit-button:hover {
  background-color: #5a67d8;
}

.contact-small-map .submit-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.contact-small-map .form-note {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 12px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .contact-small-map .contact-container {
    padding: 48px 16px;
  }
  
  .contact-small-map .map-section {
    padding: 24px;
    min-height: 300px;
  }
  
  .contact-small-map .contact-info {
    padding: 16px;
  }
  
  .contact-small-map .info-section {
    padding: 0 12px;
  }
}`;

export class ContactSmallMapEl extends ArchitectElement {
  name = 'Contact Small Map';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ContactMailIcon />);
  specificity = 3;
  hiddenClasses = ['contact-small-map'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'contact-small-map');
  }
} 