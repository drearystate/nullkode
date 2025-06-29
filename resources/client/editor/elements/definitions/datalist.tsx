import {ArchitectElement} from '../architect-element';
import {ListIcon} from '@common/icons/material/List';

const template = `<div class="form-group">
  <label for="browsers">Choose a browser:</label>
  <input list="browsers" name="browser" class="form-control" id="browser">
  <datalist id="browsers">
    <option value="Chrome">
    <option value="Firefox">
    <option value="Safari">
    <option value="Edge">
    <option value="Opera">
  </datalist>
</div>`;

export class DatalistEl extends ArchitectElement {
  name = 'Datalist';
  html = template;
  contentCategories = ['flow'];
  allowedContent = ['option'];
  category = 'forms';
  icon = (<ListIcon />);
  specificity = 2;
  matcher(node: HTMLElement) {
    return node.querySelector('datalist') !== null;
  }
} 