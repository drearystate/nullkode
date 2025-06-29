import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ArticleIcon} from '@common/icons/material/Article';

const template = `<section class="blog-horizontal">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <img class="blog-image" src="/images/builder/placeholder.svg" alt="blog">
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">The Catalyzer</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
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
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <img class="blog-image" src="/images/builder/placeholder.svg" alt="blog">
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">The 400 Blows</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
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
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <img class="blog-image" src="/images/builder/placeholder.svg" alt="blog">
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">Shooting Stars</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.blog-horizontal {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.blog-horizontal .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-horizontal .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.blog-horizontal .blog-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .blog-horizontal .blog-card {
    width: 33.333333%;
  }
}

.blog-horizontal .blog-card-inner {
  height: 100%;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.blog-horizontal .blog-card-inner:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.blog-horizontal .blog-image {
  width: 100%;
  height: 144px;
  object-fit: cover;
  object-position: center;
}

@media (min-width: 1024px) {
  .blog-horizontal .blog-image {
    height: 192px;
  }
}

.blog-horizontal .blog-content {
  padding: 24px;
}

.blog-horizontal .blog-category {
  letter-spacing: 0.1em;
  font-size: 12px;
  font-weight: 500;
  color: #a0aec0;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.blog-horizontal .blog-title {
  font-size: 18px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 12px;
  line-height: 1.4;
}

.blog-horizontal .blog-description {
  line-height: 1.6;
  margin-bottom: 12px;
  color: #4a5568;
}

.blog-horizontal .blog-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.blog-horizontal .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-horizontal .blog-link:hover {
  color: #5a67d8;
}

.blog-horizontal .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.blog-horizontal .blog-stats,
.blog-horizontal .blog-comments {
  color: #a0aec0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  margin-left: auto;
}

@media (min-width: 768px) {
  .blog-horizontal .blog-stats {
    margin-left: auto;
  }
}

@media (min-width: 1024px) {
  .blog-horizontal .blog-stats {
    margin-left: auto;
  }
}

.blog-horizontal .blog-stats {
  padding-right: 12px;
  border-right: 2px solid #e2e8f0;
  margin-right: 12px;
}

.blog-horizontal .blog-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .blog-horizontal {
    padding: 48px 0;
  }
  
  .blog-horizontal .blog-container {
    padding: 0 16px;
  }
  
  .blog-horizontal .blog-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .blog-horizontal .blog-stats,
  .blog-horizontal .blog-comments {
    margin-left: 0;
  }
  
  .blog-horizontal .blog-stats {
    border-right: none;
    margin-right: 0;
    padding-right: 0;
  }
}`;

export class BlogHorizontalEl extends ArchitectElement {
  name = 'Blog Horizontal';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ArticleIcon />);
  specificity = 3;
  hiddenClasses = ['blog-horizontal'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'blog-horizontal');
  }
} 