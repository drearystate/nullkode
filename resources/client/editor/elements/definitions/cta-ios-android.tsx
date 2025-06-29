import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {PhoneAndroidIcon} from '@common/icons/material/PhoneAndroid';

const template = `<section class="cta-ios-android">
  <div class="cta-container">
    <div class="cta-content">
      <div class="cta-text">
        <h2 class="cta-subtitle">ROOF PARTY POLAROID</h2>
        <h1 class="cta-title">Master Cleanse Reliac Heirloom</h1>
      </div>
      <div class="cta-buttons">
        <button class="app-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="app-icon" viewBox="0 0 512 512">
            <path d="M99.617 8.057a50.191 50.191 0 00-38.815-6.713l230.932 230.933 74.846-74.846L99.617 8.057zM32.139 20.116c-6.441 8.563-10.148 19.077-10.148 30.199v411.358c0 11.123 3.708 21.636 10.148 30.199l235.877-235.877L32.139 20.116zM464.261 212.087l-67.266-37.637-81.544 81.544 81.548 81.548 67.273-37.64c16.117-9.03 25.738-25.442 25.738-43.908s-9.621-34.877-25.749-43.907zM291.733 279.711L60.815 510.629c3.786.891 7.639 1.371 11.492 1.371a50.275 50.275 0 0027.31-8.07l266.965-149.372-74.849-74.847z"></path>
          </svg>
          <span class="app-text">
            <span class="app-subtitle">GET IT ON</span>
            <span class="app-title">Google Play</span>
          </span>
        </button>
        <button class="app-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="app-icon" viewBox="0 0 305 305">
            <path d="M40.74 112.12c-25.79 44.74-9.4 112.65 19.12 153.82C74.09 286.52 88.5 305 108.24 305c.37 0 .74 0 1.13-.02 9.27-.37 15.97-3.23 22.45-5.99 7.27-3.1 14.8-6.3 26.6-6.3 11.22 0 18.39 3.1 25.31 6.1 6.83 2.95 13.87 6 24.26 5.81 22.23-.41 35.88-20.35 47.92-37.94a168.18 168.18 0 0021-43l.09-.28a2.5 2.5 0 00-1.33-3.06l-.18-.08c-3.92-1.6-38.26-16.84-38.62-58.36-.34-33.74 25.76-51.6 31-54.84l.24-.15a2.5 2.5 0 00.7-3.51c-18-26.37-45.62-30.34-56.73-30.82a50.04 50.04 0 00-4.95-.24c-13.06 0-25.56 4.93-35.61 8.9-6.94 2.73-12.93 5.09-17.06 5.09-4.64 0-10.67-2.4-17.65-5.16-9.33-3.7-19.9-7.9-31.1-7.9l-.79.01c-26.03.38-50.62 15.27-64.18 38.86z"></path>
            <path d="M212.1 0c-15.76.64-34.67 10.35-45.97 23.58-9.6 11.13-19 29.68-16.52 48.38a2.5 2.5 0 002.29 2.17c1.06.08 2.15.12 3.23.12 15.41 0 32.04-8.52 43.4-22.25 11.94-14.5 17.99-33.1 16.16-49.77A2.52 2.52 0 00212.1 0z"></path>
          </svg>
          <span class="app-text">
            <span class="app-subtitle">Download on the</span>
            <span class="app-title">App Store</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</section>`;

const style = `.cta-ios-android {
  color: #718096;
  padding: 96px 0;
}

.cta-ios-android .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
}

.cta-ios-android .cta-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-content {
    flex-direction: row;
  }
}

.cta-ios-android .cta-text {
  display: flex;
  flex-direction: column;
  padding-right: 0;
  margin-bottom: 24px;
  padding: 0;
  width: 100%;
  text-align: center;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-text {
    padding-right: 40px;
    margin-bottom: 0;
    width: auto;
    text-align: left;
  }
}

.cta-ios-android .cta-subtitle {
  font-size: 12px;
  color: #667eea;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.cta-ios-android .cta-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-title {
    font-size: 30px;
  }
}

.cta-ios-android .cta-buttons {
  display: flex;
  margin-left: 0;
  margin-right: 0;
  margin: 0 auto;
  align-items: center;
  flex-shrink: 0;
  gap: 16px;
  flex-direction: column;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-buttons {
    margin-left: auto;
    margin-right: 0;
    flex-direction: row;
  }
}

.cta-ios-android .app-button {
  background-color: #f7fafc;
  display: inline-flex;
  padding: 12px 20px;
  border-radius: 8px;
  align-items: center;
  border: none;
  cursor: pointer;
  outline: none;
  transition: background-color 0.2s ease;
  width: 100%;
  min-width: 200px;
}

@media (min-width: 768px) {
  .cta-ios-android .app-button {
    width: auto;
  }
}

.cta-ios-android .app-button:hover {
  background-color: #e2e8f0;
}

.cta-ios-android .app-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.cta-ios-android .app-icon {
  width: 24px;
  height: 24px;
  color: #374151;
}

.cta-ios-android .app-text {
  margin-left: 16px;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  line-height: 1;
}

.cta-ios-android .app-subtitle {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.cta-ios-android .app-title {
  font-weight: 500;
  color: #1a202c;
  font-size: 16px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .cta-ios-android {
    padding: 48px 0;
  }
  
  .cta-ios-android .cta-container {
    padding: 0 16px;
  }
  
  .cta-ios-android .cta-title {
    font-size: 20px;
  }
  
  .cta-ios-android .cta-buttons {
    gap: 12px;
  }
  
  .cta-ios-android .app-button {
    min-width: 180px;
  }
}`;

export class CtaIosAndroidEl extends ArchitectElement {
  name = 'CTA iOS Android';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<PhoneAndroidIcon />);
  specificity = 3;
  hiddenClasses = ['cta-ios-android'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'cta-ios-android');
  }
} 