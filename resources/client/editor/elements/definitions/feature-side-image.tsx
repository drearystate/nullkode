import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {SettingsIcon} from '@common/icons/material/Settings';

const template = `<section class="feature-side-image">
  <div class="feature-container">
    <h1 class="feature-title">Raw Denim Heirloom Man Braid<br class="feature-break">Selfies Wayfarers</h1>
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">Shooting Stars</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.</p>
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
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.</p>
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
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.feature-side-image {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-side-image .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-side-image .feature-title {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a202c;
  margin-bottom: 80px;
}

@media (min-width: 640px) {
  .feature-side-image .feature-title {
    font-size: 30px;
  }
}

.feature-side-image .feature-break {
  display: none;
}

@media (min-width: 640px) {
  .feature-side-image .feature-break {
    display: block;
  }
}

.feature-side-image .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -40px -16px;
}

@media (min-width: 640px) {
  .feature-side-image .features-grid {
    margin: -16px;
    gap: 0;
  }
}

@media (min-width: 768px) {
  .feature-side-image .features-grid {
    gap: 0;
  }
}

.feature-side-image .feature-item {
  padding: 16px;
  width: 100%;
  display: flex;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .feature-side-image .feature-item {
    width: 33.333333%;
    margin-bottom: 0;
  }
}

@media (min-width: 640px) {
  .feature-side-image .features-grid {
    gap: 0;
  }
}

.feature-side-image .feature-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.feature-side-image .feature-svg {
  width: 24px;
  height: 24px;
}

.feature-side-image .feature-content {
  flex-grow: 1;
  padding-left: 24px;
}

.feature-side-image .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.feature-side-image .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-side-image .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-side-image .feature-link:hover {
  color: #5a67d8;
}

.feature-side-image .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .feature-side-image {
    padding: 48px 0;
  }
  
  .feature-side-image .feature-container {
    padding: 0 16px;
  }
  
  .feature-side-image .feature-title {
    font-size: 20px;
    margin-bottom: 40px;
  }
  
  .feature-side-image .feature-item {
    flex-direction: column;
    text-align: center;
  }
  
  .feature-side-image .feature-content {
    padding-left: 0;
    padding-top: 16px;
  }
}`;

export class FeatureSideImageEl extends ArchitectElement {
  name = 'Feature Side Image';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<SettingsIcon />);
  specificity = 3;
  hiddenClasses = ['feature-side-image'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-side-image');
  }
} 