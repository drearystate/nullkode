import { DataTable, DataQuery, DataRow } from './data-schema';

export interface DynamicBinding {
  elementId: string;
  property: string; // 'textContent', 'src', 'href', etc.
  dataSource: string; // table name
  field: string; // field name
  template?: string; // template with placeholders like "Hello {{name}}"
  query?: DataQuery; // optional query to filter data
}

export interface TemplateVariable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

// Template processing utilities
export class DynamicContentProcessor {
  private bindings: Map<string, DynamicBinding[]> = new Map();
  
  // Register a data binding for an element
  addBinding(binding: DynamicBinding) {
    const elementBindings = this.bindings.get(binding.elementId) || [];
    elementBindings.push(binding);
    this.bindings.set(binding.elementId, elementBindings);
  }
  
  // Remove all bindings for an element
  removeElementBindings(elementId: string) {
    this.bindings.delete(elementId);
  }
  
  // Get all bindings for an element
  getElementBindings(elementId: string): DynamicBinding[] {
    return this.bindings.get(elementId) || [];
  }
  
  // Process template with data
  processTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }
  
  // Get nested property value (e.g., "user.profile.name")
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  // Apply data bindings to DOM elements
  applyBindings(containerElement: HTMLElement, data: DataRow[]) {
    this.bindings.forEach((bindings, elementId) => {
      const element = containerElement.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
      if (!element) return;
      
      bindings.forEach(binding => {
        const relevantData = this.filterDataForBinding(data, binding);
        this.applyBinding(element, binding, relevantData);
      });
    });
  }
  
  // Filter data based on binding query
  private filterDataForBinding(data: DataRow[], binding: DynamicBinding): DataRow[] {
    if (!binding.query) return data;
    
    // Simple filtering - in real implementation this would be more sophisticated
    return data.filter(row => {
      if (!binding.query?.where) return true;
      
      return binding.query.where.every(condition => {
        const fieldValue = row[condition.field];
        switch (condition.operator) {
          case 'equals':
            return fieldValue === condition.value;
          case 'not_equals':
            return fieldValue !== condition.value;
          case 'contains':
            return String(fieldValue).includes(String(condition.value));
          case 'greater_than':
            return Number(fieldValue) > Number(condition.value);
          case 'less_than':
            return Number(fieldValue) < Number(condition.value);
          default:
            return true;
        }
      });
    });
  }
  
  // Apply a single binding to an element
  private applyBinding(element: HTMLElement, binding: DynamicBinding, data: DataRow[]) {
    if (data.length === 0) return;
    
    const firstRow = data[0];
    const fieldValue = firstRow[binding.field];
    
    if (binding.template) {
      const processedValue = this.processTemplate(binding.template, firstRow);
      this.setElementProperty(element, binding.property, processedValue);
    } else {
      this.setElementProperty(element, binding.property, fieldValue);
    }
  }
  
  // Set element property based on property name
  private setElementProperty(element: HTMLElement, property: string, value: any) {
    switch (property) {
      case 'textContent':
        element.textContent = String(value);
        break;
      case 'innerHTML':
        element.innerHTML = String(value);
        break;
      case 'src':
        if (element instanceof HTMLImageElement) {
          element.src = String(value);
        }
        break;
      case 'href':
        if (element instanceof HTMLAnchorElement) {
          element.href = String(value);
        }
        break;
      case 'value':
        if (element instanceof HTMLInputElement) {
          element.value = String(value);
        }
        break;
      case 'title':
        element.title = String(value);
        break;
      case 'alt':
        if (element instanceof HTMLImageElement) {
          element.alt = String(value);
        }
        break;
      default:
        element.setAttribute(property, String(value));
    }
  }
}

