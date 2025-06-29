import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {BadgeIcon} from '@common/icons/material/Badge';

const template = `<div class="title-field">
  <label class="form-label">Job Title/Position</label>
  <input type="text" class="form-control title-input" name="jobTitle" placeholder="Enter your job title or position" autocomplete="organization-title">
  <small class="text-muted">Optional: Enter your professional title or position</small>
</div>

<style>
.title-field {
  margin: 20px 0;
}

.title-field .form-label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.title-field .title-input {
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.title-field .title-input:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  outline: 0;
}

.title-field .title-input::placeholder {
  color: #6c757d;
  font-style: italic;
}

.title-field small {
  display: block;
  margin-top: 5px;
  font-size: 0.875rem;
}

/* Validation styles */
.title-field .title-input:invalid {
  border-color: #dc3545;
}

.title-field .title-input:valid {
  border-color: #28a745;
}

/* Professional styling */
.title-field .title-input {
  text-transform: capitalize;
}
</style>

<script>
function initializeTitleFields() {
  const titleFields = document.querySelectorAll('.title-input');
  
  titleFields.forEach(field => {
    if (!field.dataset.initialized) {
      field.dataset.initialized = 'true';
      
      // Common job titles for autocomplete suggestions
      const commonTitles = [
        'CEO', 'CFO', 'CTO', 'COO', 'President', 'Vice President', 'Director',
        'Manager', 'Senior Manager', 'Assistant Manager', 'Supervisor',
        'Developer', 'Senior Developer', 'Software Engineer', 'Analyst',
        'Consultant', 'Specialist', 'Coordinator', 'Administrator',
        'Executive', 'Representative', 'Associate', 'Assistant'
      ];
      
      // Add input formatting
      field.addEventListener('input', function() {
        // Capitalize first letter of each word
        const value = this.value;
        if (value) {
          const formatted = value.replace(/\b\w/g, l => l.toUpperCase());
          if (formatted !== this.value) {
            this.value = formatted;
          }
        }
      });
      
      // Add blur event for final formatting
      field.addEventListener('blur', function() {
        this.value = this.value.trim();
      });
    }
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTitleFields);
} else {
  initializeTitleFields();
}

// Export for manual initialization
window.initializeTitleFields = initializeTitleFields;
</script>`;

export class TitleFieldEl extends ArchitectElement {
  name = 'Title Field';
  contentCategories = ['flow'];
  html = template;
  allowedContent = [];
  category = 'forms';
  icon = (<BadgeIcon />);
  specificity = 4;
  hiddenClasses = ['title-field'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'title-field');
  }
} 