import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {WebIcon} from '@common/icons/material/Web';

const template = `<footer class="footer-middle">
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
      <div class="footer-column">
        <h2 class="column-title">LEGAL</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Privacy Policy</a></li>
          <li><a class="nav-link">Terms of Service</a></li>
          <li><a class="nav-link">Cookie Policy</a></li>
          <li><a class="nav-link">Disclaimer</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">RESOURCES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Templates</a></li>
          <li><a class="nav-link">Components</a></li>
          <li><a class="nav-link">Tools</a></li>
          <li><a class="nav-link">Tutorials</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">CONNECT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">GitHub</a></li>
          <li><a class="nav-link">Discord</a></li>
          <li><a class="nav-link">Newsletter</a></li>
          <li><a class="nav-link">Partners</a></li>
        </nav>
      </div>
    </div>
  </div>
  <div class="footer-newsletter">
    <div class="newsletter-container">
      <div class="newsletter-content">
        <div class="newsletter-form">
          <div class="form-field">
            <label for="footer-field" class="field-label">Newsletter</label>
            <input type="text" id="footer-field" name="footer-field" class="form-input" placeholder="Enter your email">
          </div>
          <button class="subscribe-button">Subscribe</button>
          <p class="newsletter-text">
            Stay updated with our latest news
            <br class="newsletter-break">and product releases
          </p>
        </div>
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
      <span class="footer-tagline">Building the future with code</span>
    </div>
  </div>
</footer>`;

const style = `.footer-middle {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-middle .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
}

.footer-middle .footer-columns {
  display: flex;
  flex-wrap: wrap;
  text-align: center;
  margin-bottom: -40px;
  margin-left: -16px;
  margin-right: -16px;
}

@media (min-width: 768px) {
  .footer-middle .footer-columns {
    text-align: left;
  }
}

.footer-middle .footer-column {
  padding: 0 16px;
  width: 100%;
  margin-bottom: 40px;
}

@media (min-width: 768px) {
  .footer-middle .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-middle .footer-column {
    width: 16.666667%;
  }
}

.footer-middle .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-middle .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-middle .column-nav li {
  margin-bottom: 8px;
}

.footer-middle .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-middle .nav-link:hover {
  color: #1a202c;
}

.footer-middle .footer-newsletter {
  border-top: 1px solid #e2e8f0;
}

.footer-middle .newsletter-container {
  max-width: 1200px;
  padding: 0 20px 32px 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.footer-middle .newsletter-content {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
}

@media (min-width: 768px) {
  .footer-middle .newsletter-content {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

@media (min-width: 1024px) {
  .footer-middle .newsletter-content {
    justify-content: flex-start;
  }
}

.footer-middle .newsletter-form {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-end;
}

@media (min-width: 768px) {
  .footer-middle .newsletter-form {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

.footer-middle .form-field {
  position: relative;
  width: 160px;
  margin-right: 16px;
}

@media (min-width: 640px) {
  .footer-middle .form-field {
    width: auto;
    margin-right: 16px;
  }
}

.footer-middle .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
}

.footer-middle .form-input {
  width: 100%;
  background-color: rgba(247, 250, 252, 0.5);
  background-opacity: 0.5;
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: all 0.2s ease-in-out;
}

.footer-middle .form-input:focus {
  background-color: transparent;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.footer-middle .subscribe-button {
  display: inline-flex;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.footer-middle .subscribe-button:hover {
  background-color: #5a67d8;
}

.footer-middle .newsletter-text {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 24px;
  margin-top: 0;
  text-align: left;
  display: none;
}

@media (min-width: 768px) {
  .footer-middle .newsletter-text {
    margin-left: 24px;
    margin-top: 0;
    display: block;
  }
}

.footer-middle .newsletter-break {
  display: none;
}

@media (min-width: 1024px) {
  .footer-middle .newsletter-break {
    display: block;
  }
}

.footer-middle .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 24px;
  width: 100%;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-middle .social-links {
    margin-top: 0;
    width: auto;
    justify-content: flex-start;
  }
}

.footer-middle .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-middle .social-link:hover {
  color: #718096;
}

.footer-middle .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-middle .social-icon {
  width: 20px;
  height: 20px;
}

.footer-middle .footer-bottom {
  background-color: #f7fafc;
}

.footer-middle .bottom-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: center;
}

@media (min-width: 640px) {
  .footer-middle .bottom-container {
    flex-direction: row;
  }
}

.footer-middle .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-middle .brand-link {
    justify-content: flex-start;
  }
}

.footer-middle .brand-logo {
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

.footer-middle .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-middle .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-middle .copyright {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 2px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-middle .copyright {
    padding-top: 8px;
    margin-top: 0;
    text-align: left;
  }
}

.footer-middle .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-middle .copyright-link:hover {
  color: #1a202c;
}

.footer-middle .footer-tagline {
  margin-left: auto;
  margin-top: 8px;
  width: 100%;
  text-align: center;
  color: #a0aec0;
  font-size: 14px;
}

@media (min-width: 640px) {
  .footer-middle .footer-tagline {
    margin-top: 0;
    width: auto;
    text-align: left;
  }
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-middle .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-middle .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
  
  .footer-middle .newsletter-container {
    padding: 0 16px 24px 16px;
  }
  
  .footer-middle .newsletter-content {
    flex-direction: column;
    align-items: center;
  }
  
  .footer-middle .newsletter-form {
    margin-bottom: 16px;
  }
}`;

export class FooterMiddleEl extends ArchitectElement {
  name = 'Footer Middle';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<WebIcon />);
  specificity = 3;
  hiddenClasses = ['footer-middle'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'footer-middle');
  }
} 