import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CallToActionIcon} from '@common/icons/material/CallToAction';

const template = `<section class="cta-simple">
  <div class="cta-container">
    <div class="cta-content">
      <h1 class="cta-title">Slow-carb next level shoindxgoitch ethical authentic, scenester sriracha forage.</h1>
      <button class="cta-button">Button</button>
    </div>
  </div>
</section>`;

const style = `.cta-simple {
  color: #718096;
  padding: 96px 0;
}

.cta-simple .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.cta-simple .cta-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 640px) {
  .cta-simple .cta-content {
    flex-direction: row;
    align-items: center;
  }
}

@media (min-width: 1024px) {
  .cta-simple .cta-content {
    width: 66.666667%;
  }
}

.cta-simple .cta-title {
  flex-grow: 1;
  padding-right: 0;
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 40px;
}

@media (min-width: 640px) {
  .cta-simple .cta-title {
    padding-right: 64px;
    margin-bottom: 0;
  }
}

.cta-simple .cta-button {
  flex-shrink: 0;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cta-simple .cta-button:hover {
  background-color: #5a67d8;
}

.cta-simple .cta-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .cta-simple {
    padding: 48px 0;
  }
  
  .cta-simple .cta-container {
    padding: 0 16px;
  }
  
  .cta-simple .cta-title {
    font-size: 20px;
    margin-bottom: 24px;
  }
}`;

export class CtaSimpleEl extends ArchitectElement {
  name = 'CTA Simple';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<CallToActionIcon />);
  specificity = 3;
  hiddenClasses = ['cta-simple'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'cta-simple');
  }
} 