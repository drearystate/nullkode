import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {TaskAltIcon} from '@common/icons/material/TaskAlt';

const template = `<section class="feature-small-checkmarked">
  <div class="feature-container">
    <div class="feature-header">
      <h1 class="feature-title">Raw Denim Heirloom Man Braid</h1>
      <p class="feature-subtitle">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.</p>
    </div>
    <div class="features-grid">
      <div class="feature-column">
        <h2 class="column-title">SHOOTING STARS</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
      <div class="feature-column">
        <h2 class="column-title">THE 400 BLOWS</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
      <div class="feature-column">
        <h2 class="column-title">THE CATALYZER</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
      <div class="feature-column">
        <h2 class="column-title">NEPTUNE</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`;

const style = `.feature-small-checkmarked {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-small-checkmarked .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-small-checkmarked .feature-header {
  text-align: center;
  margin-bottom: 80px;
}

.feature-small-checkmarked .feature-title {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a202c;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .feature-title {
    font-size: 30px;
  }
}

.feature-small-checkmarked .feature-subtitle {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 auto;
  color: #718096;
}

@media (min-width: 1024px) {
  .feature-small-checkmarked .feature-subtitle {
    width: 75%;
  }
}

@media (min-width: 1280px) {
  .feature-small-checkmarked .feature-subtitle {
    width: 50%;
  }
}

.feature-small-checkmarked .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.feature-small-checkmarked .feature-column {
  padding: 16px;
  width: 100%;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .feature-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .feature-small-checkmarked .feature-column {
    width: 25%;
  }
}

.feature-small-checkmarked .column-title {
  font-weight: 500;
  letter-spacing: 0.05em;
  color: #1a202c;
  margin-bottom: 16px;
  font-size: 14px;
  text-align: center;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .column-title {
    text-align: left;
  }
}

.feature-small-checkmarked .column-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: -4px;
  gap: 10px;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .column-nav {
    align-items: flex-start;
    text-align: left;
  }
}

.feature-small-checkmarked .nav-item {
  display: flex;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

.feature-small-checkmarked .nav-item:hover {
  color: #667eea;
}

.feature-small-checkmarked .nav-icon {
  background-color: #edf2f7;
  color: #667eea;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.feature-small-checkmarked .nav-svg {
  width: 12px;
  height: 12px;
}

.feature-small-checkmarked .feature-cta {
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

.feature-small-checkmarked .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-small-checkmarked .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-small-checkmarked {
    padding: 48px 0;
  }
  
  .feature-small-checkmarked .feature-container {
    padding: 0 16px;
  }
  
  .feature-small-checkmarked .feature-title {
    font-size: 20px;
  }
  
  .feature-small-checkmarked .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-small-checkmarked .feature-cta {
    margin-top: 40px;
  }
}`;

export class FeatureSmallCheckmarkedEl extends ArchitectElement {
  name = 'Feature Small Checkmarked';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<TaskAltIcon />);
  specificity = 3;
  hiddenClasses = ['feature-small-checkmarked'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-small-checkmarked');
  }
} 