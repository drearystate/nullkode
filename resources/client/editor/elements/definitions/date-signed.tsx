import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {EventIcon} from '@common/icons/material/Event';

const template = `<div class="date-signed-field">
  <label class="form-label">Date Signed</label>
  <input type="text" class="form-control date-signed-input" readonly placeholder="Date will appear when signed" style="background-color: #f8f9fa;">
  <small class="text-muted">Automatically filled when document is signed</small>
</div>

<style>
.date-signed-field {
  margin: 20px 0;
}

.date-signed-field .date-signed-input {
  background-color: #f8f9fa !important;
  cursor: not-allowed;
}

.date-signed-field .form-label {
  font-weight: 600;
  color: #495057;
}
</style>

<script>
function initializeDateSignedFields() {
  const dateFields = document.querySelectorAll('.date-signed-input');
  
  dateFields.forEach(field => {
    if (!field.dataset.initialized) {
      field.dataset.initialized = 'true';
      
      // Set current date when field becomes visible or when signing event occurs
      const setCurrentDate = () => {
        const now = new Date();
        field.value = now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
      
      // Listen for custom signing events
      document.addEventListener('documentSigned', setCurrentDate);
      
      // Auto-populate if this is in a preview/test environment
      if (window.location.href.includes('preview') || field.closest('.architect-canvas')) {
        setTimeout(setCurrentDate, 100);
      }
    }
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDateSignedFields);
} else {
  initializeDateSignedFields();
}

// Export for manual initialization
window.initializeDateSignedFields = initializeDateSignedFields;

// Trigger date signing from other elements
window.triggerDocumentSigned = function() {
  document.dispatchEvent(new CustomEvent('documentSigned'));
};
</script>`;

export class DateSignedEl extends ArchitectElement {
  name = 'Date Signed';
  contentCategories = ['flow'];
  html = template;
  allowedContent = [];
  category = 'forms';
  icon = (<EventIcon />);
  specificity = 4;
  hiddenClasses = ['date-signed-field'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'date-signed-field');
  }
} 