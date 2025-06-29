import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ArticleIcon} from '@common/icons/material/Article';

const template = `<section class="blog-no-frame">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <span class="blog-category">CATEGORY</span>
          <h2 class="blog-title">Roof party normcore before they sold out, cornhole vape</h2>
          <p class="blog-description">Live-edge letterpress cliche, salvia fanny pack humblebrag narwhal portland. VHS man braid palo santo hoodie brunch trust fund. Bitters hashtag waistcoat fashion axe chia unicorn. Plaid fixie chambray 90's, slow-carb etsy tumeric. Cray pug you probably haven't heard of them hexagon kickstarter craft beer pork chic.</p>
          <div class="blog-footer">
            <a class="blog-link">Learn More
              <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
              </svg>
            </a>
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
          <a class="blog-author">
            <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
            <span class="author-info">
              <span class="author-name">Holden Caulfield</span>
              <span class="author-role">UI DEVELOPER</span>
            </span>
          </a>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <span class="blog-category">CATEGORY</span>
          <h2 class="blog-title">Pinterest DIY dreamcatcher gentrify single-origin coffee</h2>
          <p class="blog-description">Live-edge letterpress cliche, salvia fanny pack humblebrag narwhal portland. VHS man braid palo santo hoodie brunch trust fund. Bitters hashtag waistcoat fashion axe chia unicorn. Plaid fixie chambray 90's, slow-carb etsy tumeric.</p>
          <div class="blog-footer">
            <a class="blog-link">Learn More
              <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
              </svg>
            </a>
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
          <a class="blog-author">
            <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
            <span class="author-info">
              <span class="author-name">Alper Kamu</span>
              <span class="author-role">DESIGNER</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.blog-no-frame {
  color: #718096;
  padding: 96px 0;
  overflow: hidden;
}

.blog-no-frame .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-no-frame .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -48px;
}

.blog-no-frame .blog-card {
  padding: 48px;
  width: 100%;
}

@media (min-width: 768px) {
  .blog-no-frame .blog-card {
    width: 50%;
  }
}

.blog-no-frame .blog-card-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.blog-no-frame .blog-category {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #edf2f7;
  color: #667eea;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-no-frame .blog-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin: 16px 0;
  line-height: 1.4;
}

@media (min-width: 640px) {
  .blog-no-frame .blog-title {
    font-size: 30px;
  }
}

.blog-no-frame .blog-description {
  line-height: 1.6;
  margin-bottom: 32px;
  color: #4a5568;
}

.blog-no-frame .blog-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid #f7fafc;
  margin-top: auto;
  width: 100%;
  gap: 12px;
}

.blog-no-frame .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-no-frame .blog-link:hover {
  color: #5a67d8;
}

.blog-no-frame .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.blog-no-frame .blog-stats,
.blog-no-frame .blog-comments {
  color: #a0aec0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  margin-left: auto;
}

.blog-no-frame .blog-stats {
  margin-right: 12px;
  padding-right: 12px;
  border-right: 2px solid #e2e8f0;
}

.blog-no-frame .blog-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.blog-no-frame .blog-author {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.blog-no-frame .author-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center;
}

.blog-no-frame .author-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding-left: 16px;
}

.blog-no-frame .author-name {
  font-weight: 500;
  color: #1a202c;
}

.blog-no-frame .author-role {
  color: #a0aec0;
  font-size: 12px;
  letter-spacing: 0.1em;
  margin-top: 2px;
  text-transform: uppercase;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .blog-no-frame {
    padding: 48px 0;
  }
  
  .blog-no-frame .blog-container {
    padding: 0 16px;
  }
  
  .blog-no-frame .blog-grid {
    margin: -24px;
  }
  
  .blog-no-frame .blog-card {
    padding: 24px;
  }
  
  .blog-no-frame .blog-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .blog-no-frame .blog-stats,
  .blog-no-frame .blog-comments {
    margin-left: 0;
  }
  
  .blog-no-frame .blog-stats {
    border-right: none;
    margin-right: 0;
    padding-right: 0;
  }
}`;

export class BlogNoFrameEl extends ArchitectElement {
  name = 'Blog No Frame';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ArticleIcon />);
  specificity = 3;
  hiddenClasses = ['blog-no-frame'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'blog-no-frame');
  }
} 