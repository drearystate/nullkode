import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {BusinessIcon} from '@common/icons/material/Business';

const template = `<div class="company-field">
  <label class="form-label">Company/Organization</label>
  <input type="text" class="form-control company-input" name="company" placeholder="Enter company or organization name" autocomplete="organization">
  <small class="text-muted">Optional: Enter your company or organization name</small>
</div>

<style>
.company-field {
  margin: 20px 0;
}

.company-field .form-label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.company-field .company-input {
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.company-field .company-input:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  outline: 0;
}

.company-field .company-input::placeholder {
  color: #6c757d;
  font-style: italic;
}

.company-field small {
  display: block;
  margin-top: 5px;
  font-size: 0.875rem;
}

/* Validation styles */
.company-field .company-input:invalid {
  border-color: #dc3545;
}

.company-field .company-input:valid {
  border-color: #28a745;
}
</style>

<script>
function initializeCompanyFields() {
  const companyFields = document.querySelectorAll('.company-input');
  
  companyFields.forEach(field => {
    if (!field.dataset.initialized) {
      field.dataset.initialized = 'true';
      
      // Add input validation and formatting
      field.addEventListener('input', function() {
        // Trim whitespace and capitalize first letters
        const value = this.value.trim();
        if (value) {
          // Capitalize first letter of each word for better presentation
          const formatted = value.replace(/\b\w/g, l => l.toUpperCase());
          if (formatted !== this.value) {
            this.value = formatted;
          }
        }
      });
      
      // Add autocomplete suggestions for common company types
      field.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && this.value.length > 0) {
          const value = this.value.toLowerCase();
          const suggestions = [
            'LLC', 'Inc.', 'Corp.', 'Ltd.', 'Co.', 'Corporation', 
            'Limited', 'Company', 'Incorporated', 'Group'
          ];
          
          // Auto-suggest company suffixes
          const suggestion = suggestions.find(s => 
            !value.includes(s.toLowerCase()) && 
            value.match(/\b\w+$/)
          );
          
          if (suggestion && !value.endsWith('.') && !value.endsWith('inc') && !value.endsWith('llc')) {
            // Don't auto-suggest, let user type naturally
          }
        }
      });
    }
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCompanyFields);
} else {
  initializeCompanyFields();
}

// Export for manual initialization
window.initializeCompanyFields = initializeCompanyFields;
</script>`;

export class CompanyFieldEl extends ArchitectElement {
  name = 'Company Field';
  contentCategories = ['flow'];
  html = template;
  allowedContent = [];
  category = 'forms';
  icon = (<BusinessIcon />);
  specificity = 4;
  hiddenClasses = ['company-field'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'company-field');
  }
} 