import {ArchitectElement} from '../architect-element';
import {RestartAltIcon} from '@common/icons/material/RestartAlt';

const template = `<button type="reset" class="btn btn-secondary">Reset</button>`;

export class ResetButtonEl extends ArchitectElement {
  name = 'Reset Button';
  html = template;
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = ['phrasing'];
  category = 'forms';
  icon = (<RestartAltIcon />);
  specificity = 2;
  hiddenClasses = ['btn', 'btn-secondary'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'BUTTON' && 
           (node as HTMLButtonElement).type === 'reset';
  }
} 