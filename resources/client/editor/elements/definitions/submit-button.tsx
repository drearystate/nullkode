import {ArchitectElement} from '../architect-element';
import {SendIcon} from '@common/icons/material/Send';

const template = `<button type="submit" class="btn btn-primary">Submit</button>`;

export class SubmitButtonEl extends ArchitectElement {
  name = 'Submit Button';
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
  icon = (<SendIcon />);
  specificity = 2;
  hiddenClasses = ['btn', 'btn-primary'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'BUTTON' && 
           (node as HTMLButtonElement).type === 'submit';
  }
} 