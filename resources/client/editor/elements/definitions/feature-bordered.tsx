import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ExtensionIcon} from '@common/icons/material/Extension';

const template = `<section class="feature-bordered">
  <div class="feature-container">
    <div class="feature-header">
      <h2 class="feature-subtitle">ROOF PARTY POLAROID</h2>
      <h1 class="feature-title">Master Cleanse Reliac Heirloom</h1>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-card-content">
          <div class="feature-header-row">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h2 class="feature-heading">Shooting Stars</h2>
          </div>
          <div class="feature-content">
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="feature-card">
        <div class="feature-card-content">
          <div class="feature-header-row">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2 class="feature-heading">The Catalyzer</h2>
          </div>
          <div class="feature-content">
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="feature-card">
        <div class="feature-card-content">
          <div class="feature-header-row">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
              </svg>
            </div>
            <h2 class="feature-heading">Neptune</h2>
          </div>
          <div class="feature-content">
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

const style = `.feature-bordered {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-bordered .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-bordered .feature-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 80px;
}

.feature-bordered .feature-subtitle {
  font-size: 12px;
  color: #667eea;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.feature-bordered .feature-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
}

@media (min-width: 640px) {
  .feature-bordered .feature-title {
    font-size: 30px;
  }
}

.feature-bordered .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.feature-bordered .feature-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .feature-bordered .feature-card {
    width: 33.333333%;
  }
}

.feature-bordered .feature-card-content {
  display: flex;
  border-radius: 8px;
  height: 100%;
  background-color: #f7fafc;
  padding: 32px;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-bordered .feature-card-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-bordered .feature-header-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.feature-bordered .feature-icon {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #667eea;
  color: white;
  flex-shrink: 0;
}

.feature-bordered .feature-svg {
  width: 20px;
  height: 20px;
}

.feature-bordered .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
}

.feature-bordered .feature-content {
  flex-grow: 1;
}

.feature-bordered .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-bordered .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-bordered .feature-link:hover {
  color: #5a67d8;
}

.feature-bordered .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .feature-bordered {
    padding: 48px 0;
  }
  
  .feature-bordered .feature-container {
    padding: 0 16px;
  }
  
  .feature-bordered .feature-title {
    font-size: 20px;
  }
  
  .feature-bordered .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-bordered .feature-card-content {
    padding: 24px;
  }
}`;

export class FeatureBorderedEl extends ArchitectElement {
  name = 'Feature Bordered';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ExtensionIcon />);
  specificity = 3;
  hiddenClasses = ['feature-bordered'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-bordered');
  }
} 