import {ArchitectElement} from '../architect-element';
import {VisibilityOffIcon} from '@common/icons/material/VisibilityOff';

const template = `<input type="hidden" name="hidden_field" value="">`;

export class HiddenInputEl extends ArchitectElement {
  name = 'Hidden Input';
  html = template;
  contentCategories = [
    'flow',
    'listed',
    'submittable',
    'resettable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = [];
  category = 'forms';
  icon = (<VisibilityOffIcon />);
  specificity = 2;
  matcher(node: HTMLElement) {
    return node.nodeName === 'INPUT' && 
           (node as HTMLInputElement).type === 'hidden';
  }
} 