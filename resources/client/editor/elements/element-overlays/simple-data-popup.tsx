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

interface SimpleDataPopupProps {
  elementId: string;
  onClose: () => void;
}

interface DatabaseTable {
  name: string;
  fields: string[];
}

interface RepeatingPattern {
  container: HTMLElement;
  items: HTMLElement[];
  pattern: 'cards' | 'list' | 'grid';
}

interface FieldMapping {
  elementSelector: string;
  field: string;
  elementLabel: string;
}

export function SimpleDataPopup({ elementId, onClose }: SimpleDataPopupProps) {
  const project = useEditorStore(s => s.project);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [bindingMode, setBindingMode] = useState<'single' | 'repeating'>('single');
  const [repeatingPattern, setRepeatingPattern] = useState<RepeatingPattern | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(false);

  // Sample tables for demo
  const sampleTables = [
    { name: 'users', fields: ['name', 'email', 'avatar', 'role'] },
    { name: 'products', fields: ['name', 'description', 'price', 'image', 'category'] },
    { name: 'blog_posts', fields: ['title', 'excerpt', 'featured_image', 'author', 'date'] },
    { name: 'team', fields: ['name', 'position', 'bio', 'photo'] }
  ];

  useEffect(() => {
    loadTables();
    analyzeElement();
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

  const analyzeElement = () => {
    const element = findNodeById(elementId, editorState().getEditorDoc());
    if (!element) return;

    const pattern = detectRepeatingPattern(element);
    if (pattern) {
      setRepeatingPattern(pattern);
      setBindingMode('repeating');
      generateFieldMappings(pattern);
    } else {
      setBindingMode('single');
      generateSingleFieldMapping(element);
    }
  };

  const detectRepeatingPattern = (clickedElement: HTMLElement): RepeatingPattern | null => {
    // Check if element is part of a repeating pattern
    const parent = clickedElement.parentElement;
    if (!parent) return null;

    // Get all siblings that look similar
    const siblings = Array.from(parent.children) as HTMLElement[];
    const similarSiblings = siblings.filter(sibling => 
      sibling !== clickedElement && 
      hasSimilarStructure(sibling, clickedElement)
    );

    if (similarSiblings.length > 0) {
      // Determine pattern type
      let patternType: 'cards' | 'list' | 'grid' = 'cards';
      
      if (parent.tagName === 'UL' || parent.tagName === 'OL') {
        patternType = 'list';
      } else if (parent.classList.contains('grid') || 
                 window.getComputedStyle(parent).display === 'grid') {
        patternType = 'grid';
      }

      return {
        container: parent,
        items: [clickedElement, ...similarSiblings],
        pattern: patternType
      };
    }

    return null;
  };

  const hasSimilarStructure = (element1: HTMLElement, element2: HTMLElement): boolean => {
    // Compare class names
    const classes1 = Array.from(element1.classList);
    const classes2 = Array.from(element2.classList);
    const commonClasses = classes1.filter(cls => classes2.includes(cls));
    
    // Similar if they share classes or same tag with similar child count
    return commonClasses.length > 0 || 
           (element1.tagName === element2.tagName && 
            Math.abs(element1.children.length - element2.children.length) <= 1);
  };

  const generateFieldMappings = (pattern: RepeatingPattern) => {
    const mappings: FieldMapping[] = [];
    const firstItem = pattern.items[0];
    
    // Find bindable elements
    const bindableElements = firstItem.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, span, div, img, a'
    );

    bindableElements.forEach((el, index) => {
      const element = el as HTMLElement;
      const label = getElementLabel(element);
      
      if (label) {
        mappings.push({
          elementSelector: getElementSelector(element, firstItem),
          field: '',
          elementLabel: label
        });
      }
    });

    setFieldMappings(mappings);
  };

  const generateSingleFieldMapping = (element: HTMLElement) => {
    setFieldMappings([{
      elementSelector: '',
      field: '',
      elementLabel: getElementLabel(element)
    }]);
  };

  const getElementLabel = (element: HTMLElement): string => {
    const className = element.className.toLowerCase();
    const tagName = element.tagName.toLowerCase();
    
    if (tagName.match(/h[1-6]/)) return 'Title/Heading';
    if (tagName === 'img') return 'Image';
    if (tagName === 'a') return 'Link';
    if (className.includes('title')) return 'Title';
    if (className.includes('name')) return 'Name';
    if (className.includes('description')) return 'Description';
    if (className.includes('price')) return 'Price';
    if (className.includes('category')) return 'Category';
    if (tagName === 'p') return 'Text';
    
    return 'Content';
  };

  const getElementSelector = (element: HTMLElement, container: HTMLElement): string => {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    
    const tagName = element.tagName.toLowerCase();
    const siblings = Array.from(container.querySelectorAll(tagName));
    const index = siblings.indexOf(element);
    
    return index > 0 ? `${tagName}:nth-of-type(${index + 1})` : tagName;
  };

  const updateFieldMapping = (index: number, field: string) => {
    const updated = [...fieldMappings];
    updated[index].field = field;
    setFieldMappings(updated);
  };

  const handleConnect = async () => {
    if (!selectedTable || fieldMappings.some(m => !m.field)) return;
    
    setLoading(true);
    try {
      if (bindingMode === 'single') {
        await applySingleBinding();
      } else {
        await applyRepeatingBinding();
      }
      onClose();
    } catch (error) {
      console.error('Failed to apply binding:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySingleBinding = async () => {
    const element = findNodeById(elementId, editorState().getEditorDoc());
    if (!element) return;

    // For demo, just set sample data
    const sampleData = getSampleData(selectedTable);
    if (sampleData.length > 0) {
      const value = sampleData[0][fieldMappings[0].field];
      if (element.tagName === 'IMG') {
        (element as HTMLImageElement).src = value;
      } else {
        element.textContent = value;
      }
    }
  };

  const applyRepeatingBinding = async () => {
    if (!repeatingPattern) return;

    const sampleData = getSampleData(selectedTable);
    const currentItemCount = repeatingPattern.items.length;
    const neededItemCount = sampleData.length;

    // Clone additional items if needed
    if (neededItemCount > currentItemCount) {
      const templateItem = repeatingPattern.items[0];
      for (let i = currentItemCount; i < neededItemCount; i++) {
        const clonedItem = templateItem.cloneNode(true) as HTMLElement;
        // Update IDs to avoid conflicts
        if (clonedItem.id) clonedItem.id = `${clonedItem.id}-${i}`;
        repeatingPattern.container.appendChild(clonedItem);
      }
    }

    // Apply data to all items
    const allItems = Array.from(repeatingPattern.container.children) as HTMLElement[];
    allItems.forEach((item, index) => {
      if (sampleData[index]) {
        applyDataToItem(item, sampleData[index]);
      }
    });
  };

  const applyDataToItem = (item: HTMLElement, record: any) => {
    fieldMappings.forEach(mapping => {
      if (!mapping.field) return;
      
      const targetElement = item.querySelector(mapping.elementSelector) as HTMLElement;
      if (targetElement) {
        const value = record[mapping.field];
        if (targetElement.tagName === 'IMG') {
          (targetElement as HTMLImageElement).src = value;
        } else {
          targetElement.textContent = value;
        }
      }
    });
  };

  const getSampleData = (tableName: string) => {
    const samples: Record<string, any[]> = {
      users: [
        { name: 'John Doe', email: 'john@example.com', avatar: '/images/avatar1.jpg', role: 'Admin' },
        { name: 'Jane Smith', email: 'jane@example.com', avatar: '/images/avatar2.jpg', role: 'User' },
        { name: 'Bob Johnson', email: 'bob@example.com', avatar: '/images/avatar3.jpg', role: 'Editor' }
      ],
      products: [
        { name: 'Product 1', description: 'Amazing product', price: '$29.99', image: '/images/product1.jpg', category: 'Electronics' },
        { name: 'Product 2', description: 'Great quality', price: '$39.99', image: '/images/product2.jpg', category: 'Gadgets' },
        { name: 'Product 3', description: 'Best seller', price: '$19.99', image: '/images/product3.jpg', category: 'Accessories' }
      ],
      blog_posts: [
        { title: 'How to Build Apps', excerpt: 'Learn the basics...', featured_image: '/images/blog1.jpg', author: 'John Doe', date: '2024-01-15' },
        { title: 'Design Patterns', excerpt: 'Best practices...', featured_image: '/images/blog2.jpg', author: 'Jane Smith', date: '2024-01-20' },
        { title: 'Advanced Tips', excerpt: 'Pro techniques...', featured_image: '/images/blog3.jpg', author: 'Bob Johnson', date: '2024-01-25' }
      ],
      team: [
        { name: 'Alice Wilson', position: 'CEO', bio: 'Leading with vision', photo: '/images/team1.jpg' },
        { name: 'Charlie Brown', position: 'CTO', bio: 'Tech innovator', photo: '/images/team2.jpg' },
        { name: 'Diana Prince', position: 'Designer', bio: 'Creating beauty', photo: '/images/team3.jpg' }
      ]
    };
    
    return samples[tableName] || [];
  };

  return (
    <DialogTrigger
      type="modal"
      isOpen={true}
      onClose={onClose}
    >
      <Dialog size="md">
        <DialogHeader>
          <Trans message="Connect Data" />
        </DialogHeader>
        
        <DialogBody>
        {/* Pattern Detection Info */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-blue-800 font-medium">
              {bindingMode === 'single' 
                ? 'Single Element Binding' 
                : `Repeating Pattern Detected (${repeatingPattern?.items.length} items)`
              }
            </span>
          </div>
          {bindingMode === 'repeating' && (
            <p className="text-sm text-blue-600 mt-1">
              Elements will be duplicated to match your data records
            </p>
          )}
        </div>

        {/* Table Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Trans message="Choose Data Source" />
          </label>
          <select 
            value={selectedTable} 
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Trans message="Map Fields to Elements" />
            </label>
            <div className="space-y-3">
              {fieldMappings.map((mapping, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {mapping.elementLabel}
                  </div>
                  <select
                    value={mapping.field}
                    onChange={(e) => updateFieldMapping(index, e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select field...</option>
                    {tables.find(t => t.name === selectedTable)?.fields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button 
          onClick={handleConnect}
          disabled={!selectedTable || fieldMappings.some(m => !m.field) || loading}
        >
          {loading ? 'Connecting...' : (bindingMode === 'single' ? 'Connect Data' : 'Connect & Duplicate')}
        </Button>
      </DialogFooter>
    </Dialog>
    </DialogTrigger>
  );
} 