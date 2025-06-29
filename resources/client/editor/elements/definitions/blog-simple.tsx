import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ArticleIcon} from '@common/icons/material/Article';

const template = `<section class="blog-simple">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <div class="blog-date">
            <span class="blog-month">Jul</span>
            <span class="blog-day">18</span>
          </div>
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">The 400 Blows</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <a class="blog-author">
              <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
              <span class="author-info">
                <span class="author-name">Alper Kamu</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <div class="blog-date">
            <span class="blog-month">Jul</span>
            <span class="blog-day">18</span>
          </div>
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">Shooting Stars</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <a class="blog-author">
              <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
              <span class="author-info">
                <span class="author-name">Holden Caulfield</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <div class="blog-date">
            <span class="blog-month">Jul</span>
            <span class="blog-day">18</span>
          </div>
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">Neptune</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <a class="blog-author">
              <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
              <span class="author-info">
                <span class="author-name">Henry Letham</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.blog-simple {
  color: #718096;
  padding: 96px 0;
}

.blog-simple .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-simple .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px;
}

.blog-simple .blog-card {
  padding: 32px 16px;
  width: 100%;
}

@media (min-width: 1024px) {
  .blog-simple .blog-card {
    width: 33.333333%;
  }
}

.blog-simple .blog-card-inner {
  height: 100%;
  display: flex;
  align-items: flex-start;
}

.blog-simple .blog-date {
  width: 48px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  text-align: center;
}

.blog-simple .blog-month {
  color: #a0aec0;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 14px;
}

.blog-simple .blog-day {
  font-weight: 500;
  font-size: 18px;
  color: #2d3748;
  line-height: 1;
}

.blog-simple .blog-content {
  flex-grow: 1;
  padding-left: 24px;
}

.blog-simple .blog-category {
  letter-spacing: 0.1em;
  font-size: 12px;
  font-weight: 500;
  color: #667eea;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.blog-simple .blog-title {
  font-size: 20px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 12px;
  line-height: 1.4;
}

.blog-simple .blog-description {
  line-height: 1.6;
  margin-bottom: 20px;
  color: #4a5568;
}

.blog-simple .blog-author {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.blog-simple .author-image {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center;
}

.blog-simple .author-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding-left: 12px;
}

.blog-simple .author-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 14px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .blog-simple {
    padding: 48px 0;
  }
  
  .blog-simple .blog-container {
    padding: 0 16px;
  }
  
  .blog-simple .blog-card {
    padding: 24px 16px;
  }
  
  .blog-simple .blog-content {
    padding-left: 16px;
  }
}`;

export class BlogSimpleEl extends ArchitectElement {
  name = 'Blog Simple';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ArticleIcon />);
  specificity = 3;
  hiddenClasses = ['blog-simple'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'blog-simple');
  }
} 