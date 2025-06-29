import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {WebIcon} from '@common/icons/material/Web';

const template = `<footer class="footer-right">
  <div class="footer-container">
    <div class="footer-brand">
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
      <p class="brand-description">Building the future with code</p>
    </div>
    <div class="footer-content">
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
    </div>
  </div>
  <div class="footer-bottom">
    <div class="bottom-container">
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
            <path stroke="none" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
            <circle cx="4" cy="4" r="2" stroke="none"></circle>
          </svg>
        </a>
      </span>
    </div>
  </div>
</footer>`;

const style = `.footer-right {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-right .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  flex-wrap: wrap;
}

@media (min-width: 768px) {
  .footer-right .footer-container {
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
  }
}

@media (min-width: 1024px) {
  .footer-right .footer-container {
    align-items: flex-start;
  }
}

.footer-right .footer-brand {
  width: 256px;
  flex-shrink: 0;
  margin: 0 auto;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-right .footer-brand {
    margin: 0;
    text-align: left;
  }
}

.footer-right .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-right .brand-link {
    justify-content: flex-start;
  }
}

.footer-right .brand-logo {
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

.footer-right .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-right .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-right .brand-description {
  margin-top: 8px;
  font-size: 14px;
  color: #a0aec0;
}

.footer-right .footer-content {
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  padding-left: 0;
  margin-bottom: -40px;
  margin-top: 40px;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-right .footer-content {
    padding-left: 80px;
    margin-top: 0;
    text-align: left;
  }
}

.footer-right .footer-column {
  padding: 0 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .footer-right .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-right .footer-column {
    width: 25%;
  }
}

.footer-right .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-right .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-right .column-nav li {
  margin-bottom: 8px;
}

.footer-right .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  display: block;
  line-height: 1.4;
}

.footer-right .nav-link:hover {
  color: #1a202c;
}

.footer-right .footer-bottom {
  background-color: #f7fafc;
}

.footer-right .bottom-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
}

@media (min-width: 640px) {
  .footer-right .bottom-container {
    flex-direction: row;
  }
}

.footer-right .copyright {
  color: #a0aec0;
  font-size: 14px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-right .copyright {
    text-align: left;
  }
}

.footer-right .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-right .copyright-link:hover {
  color: #1a202c;
}

.footer-right .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 0;
  margin-bottom: 8px;
  justify-content: center;
}

@media (min-width: 640px) {
  .footer-right .social-links {
    margin-top: 0;
    margin-bottom: 0;
    justify-content: flex-start;
  }
}

.footer-right .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-right .social-link:hover {
  color: #718096;
}

.footer-right .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-right .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-right .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-right .footer-content {
    margin-top: 32px;
  }
  
  .footer-right .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
}`;

export class FooterRightEl extends ArchitectElement {
  name = 'Footer Right';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<WebIcon />);
  specificity = 3;
  hiddenClasses = ['footer-right'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'footer-right');
  }
} 