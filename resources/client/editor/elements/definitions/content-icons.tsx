import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ExtensionIcon} from '@common/icons/material/Extension';

const template = `<section class="content-icons">
  <div class="content-container">
    <div class="header-section">
      <h1 class="header-title">Pitchfork Kickstarter Taxidermy</h1>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table.</p>
    </div>
    <div class="content-grid">
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <h2 class="item-title">Shooting Stars</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
            </svg>
          </div>
          <h2 class="item-title">The Catalyzer</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2 class="item-title">Neptune</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"></path>
            </svg>
          </div>
          <h2 class="item-title">Melanchole</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
            </svg>
          </div>
          <h2 class="item-title">Bunker</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h2 class="item-title">Ramona Falls</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
    </div>
    <button class="cta-button">Button</button>
  </div>
</section>`;

const style = `.content-icons {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content-icons .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-icons .header-section {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 80px;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.content-icons .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-icons .header-title {
    font-size: 30px;
  }
}

.content-icons .header-description {
  width: 100%;
  line-height: 1.6;
  color: #a0aec0;
  font-size: 16px;
}

@media (min-width: 1024px) {
  .content-icons .header-description {
    width: 50%;
  }
}

.content-icons .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.content-icons .content-item {
  width: 100%;
  padding: 16px;
}

@media (min-width: 768px) {
  .content-icons .content-item {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .content-icons .content-item {
    width: 33.333333%;
  }
}

.content-icons .item-inner {
  border: 1px solid #e2e8f0;
  padding: 24px;
  border-radius: 8px;
}

.content-icons .icon-wrapper {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 16px;
}

.content-icons .icon {
  width: 24px;
  height: 24px;
}

.content-icons .item-title {
  font-size: 18px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 8px;
}

.content-icons .item-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
}

.content-icons .cta-button {
  display: flex;
  margin: 64px auto 0;
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

.content-icons .cta-button:hover {
  background-color: #5a67d8;
}

.content-icons .cta-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-icons {
    padding: 48px 0;
  }
  
  .content-icons .content-container {
    padding: 0 16px;
  }
  
  .content-icons .header-section {
    margin-bottom: 48px;
  }
  
  .content-icons .item-inner {
    padding: 20px;
  }
}`;

export class ContentIconsEl extends ArchitectElement {
  name = 'Content Icons';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ExtensionIcon />);
  specificity = 3;
  hiddenClasses = ['content-icons'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-icons');
  }
} 