import React, {useState, useEffect} from 'react';
import {DataTable, DataField, DataFieldType} from './data-schema';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {PrimitiveValue} from '@common/ui/forms/listbox/types';
import {Switch} from '@common/ui/forms/toggle/switch';
import {IconButton} from '@common/ui/buttons/icon-button';
import {AddIcon} from '@common/icons/material/Add';
import {DeleteIcon} from '@common/icons/material/Delete';
import {DragIndicatorIcon} from '@common/icons/material/DragIndicator';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import clsx from 'clsx';
import {nanoid} from 'nanoid';

interface TableEditorProps {
  table?: DataTable;
  isOpen: boolean;
  onClose: () => void;
  onSave: (table: DataTable) => void;
}

const FIELD_TYPES: {value: DataFieldType; label: string; description: string}[] = [
  {value: 'text', label: 'Text', description: 'Short text (up to 255 characters)'},
  {value: 'textarea', label: 'Long Text', description: 'Multi-line text'},
  {value: 'number', label: 'Number', description: 'Whole numbers'},
  {value: 'decimal', label: 'Decimal', description: 'Numbers with decimal places'},
  {value: 'boolean', label: 'True/False', description: 'Yes/No or True/False'},
  {value: 'date', label: 'Date', description: 'Date only'},
  {value: 'datetime', label: 'Date & Time', description: 'Date and time'},
  {value: 'email', label: 'Email', description: 'Email address'},
  {value: 'url', label: 'URL', description: 'Website link'},
  {value: 'phone', label: 'Phone', description: 'Phone number'},
  {value: 'select', label: 'Dropdown', description: 'Choose from predefined options'},
  {value: 'multiselect', label: 'Multi-Select', description: 'Choose multiple options'},
  {value: 'image', label: 'Image', description: 'Upload images'},
  {value: 'file', label: 'File', description: 'Upload any file'},
  {value: 'json', label: 'JSON', description: 'Structured data'},
  {value: 'reference', label: 'Reference', description: 'Link to another table'}
];

