import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CategoryIcon} from '@common/icons/material/Category';

const template = `<section class="content-categories">
  <div class="content-container">
    <div class="content-left">
      <h1 class="main-title">Pitchfork Kickstarter Taxidermy</h1>
      <p class="main-description">Locavore cardigan small batch roof party blue bottle blog meggings sartorial jean shorts kickstarter migas sriracha church-key synth succulents. Actually taiyaki neutra, distillery gastropub pok pok ugh.</p>
      <a class="learn-more-link">Learn More
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      </a>
    </div>
    <div class="content-right">
      <h2 class="categories-title">CATEGORIES</h2>
      <nav class="categories-nav">
        <a class="category-link">First Link</a>
        <a class="category-link">Second Link</a>
        <a class="category-link">Third Link</a>
        <a class="category-link">Fourth Link</a>
        <a class="category-link">Fifth Link</a>
        <a class="category-link">Sixth Link</a>
        <a class="category-link">Seventh Link</a>
        <a class="category-link">Eighth Link</a>
      </nav>
    </div>
  </div>
</section>`;

const style = `.content-categories {
  color: #718096;
  padding: 96px 0;
}

.content-categories .content-container {
  max-width: 1200px;
  display: flex;
  flex-wrap: wrap;
  padding: 0 20px;
  margin: 0 auto;
  align-items: center;
}

.content-categories .content-left {
  width: 100%;
  padding-right: 0;
  padding: 32px 0;
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid #e2e8f0;
}

@media (min-width: 768px) {
  .content-categories .content-left {
    width: 50%;
    padding-right: 48px;
    border-right: 1px solid #e2e8f0;
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 32px;
  }
}

.content-categories .main-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-categories .main-title {
    font-size: 30px;
  }
}

.content-categories .main-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 16px;
}

.content-categories .learn-more-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-categories .learn-more-link:hover {
  color: #5a67d8;
}

.content-categories .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.content-categories .content-right {
  width: 100%;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .content-categories .content-right {
    width: 50%;
    padding-left: 48px;
  }
}

.content-categories .categories-title {
  font-weight: 600;
  color: #2d3748;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.content-categories .categories-nav {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin-bottom: -4px;
}

.content-categories .category-link {
  width: 50%;
  margin-bottom: 4px;
  color: #718096;
  text-decoration: none;
  transition: color 0.2s ease;
  cursor: pointer;
}

@media (min-width: 1024px) {
  .content-categories .category-link {
    width: 33.333333%;
  }
}

.content-categories .category-link:hover {
  color: #2d3748;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-categories {
    padding: 48px 0;
  }
  
  .content-categories .content-container {
    padding: 0 16px;
  }
}`;

export class ContentCategoriesEl extends ArchitectElement {
  name = 'Content Categories';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<CategoryIcon />);
  specificity = 3;
  hiddenClasses = ['content-categories'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-categories');
  }
} 