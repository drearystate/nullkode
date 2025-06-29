import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {RadioButtonCheckedIcon} from '@common/icons/material/RadioButtonChecked';

const template = `<div class="form-check">
  <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" value="option1">
  <label class="form-check-label" for="flexRadioDefault1">
    Default radio
  </label>
</div>`;

export class RadioButtonEl extends ArchitectElement {
  name = 'Radio Button';
  html = template;
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'resettable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = [];
  category = 'forms';
  icon = (<RadioButtonCheckedIcon />);
  specificity = 2;
  hiddenClasses = ['form-check'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'form-check') && 
           node.querySelector('input[type="radio"]') !== null;
  }
} 