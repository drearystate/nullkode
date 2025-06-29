import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {StorefrontIcon} from '@common/icons/material/Storefront';

const template = `<section class="ecommerce-details-right">
  <div class="ecommerce-container">
    <div class="product-details">
      <img alt="ecommerce" class="product-image" src="https://dummyimage.com/400x400">
      <div class="product-info">
        <h2 class="brand-name">BRAND NAME</h2>
        <h1 class="product-title">The Catcher in the Rye</h1>
        <div class="rating-social">
          <span class="rating-section">
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <span class="review-count">4 Reviews</span>
          </span>
          <span class="social-links">
            <a class="social-icon">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-svg" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
            <a class="social-icon">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-svg" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
              </svg>
            </a>
            <a class="social-icon">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-svg" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>
            </a>
          </span>
        </div>
        <p class="product-description">Fam locavore kickstarter distillery. Mixtape chillwave tumeric sriracha taximy chia microdosing tilde DIY. XOXO fam indxgo juiceramps cornhole raw denim forage brooklyn. Everyday carry +1 seitan poutine tumeric. Gastropub blue bottle austin listicle pour-over, neutra jean shorts keytar banjo tattooed umami cardigan.</p>
        <div class="product-options">
          <div class="color-options">
            <span class="option-label">Color</span>
            <button class="color-btn white" aria-label="White color"></button>
            <button class="color-btn gray" aria-label="Gray color"></button>
            <button class="color-btn blue" aria-label="Blue color"></button>
          </div>
          <div class="size-options">
            <span class="option-label">Size</span>
            <div class="size-select">
              <select class="size-dropdown">
                <option>SM</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
              </select>
              <span class="dropdown-icon">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="chevron-icon" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
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
    </div>
  </div>
</section>`;

const style = `.ecommerce-details-right {
  color: #718096;
  overflow: hidden;
  padding: 96px 0;
}

.ecommerce-details-right .ecommerce-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.ecommerce-details-right .product-details {
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

@media (min-width: 1024px) {
  .ecommerce-details-right .product-details {
    width: 80%;
  }
}

.ecommerce-details-right .product-image {
  width: 100%;
  height: 256px;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .ecommerce-details-right .product-image {
    width: 50%;
    height: auto;
    margin-bottom: 0;
  }
}

.ecommerce-details-right .product-info {
  width: 100%;
  padding-left: 0;
  padding: 24px 0;
  margin-top: 0;
}

@media (min-width: 1024px) {
  .ecommerce-details-right .product-info {
    width: 50%;
    padding-left: 40px;
    padding: 24px 0;
    margin-top: 0;
  }
}

.ecommerce-details-right .brand-name {
  font-size: 14px;
  color: #a0aec0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ecommerce-details-right .product-title {
  color: #1a202c;
  font-size: 30px;
  font-weight: 500;
  margin: 4px 0 16px 0;
}

.ecommerce-details-right .rating-social {
  display: flex;
  margin-bottom: 16px;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 640px) {
  .ecommerce-details-right .rating-social {
    flex-direction: row;
    align-items: center;
  }
}

.ecommerce-details-right .rating-section {
  display: flex;
  align-items: center;
}

.ecommerce-details-right .star-icon {
  width: 16px;
  height: 16px;
  color: #667eea;
}

.ecommerce-details-right .star-icon.filled {
  fill: currentColor;
}

.ecommerce-details-right .review-count {
  color: #718096;
  margin-left: 12px;
}

.ecommerce-details-right .social-links {
  display: flex;
  margin-left: 0;
  padding-left: 0;
  padding: 8px 0;
  border-left: none;
  gap: 8px;
}

@media (min-width: 640px) {
  .ecommerce-details-right .social-links {
    margin-left: 12px;
    padding-left: 12px;
    padding: 8px 0;
    border-left: 2px solid #e2e8f0;
  }
}

.ecommerce-details-right .social-icon {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.ecommerce-details-right .social-icon:hover {
  color: #667eea;
}

.ecommerce-details-right .social-svg {
  width: 20px;
  height: 20px;
}

.ecommerce-details-right .product-description {
  line-height: 1.6;
  color: #4a5568;
  margin-bottom: 24px;
}

.ecommerce-details-right .product-options {
  display: flex;
  margin-top: 24px;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 2px solid #f7fafc;
  margin-bottom: 20px;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 640px) {
  .ecommerce-details-right .product-options {
    flex-direction: row;
    gap: 24px;
  }
}

.ecommerce-details-right .color-options {
  display: flex;
  align-items: center;
}

.ecommerce-details-right .option-label {
  margin-right: 12px;
  color: #4a5568;
}

.ecommerce-details-right .color-btn {
  border: 2px solid #d2d6dc;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  outline: none;
  margin-left: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.ecommerce-details-right .color-btn:focus {
  border-color: #667eea;
}

.ecommerce-details-right .color-btn.white {
  background-color: white;
}

.ecommerce-details-right .color-btn.gray {
  background-color: #374151;
}

.ecommerce-details-right .color-btn.blue {
  background-color: #667eea;
}

.ecommerce-details-right .size-options {
  display: flex;
  align-items: center;
}

.ecommerce-details-right .size-select {
  position: relative;
}

.ecommerce-details-right .size-dropdown {
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  padding: 8px 32px 8px 12px;
  outline: none;
  font-size: 16px;
  appearance: none;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ecommerce-details-right .size-dropdown:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.ecommerce-details-right .dropdown-icon {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 40px;
  text-align: center;
  color: #718096;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ecommerce-details-right .chevron-icon {
  width: 16px;
  height: 16px;
}

.ecommerce-details-right .purchase-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.ecommerce-details-right .product-price {
  font-weight: 500;
  font-size: 24px;
  color: #1a202c;
}

.ecommerce-details-right .add-to-cart {
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

.ecommerce-details-right .add-to-cart:hover {
  background-color: #5a67d8;
}

.ecommerce-details-right .add-to-cart:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.ecommerce-details-right .wishlist-btn {
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

.ecommerce-details-right .wishlist-btn:hover {
  background-color: #cbd5e0;
  color: #e53e3e;
}

.ecommerce-details-right .heart-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .ecommerce-details-right {
    padding: 48px 0;
  }
  
  .ecommerce-details-right .ecommerce-container {
    padding: 0 16px;
  }
  
  .ecommerce-details-right .product-title {
    font-size: 24px;
  }
  
  .ecommerce-details-right .purchase-section {
    justify-content: space-between;
  }
  
  .ecommerce-details-right .add-to-cart {
    margin-left: 0;
  }
}`;

export class EcommerceDetailsRightEl extends ArchitectElement {
  name = 'Ecommerce Details Right';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<StorefrontIcon />);
  specificity = 3;
  hiddenClasses = ['ecommerce-details-right'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'ecommerce-details-right');
  }
} 