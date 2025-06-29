import React, {useState} from 'react';
import {DatabaseDesigner} from './database-designer';
import {SimpleTableEditor} from './simple-table-editor';
import {DataTable} from './data-schema';
import {nanoid} from 'nanoid';

interface DatabaseRelationship {
  id: string;
  fromTable: string;
  toTable: string;
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
  fromField?: string;
  toField?: string;
  label?: string;
}

export function DatabaseDesignerPage() {
  const [tables, setTables] = useState<DataTable[]>([
    // Sample data
    {
      id: 'users',
      name: 'users',
      displayName: 'Users',
      description: 'Application users',
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [
        {
          id: '1',
          name: 'id',
          displayName: 'ID',
          type: 'number',
          required: true,
          unique: true
        },
        {
          id: '2',
          name: 'email',
          displayName: 'Email',
          type: 'email',
          required: true,
          unique: true
        },
        {
          id: '3',
          name: 'name',
          displayName: 'Name',
          type: 'text',
          required: true
        }
      ]
    },
    {
      id: 'posts',
      name: 'posts',
      displayName: 'Posts',
      description: 'Blog posts',
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [
        {
          id: '1',
          name: 'id',
          displayName: 'ID',
          type: 'number',
          required: true,
          unique: true
        },
        {
          id: '2',
          name: 'title',
          displayName: 'Title',
          type: 'text',
          required: true
        },
        {
          id: '3',
          name: 'content',
          displayName: 'Content',
          type: 'textarea',
          required: true
        },
        {
          id: '4',
          name: 'user_id',
          displayName: 'Author',
          type: 'reference',
          required: true
        }
      ]
    }
  ]);

  const [relationships, setRelationships] = useState<DatabaseRelationship[]>([
    {
      id: 'rel1',
      fromTable: 'posts',
      toTable: 'users',
      type: 'belongsTo',
      fromField: 'user_id',
      toField: 'id'
    }
  ]);

  const [editingTable, setEditingTable] = useState<DataTable | undefined>();
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);

  const handleAddTable = () => {
    setEditingTable(undefined);
    setIsTableEditorOpen(true);
  };

  const handleEditTable = (table: DataTable) => {
    setEditingTable(table);
    setIsTableEditorOpen(true);
  };

  const handleDeleteTable = (tableId: string) => {
    setTables(prev => prev.filter(t => t.id !== tableId));
    // Also remove related relationships
    setRelationships(prev => 
      prev.filter(r => r.fromTable !== tableId && r.toTable !== tableId)
    );
  };

  const handleSaveTable = (table: DataTable) => {
    if (editingTable) {
      // Update existing table
      setTables(prev => prev.map(t => t.id === table.id ? table : t));
    } else {
      // Add new table
      setTables(prev => [...prev, table]);
    }
    setIsTableEditorOpen(false);
    setEditingTable(undefined);
  };

  const handleCreateRelationship = (relationship: Omit<DatabaseRelationship, 'id'>) => {
    const newRelationship: DatabaseRelationship = {
      ...relationship,
      id: nanoid()
    };
    setRelationships(prev => [...prev, newRelationship]);
  };

  const handleDeleteRelationship = (relationshipId: string) => {
    setRelationships(prev => prev.filter(r => r.id !== relationshipId));
  };

  return (
    <div className="h-screen w-full">
      <DatabaseDesigner
        tables={tables}
        relationships={relationships}
        onAddTable={handleAddTable}
        onEditTable={handleEditTable}
        onDeleteTable={handleDeleteTable}
        onCreateRelationship={handleCreateRelationship}
        onDeleteRelationship={handleDeleteRelationship}
      />
      
      <SimpleTableEditor
        table={editingTable}
        isOpen={isTableEditorOpen}
        onClose={() => {
          setIsTableEditorOpen(false);
          setEditingTable(undefined);
        }}
        onSave={handleSaveTable}
      />
    </div>
  );
} 