// List element processor for rendering arrays of data
export class ListProcessor extends DynamicContentProcessor {
  // Render a list from data
  renderList(
    containerElement: HTMLElement, 
    itemTemplate: string, 
    data: DataRow[], 
    binding: DynamicBinding
  ) {
    const fragment = document.createDocumentFragment();
    
    data.forEach((row, index) => {
      const itemElement = this.createItemElement(itemTemplate, row, index);
      fragment.appendChild(itemElement);
    });
    
    containerElement.innerHTML = '';
    containerElement.appendChild(fragment);
  }
  
  private createItemElement(template: string, data: DataRow, index: number): HTMLElement {
    const processedTemplate = this.processTemplate(template, { ...data, index });
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedTemplate;
    return tempDiv.firstElementChild as HTMLElement;
  }
}

// Chart data processor
export class ChartDataProcessor {
  // Convert table data to chart format
  static processChartData(
    data: DataRow[], 
    xField: string, 
    yField: string, 
    chartType: 'line' | 'bar' | 'pie' | 'doughnut'
  ) {
    switch (chartType) {
      case 'line':
      case 'bar':
        return {
          labels: data.map(row => row[xField]),
          datasets: [{
            data: data.map(row => Number(row[yField]) || 0),
            backgroundColor: this.generateColors(data.length),
            borderColor: this.generateColors(data.length),
          }]
        };
      
      case 'pie':
      case 'doughnut':
        return {
          labels: data.map(row => row[xField]),
          datasets: [{
            data: data.map(row => Number(row[yField]) || 0),
            backgroundColor: this.generateColors(data.length),
          }]
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  }
  
  private static generateColors(count: number): string[] {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }
}

// Form data processor
export class FormDataProcessor {
  // Pre-fill form with data
  static prefillForm(formElement: HTMLFormElement, data: DataRow) {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      const input = formElement.querySelector(`[name="${key}"]`) as HTMLInputElement;
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
        }
        formData.append(key, String(value));
      }
    });
    
    return formData;
  }
  
  // Extract form data in table format
  static extractFormData(formElement: HTMLFormElement): Record<string, any> {
    const formData = new FormData(formElement);
    const data: Record<string, any> = {};
    
    formData.forEach((value, key) => {
      // Handle multiple values (checkboxes, multi-selects)
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    });
    
    return data;
  }
}

// Utility functions for common data operations
export const DataUtils = {
  // Format data for display
  formatValue(value: any, type: string): string {
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(Number(value));
      case 'number':
        return new Intl.NumberFormat().format(Number(value));
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  },
  
  // Sort data by field
  sortData(data: DataRow[], field: string, direction: 'asc' | 'desc' = 'asc'): DataRow[] {
    return [...data].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },
  
  // Filter data by conditions
  filterData(data: DataRow[], conditions: Array<{field: string, operator: string, value: any}>): DataRow[] {
    return data.filter(row => 
      conditions.every(condition => {
        const fieldValue = row[condition.field];
        switch (condition.operator) {
          case 'equals': return fieldValue === condition.value;
          case 'contains': return String(fieldValue).includes(String(condition.value));
          case 'greater_than': return Number(fieldValue) > Number(condition.value);
          case 'less_than': return Number(fieldValue) < Number(condition.value);
          default: return true;
        }
      })
    );
  },
  
  // Group data by field
  groupData(data: DataRow[], field: string): Record<string, DataRow[]> {
    return data.reduce((groups, row) => {
      const key = String(row[field]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
      return groups;
    }, {} as Record<string, DataRow[]>);
  },
  
  // Aggregate data
  aggregateData(data: DataRow[], groupField: string, valueField: string, operation: 'sum' | 'avg' | 'count' | 'min' | 'max') {
    const groups = this.groupData(data, groupField);
    
    return Object.entries(groups).map(([key, rows]) => {
      let value: number;
      const values = rows.map(row => Number(row[valueField]) || 0);
      
      switch (operation) {
        case 'sum':
          value = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          value = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          value = rows.length;
          break;
        case 'min':
          value = Math.min(...values);
          break;
        case 'max':
          value = Math.max(...values);
          break;
        default:
          value = 0;
      }
      
      return { [groupField]: key, [valueField]: value };
    });
  }
}; 