import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ViewModuleIcon} from '@common/icons/material/ViewModule';

const template = `<section class="feature-vertical">
  <div class="feature-container">
    <div class="feature-layout">
      <div class="feature-image-container">
        <img alt="feature" class="feature-image" src="https://dummyimage.com/460x500">
      </div>
      <div class="feature-content-container">
        <div class="feature-item">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">Shooting Stars</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">The Catalyzer</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">Neptune</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.feature-vertical {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-vertical .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.feature-vertical .feature-layout {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.feature-vertical .feature-image-container {
  width: 100%;
  margin-bottom: 40px;
  border-radius: 8px;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-image-container {
    width: 50%;
    margin-bottom: 0;
  }
}

.feature-vertical .feature-image {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
  min-height: 300px;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-image {
    min-height: 500px;
  }
}

.feature-vertical .feature-content-container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  margin-bottom: -40px;
  width: 100%;
  padding: 0;
  text-align: center;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-content-container {
    width: 50%;
    padding: 24px 0 0 48px;
    text-align: left;
    margin-bottom: 0;
  }
}

.feature-vertical .feature-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 40px;
  align-items: center;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-item {
    align-items: flex-start;
  }
}

.feature-vertical .feature-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 20px;
}

.feature-vertical .feature-svg {
  width: 24px;
  height: 24px;
}

.feature-vertical .feature-content {
  flex-grow: 1;
}

.feature-vertical .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.feature-vertical .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-vertical .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-vertical .feature-link:hover {
  color: #5a67d8;
}

.feature-vertical .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .feature-vertical {
    padding: 48px 0;
  }
  
  .feature-vertical .feature-container {
    padding: 0 16px;
  }
  
  .feature-vertical .feature-image {
    min-height: 250px;
  }
  
  .feature-vertical .feature-item {
    margin-bottom: 32px;
  }
}`;

export class FeatureVerticalEl extends ArchitectElement {
  name = 'Feature Vertical';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ViewModuleIcon />);
  specificity = 3;
  hiddenClasses = ['feature-vertical'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-vertical');
  }
} 