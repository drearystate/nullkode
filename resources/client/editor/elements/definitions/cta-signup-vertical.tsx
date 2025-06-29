import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {LoginIcon} from '@common/icons/material/Login';

const template = `<section class="cta-signup-vertical">
  <div class="cta-container">
    <div class="cta-content">
      <div class="cta-text">
        <h1 class="cta-title">Slow-carb next level shoindcgoitch ethical authentic, poko scenester</h1>
        <p class="cta-description">Poke slow-carb mixtape knausgaard, typewriter street art gentrify hammock starladder roathse. Craies vegan tousled etsy austin.</p>
      </div>
      <div class="cta-form">
        <h2 class="form-title">Sign Up</h2>
        <div class="form-group">
          <label for="full-name" class="form-label">Full Name</label>
          <input type="text" id="full-name" name="full-name" class="form-input">
        </div>
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input type="email" id="email" name="email" class="form-input">
        </div>
        <button class="form-button">Button</button>
        <p class="form-note">Literally you probably haven't heard of them jean shorts.</p>
      </div>
    </div>
  </div>
</section>`;

const style = `.cta-signup-vertical {
  color: #718096;
  padding: 96px 0;
}

.cta-signup-vertical .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.cta-signup-vertical .cta-content {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.cta-signup-vertical .cta-text {
  width: 100%;
  padding-right: 0;
  margin-bottom: 40px;
}

@media (min-width: 768px) {
  .cta-signup-vertical .cta-text {
    width: 50%;
    padding-right: 64px;
    margin-bottom: 0;
  }
}

@media (min-width: 1024px) {
  .cta-signup-vertical .cta-text {
    width: 60%;
  }
}

.cta-signup-vertical .cta-title {
  font-weight: 500;
  font-size: 30px;
  color: #1a202c;
  margin-bottom: 16px;
}

.cta-signup-vertical .cta-description {
  line-height: 1.6;
  color: #4a5568;
  font-size: 16px;
}

.cta-signup-vertical .cta-form {
  width: 100%;
  background-color: #f7fafc;
  border-radius: 8px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  margin-left: 0;
}

@media (min-width: 768px) {
  .cta-signup-vertical .cta-form {
    width: 50%;
    margin-left: auto;
  }
}

@media (min-width: 1024px) {
  .cta-signup-vertical .cta-form {
    width: 33.333333%;
  }
}

.cta-signup-vertical .form-title {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 20px;
}

.cta-signup-vertical .form-group {
  position: relative;
  margin-bottom: 16px;
}

.cta-signup-vertical .form-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
  display: block;
  margin-bottom: 2px;
}

.cta-signup-vertical .form-input {
  width: 100%;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cta-signup-vertical .form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.cta-signup-vertical .form-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 12px;
}

.cta-signup-vertical .form-button:hover {
  background-color: #5a67d8;
}

.cta-signup-vertical .form-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.cta-signup-vertical .form-note {
  font-size: 12px;
  color: #a0aec0;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .cta-signup-vertical {
    padding: 48px 0;
  }
  
  .cta-signup-vertical .cta-container {
    padding: 0 16px;
  }
  
  .cta-signup-vertical .cta-title {
    font-size: 24px;
  }
  
  .cta-signup-vertical .cta-form {
    padding: 24px;
  }
}`;

export class CtaSignupVerticalEl extends ArchitectElement {
  name = 'CTA Signup Vertical';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<LoginIcon />);
  specificity = 3;
  hiddenClasses = ['cta-signup-vertical'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'cta-signup-vertical');
  }
} 