export function TableEditor({table, isOpen, onClose, onSave}: TableEditorProps) {
  const [formData, setFormData] = useState<Partial<DataTable>>({
    name: '',
    displayName: '',
    description: '',
    fields: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (table) {
      setFormData(table);
    } else {
      setFormData({
        name: '',
        displayName: '',
        description: '',
        fields: [
          // Always start with an ID field
          {
            id: nanoid(),
            name: 'id',
            displayName: 'ID',
            type: 'number',
            required: true,
            unique: true,
            description: 'Unique identifier'
          }
        ]
      });
    }
    setErrors({});
  }, [table, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Table name is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Table name must start with a letter and contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.displayName?.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.fields || formData.fields.length === 0) {
      newErrors.fields = 'At least one field is required';
    } else {
      formData.fields.forEach((field, index) => {
        if (!field.name?.trim()) {
          newErrors[`field_${index}_name`] = 'Field name is required';
        } else if (!/^[a-z][a-z0-9_]*$/.test(field.name)) {
          newErrors[`field_${index}_name`] = 'Field name must start with a letter and contain only lowercase letters, numbers, and underscores';
        }

        if (!field.displayName?.trim()) {
          newErrors[`field_${index}_displayName`] = 'Display name is required';
        }

        // Check for duplicate field names
        const duplicateIndex = formData.fields!.findIndex((f, i) => 
          i !== index && f.name === field.name
        );
        if (duplicateIndex !== -1) {
          newErrors[`field_${index}_name`] = 'Field name must be unique';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const tableData: DataTable = {
      id: table?.id || nanoid(),
      name: formData.name!,
      displayName: formData.displayName!,
      description: formData.description || '',
      fields: formData.fields!,
      createdAt: table?.createdAt || new Date(),
      updatedAt: new Date(),
      isSystem: table?.isSystem || false
    };

    onSave(tableData);
    onClose();
  };

  const addField = () => {
    const newField: DataField = {
      id: nanoid(),
      name: '',
      displayName: '',
      type: 'text',
      required: false
    };

    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.filter((_, i) => i !== index) || []
    }));
    
    // Clear related errors
    const newErrors = {...errors};
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`field_${index}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const updateField = (index: number, updates: Partial<DataField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.map((field, i) => 
        i === index ? {...field, ...updates} : field
      ) || []
    }));

    // Clear field-specific errors when user starts typing
    if (updates.name !== undefined) {
      const newErrors = {...errors};
      delete newErrors[`field_${index}_name`];
      setErrors(newErrors);
    }
    if (updates.displayName !== undefined) {
      const newErrors = {...errors};
      delete newErrors[`field_${index}_displayName`];
      setErrors(newErrors);
    }
  };

  const generateFieldName = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[0-9]/, 'field_$&');
  };

  return (
    <DialogTrigger type="modal" isOpen={isOpen} onClose={onClose}>
      <Dialog size="lg">
        <DialogHeader>
          {table ? 'Edit Table' : 'Create New Table'}
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6">
            {/* Basic Table Info */}
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Table Name"
                name="name"
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData(prev => ({...prev, name: e.target.value}));
                  const newErrors = {...errors};
                  delete newErrors.name;
                  setErrors(newErrors);
                }}
                placeholder="e.g., users, products, orders"
                description="Database table name (lowercase, no spaces)"
                invalid={!!errors.name}
                errorMessage={errors.name}
                required
              />
              
              <TextField
                label="Display Name"
                name="displayName"
                value={formData.displayName || ''}
                onChange={(e) => {
                  const displayName = e.target.value;
                  setFormData(prev => ({
                    ...prev, 
                    displayName,
                    // Auto-generate table name if it's empty
                    name: prev.name || generateFieldName(displayName)
                  }));
                  const newErrors = {...errors};
                  delete newErrors.displayName;
                  setErrors(newErrors);
                }}
                placeholder="e.g., Users, Products, Orders"
                description="Human-readable name"
                invalid={!!errors.displayName}
                errorMessage={errors.displayName}
                required
              />
            </div>

            <TextField
              label="Description"
              name="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="What is this table for?"
              description="Optional description of the table's purpose"
            />

            {/* Fields */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">Fields</h3>
                <Button size="sm" variant="outline" onClick={addField}>
                  <AddIcon className="mr-2" />
                  Add Field
                </Button>
              </div>

              {errors.fields && (
                <div className="mb-4 text-sm text-red-600">{errors.fields}</div>
              )}

              <div className="space-y-4">
                {formData.fields?.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    errors={errors}
                    onUpdate={(updates) => updateField(index, updates)}
                    onRemove={() => removeField(index)}
                    canRemove={formData.fields!.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="flat" onClick={handleSave}>
            {table ? 'Update Table' : 'Create Table'}
          </Button>
        </DialogFooter>
      </Dialog>
    </DialogTrigger>
  );
}

interface FieldEditorProps {
  field: DataField;
  index: number;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<DataField>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function FieldEditor({field, index, errors, onUpdate, onRemove, canRemove}: FieldEditorProps) {
  const generateFieldName = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[0-9]/, 'field_$&');
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <DragIndicatorIcon className="h-5 w-5 text-gray-400" />
          <h4 className="font-medium">Field {index + 1}</h4>
        </div>
        
        {canRemove && (
          <Tooltip label="Remove Field">
            <IconButton size="xs" variant="outline" onClick={onRemove} className="text-red-500">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Field Name"
          name={`field_${index}_name`}
          value={field.name}
          onChange={(e) => onUpdate({name: e.target.value})}
          placeholder="e.g., email, first_name"
          description="Database column name"
          invalid={!!errors[`field_${index}_name`]}
          errorMessage={errors[`field_${index}_name`]}
          required
        />
        
        <TextField
          label="Display Name"
          name={`field_${index}_displayName`}
          value={field.displayName}
          onChange={(e) => {
            const displayName = e.target.value;
            onUpdate({
              displayName,
              // Auto-generate field name if it's empty
              name: field.name || generateFieldName(displayName)
            });
          }}
          placeholder="e.g., Email Address, First Name"
          description="Human-readable name"
          invalid={!!errors[`field_${index}_displayName`]}
          errorMessage={errors[`field_${index}_displayName`]}
          required
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Field Type</label>
          <Select
            selectedValue={field.type}
            onSelectionChange={(type: PrimitiveValue) => onUpdate({type: String(type) as DataFieldType})}
            selectionMode="single"
          >
            {FIELD_TYPES.map(type => (
              <Item key={type.value} value={type.value}>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </div>
              </Item>
            ))}
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Required</label>
            <Switch
              checked={field.required}
              onChange={(e) => onUpdate({required: e.target.checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Unique</label>
            <Switch
              checked={field.unique || false}
              onChange={(e) => onUpdate({unique: e.target.checked})}
            />
          </div>
        </div>
      </div>

      {field.description !== undefined && (
        <div className="mt-4">
          <TextField
            label="Description"
            name={`field_${index}_description`}
            value={field.description}
            onChange={(e) => onUpdate({description: e.target.value})}
            placeholder="Optional field description"
          />
        </div>
      )}
    </div>
  );
} 