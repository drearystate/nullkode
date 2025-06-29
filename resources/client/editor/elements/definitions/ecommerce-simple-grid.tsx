import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ShoppingCartIcon} from '@common/icons/material/ShoppingCart';

const template = `<section class="ecommerce-simple-grid">
  <div class="ecommerce-container">
    <div class="products-grid">
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/420x260">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The Catalyzer</h2>
          <p class="product-price">$16.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/421x261">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Shooting Stars</h2>
          <p class="product-price">$21.15</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/422x262">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Neptune</h2>
          <p class="product-price">$12.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/423x263">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The 400 Blows</h2>
          <p class="product-price">$18.40</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/424x264">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The Catalyzer</h2>
          <p class="product-price">$16.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/425x265">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Shooting Stars</h2>
          <p class="product-price">$21.15</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/427x267">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Neptune</h2>
          <p class="product-price">$12.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/428x268">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The 400 Blows</h2>
          <p class="product-price">$18.40</p>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.ecommerce-simple-grid {
  color: #718096;
  padding: 96px 0;
}

.ecommerce-simple-grid .ecommerce-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.ecommerce-simple-grid .products-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.ecommerce-simple-grid .product-item {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .ecommerce-simple-grid .product-item {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .ecommerce-simple-grid .product-item {
    width: 25%;
  }
}

.ecommerce-simple-grid .product-link {
  display: block;
  position: relative;
  height: 192px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.ecommerce-simple-grid .product-link:hover {
  transform: translateY(-2px);
}

.ecommerce-simple-grid .product-image {
  object-fit: cover;
  object-position: center;
  width: 100%;
  height: 100%;
  display: block;
}

.ecommerce-simple-grid .product-info {
  margin-top: 16px;
}

.ecommerce-simple-grid .product-category {
  color: #a0aec0;
  font-size: 12px;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.ecommerce-simple-grid .product-title {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 4px;
}

.ecommerce-simple-grid .product-price {
  margin-top: 4px;
  color: #4a5568;
  font-weight: 500;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .ecommerce-simple-grid {
    padding: 48px 0;
  }
  
  .ecommerce-simple-grid .ecommerce-container {
    padding: 0 16px;
  }
  
  .ecommerce-simple-grid .product-link {
    height: 160px;
  }
  
  .ecommerce-simple-grid .product-info {
    margin-top: 12px;
  }
}`;

export class EcommerceSimpleGridEl extends ArchitectElement {
  name = 'Ecommerce Simple Grid';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ShoppingCartIcon />);
  specificity = 3;
  hiddenClasses = ['ecommerce-simple-grid'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'ecommerce-simple-grid');
  }
} 