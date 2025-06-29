import {ArchitectElement} from '../architect-element';
import {ShowChartIcon} from '@common/icons/material/ShowChart';

const template = `<div class="form-group">
  <label for="progress">Progress:</label>
  <progress id="progress" value="50" max="100" class="form-progress">50%</progress>
</div>`;

export class ProgressEl extends ArchitectElement {
  name = 'Progress';
  html = template;
  contentCategories = ['flow', 'phrasing', 'labelable'];
  allowedContent = [];
  category = 'forms';
  icon = (<ShowChartIcon />);
  specificity = 2;
  hiddenClasses = ['form-progress'];
  matcher(node: HTMLElement) {
    return node.querySelector('progress') !== null;
  }
} 