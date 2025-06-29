import {ArchitectElement} from '../architect-element';
import {BorderAllIcon} from '@common/icons/material/BorderAll';

const template = `<fieldset class="form-fieldset">
  <legend>Form Section</legend>
  <div class="form-group">
    <label for="field1">Field 1</label>
    <input type="text" class="form-control" id="field1" name="field1">
  </div>
  <div class="form-group">
    <label for="field2">Field 2</label>
    <input type="text" class="form-control" id="field2" name="field2">
  </div>
</fieldset>`;

export class FieldsetEl extends ArchitectElement {
  name = 'Fieldset';
  html = template;
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'forms';
  icon = (<BorderAllIcon />);
  specificity = 2;
  hiddenClasses = ['form-fieldset'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'FIELDSET';
  }
} 