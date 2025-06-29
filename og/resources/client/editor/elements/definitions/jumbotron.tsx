import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CallToActionIcon} from '@common/icons/material/CallToAction';

const template = `<div class="jumbotron">
<h1 class="display-4">Hello, world!</h1>
<p class="lead">This is a simple hero unit, a simple jumbotron-style component for calling extra attention to featured content or information.</p>
<hr class="my-4">
<p>It uses utility classes for typography and spacing to space content out within the larger container.</p>
<a class="btn btn-primary btn-lg" href="#" role="button">Learn more</a>
</div>`;

const style = `
.jumbotron {
    text-align: center;
}

.jumbotron p {
    margin: 20px 0 30px;
}
`;

export class JumbotronEl extends ArchitectElement {
  name = 'jumbotron';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<CallToActionIcon />);
  specificity = 3;
  hiddenClasses = ['jumbotron'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'jumbotron');
  }
}
