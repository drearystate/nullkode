import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ViewModuleIcon} from '@common/icons/material/ViewModule';

const template = `<section class="content-divided">
  <div class="content-container">
    <div class="content-header">
      <h2 class="header-subtitle">ROOF PARTY POLAROID</h2>
      <h1 class="header-title">Master Cleanse Reliac Heirloom</h1>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.</p>
    </div>
    <div class="content-grid">
      <div class="content-item">
        <h2 class="item-title">Shooting Stars</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <h2 class="item-title">The Catalyzer</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <h2 class="item-title">Neptune</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <h2 class="item-title">Melanchole</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
    <button class="cta-button">Button</button>
  </div>
</section>`;

const style = `.content-divided {
  color: #718096;
  padding: 96px 0;
}

.content-divided .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-divided .content-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 80px;
}

.content-divided .header-subtitle {
  font-size: 12px;
  color: #667eea;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.content-divided .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-divided .header-title {
    font-size: 30px;
  }
}

.content-divided .header-description {
  margin: 0 auto;
  line-height: 1.6;
  font-size: 16px;
  max-width: 66.666667%;
  color: #4a5568;
}

.content-divided .content-grid {
  display: flex;
  flex-wrap: wrap;
}

.content-divided .content-item {
  padding: 24px 32px;
  border-left: 2px solid #e2e8f0;
  width: 100%;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .content-divided .content-item {
    width: 100%;
    margin-bottom: 0;
  }
}

@media (min-width: 1024px) {
  .content-divided .content-item {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .content-divided .content-item {
    width: 25%;
  }
}

.content-divided .item-title {
  font-size: 18px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .content-divided .item-title {
    font-size: 20px;
  }
}

.content-divided .item-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 16px;
  color: #4a5568;
}

.content-divided .item-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-divided .item-link:hover {
  color: #5a67d8;
}

.content-divided .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.content-divided .cta-button {
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

.content-divided .cta-button:hover {
  background-color: #5a67d8;
}

.content-divided .cta-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-divided {
    padding: 48px 0;
  }
  
  .content-divided .content-container {
    padding: 0 16px;
  }
  
  .content-divided .header-description {
    max-width: 100%;
  }
  
  .content-divided .content-header {
    margin-bottom: 48px;
  }
  
  .content-divided .content-item {
    padding: 16px 24px;
  }
}`;

export class ContentDividedEl extends ArchitectElement {
  name = 'Content Divided';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ViewModuleIcon />);
  specificity = 3;
  hiddenClasses = ['content-divided'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-divided');
  }
} 