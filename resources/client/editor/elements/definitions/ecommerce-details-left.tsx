import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {ShopIcon} from '@common/icons/material/Shop';

const template = `<section class="ecommerce-details-left">
  <div class="ecommerce-container">
    <div class="product-details">
      <div class="product-info">
        <h2 class="brand-name">BRAND NAME</h2>
        <h1 class="product-title">Animated Night Hill Illustrations</h1>
        <div class="product-tabs">
          <a class="tab-link active">Description</a>
          <a class="tab-link">Reviews</a>
          <a class="tab-link">Details</a>
        </div>
        <p class="product-description">Fam locavore kickstarter distillery. Mixtape chillwave tumeric sriracha taximy chia microdosing tilde DIY. XOXO fam inxigo juiceramps cornhole raw denim forage brooklyn. Everyday carry +1 seitan poutine tumeric. Gastropub blue bottle austin listicle pour-over, neutra jean.</p>
        <div class="product-specs">
          <div class="spec-row">
            <span class="spec-label">Color</span>
            <span class="spec-value">Blue</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">Size</span>
            <span class="spec-value">Medium</span>
          </div>
          <div class="spec-row final">
            <span class="spec-label">Quantity</span>
            <span class="spec-value">4</span>
          </div>
        </div>
        <div class="purchase-section">
          <span class="product-price">$58.00</span>
          <button class="add-to-cart">Button</button>
          <button class="wishlist-btn">
            <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="heart-icon" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>
      <img alt="ecommerce" class="product-image" src="https://dummyimage.com/400x400">
    </div>
  </div>
</section>`;

const style = `.ecommerce-details-left {
  color: #718096;
  overflow: hidden;
  padding: 96px 0;
}

.ecommerce-details-left .ecommerce-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.ecommerce-details-left .product-details {
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

@media (min-width: 1024px) {
  .ecommerce-details-left .product-details {
    width: 80%;
  }
}

.ecommerce-details-left .product-info {
  width: 100%;
  padding-right: 0;
  padding: 24px 0;
  margin-bottom: 24px;
  order: 2;
}

@media (min-width: 1024px) {
  .ecommerce-details-left .product-info {
    width: 50%;
    padding-right: 40px;
    padding: 24px 0;
    margin-bottom: 0;
    order: 1;
  }
}

.ecommerce-details-left .product-image {
  width: 100%;
  height: 256px;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  order: 1;
}

@media (min-width: 1024px) {
  .ecommerce-details-left .product-image {
    width: 50%;
    height: auto;
    order: 2;
  }
}

.ecommerce-details-left .brand-name {
  font-size: 14px;
  color: #a0aec0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ecommerce-details-left .product-title {
  color: #1a202c;
  font-size: 30px;
  font-weight: 500;
  margin: 16px 0;
}

.ecommerce-details-left .product-tabs {
  display: flex;
  margin-bottom: 16px;
}

.ecommerce-details-left .tab-link {
  flex-grow: 1;
  color: #a0aec0;
  border-bottom: 2px solid #d2d6dc;
  padding: 8px 4px;
  font-size: 18px;
  cursor: pointer;
  text-align: center;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.ecommerce-details-left .tab-link.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.ecommerce-details-left .tab-link:hover {
  color: #667eea;
}

.ecommerce-details-left .product-description {
  line-height: 1.6;
  margin-bottom: 16px;
  color: #4a5568;
}

.ecommerce-details-left .product-specs {
  margin-bottom: 24px;
}

.ecommerce-details-left .spec-row {
  display: flex;
  border-top: 1px solid #e2e8f0;
  padding: 8px 0;
}

.ecommerce-details-left .spec-row.final {
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
}

.ecommerce-details-left .spec-label {
  color: #a0aec0;
}

.ecommerce-details-left .spec-value {
  margin-left: auto;
  color: #1a202c;
}

.ecommerce-details-left .purchase-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.ecommerce-details-left .product-price {
  font-weight: 500;
  font-size: 24px;
  color: #1a202c;
}

.ecommerce-details-left .add-to-cart {
  display: flex;
  margin-left: auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ecommerce-details-left .add-to-cart:hover {
  background-color: #5a67d8;
}

.ecommerce-details-left .add-to-cart:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.ecommerce-details-left .wishlist-btn {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  background-color: #e2e8f0;
  padding: 0;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.ecommerce-details-left .wishlist-btn:hover {
  background-color: #cbd5e0;
  color: #e53e3e;
}

.ecommerce-details-left .heart-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .ecommerce-details-left {
    padding: 48px 0;
  }
  
  .ecommerce-details-left .ecommerce-container {
    padding: 0 16px;
  }
  
  .ecommerce-details-left .product-title {
    font-size: 24px;
    margin: 12px 0;
  }
  
  .ecommerce-details-left .tab-link {
    font-size: 16px;
    padding: 6px 2px;
  }
  
  .ecommerce-details-left .purchase-section {
    justify-content: space-between;
  }
  
  .ecommerce-details-left .add-to-cart {
    margin-left: 0;
  }
}`;

export class EcommerceDetailsLeftEl extends ArchitectElement {
  name = 'Ecommerce Details Left';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<ShopIcon />);
  specificity = 3;
  hiddenClasses = ['ecommerce-details-left'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'ecommerce-details-left');
  }
} 