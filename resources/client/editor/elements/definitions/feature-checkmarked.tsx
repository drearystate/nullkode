import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CheckCircleIcon} from '@common/icons/material/CheckCircle';

const template = `<section class="feature-checkmarked">
  <div class="feature-container">
    <div class="feature-header">
      <h1 class="feature-title">Raw Denim Heirloom Man Braid</h1>
      <p class="feature-subtitle">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.</p>
    </div>
    <div class="checklist-grid">
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Authentic Cliche Forage</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Kinfolk Chips Snackwave</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Coloring Book Ethical</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Typewriter Polaroid Cray</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Pack Truffaut Blue</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">The Catcher In The Rye</span>
        </div>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`;

const style = `.feature-checkmarked {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-checkmarked .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-checkmarked .feature-header {
  text-align: center;
  margin-bottom: 80px;
}

.feature-checkmarked .feature-title {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a202c;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .feature-checkmarked .feature-title {
    font-size: 30px;
  }
}

.feature-checkmarked .feature-subtitle {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 auto;
  color: #718096;
}

@media (min-width: 1024px) {
  .feature-checkmarked .feature-subtitle {
    width: 75%;
  }
}

@media (min-width: 1280px) {
  .feature-checkmarked .feature-subtitle {
    width: 50%;
  }
}

.feature-checkmarked .checklist-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 auto -8px auto;
}

@media (min-width: 640px) {
  .feature-checkmarked .checklist-grid {
    margin: 0 auto -8px auto;
  }
}

@media (min-width: 1024px) {
  .feature-checkmarked .checklist-grid {
    width: 80%;
  }
}

.feature-checkmarked .checklist-item {
  padding: 8px;
  width: 100%;
}

@media (min-width: 640px) {
  .feature-checkmarked .checklist-item {
    width: 50%;
  }
}

.feature-checkmarked .check-card {
  background-color: #f7fafc;
  border-radius: 4px;
  display: flex;
  padding: 16px;
  height: 100%;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-checkmarked .check-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-checkmarked .check-icon {
  color: #667eea;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-right: 16px;
}

.feature-checkmarked .check-text {
  font-weight: 500;
  color: #1a202c;
  word-wrap: break-word;
  overflow-wrap: break-word;
  flex: 1;
  line-height: 1.4;
}

.feature-checkmarked .feature-cta {
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

.feature-checkmarked .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-checkmarked .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-checkmarked {
    padding: 48px 0;
  }
  
  .feature-checkmarked .feature-container {
    padding: 0 16px;
  }
  
  .feature-checkmarked .feature-title {
    font-size: 20px;
  }
  
  .feature-checkmarked .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-checkmarked .feature-cta {
    margin-top: 40px;
  }
}`;

export class FeatureCheckmarkedEl extends ArchitectElement {
  name = 'Feature Checkmarked';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<CheckCircleIcon />);
  specificity = 3;
  hiddenClasses = ['feature-checkmarked'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'feature-checkmarked');
  }
} 