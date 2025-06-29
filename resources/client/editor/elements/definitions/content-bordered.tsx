import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ViewModuleIcon} from '@common/icons/material/ViewModule';

const template = `<section class="content-bordered">
  <div class="content-container">
    <div class="header-section">
      <div class="header-left">
        <h1 class="header-title">Pitchfork Kickstarter Taxidermy</h1>
        <div class="header-accent"></div>
      </div>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.</p>
    </div>
    <div class="content-grid">
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/720x400" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">Chichen Itza</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/721x401" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">Colosseum Roma</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/722x402" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">Great Pyramid of Giza</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/723x403" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">San Francisco</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.content-bordered {
  color: #718096;
  padding: 96px 0;
}

.content-bordered .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-bordered .header-section {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 80px;
}

.content-bordered .header-left {
  width: 100%;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .content-bordered .header-left {
    width: 50%;
    margin-bottom: 0;
  }
}

.content-bordered .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-bordered .header-title {
    font-size: 30px;
  }
}

.content-bordered .header-accent {
  height: 4px;
  width: 80px;
  background-color: #667eea;
  border-radius: 2px;
}

.content-bordered .header-description {
  width: 100%;
  line-height: 1.6;
  color: #a0aec0;
  font-size: 16px;
}

@media (min-width: 1024px) {
  .content-bordered .header-description {
    width: 50%;
  }
}

.content-bordered .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.content-bordered .content-card {
  width: 100%;
  padding: 16px;
}

@media (min-width: 768px) {
  .content-bordered .content-card {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .content-bordered .content-card {
    width: 25%;
  }
}

.content-bordered .card-inner {
  background-color: #f7fafc;
  padding: 24px;
  border-radius: 8px;
}

.content-bordered .card-image {
  height: 160px;
  border-radius: 8px;
  width: 100%;
  object-fit: cover;
  object-position: center;
  margin-bottom: 24px;
}

.content-bordered .card-subtitle {
  letter-spacing: 0.1em;
  color: #667eea;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.content-bordered .card-title {
  font-size: 18px;
  color: #1a202c;
  font-weight: 500;
  margin: 4px 0 16px 0;
}

.content-bordered .card-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-bordered {
    padding: 48px 0;
  }
  
  .content-bordered .content-container {
    padding: 0 16px;
  }
  
  .content-bordered .header-section {
    margin-bottom: 48px;
  }
  
  .content-bordered .card-inner {
    padding: 20px;
  }
  
  .content-bordered .card-image {
    height: 140px;
  }
}`;

export class ContentBorderedEl extends ArchitectElement {
  name = 'Content Bordered';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ViewModuleIcon />);
  specificity = 3;
  hiddenClasses = ['content-bordered'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-bordered');
  }
} 