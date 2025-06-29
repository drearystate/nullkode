import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {FeaturedPlayListIcon} from '@common/icons/material/FeaturedPlayList';

const template = `<section class="feature-top-image">
  <div class="feature-container">
    <div class="feature-header">
      <h1 class="feature-title">Raw Denim Heirloom Man Braid</h1>
      <p class="feature-subtitle">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.</p>
      <div class="feature-divider">
        <div class="feature-line"></div>
      </div>
    </div>
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">Shooting Stars</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.</p>
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
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.</p>
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
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`;

const style = `.feature-top-image {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-top-image .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-top-image .feature-header {
  text-align: center;
  margin-bottom: 80px;
}

.feature-top-image .feature-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .feature-top-image .feature-title {
    font-size: 30px;
  }
}

.feature-top-image .feature-subtitle {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 auto;
  color: #a0aec0;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .feature-top-image .feature-subtitle {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .feature-top-image .feature-subtitle {
    width: 41.666667%;
  }
}

.feature-top-image .feature-divider {
  display: flex;
  margin-top: 24px;
  justify-content: center;
}

.feature-top-image .feature-line {
  width: 64px;
  height: 4px;
  border-radius: 9999px;
  background-color: #667eea;
  display: inline-flex;
}

.feature-top-image .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -40px -16px;
}

@media (min-width: 640px) {
  .feature-top-image .features-grid {
    margin: -16px;
    gap: 0;
  }
}

@media (min-width: 768px) {
  .feature-top-image .features-grid {
    gap: 0;
  }
}

.feature-top-image .feature-item {
  padding: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: center;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .feature-top-image .feature-item {
    width: 33.333333%;
    margin-bottom: 0;
  }
}

.feature-top-image .feature-icon {
  width: 80px;
  height: 80px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.feature-top-image .feature-svg {
  width: 40px;
  height: 40px;
}

.feature-top-image .feature-content {
  flex-grow: 1;
}

.feature-top-image .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.feature-top-image .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-top-image .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-top-image .feature-link:hover {
  color: #5a67d8;
}

.feature-top-image .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.feature-top-image .feature-cta {
  display: flex;
  margin: 0 auto;
  margin-top: 64px;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.feature-top-image .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-top-image .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .feature-top-image {
    padding: 48px 0;
  }
  
  .feature-top-image .feature-container {
    padding: 0 16px;
  }
  
  .feature-top-image .feature-title {
    font-size: 20px;
  }
  
  .feature-top-image .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-top-image .feature-icon {
    width: 60px;
    height: 60px;
  }
  
  .feature-top-image .feature-svg {
    width: 30px;
    height: 30px;
  }
  
  .feature-top-image .feature-cta {
    margin-top: 40px;
  }
}`;

export class FeatureTopImageEl extends ArchitectElement {
  name = 'Feature Top Image';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<FeaturedPlayListIcon />);
  specificity = 3;
  hiddenClasses = ['feature-top-image'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-top-image');
  }
} 