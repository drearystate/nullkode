import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ImageIcon} from '@common/icons/material/Image';

const template = `<section class="content-large-images">
  <div class="content-container">
    <div class="content-grid">
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1201x501">
        </div>
        <h2 class="item-title">Buy YouTube Videos</h2>
        <p class="item-description">Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.</p>
        <button class="item-button">Button</button>
      </div>
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1202x502">
        </div>
        <h2 class="item-title">The Catalyzer</h2>
        <p class="item-description">Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.</p>
        <button class="item-button">Button</button>
      </div>
    </div>
  </div>
</section>`;

const style = `.content-large-images {
  color: #718096;
  padding: 96px 0;
}

.content-large-images .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-large-images .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -40px -16px;
  text-align: center;
}

.content-large-images .content-item {
  width: 100%;
  margin-bottom: 40px;
  padding: 16px;
}

@media (min-width: 640px) {
  .content-large-images .content-item {
    width: 50%;
  }
}

.content-large-images .image-wrapper {
  border-radius: 8px;
  height: 256px;
  overflow: hidden;
  margin-bottom: 24px;
}

.content-large-images .content-image {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
}

.content-large-images .item-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin: 24px 0 12px 0;
}

.content-large-images .item-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 24px;
}

.content-large-images .item-button {
  display: flex;
  margin: 0 auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 20px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.content-large-images .item-button:hover {
  background-color: #5a67d8;
}

.content-large-images .item-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .content-large-images {
    padding: 48px 0;
  }
  
  .content-large-images .content-container {
    padding: 0 16px;
  }
  
  .content-large-images .image-wrapper {
    height: 200px;
    margin-bottom: 20px;
  }
  
  .content-large-images .item-title {
    margin: 20px 0 10px 0;
  }
  
  .content-large-images .item-description {
    margin-bottom: 20px;
  }
}`;

export class ContentLargeImagesEl extends ArchitectElement {
  name = 'Content Large Images';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ImageIcon />);
  specificity = 3;
  hiddenClasses = ['content-large-images'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-large-images');
  }
} 