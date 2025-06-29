import {ArchitectElement} from '../architect-element';
import {TuneIcon} from '@common/icons/material/Tune';

const template = `<div class="form-group">
  <label for="customRange" class="form-label">Range</label>
  <input type="range" class="form-range" min="0" max="100" value="50" id="customRange" name="range">
  <div class="range-value">50</div>
</div>`;

export class RangeInputEl extends ArchitectElement {
  name = 'Range Slider';
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
  icon = (<TuneIcon />);
  specificity = 2;
  matcher(node: HTMLElement) {
    return node.querySelector('input[type="range"]') !== null;
  }
} 