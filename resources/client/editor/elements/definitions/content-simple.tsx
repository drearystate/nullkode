import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ViewHeadlineIcon} from '@common/icons/material/ViewHeadline';

const template = `<section class="content-simple">
  <div class="content-container">
    <h2 class="content-title">Kickstarter Actually Pinterest Brunch Bitters Occupy</h2>
    <div class="content-description">
      <p class="description-text">Taxidermy bushwick celiac master cleanse microdosing seitan. Fashion axe four dollar toast truffaut, direct trade kombucha brunch williamsburg keffiyeh gastropub tousled squid meh taiyaki drinking vinegar tacos.</p>
      <div class="action-buttons">
        <button class="primary-button">Button</button>
        <a class="learn-more-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>`;

const style = `.content-simple {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content-simple .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.content-simple .content-title {
  font-size: 24px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 8px;
  width: 100%;
}

@media (min-width: 640px) {
  .content-simple .content-title {
    font-size: 30px;
  }
}

@media (min-width: 768px) {
  .content-simple .content-title {
    width: 40%;
    margin-bottom: 0;
  }
}

.content-simple .content-description {
  width: 100%;
}

@media (min-width: 768px) {
  .content-simple .content-description {
    width: 60%;
    padding-left: 24px;
  }
}

.content-simple .description-text {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 16px;
}

@media (min-width: 768px) {
  .content-simple .description-text {
    margin-bottom: 16px;
  }
}

@media (min-width: 768px) {
  .content-simple .action-buttons {
    margin-top: 16px;
  }
}

.content-simple .action-buttons {
  display: flex;
  margin-top: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.content-simple .primary-button {
  display: inline-flex;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 4px 16px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-right: 16px;
  margin-bottom: 8px;
}

.content-simple .primary-button:hover {
  background-color: #5a67d8;
}

.content-simple .primary-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.content-simple .learn-more-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
  margin-bottom: 8px;
}

.content-simple .learn-more-link:hover {
  color: #5a67d8;
}

.content-simple .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-simple {
    padding: 48px 0;
  }
  
  .content-simple .content-container {
    padding: 0 16px;
  }
  
  .content-simple .content-title {
    margin-bottom: 24px;
  }
  
  .content-simple .action-buttons {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .content-simple .primary-button {
    margin-right: 0;
    margin-bottom: 12px;
  }
}`;

export class ContentSimpleEl extends ArchitectElement {
  name = 'Content Simple';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ViewHeadlineIcon />);
  specificity = 3;
  hiddenClasses = ['content-simple'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-simple');
  }
} 