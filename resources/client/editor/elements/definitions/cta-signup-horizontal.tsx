import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {PersonAddIcon} from '@common/icons/material/PersonAdd';

const template = `<section class="cta-signup-horizontal">
  <div class="cta-container">
    <div class="cta-header">
      <h1 class="cta-title">Master Cleanse Reliac Heirloom</h1>
      <p class="cta-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep.</p>
    </div>
    <div class="cta-form">
      <div class="form-group">
        <label for="full-name" class="form-label">Full Name</label>
        <input type="text" id="full-name" name="full-name" class="form-input">
      </div>
      <div class="form-group">
        <label for="email" class="form-label">Email</label>
        <input type="email" id="email" name="email" class="form-input">
      </div>
      <button class="form-button">Button</button>
    </div>
  </div>
</section>`;

const style = `.cta-signup-horizontal {
  color: #718096;
  padding: 96px 0;
}

.cta-signup-horizontal .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.cta-signup-horizontal .cta-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 48px;
}

.cta-signup-horizontal .cta-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .cta-signup-horizontal .cta-title {
    font-size: 30px;
  }
}

.cta-signup-horizontal .cta-description {
  margin: 0 auto;
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
}

@media (min-width: 1024px) {
  .cta-signup-horizontal .cta-description {
    width: 66.666667%;
  }
}

.cta-signup-horizontal .cta-form {
  display: flex;
  width: 100%;
  flex-direction: column;
  margin: 0 auto;
  padding: 0 32px;
  gap: 16px;
  align-items: end;
}

@media (min-width: 640px) {
  .cta-signup-horizontal .cta-form {
    flex-direction: row;
    gap: 16px;
    padding: 0;
  }
}

@media (min-width: 1024px) {
  .cta-signup-horizontal .cta-form {
    width: 66.666667%;
  }
}

.cta-signup-horizontal .form-group {
  position: relative;
  flex-grow: 1;
  width: 100%;
}

.cta-signup-horizontal .form-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
  display: block;
  margin-bottom: 2px;
}

.cta-signup-horizontal .form-input {
  width: 100%;
  background-color: #f7fafc;
  background-opacity: 0.5;
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.cta-signup-horizontal .form-input:focus {
  border-color: #667eea;
  background-color: transparent;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.cta-signup-horizontal .form-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.cta-signup-horizontal .form-button:hover {
  background-color: #5a67d8;
}

.cta-signup-horizontal .form-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .cta-signup-horizontal {
    padding: 48px 0;
  }
  
  .cta-signup-horizontal .cta-container {
    padding: 0 16px;
  }
  
  .cta-signup-horizontal .cta-header {
    margin-bottom: 32px;
  }
  
  .cta-signup-horizontal .cta-form {
    padding: 0 16px;
    gap: 12px;
  }
  
  .cta-signup-horizontal .form-button {
    align-self: stretch;
  }
}`;

export class CtaSignupHorizontalEl extends ArchitectElement {
  name = 'CTA Signup Horizontal';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<PersonAddIcon />);
  specificity = 3;
  hiddenClasses = ['cta-signup-horizontal'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'cta-signup-horizontal');
  }
} 