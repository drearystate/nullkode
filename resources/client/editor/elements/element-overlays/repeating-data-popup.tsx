import React, { useState, useEffect } from 'react';
import { Button } from '@common/ui/buttons/button';
import { Trans } from '@common/i18n/trans';
import { Dialog } from '@common/ui/overlays/dialog/dialog';
import { DialogHeader } from '@common/ui/overlays/dialog/dialog-header';
import { DialogBody } from '@common/ui/overlays/dialog/dialog-body';
import { DialogFooter } from '@common/ui/overlays/dialog/dialog-footer';
import { DialogTrigger } from '@common/ui/overlays/dialog/dialog-trigger';
import { findNodeById } from '@app/editor/utils/find-nodes-by-id';
import { editorState, useEditorStore } from '@app/editor/state/editor-store';
import { useAutomationData } from '@app/editor/automation/use-automation-data';
import { toast } from '@common/ui/toast/toast';

import { TextField } from '@common/ui/forms/input-field/text-field/text-field';

interface RepeatingDataPopupProps {
  elementId: string;
  onClose: () => void;
}

interface DatabaseTable {
  name: string;
  fields: string[];
}

interface ElementPattern {
  type: 'image' | 'heading' | 'text' | 'button' | 'link';
  selector: string;
  element: HTMLElement;
  suggestedField?: string;
}

interface PaginationSettings {
  itemsPerPage: number;
  columns: number;
  rows: number;
  showPagination: boolean;
}

