import {ArchitectElement} from '../architect-element';
import {LabelIcon} from '@common/icons/material/Label';

const template = `<label class="form-label">Label Text</label>`;

export class LabelEl extends ArchitectElement {
  name = 'Label';
  html = template;
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = ['phrasing'];
  category = 'forms';
  icon = (<LabelIcon />);
  specificity = 1;
  hiddenClasses = ['form-label'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'LABEL';
  }
} 