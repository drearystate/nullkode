import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ArticleIcon} from '@common/icons/material/Article';

const template = `<section class="blog-timeline">
  <div class="blog-container">
    <div class="blog-timeline-list">
      <div class="blog-timeline-item">
        <div class="blog-meta">
          <span class="blog-category">CATEGORY</span>
          <span class="blog-date">12 Jun 2019</span>
        </div>
        <div class="blog-content">
          <h2 class="blog-title">Bitters hashtag waistcoat fashion axe chia unicorn</h2>
          <p class="blog-description">Glossier echo park pug, church-key sartorial biodiesel vexillologist pop-up snackwave ramps cornhole. Marfa 3 wolf moon party messenger bag selfies, poke vaporware kombucha lumbersexual pork belly polaroid hoodie portland craft beer.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="blog-timeline-item">
        <div class="blog-meta">
          <span class="blog-category">CATEGORY</span>
          <span class="blog-date">12 Jun 2019</span>
        </div>
        <div class="blog-content">
          <h2 class="blog-title">Meditation bushwick direct trade taxidermy shaman</h2>
          <p class="blog-description">Glossier echo park pug, church-key sartorial biodiesel vexillologist pop-up snackwave ramps cornhole. Marfa 3 wolf moon party messenger bag selfies, poke vaporware kombucha lumbersexual pork belly polaroid hoodie portland craft beer.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="blog-timeline-item">
        <div class="blog-meta">
          <span class="blog-category">CATEGORY</span>
          <span class="blog-date">12 Jun 2019</span>
        </div>
        <div class="blog-content">
          <h2 class="blog-title">Woke master cleanse drinking vinegar salvia</h2>
          <p class="blog-description">Glossier echo park pug, church-key sartorial biodiesel vexillologist pop-up snackwave ramps cornhole. Marfa 3 wolf moon party messenger bag selfies, poke vaporware kombucha lumbersexual pork belly polaroid hoodie portland craft beer.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.blog-timeline {
  color: #718096;
  padding: 96px 0;
  overflow: hidden;
}

.blog-timeline .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-timeline .blog-timeline-list {
  margin: -32px 0;
}

.blog-timeline .blog-timeline-item {
  padding: 32px 0;
  display: flex;
  flex-wrap: wrap;
  border-bottom: 2px solid #f7fafc;
}

.blog-timeline .blog-timeline-item:last-child {
  border-bottom: none;
}

@media (min-width: 768px) {
  .blog-timeline .blog-timeline-item {
    flex-wrap: nowrap;
  }
}

.blog-timeline .blog-meta {
  width: 100%;
  margin-bottom: 24px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .blog-timeline .blog-meta {
    width: 256px;
    margin-bottom: 0;
  }
}

.blog-timeline .blog-category {
  font-weight: 600;
  color: #4a5568;
  text-transform: uppercase;
  font-size: 14px;
}

.blog-timeline .blog-date {
  margin-top: 4px;
  color: #a0aec0;
  font-size: 14px;
}

.blog-timeline .blog-content {
  flex-grow: 1;
}

@media (min-width: 768px) {
  .blog-timeline .blog-content {
    padding-left: 24px;
  }
}

.blog-timeline .blog-title {
  font-size: 32px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 8px;
  line-height: 1.4;
}

.blog-timeline .blog-description {
  line-height: 1.6;
  color: #4a5568;
  margin-bottom: 16px;
}

.blog-timeline .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-timeline .blog-link:hover {
  color: #5a67d8;
}

.blog-timeline .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .blog-timeline {
    padding: 48px 0;
  }
  
  .blog-timeline .blog-container {
    padding: 0 16px;
  }
  
  .blog-timeline .blog-timeline-item {
    padding: 24px 0;
  }
  
  .blog-timeline .blog-title {
    font-size: 24px;
  }
  
  .blog-timeline .blog-meta {
    margin-bottom: 16px;
  }
}`;

export class BlogTimelineEl extends ArchitectElement {
  name = 'Blog Timeline';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ArticleIcon />);
  specificity = 3;
  hiddenClasses = ['blog-timeline'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'blog-timeline');
  }
} 