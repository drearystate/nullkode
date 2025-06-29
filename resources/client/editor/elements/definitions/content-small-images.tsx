import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {PhotoLibraryIcon} from '@common/icons/material/PhotoLibrary';

const template = `<section class="content-small-images">
  <div class="content-container">
    <div class="header-section">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="header-content">
        <h1 class="header-title">Space The Final Frontier</h1>
        <p class="header-description">Street art subway tile salvia four dollar toast bitters selfies quinoa yuccie synth meditation iPhone intelligentsia prism tofu. Viral gochujang bitters dreamcatcher.</p>
      </div>
    </div>
    <div class="content-grid">
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1203x503">
        </div>
        <h2 class="item-title">Shooting Stars</h2>
        <p class="item-description">Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1204x504">
        </div>
        <h2 class="item-title">The Catalyzer</h2>
        <p class="item-description">Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1205x505">
        </div>
        <h2 class="item-title">The 400 Blows</h2>
        <p class="item-description">Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>`;

const style = `.content-small-images {
  color: #718096;
  padding: 96px 0;
}

.content-small-images .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-small-images .header-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 48px;
}

.content-small-images .progress-bar {
  height: 4px;
  background-color: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 24px;
}

.content-small-images .progress-fill {
  width: 96px;
  height: 100%;
  background-color: #667eea;
}

.content-small-images .header-content {
  display: flex;
  flex-wrap: wrap;
  padding: 24px 0;
}

.content-small-images .header-title {
  width: 100%;
  color: #1a202c;
  font-weight: 500;
  font-size: 24px;
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .content-small-images .header-title {
    width: 40%;
    margin-bottom: 0;
  }
}

.content-small-images .header-description {
  width: 100%;
  line-height: 1.6;
  font-size: 16px;
  padding-left: 0;
  color: #4a5568;
}

@media (min-width: 640px) {
  .content-small-images .header-description {
    width: 60%;
    padding-left: 40px;
  }
}

.content-small-images .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -16px -16px;
}

.content-small-images .content-item {
  padding: 16px;
  width: 100%;
  margin-bottom: 0;
}

@media (min-width: 768px) {
  .content-small-images .content-item {
    width: 33.333333%;
    margin-bottom: 0;
  }
}

@media (min-width: 640px) {
  .content-small-images .content-item {
    margin-bottom: 0;
  }
}

.content-small-images .image-wrapper {
  border-radius: 8px;
  height: 256px;
  overflow: hidden;
  margin-bottom: 20px;
}

.content-small-images .content-image {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
}

.content-small-images .item-title {
  font-size: 20px;
  font-weight: 500;
  color: #1a202c;
  margin: 20px 0 8px 0;
}

.content-small-images .item-description {
  font-size: 16px;
  line-height: 1.6;
  margin: 8px 0 12px 0;
  color: #4a5568;
}

.content-small-images .item-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-small-images .item-link:hover {
  color: #5a67d8;
}

.content-small-images .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-small-images {
    padding: 48px 0;
  }
  
  .content-small-images .content-container {
    padding: 0 16px;
  }
  
  .content-small-images .header-content {
    padding: 16px 0;
  }
  
  .content-small-images .header-description {
    padding-left: 0;
    margin-top: 16px;
  }
  
  .content-small-images .image-wrapper {
    height: 200px;
  }
  
  .content-small-images .item-title {
    margin: 16px 0 6px 0;
  }
  
  .content-small-images .item-description {
    margin: 6px 0 10px 0;
  }
}`;

export class ContentSmallImagesEl extends ArchitectElement {
  name = 'Content Small Images';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<PhotoLibraryIcon />);
  specificity = 3;
  hiddenClasses = ['content-small-images'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-small-images');
  }
} 