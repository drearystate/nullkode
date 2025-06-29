import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {DashboardIcon} from '@common/icons/material/Dashboard';

const template = `<section class="feature-horizontal-simple">
  <div class="feature-container">
    <div class="features-wrapper">
      <div class="feature-card">
        <div class="feature-card-inner">
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
      </div>
      <div class="feature-card">
        <div class="feature-card-inner">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
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
      </div>
    </div>
  </div>
</section>`;

const style = `.feature-horizontal-simple {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-horizontal-simple .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.feature-horizontal-simple .features-wrapper {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.feature-horizontal-simple .feature-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .feature-horizontal-simple .feature-card {
    width: 100%;
  }
}

@media (min-width: 1024px) {
  .feature-horizontal-simple .feature-card {
    width: 50%;
  }
}

.feature-horizontal-simple .feature-card-inner {
  display: flex;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  border-opacity: 0.5;
  padding: 32px;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

@media (min-width: 640px) {
  .feature-horizontal-simple .feature-card-inner {
    flex-direction: row;
  }
}

.feature-horizontal-simple .feature-card-inner:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-horizontal-simple .feature-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .feature-horizontal-simple .feature-icon {
    margin-right: 32px;
    margin-bottom: 0;
  }
}

.feature-horizontal-simple .feature-svg {
  width: 32px;
  height: 32px;
}

@media (min-width: 640px) {
  .feature-horizontal-simple .feature-svg {
    width: 40px;
    height: 40px;
  }
}

.feature-horizontal-simple .feature-content {
  flex-grow: 1;
}

.feature-horizontal-simple .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.feature-horizontal-simple .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-horizontal-simple .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-horizontal-simple .feature-link:hover {
  color: #5a67d8;
}

.feature-horizontal-simple .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-horizontal-simple {
    padding: 48px 0;
  }
  
  .feature-horizontal-simple .feature-container {
    padding: 0 16px;
  }
  
  .feature-horizontal-simple .feature-card-inner {
    padding: 24px;
    text-align: center;
  }
  
  .feature-horizontal-simple .feature-icon {
    margin: 0 auto 16px auto;
  }
}`;

export class FeatureHorizontalSimpleEl extends ArchitectElement {
  name = 'Feature Horizontal Simple';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<DashboardIcon />);
  specificity = 3;
  hiddenClasses = ['feature-horizontal-simple'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-horizontal-simple');
  }
} 