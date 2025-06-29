import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CreditCardIcon} from '@common/icons/material/CreditCard';

const template = `<div class="card-component">
  <div class="card">
    <img src="/images/builder/placeholder.svg" class="card-img-top" alt="Card image">
    <div class="card-body">
      <h5 class="card-title">Card Title</h5>
      <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
      <a href="#" class="btn btn-primary">Go somewhere</a>
    </div>
  </div>
</div>`;

const style = `.card-component .card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
}

.card-component .card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.card-component .card-img-top {
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
  height: 200px;
  object-fit: cover;
}

.card-component .card-body {
  padding: 1.25rem;
}

.card-component .card-title {
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #212529;
}

.card-component .card-text {
  color: #6c757d;
  margin-bottom: 1rem;
}

.card-component .btn {
  text-decoration: none;
  display: inline-block;
  font-weight: 400;
  text-align: center;
  vertical-align: middle;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  border-radius: 0.375rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

.card-component .btn-primary {
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.card-component .btn-primary:hover {
  color: #fff;
  background-color: #0b5ed7;
  border-color: #0a58ca;
}`;

export class CardEl extends ArchitectElement {
  name = 'Card';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<CreditCardIcon />);
  specificity = 3;
  hiddenClasses = ['card-component'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'card-component');
  }
} 