export function RepeatingDataPopup({ elementId, onClose }: RepeatingDataPopupProps) {
  const project = useEditorStore(s => s.project);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [detectedPattern, setDetectedPattern] = useState<ElementPattern[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState<PaginationSettings>({
    itemsPerPage: 12,
    columns: 3,
    rows: 4,
    showPagination: true
  });
  const [loading, setLoading] = useState(false);
  const { addDataBinding, isAddingBinding } = useAutomationData();

  // Sample tables for demo
  const sampleTables = [
    { name: 'vehicles', fields: ['id', 'name', 'description', 'image', 'price', 'category', 'year'] },
    { name: 'products', fields: ['id', 'name', 'description', 'price', 'image', 'category', 'stock'] },
    { name: 'blog_posts', fields: ['id', 'title', 'excerpt', 'featured_image', 'author', 'date', 'category'] },
    { name: 'team_members', fields: ['id', 'name', 'position', 'bio', 'photo', 'email'] },
    { name: 'portfolio', fields: ['id', 'title', 'description', 'image', 'category', 'link'] }
  ];

  useEffect(() => {
    loadTables();
    analyzeRepeatingPattern();
  }, [elementId]);

  const loadTables = async () => {
    if (!project) {
      setTables(sampleTables);
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/projects/${project.model.id}/database/schema`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Convert schema response to our table format
      const tables = data.schema?.map((table: any) => ({
        name: table.name,
        fields: table.columns?.map((col: any) => col.name) || []
      })) || [];
      
      setTables(tables.length > 0 ? tables : sampleTables);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables(sampleTables);
    }
  };

  const analyzeRepeatingPattern = () => {
    const containerElement = findNodeById(elementId, editorState().getEditorDoc());
    if (!containerElement) return;

    // Find the first repeating item (card, product, blog post, etc.)
    const firstItem = findFirstRepeatingItem(containerElement);
    if (!firstItem) return;

    const patterns: ElementPattern[] = [];

    // Detect images
    const images = firstItem.querySelectorAll('img');
    images.forEach((img, index) => {
      patterns.push({
        type: 'image',
        selector: `img:nth-of-type(${index + 1})`,
        element: img,
        suggestedField: guessFieldName(img, 'image')
      });
    });

    // Detect headings
    const headings = firstItem.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading, index) => {
      patterns.push({
        type: 'heading',
        selector: `h1:nth-of-type(${index + 1}), h2:nth-of-type(${index + 1}), h3:nth-of-type(${index + 1}), h4:nth-of-type(${index + 1}), h5:nth-of-type(${index + 1}), h6:nth-of-type(${index + 1})`,
        element: heading as HTMLElement,
        suggestedField: guessFieldName(heading as HTMLElement, 'text')
      });
    });

    // Detect paragraphs
    const paragraphs = firstItem.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
      patterns.push({
        type: 'text',
        selector: `p:nth-of-type(${index + 1})`,
        element: p,
        suggestedField: guessFieldName(p, 'text')
      });
    });

    // Detect buttons and links
    const buttons = firstItem.querySelectorAll('button, a');
    buttons.forEach((btn, index) => {
      patterns.push({
        type: btn.tagName.toLowerCase() === 'button' ? 'button' : 'link',
        selector: `${btn.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
        element: btn as HTMLElement,
        suggestedField: guessFieldName(btn as HTMLElement, 'link')
      });
    });

    setDetectedPattern(patterns);

    // Initialize field mappings with suggestions
    const initialMappings: Record<string, string> = {};
    patterns.forEach((pattern, index) => {
      if (pattern.suggestedField) {
        initialMappings[`pattern_${index}`] = pattern.suggestedField;
      }
    });
    setFieldMappings(initialMappings);
  };

  const findFirstRepeatingItem = (container: HTMLElement): HTMLElement | null => {
    // Look for common repeating patterns
    const selectors = [
      '.product-item', '.blog-card', '.content-card', '.team-member',
      '.card', '.item', '.post', '.member', '.product',
      '.col-sm-3', '.col-md-4', '.col-lg-3', '.col-xl-3',
      '[class*="col-"]', '[class*="item"]', '[class*="card"]'
    ];

    for (const selector of selectors) {
      const items = container.querySelectorAll(selector);
      if (items.length > 1) {
        return items[0] as HTMLElement;
      }
    }

    // Fallback: look for direct children that repeat
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length > 1) {
      return children[0];
    }

    return null;
  };

  const guessFieldName = (element: HTMLElement, type: string): string => {
    const className = element.className.toLowerCase();
    const id = element.id?.toLowerCase() || '';
    
    if (type === 'image') {
      if (className.includes('product')) return 'image';
      if (className.includes('photo') || className.includes('avatar')) return 'photo';
      if (className.includes('featured')) return 'featured_image';
      return 'image';
    }

    if (type === 'text') {
      if (className.includes('title') || element.tagName.match(/H[1-6]/)) return 'name';
      if (className.includes('description') || className.includes('excerpt')) return 'description';
      if (className.includes('price')) return 'price';
      if (className.includes('category')) return 'category';
      return 'description';
    }

    if (type === 'link') {
      return 'link';
    }

    return 'name';
  };

  const handleSaveConfiguration = async () => {
    if (!selectedTable || !elementId) return;

    try {
      // Save each field mapping as a data binding
      const savePromises = detectedPattern.map((pattern, index) => {
        const mappedField = fieldMappings[`pattern_${index}`];
        if (!mappedField || mappedField === 'none') return Promise.resolve();

                 const binding = {
           elementId: elementId,
           property: getPropertyForElementType(pattern.type),
           dataSource: selectedTable,
           field: mappedField,
           template: pattern.type === 'image' ? undefined : `{{${mappedField}}}`,
           query: {
             limit: parseInt(pagination.itemsPerPage.toString()),
             offset: 0 // Start from first page for now
           }
         };

        return addDataBinding(binding);
      });

      // Wait for all bindings to be saved
      await Promise.all(savePromises.filter(Boolean));

      // Also populate with sample data for immediate preview
      await populateWithSampleData();

             toast('Data binding configuration saved successfully! This will work in your exported project.');
       onClose();
     } catch (error) {
       console.error('Failed to save data binding configuration:', error);
       toast('Failed to save data binding configuration');
     }
  };

  // Helper function to determine the right property for each element type
  const getPropertyForElementType = (elementType: string): string => {
    switch (elementType) {
      case 'image':
        return 'src';
      case 'link':
        return 'href';
      case 'input':
      case 'textarea':
      case 'select':
        return 'value';
      default:
        return 'textContent';
    }
  };

  const populateWithSampleData = async () => {
    const containerElement = findNodeById(elementId, editorState().getEditorDoc());
    if (!containerElement) return;

    // Get current items
    let allItems = Array.from(containerElement.children) as HTMLElement[];
    
    // Remove extra items if we have too many
    while (allItems.length > pagination.itemsPerPage) {
      const lastItem = allItems.pop();
      if (lastItem && lastItem !== containerElement.children[0]) {
        lastItem.remove();
      }
    }

    // Add more items if we need them
    while (allItems.length < pagination.itemsPerPage) {
      const clonedItem = containerElement.children[0].cloneNode(true) as HTMLElement;
      // Clear any existing IDs to avoid conflicts
      const elementsWithIds = clonedItem.querySelectorAll('[id]');
      elementsWithIds.forEach((el, idx) => {
        if (el.id) el.id = `${el.id}-clone-${allItems.length}-${idx}`;
      });
      
      containerElement.appendChild(clonedItem);
      allItems.push(clonedItem);
    }

    // Refresh the items list after adding/removing
    allItems = Array.from(containerElement.children) as HTMLElement[];

         // Populate each item with data
     allItems.forEach((item, index) => {
       populateItemWithData(item, index);
     });
  };

  const populateItemWithData = (item: HTMLElement, itemIndex: number = 0) => {
    detectedPattern.forEach((pattern, index) => {
      const mappedField = fieldMappings[`pattern_${index}`];
      if (!mappedField) return;

      // Try multiple selectors to find the element
      let targetElement: HTMLElement | null = null;
      
      // First try the original selector
      targetElement = item.querySelector(pattern.selector) as HTMLElement;
      
      // If not found, try by tag name and class
      if (!targetElement && pattern.element.className) {
        const className = pattern.element.className.split(' ')[0];
        targetElement = item.querySelector(`.${className}`) as HTMLElement;
      }
      
      // If still not found, try by tag name only
      if (!targetElement) {
        const tagName = pattern.element.tagName.toLowerCase();
        targetElement = item.querySelector(tagName) as HTMLElement;
      }

      if (!targetElement) {
        console.warn(`Could not find element with selector: ${pattern.selector} in item`);
        return;
      }

      // Generate realistic sample data based on field name
      let value = generateSampleValue(mappedField, itemIndex + 1);

      if (pattern.type === 'image') {
        (targetElement as HTMLImageElement).src = value;
        (targetElement as HTMLImageElement).alt = value;
      } else if (pattern.type === 'link') {
        (targetElement as HTMLAnchorElement).href = value;
        if (!targetElement.textContent || targetElement.textContent.includes('Learn More')) {
          targetElement.textContent = value;
        }
      } else {
        targetElement.textContent = value;
      }
    });
  };

  const generateSampleValue = (fieldName: string, index: number): string => {
    const field = fieldName.toLowerCase();
    
    if (field.includes('image') || field.includes('photo') || field.includes('picture')) {
      return `/images/builder/sample-${(index % 8) + 1}.jpg`;
    } else if (field.includes('name') || field.includes('title')) {
      return `Sample ${fieldName} ${index}`;
    } else if (field.includes('description') || field.includes('excerpt') || field.includes('content')) {
      return `This is sample ${fieldName.toLowerCase()} content for item ${index}. Lorem ipsum dolor sit amet.`;
    } else if (field.includes('price') || field.includes('cost')) {
      return `$${(Math.random() * 100 + 10).toFixed(2)}`;
    } else if (field.includes('category') || field.includes('type')) {
      const categories = ['Category A', 'Category B', 'Category C', 'Premium', 'Standard', 'Basic'];
      return categories[index % categories.length];
    } else if (field.includes('email')) {
      return `sample${index}@example.com`;
    } else if (field.includes('phone')) {
      return `+1-555-${String(index).padStart(4, '0')}`;
    } else if (field.includes('url') || field.includes('link')) {
      return `https://example.com/item-${index}`;
    } else if (field.includes('date')) {
      const date = new Date();
      date.setDate(date.getDate() + index);
      return date.toLocaleDateString();
    } else {
      return `Sample ${fieldName} ${index}`;
    }
  };

  const selectedTableFields = tables.find(t => t.name === selectedTable)?.fields || [];

  return (
    <DialogTrigger
      type="modal"
      isOpen={true}
      onClose={onClose}
    >
      <Dialog size="fullscreen" className="h-screen max-h-screen">
        <DialogHeader>
          <Trans message="Connect Repeating Data" />
        </DialogHeader>
        
        <DialogBody className="flex-1 overflow-y-auto p-6">
          {/* Pattern Detection Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-blue-800 font-medium">
                Detected Repeating Pattern
              </span>
            </div>
            <p className="text-sm text-blue-600 mb-2">
              Found {detectedPattern.length} elements in the repeating pattern:
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedPattern.map((pattern, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {pattern.type}: {pattern.element.tagName.toLowerCase()}
                  {pattern.element.className && ` .${pattern.element.className.split(' ')[0]}`}
                </span>
              ))}
            </div>
          </div>

          {/* Table Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Trans message="Choose Data Source" />
            </label>
                      <select 
            value={selectedTable} 
            onChange={(e) => {
              e.stopPropagation();
              setSelectedTable(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-50"
          >
              <option value="">Select a table...</option>
              {tables.map(table => (
                <option key={table.name} value={table.name}>
                  {table.name} ({table.fields.length} fields)
                </option>
              ))}
            </select>
          </div>

          {/* Field Mappings */}
          {selectedTable && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Trans message="Map Elements to Database Fields" />
              </label>
              <div className="space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto pr-2">
                {detectedPattern.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {pattern.type} ({pattern.element.tagName.toLowerCase()})
                      </span>
                      <span className="text-xs text-gray-500">
                        {pattern.element.className && `.${pattern.element.className.split(' ')[0]}`}
                      </span>
                    </div>
                    <select
                      value={fieldMappings[`pattern_${index}`] || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        setFieldMappings(prev => ({
                          ...prev,
                          [`pattern_${index}`]: e.target.value
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 relative z-40"
                    >
                      <option value="">Select field...</option>
                      {selectedTableFields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Settings */}
          {selectedTable && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Trans message="Pagination Settings" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Items per Page"
                  type="number"
                  value={pagination.itemsPerPage}
                  onChange={(e) => setPagination(prev => ({
                    ...prev,
                    itemsPerPage: parseInt(e.target.value) || 12
                  }))}
                  min={1}
                  max={100}
                />
                <TextField
                  label="Columns"
                  type="number"
                  value={pagination.columns}
                  onChange={(e) => setPagination(prev => ({
                    ...prev,
                    columns: parseInt(e.target.value) || 3
                  }))}
                  min={1}
                  max={12}
                />
              </div>
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pagination.showPagination}
                    onChange={(e) => setPagination(prev => ({
                      ...prev,
                      showPagination: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show pagination controls</span>
                </label>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <Trans message="Cancel" />
          </Button>
          <Button 
            variant="outline"
            onClick={populateWithSampleData}
            disabled={!selectedTable || Object.values(fieldMappings).every((field: string) => !field || field === 'none')}
          >
            Preview with Sample Data
          </Button>
          <Button 
            onClick={handleSaveConfiguration}
            disabled={!selectedTable || Object.values(fieldMappings).every((field: string) => !field || field === 'none') || isAddingBinding}
          >
            {isAddingBinding ? 'Saving...' : 'Save & Apply Configuration'}
          </Button>
        </DialogFooter>
      </Dialog>
    </DialogTrigger>
  );
} 