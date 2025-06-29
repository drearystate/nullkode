import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {WebIcon} from '@common/icons/material/Web';

const template = `<footer class="footer-subscribe">
  <div class="footer-container">
    <div class="footer-columns">
      <div class="footer-column">
        <h2 class="column-title">SERVICES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Web Development</a></li>
          <li><a class="nav-link">App Development</a></li>
          <li><a class="nav-link">UI/UX Design</a></li>
          <li><a class="nav-link">Consulting</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">COMPANY</h2>
        <nav class="column-nav">
          <li><a class="nav-link">About Us</a></li>
          <li><a class="nav-link">Careers</a></li>
          <li><a class="nav-link">Blog</a></li>
          <li><a class="nav-link">Contact</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">SUPPORT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Documentation</a></li>
          <li><a class="nav-link">Help Center</a></li>
          <li><a class="nav-link">Community</a></li>
          <li><a class="nav-link">Status</a></li>
        </nav>
      </div>
      <div class="footer-column subscribe-column">
        <h2 class="column-title">SUBSCRIBE</h2>
        <div class="subscribe-form">
          <div class="form-field">
            <label for="footer-field" class="field-label">Newsletter</label>
            <input type="text" id="footer-field" name="footer-field" class="form-input" placeholder="Enter your email">
          </div>
          <button class="subscribe-button">Subscribe</button>
        </div>
        <p class="subscribe-text">
          Stay updated with our latest
          <br class="subscribe-break">coding innovations and tools
        </p>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="bottom-container">
      <a class="brand-link">
        <div class="brand-logo">
          <svg viewBox="0 0 200 200" class="logo-svg">
            <!-- Nullkode logo cubes -->
            <g>
              <!-- Main cube structure -->
              <polygon points="50,80 100,50 150,80 100,110" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="100,50 150,80 150,120 100,150" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="50,80 100,110 100,150 50,120" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
              
              <!-- Additional cubes for the nullkode pattern -->
              <polygon points="30,90 50,80 50,120 30,130" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="150,80 170,70 170,110 150,120" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="80,130 100,150 120,130 100,160" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
            </g>
          </svg>
        </div>
        <span class="brand-name">Nullkode</span>
      </a>
      <p class="copyright">© 2025 Nullkode — <a href="https://nullkode.com" class="copyright-link" target="_blank">nullkode.com</a></p>
      <span class="social-links">
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
          <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" class="social-icon" viewBox="0 0 24 24">
            <path stroke="none" d="M16 8a6 6 0 616 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 616-6zM2 9h4v12H2z"></path>
            <circle cx="4" cy="4" r="2" stroke="none"></circle>
          </svg>
        </a>
      </span>
    </div>
  </div>
</footer>`;

const style = `.footer-subscribe {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-subscribe .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
}

.footer-subscribe .footer-columns {
  display: flex;
  flex-wrap: wrap;
  text-align: center;
  order: 1;
}

@media (min-width: 768px) {
  .footer-subscribe .footer-columns {
    text-align: left;
  }
}

.footer-subscribe .footer-column {
  padding: 0 16px;
  width: 100%;
  margin-bottom: 40px;
}

@media (min-width: 768px) {
  .footer-subscribe .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-subscribe .footer-column {
    width: 25%;
  }
}

.footer-subscribe .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-subscribe .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-subscribe .column-nav li {
  margin-bottom: 8px;
}

.footer-subscribe .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-subscribe .nav-link:hover {
  color: #1a202c;
}

.footer-subscribe .subscribe-column {
  /* Special styling for subscribe column */
}

.footer-subscribe .subscribe-form {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
}

@media (min-width: 768px) {
  .footer-subscribe .subscribe-form {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

@media (min-width: 1024px) {
  .footer-subscribe .subscribe-form {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (min-width: 1280px) {
  .footer-subscribe .subscribe-form {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

.footer-subscribe .form-field {
  position: relative;
  width: 160px;
  margin-right: 8px;
}

@media (min-width: 640px) {
  .footer-subscribe .form-field {
    width: auto;
    margin-right: 16px;
  }
}

@media (min-width: 1280px) {
  .footer-subscribe .form-field {
    margin-right: 16px;
  }
}

.footer-subscribe .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
}

.footer-subscribe .form-input {
  width: 100%;
  background-color: rgba(247, 250, 252, 0.5);
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: all 0.2s ease-in-out;
}

.footer-subscribe .form-input:focus {
  background-color: transparent;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.footer-subscribe .subscribe-button {
  margin-top: 8px;
  flex-shrink: 0;
  display: inline-flex;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

@media (min-width: 1024px) {
  .footer-subscribe .subscribe-button {
    margin-top: 8px;
  }
}

@media (min-width: 1280px) {
  .footer-subscribe .subscribe-button {
    margin-top: 0;
  }
}

.footer-subscribe .subscribe-button:hover {
  background-color: #5a67d8;
}

.footer-subscribe .subscribe-text {
  color: #a0aec0;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-subscribe .subscribe-text {
    text-align: left;
  }
}

.footer-subscribe .subscribe-break {
  display: none;
}

@media (min-width: 1024px) {
  .footer-subscribe .subscribe-break {
    display: block;
  }
}

.footer-subscribe .footer-bottom {
  background-color: #f7fafc;
}

.footer-subscribe .bottom-container {
  max-width: 1200px;
  padding: 0 20px 24px 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
}

@media (min-width: 640px) {
  .footer-subscribe .bottom-container {
    flex-direction: row;
  }
}

.footer-subscribe .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-subscribe .brand-link {
    justify-content: flex-start;
  }
}

.footer-subscribe .brand-logo {
  width: 40px;
  height: 40px;
  color: white;
  padding: 8px;
  background-color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-subscribe .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-subscribe .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-subscribe .copyright {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 24px;
  margin-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-subscribe .copyright {
    margin-top: 0;
    text-align: left;
  }
}

.footer-subscribe .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-subscribe .copyright-link:hover {
  color: #1a202c;
}

.footer-subscribe .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 16px;
  justify-content: center;
}

@media (min-width: 640px) {
  .footer-subscribe .social-links {
    margin-top: 0;
    justify-content: flex-start;
  }
}

.footer-subscribe .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-subscribe .social-link:hover {
  color: #718096;
}

.footer-subscribe .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-subscribe .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-subscribe .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-subscribe .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
  
  .footer-subscribe .subscribe-column {
    width: 100%;
  }
  
  .footer-subscribe .subscribe-form {
    flex-direction: column;
    align-items: center;
  }
  
  .footer-subscribe .form-field {
    margin-right: 0;
    margin-bottom: 12px;
    width: 200px;
  }
  
  .footer-subscribe .subscribe-button {
    margin-top: 0;
  }
  
  .footer-subscribe .bottom-container {
    padding: 0 16px 20px 16px;
  }
  
  .footer-subscribe .copyright {
    margin-left: 0;
  }
  
  .footer-subscribe .social-links {
    margin-left: 0;
  }
}`;

export class FooterSubscribeEl extends ArchitectElement {
  name = 'Footer Subscribe';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<WebIcon />);
  specificity = 3;
  hiddenClasses = ['footer-subscribe'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'footer-subscribe');
  }
} 