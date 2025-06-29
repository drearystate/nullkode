import React, {useState, useEffect} from 'react';
import {DataTable, DataField, DataFieldType} from './data-schema';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {IconButton} from '@common/ui/buttons/icon-button';
import {AddIcon} from '@common/icons/material/Add';
import {DeleteIcon} from '@common/icons/material/Delete';
import {DragIndicatorIcon} from '@common/icons/material/DragIndicator';
import {Switch} from '@common/ui/forms/toggle/switch';
import {nanoid} from 'nanoid';

interface SimpleTableEditorProps {
  table?: DataTable;
  isOpen: boolean;
  onClose: () => void;
  onSave: (table: DataTable) => void;
}

const FIELD_TYPES: {value: DataFieldType; label: string}[] = [
  {value: 'text', label: 'Text'},
  {value: 'textarea', label: 'Long Text'},
  {value: 'number', label: 'Number'},
  {value: 'decimal', label: 'Decimal'},
  {value: 'boolean', label: 'True/False'},
  {value: 'date', label: 'Date'},
  {value: 'datetime', label: 'Date & Time'},
  {value: 'email', label: 'Email'},
  {value: 'url', label: 'URL'},
  {value: 'phone', label: 'Phone'},
  {value: 'select', label: 'Dropdown'},
  {value: 'multiselect', label: 'Multi-Select'},
  {value: 'image', label: 'Image'},
  {value: 'file', label: 'File'},
  {value: 'json', label: 'JSON'},
  {value: 'reference', label: 'Reference'}
];

export function SimpleTableEditor({table, isOpen, onClose, onSave}: SimpleTableEditorProps) {
  const [formData, setFormData] = useState<Partial<DataTable>>({
    name: '',
    displayName: '',
    description: '',
    fields: []
  });

  useEffect(() => {
    if (table) {
      setFormData(table);
    } else {
      setFormData({
        name: '',
        displayName: '',
        description: '',
        fields: [
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
  }, [table, isOpen]);

  const handleSave = () => {
    if (!formData.name || !formData.displayName) {
      alert('Please fill in table name and display name');
      return;
    }

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
  };

  const updateField = (index: number, updates: Partial<DataField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.map((field, i) => 
        i === index ? {...field, ...updates} : field
      ) || []
    }));
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
              <div>
                <label className="mb-2 block text-sm font-medium">Table Name</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g., users, products, orders"
                />
                <p className="mt-1 text-xs text-gray-500">Database table name (lowercase, no spaces)</p>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Display Name</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData(prev => ({...prev, displayName: e.target.value}))}
                  placeholder="e.g., Users, Products, Orders"
                />
                <p className="mt-1 text-xs text-gray-500">Human-readable name</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                placeholder="What is this table for?"
              />
            </div>

            {/* Fields */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">Fields</h3>
                <Button size="sm" variant="outline" onClick={addField}>
                  <AddIcon className="mr-2" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-4">
                {formData.fields?.map((field, index) => (
                  <SimpleFieldEditor
                    key={field.id}
                    field={field}
                    index={index}
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

interface SimpleFieldEditorProps {
  field: DataField;
  index: number;
  onUpdate: (updates: Partial<DataField>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SimpleFieldEditor({field, index, onUpdate, onRemove, canRemove}: SimpleFieldEditorProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <DragIndicatorIcon className="h-5 w-5 text-gray-400" />
          <h4 className="font-medium">Field {index + 1}</h4>
        </div>
        
        {canRemove && (
          <IconButton size="xs" variant="outline" onClick={onRemove} className="text-red-500">
            <DeleteIcon />
          </IconButton>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Field Name</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={field.name}
            onChange={(e) => onUpdate({name: e.target.value})}
            placeholder="e.g., email, first_name"
          />
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-medium">Display Name</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={field.displayName}
            onChange={(e) => onUpdate({displayName: e.target.value})}
            placeholder="e.g., Email Address, First Name"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Field Type</label>
          <select
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={field.type}
            onChange={(e) => onUpdate({type: e.target.value as DataFieldType})}
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Required</label>
            <Switch
              size="sm"
              checked={field.required}
              onChange={(e) => onUpdate({required: e.target.checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Unique</label>
            <Switch
              size="sm"
              checked={field.unique || false}
              onChange={(e) => onUpdate({unique: e.target.checked})}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 