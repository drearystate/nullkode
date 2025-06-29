import {ArchitectElement} from '../architect-element';
import {AttachFileIcon} from '@common/icons/material/AttachFile';

const template = `<div class="form-group">
  <label for="formFile" class="form-label">Choose file</label>
  <input class="form-control" type="file" id="formFile" name="file">
</div>`;

export class FileUploadEl extends ArchitectElement {
  name = 'File Upload';
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
  icon = (<AttachFileIcon />);
  specificity = 2;
  matcher(node: HTMLElement) {
    return node.querySelector('input[type="file"]') !== null;
  }
} 