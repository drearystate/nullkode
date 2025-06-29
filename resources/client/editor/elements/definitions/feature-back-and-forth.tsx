import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {SwapHorizIcon} from '@common/icons/material/SwapHoriz';

const template = `<section class="feature-back-and-forth">
  <div class="feature-container">
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
    <div class="feature-item reverse">
      <div class="feature-content">
        <h2 class="feature-heading">The Catalyzer</h2>
        <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
        <a class="feature-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="feature-icon">
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
        </svg>
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
        <h2 class="feature-heading">The 400 Blows</h2>
        <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
        <a class="feature-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`;

const style = `.feature-back-and-forth {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-back-and-forth .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-back-and-forth .feature-item {
  display: flex;
  align-items: center;
  margin: 0 auto;
  padding-bottom: 40px;
  margin-bottom: 40px;
  border-bottom: 1px solid #e2e8f0;
  flex-direction: column;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-item {
    flex-direction: row;
  }
}

@media (min-width: 1024px) {
  .feature-back-and-forth .feature-item {
    width: 60%;
  }
}

.feature-back-and-forth .feature-item:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.feature-back-and-forth .feature-item.reverse {
  flex-direction: column;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-item.reverse {
    flex-direction: row-reverse;
  }
}

.feature-back-and-forth .feature-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-icon {
    width: 128px;
    height: 128px;
    margin-right: 40px;
    margin-bottom: 0;
  }
  
  .feature-back-and-forth .feature-item.reverse .feature-icon {
    margin-right: 0;
    margin-left: 40px;
  }
}

.feature-back-and-forth .feature-svg {
  width: 40px;
  height: 40px;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-svg {
    width: 64px;
    height: 64px;
  }
}

.feature-back-and-forth .feature-content {
  flex-grow: 1;
  text-align: center;
  margin-top: 24px;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-content {
    text-align: left;
    margin-top: 0;
  }
}

.feature-back-and-forth .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.feature-back-and-forth .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-back-and-forth .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-back-and-forth .feature-link:hover {
  color: #5a67d8;
}

.feature-back-and-forth .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.feature-back-and-forth .feature-cta {
  display: flex;
  margin: 0 auto;
  margin-top: 80px;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.feature-back-and-forth .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-back-and-forth .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-back-and-forth {
    padding: 48px 0;
  }
  
  .feature-back-and-forth .feature-container {
    padding: 0 16px;
  }
  
  .feature-back-and-forth .feature-item {
    padding-bottom: 32px;
    margin-bottom: 32px;
  }
  
  .feature-back-and-forth .feature-icon {
    width: 60px;
    height: 60px;
  }
  
  .feature-back-and-forth .feature-svg {
    width: 30px;
    height: 30px;
  }
  
  .feature-back-and-forth .feature-cta {
    margin-top: 40px;
  }
}`;

export class FeatureBackAndForthEl extends ArchitectElement {
  name = 'Feature Back and Forth';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<SwapHorizIcon />);
  specificity = 3;
  hiddenClasses = ['feature-back-and-forth'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-back-and-forth');
  }
} 