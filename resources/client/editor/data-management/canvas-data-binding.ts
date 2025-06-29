import { DataTable, DataRow, DataCondition } from './data-schema';

export interface CanvasElementBinding {
  elementId: string;
  elementType: string; // input, select, textarea, div, ul, button, etc.
  bindingType: 'single' | 'list' | 'template' | 'attribute' | 'style';
  property: string; // value, textContent, innerHTML, src, href, class, style, etc.
  dataSource: string; // table name
  field: string; // field name
  template?: string; // optional template for complex formatting
  listItemTemplate?: string; // template for list items
  conditions?: DataCondition[];
  defaultValue?: any;
  maxItems?: number; // for list bindings
  isActive: boolean;
}

export interface PopulationRule {
  id: string;
  name: string;
  description?: string;
  tableSource: string;
  recordSelection: 'first' | 'last' | 'random' | 'conditional' | 'all';
  conditions?: DataCondition[];
  bindings: CanvasElementBinding[];
  isEnabled: boolean;
}

export class CanvasDataBindingService {
  private populationRules: Map<string, PopulationRule> = new Map();
  private canvasContainer: HTMLElement | null = null;

  constructor(canvasElement?: HTMLElement) {
    this.canvasContainer = canvasElement || null;
  }

  setCanvasContainer(element: HTMLElement): void {
    this.canvasContainer = element;
  }

  /**
   * Add a population rule for canvas components
   */
  addPopulationRule(rule: PopulationRule): void {
    this.populationRules.set(rule.id, rule);
  }

  /**
   * Remove a population rule
   */
  removePopulationRule(ruleId: string): void {
    this.populationRules.delete(ruleId);
  }

  /**
   * Populate canvas components with database data
   */
  async populateCanvas(data: Record<string, DataRow[]>): Promise<void> {
    if (!this.canvasContainer) {
      console.warn('Canvas container not set');
      return;
    }

    for (const [ruleId, rule] of this.populationRules) {
      if (!rule.isEnabled) continue;

      const tableData = data[rule.tableSource];
      if (!tableData || tableData.length === 0) continue;

      // Select records based on rule
      const selectedRecords = this.selectRecords(tableData, rule);
      if (!selectedRecords || selectedRecords.length === 0) continue;

      // Apply bindings for this rule
      await this.applyRuleBindings(rule, selectedRecords);
    }
  }

  /**
   * Populate specific elements with fresh data from API
   */
  async populateFromAPI(apiEndpoint: string, elementIds?: string[]): Promise<void> {
    try {
      const response = await fetch(apiEndpoint);
      const data = await response.json();
      
      if (elementIds) {
        // Populate specific elements
        elementIds.forEach(elementId => {
          const element = this.canvasContainer?.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
          if (element && data.rows && data.rows.length > 0) {
            this.populateElement(element, data.rows[0]);
          }
        });
      } else {
        // Apply all bindings using the selected data
        const allData = data.rows || [data];
        if (allData.length > 0) {
          await this.populateCanvas({ default: allData });
        }
      }
    } catch (error) {
      console.error('Failed to populate from API:', error);
    }
  }

  /**
   * Auto-detect and bind elements to database fields - enhanced for all element types
   */
  autoBindFormElements(tableSchema: DataTable): CanvasElementBinding[] {
    if (!this.canvasContainer) return [];

    const bindings: CanvasElementBinding[] = [];
    
    // Enhanced selector to include more element types
    const elements = this.canvasContainer.querySelectorAll(`
      input, select, textarea, 
      [data-element-id], 
      [data-bind], 
      .data-list, 
      .data-card, 
      .data-item,
      ul[data-source],
      ol[data-source],
      div[data-field],
      span[data-field],
      p[data-field],
      button[data-field],
      a[data-field]
    `);

    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const elementId = htmlElement.getAttribute('data-element-id') || this.generateElementId(htmlElement);
      const dataField = htmlElement.getAttribute('data-field');
      const dataSource = htmlElement.getAttribute('data-source');
      const bindType = htmlElement.getAttribute('data-bind-type');
      const name = htmlElement.getAttribute('name') || dataField;
      
      if (!elementId) return;

      // Determine binding type based on element and attributes
      const bindingType = this.determineBindingType(htmlElement, bindType);
      
      // Find matching field in table schema
      let matchingField;
      if (name) {
        matchingField = tableSchema.fields.find(field => 
          field.name.toLowerCase() === name.toLowerCase() ||
          field.displayName.toLowerCase() === name.toLowerCase() ||
          field.name.toLowerCase().includes(name.toLowerCase())
        );
      }

      if (matchingField || dataSource) {
        const binding: CanvasElementBinding = {
          elementId,
          elementType: htmlElement.tagName.toLowerCase(),
          bindingType,
          property: this.getAppropriateProperty(htmlElement, bindingType),
          dataSource: dataSource || tableSchema.name,
          field: matchingField?.name || name || 'id',
          template: htmlElement.getAttribute('data-template') || undefined,
          listItemTemplate: htmlElement.getAttribute('data-item-template') || undefined,
          maxItems: parseInt(htmlElement.getAttribute('data-max-items') || '10'),
          defaultValue: matchingField?.defaultValue,
          isActive: true
        };

        // Set element ID if it doesn't have one
        if (!htmlElement.getAttribute('data-element-id')) {
          htmlElement.setAttribute('data-element-id', elementId);
        }

        bindings.push(binding);
      }
    });

    return bindings;
  }

  /**
   * Create binding for specific element and field
   */
  createElementBinding(
    elementId: string, 
    tableField: { tableName: string; fieldName: string; fieldType: string },
    options: {
      bindingType?: 'single' | 'list' | 'template' | 'attribute' | 'style';
      template?: string;
      listItemTemplate?: string;
      conditions?: DataCondition[];
      defaultValue?: any;
      maxItems?: number;
    } = {}
  ): CanvasElementBinding {
    const element = this.canvasContainer?.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
    const bindingType = options.bindingType || this.determineBindingType(element);
    
    return {
      elementId,
      elementType: element?.tagName.toLowerCase() || 'div',
      bindingType,
      property: this.getAppropriateProperty(element, bindingType),
      dataSource: tableField.tableName,
      field: tableField.fieldName,
      template: options.template,
      listItemTemplate: options.listItemTemplate,
      conditions: options.conditions,
      defaultValue: options.defaultValue,
      maxItems: options.maxItems || 10,
      isActive: true
    };
  }

  /**
   * Get binding configuration for an element
   */
  getElementBindingConfig(elementId: string): CanvasElementBinding | null {
    for (const rule of this.populationRules.values()) {
      const binding = rule.bindings.find(b => b.elementId === elementId);
      if (binding) return binding;
    }
    return null;
  }

  /**
   * Update element binding
   */
  updateElementBinding(elementId: string, updates: Partial<CanvasElementBinding>): void {
    for (const rule of this.populationRules.values()) {
      const bindingIndex = rule.bindings.findIndex(b => b.elementId === elementId);
      if (bindingIndex >= 0) {
        rule.bindings[bindingIndex] = { ...rule.bindings[bindingIndex], ...updates };
        break;
      }
    }
  }

  /**
   * Get preview of how data will populate elements
   */
  getPopulationPreview(ruleId: string, sampleData: DataRow[]): Record<string, any> {
    const rule = this.populationRules.get(ruleId);
    if (!rule) return {};

    const preview: Record<string, any> = {};
    
    rule.bindings.forEach(binding => {
      if (!binding.isActive) return;

      if (binding.bindingType === 'list' && sampleData.length > 0) {
        const items = sampleData.slice(0, binding.maxItems || 10);
        preview[binding.elementId] = {
          elementType: binding.elementType,
          bindingType: binding.bindingType,
          items: items.length,
          sampleItem: this.processTemplate(binding.listItemTemplate || '{{' + binding.field + '}}', items[0])
        };
      } else if (sampleData.length > 0) {
        let value = sampleData[0][binding.field];
        
        if (binding.template) {
          value = this.processTemplate(binding.template, sampleData[0]);
        }
        
        if (value === undefined && binding.defaultValue !== undefined) {
          value = binding.defaultValue;
        }

        preview[binding.elementId] = {
          elementType: binding.elementType,
          bindingType: binding.bindingType,
          property: binding.property,
          value: value,
          field: binding.field
        };
      }
    });

    return preview;
  }

  /**
   * Populate all canvas elements with a single data record
   */
  populateWithRecord(record: DataRow, tableSource?: string): void {
    if (!this.canvasContainer) return;

    // Find all elements with data attributes and try to populate them
    const elements = this.canvasContainer.querySelectorAll('[data-element-id], [data-field], [data-source]');
    
    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const elementId = htmlElement.getAttribute('data-element-id');
      const dataField = htmlElement.getAttribute('data-field');
      const name = htmlElement.getAttribute('name') || dataField;
      
      if (!name) return;

      // Check if we have data for this field
      if (record[name] !== undefined) {
        const bindingType = this.determineBindingType(htmlElement);
        this.setElementProperty(htmlElement, this.getAppropriateProperty(htmlElement, bindingType), record[name]);
      }
    });
  }

  // Private helper methods

  private selectRecords(data: DataRow[], rule: PopulationRule): DataRow[] | null {
    if (data.length === 0) return null;

    // Apply conditions if any
    let filteredData = data;
    if (rule.conditions && rule.conditions.length > 0) {
      filteredData = data.filter(row => {
        return rule.conditions!.every(condition => {
          const fieldValue = row[condition.field];
          switch (condition.operator) {
            case 'equals': return fieldValue === condition.value;
            case 'not_equals': return fieldValue !== condition.value;
            case 'contains': return String(fieldValue).includes(String(condition.value));
            case 'greater_than': return Number(fieldValue) > Number(condition.value);
            case 'less_than': return Number(fieldValue) < Number(condition.value);
            default: return true;
          }
        });
      });
    }

    if (filteredData.length === 0) return null;

    // Select records based on strategy
    switch (rule.recordSelection) {
      case 'first': return [filteredData[0]];
      case 'last': return [filteredData[filteredData.length - 1]];
      case 'random': return [filteredData[Math.floor(Math.random() * filteredData.length)]];
      case 'conditional': return [filteredData[0]]; // Already filtered above
      case 'all': return filteredData;
      default: return [filteredData[0]];
    }
  }

  private async applyRuleBindings(rule: PopulationRule, records: DataRow[]): Promise<void> {
    for (const binding of rule.bindings) {
      if (!binding.isActive) continue;

      const element = this.canvasContainer?.querySelector(`[data-element-id="${binding.elementId}"]`) as HTMLElement;
      if (!element) continue;

      // Handle different binding types
      switch (binding.bindingType) {
        case 'list':
          await this.applyListBinding(element, binding, records);
          break;
        case 'template':
          await this.applyTemplateBinding(element, binding, records[0]);
          break;
        case 'single':
        default:
          await this.applySingleBinding(element, binding, records[0]);
          break;
      }
    }
  }

  private async applyListBinding(element: HTMLElement, binding: CanvasElementBinding, records: DataRow[]): Promise<void> {
    const maxItems = Math.min(records.length, binding.maxItems || 10);
    const itemsToShow = records.slice(0, maxItems);
    
    if (binding.listItemTemplate) {
      // Use template to generate list items
      const html = itemsToShow.map(record => 
        this.processTemplate(binding.listItemTemplate!, record)
      ).join('');
      
      element.innerHTML = html;
    } else {
      // Simple list generation
      const items = itemsToShow.map(record => {
        const value = record[binding.field];
        if (element.tagName.toLowerCase() === 'ul' || element.tagName.toLowerCase() === 'ol') {
          return `<li>${value}</li>`;
        } else {
          return `<div class="list-item">${value}</div>`;
        }
      }).join('');
      
      element.innerHTML = items;
    }
  }

  private async applyTemplateBinding(element: HTMLElement, binding: CanvasElementBinding, record: DataRow): Promise<void> {
    if (binding.template) {
      const processedContent = this.processTemplate(binding.template, record);
      this.setElementProperty(element, binding.property, processedContent);
    }
  }

  private async applySingleBinding(element: HTMLElement, binding: CanvasElementBinding, record: DataRow): Promise<void> {
    let value = record[binding.field];
    
    if (binding.template) {
      value = this.processTemplate(binding.template, record);
    }
    
    if (value === undefined && binding.defaultValue !== undefined) {
      value = binding.defaultValue;
    }

    this.setElementProperty(element, binding.property, value);
  }

  private populateElement(element: HTMLElement, data: DataRow): void {
    // Auto-populate based on element attributes
    const name = element.getAttribute('name') || element.getAttribute('data-field') || element.getAttribute('id');
    if (name && data[name] !== undefined) {
      const bindingType = this.determineBindingType(element);
      this.setElementProperty(element, this.getAppropriateProperty(element, bindingType), data[name]);
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private generateElementId(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const className = element.className.split(' ')[0] || '';
    const timestamp = Date.now().toString(36);
    return `${tagName}-${className}-${timestamp}`.replace(/[^a-z0-9-]/g, '');
  }

  private determineBindingType(element: HTMLElement, explicitType?: string | null): 'single' | 'list' | 'template' | 'attribute' | 'style' {
    if (explicitType) {
      return explicitType as any;
    }

    if (!element) return 'single';

    const tagName = element.tagName.toLowerCase();
    const hasListTemplate = element.hasAttribute('data-item-template');
    const hasTemplate = element.hasAttribute('data-template');
    const classList = element.className.toLowerCase();

    // Check for list-type elements
    if (tagName === 'ul' || tagName === 'ol' || hasListTemplate || 
        classList.includes('list') || classList.includes('grid') || 
        classList.includes('cards')) {
      return 'list';
    }

    // Check for template-based elements
    if (hasTemplate || classList.includes('template') || classList.includes('card')) {
      return 'template';
    }

    // Check for attribute binding
    if (element.hasAttribute('data-bind-attribute')) {
      return 'attribute';
    }

    // Check for style binding
    if (element.hasAttribute('data-bind-style')) {
      return 'style';
    }

    return 'single';
  }

  private setElementProperty(element: HTMLElement, property: string, value: any): void {
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
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
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
      case 'checked':
        if (element instanceof HTMLInputElement && element.type === 'checkbox') {
          element.checked = Boolean(value);
        }
        break;
      case 'selected':
        if (element instanceof HTMLOptionElement) {
          element.selected = Boolean(value);
        }
        break;
      case 'class':
      case 'className':
        element.className = String(value);
        break;
      case 'style':
        if (typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element.style.cssText = String(value);
        }
        break;
      default:
        // Handle custom attributes
        if (property.startsWith('data-') || property.startsWith('aria-')) {
          element.setAttribute(property, String(value));
        } else {
          element.setAttribute(property, String(value));
        }
    }
  }

  private getAppropriateProperty(element: HTMLElement, bindingType: string = 'single'): string {
    if (!element) return 'textContent';
    
    const tagName = element.tagName.toLowerCase();
    
    // For list bindings, always use innerHTML
    if (bindingType === 'list') {
      return 'innerHTML';
    }

    // For template bindings, prefer innerHTML
    if (bindingType === 'template') {
      return 'innerHTML';
    }
    
    switch (tagName) {
      case 'input':
      case 'textarea':
      case 'select':
        return 'value';
      case 'img':
        return 'src';
      case 'a':
        return 'href';
      case 'ul':
      case 'ol':
      case 'div':
        return 'innerHTML';
      default:
        return 'textContent';
    }
  }
}

// Export singleton instance
export const canvasDataBinding = new CanvasDataBindingService(); 