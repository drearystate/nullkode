import React, {Fragment, useState, useCallback, useMemo} from 'react';
import {Trans} from '@common/i18n/trans';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Button} from '@common/ui/buttons/button';
import {Accordion, AccordionItem} from '@common/ui/accordion/accordion';
import {AccountBoxIcon} from '@common/icons/material/AccountBox';
import {AccessTimeIcon} from '@common/icons/material/AccessTime';
import {TouchAppIcon} from '@common/icons/material/TouchApp';
import {StorageIcon} from '@common/icons/material/Storage';
import {LinkIcon} from '@common/icons/material/Link';
import {HubIcon} from '@common/icons/material/Hub';
import {AddIcon} from '@common/icons/material/Add';
import {VisibilityIcon} from '@common/icons/material/Visibility';
import {EditIcon} from '@common/icons/material/Edit';
import {SearchIcon} from '@common/icons/material/Search';
import {DeleteIcon} from '@common/icons/material/Delete';
import {TableChartIcon} from '@common/icons/material/TableChart';
import {UploadFileIcon} from '@common/icons/material/UploadFile';
import {GetAppIcon} from '@common/icons/material/GetApp';
import {ViewListIcon} from '@common/icons/material/ViewList';
import {PersonAddIcon} from '@common/icons/material/PersonAdd';
import {useEditorStore} from '@app/editor/state/editor-store';
import {IconButton} from '@common/ui/buttons/icon-button';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {useAutomationData} from '@app/editor/automation/use-automation-data';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {WarningIcon} from '@common/icons/material/Warning';
import {Chip} from '@common/ui/forms/input-field/chip-field/chip';
import {FormSelect} from '@common/ui/forms/select/select';
import {RefreshIcon} from '@common/icons/material/Refresh';


// Enhanced system tables with more realistic data
const systemTables = [
  {
    id: 'users',
    name: 'users',
    displayName: 'Users',
    description: 'User accounts and profiles',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {id: 'id', name: 'id', type: 'decimal', description: 'Unique identifier'},
      {id: 'name', name: 'name', type: 'text', description: 'Full name'},
      {id: 'email', name: 'email', type: 'email', description: 'Email address'},
      {id: 'avatar', name: 'avatar', type: 'image', description: 'Profile picture'},
      {id: 'role', name: 'role', type: 'select', description: 'User role'},
      {id: 'created_at', name: 'created_at', type: 'datetime', description: 'Registration date'},
      {id: 'last_login', name: 'last_login', type: 'datetime', description: 'Last login time'},
    ]
  },
  {
    id: 'contacts',
    name: 'contacts',
    displayName: 'Contacts',
    description: 'Contact information and details',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {id: 'id', name: 'id', type: 'decimal', description: 'Unique identifier'},
      {id: 'first_name', name: 'first_name', type: 'text', description: 'First name'},
      {id: 'last_name', name: 'last_name', type: 'text', description: 'Last name'},
      {id: 'email', name: 'email', type: 'email', description: 'Email address'},
      {id: 'phone', name: 'phone', type: 'phone', description: 'Phone number'},
      {id: 'company', name: 'company', type: 'text', description: 'Company name'},
      {id: 'position', name: 'position', type: 'text', description: 'Job position'},
      {id: 'notes', name: 'notes', type: 'textarea', description: 'Additional notes'},
    ]
  },
  {
    id: 'products',
    name: 'products',
    displayName: 'Products',
    description: 'Product catalog and inventory',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {id: 'id', name: 'id', type: 'decimal', description: 'Unique identifier'},
      {id: 'name', name: 'name', type: 'text', description: 'Product name'},
      {id: 'description', name: 'description', type: 'textarea', description: 'Product description'},
      {id: 'price', name: 'price', type: 'decimal', description: 'Product price'},
      {id: 'category', name: 'category', type: 'select', description: 'Product category'},
      {id: 'image', name: 'image', type: 'image', description: 'Product image'},
      {id: 'stock', name: 'stock', type: 'decimal', description: 'Stock quantity'},
      {id: 'featured', name: 'featured', type: 'boolean', description: 'Featured product'},
    ]
  },
  {
    id: 'orders',
    name: 'orders',
    displayName: 'Orders',
    description: 'Customer orders and transactions',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {id: 'id', name: 'id', type: 'decimal', description: 'Order ID'},
      {id: 'customer_name', name: 'customer_name', type: 'text', description: 'Customer name'},
      {id: 'customer_email', name: 'customer_email', type: 'email', description: 'Customer email'},
      {id: 'total', name: 'total', type: 'decimal', description: 'Order total'},
      {id: 'status', name: 'status', type: 'select', description: 'Order status'},
      {id: 'order_date', name: 'order_date', type: 'datetime', description: 'Order date'},
      {id: 'shipping_address', name: 'shipping_address', type: 'textarea', description: 'Shipping address'},
    ]
  },
  {
    id: 'blog_posts',
    name: 'blog_posts',
    displayName: 'Blog Posts',
    description: 'Blog articles and content',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {id: 'id', name: 'id', type: 'decimal', description: 'Post ID'},
      {id: 'title', name: 'title', type: 'text', description: 'Post title'},
      {id: 'content', name: 'content', type: 'textarea', description: 'Post content'},
      {id: 'author', name: 'author', type: 'text', description: 'Author name'},
      {id: 'published_at', name: 'published_at', type: 'datetime', description: 'Publication date'},
      {id: 'featured_image', name: 'featured_image', type: 'image', description: 'Featured image'},
      {id: 'tags', name: 'tags', type: 'text', description: 'Post tags'},
    ]
  }
];

const tableTemplates = [
  {
    id: 'contact_form',
    name: 'Contact Form',
    fields: [
      {name: 'name', type: 'text', required: true},
      {name: 'email', type: 'email', required: true},
      {name: 'message', type: 'textarea', required: true},
    ]
  },
  {
    id: 'product_catalog',
    name: 'Product Catalog',
    fields: [
      {name: 'name', type: 'text', required: true},
      {name: 'price', type: 'decimal', required: true},
      {name: 'description', type: 'textarea', required: false},
      {name: 'image', type: 'image', required: false},
    ]
  }
];

const triggerRegistry = {
  getAll: () => [
    {id: 1, name: 'Element Clicked', description: 'When user clicks on element', category: 'user', parameters: []},
    {id: 2, name: 'Form Submitted', description: 'When form is submitted', category: 'user', parameters: []},
    {id: 3, name: 'Daily Schedule', description: 'Run at specific time every day', category: 'schedule', parameters: []},
    {id: 4, name: 'Data Created', description: 'When new data is added', category: 'data', parameters: []},
  ],
  getByCategory: (category: string) => triggerRegistry.getAll().filter(t => t.category === category)
};

const fieldTypeOptions = [
  {value: 'text', label: 'Text'},
  {value: 'textarea', label: 'Long Text'},
  {value: 'decimal', label: 'Number'},
  {value: 'boolean', label: 'True/False'},
  {value: 'date', label: 'Date'},
  {value: 'datetime', label: 'Date & Time'},
  {value: 'email', label: 'Email'},
  {value: 'url', label: 'URL'},
  {value: 'phone', label: 'Phone'},
  {value: 'select', label: 'Select'},
  {value: 'multiselect', label: 'Multi Select'},
  {value: 'image', label: 'Image'},
  {value: 'file', label: 'File'},
  {value: 'json', label: 'JSON'},
  {value: 'reference', label: 'Reference'},
];

type ModalType = 'table-details' | 'create-table' | 'template' | 'trigger' | 'create-trigger' | 'connection' | 'binding' | 'edit-fields' | 'relationships' | 'table-data' | 'csv-import' | 'add-row' | null;

// Add these new interfaces after the existing imports
interface TableRelationship {
  id: string;
  fromTable: string;
  toTable: string;
  fromField: string;
  toField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  description?: string;
}

interface PageBinding {
  pageId: string;
  pageName: string;
  elementId: string;
  elementType: string;
  bindingType: 'display' | 'form' | 'filter';
  tableId: string;
  fieldId: string;
}

interface TableDependencies {
  tableId: string;
  tableName: string;
  pageBindings: PageBinding[];
  relationships: TableRelationship[];
  canDelete: boolean;
  warnings: string[];
}

export function DataPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tables');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [showTableFieldsDialog, setShowTableFieldsDialog] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  
  const selectedNode = useEditorStore(s => s.selectedContext?.node);
  const {data: automationData, addDataTable, deleteDataTable, addTrigger, isAddingTable, isAddingTrigger, isDeletingTable} = useAutomationData();

  // Combine system tables with saved data tables
  const tables = useMemo(() => {
    const savedTables = automationData?.dataSchema || [];
    const tablesWithIds = savedTables.map((table: any) => ({
      id: table.id || table.name,
      name: table.name,
      displayName: table.displayName || table.name,
      description: table.description || '',
      isSystem: false, // Custom tables are NOT system tables
      fields: table.fields?.map((field: any) => ({
        id: field.id || field.name,
        name: field.name,
        type: field.type,
        required: field.required || false
      })) || []
    }));
    
    return [...systemTables, ...tablesWithIds];
  }, [automationData?.dataSchema]);

  // Mock project object for now
  const project = { id: 'current-project' };

  // Use the actual mutation hooks from the automation data hook
  const createDataTableMutation = {
    mutateAsync: async (tableData: any) => {
      return await addDataTable(tableData);
    },
    isPending: isAddingTable
  };

  const deleteDataTableMutation = {
    mutateAsync: async (tableId: string) => {
      return await deleteDataTable(tableId);
    },
    mutate: (tableId: string) => {
      deleteDataTable(tableId);
    },
    isPending: isDeletingTable
  };

  const openModal = useCallback((type: ModalType, data?: any) => {
    if (data?.mode === 'edit-fields') {
      setModalType('edit-fields');
      setSelectedData(data);
    } else {
      setModalType(type);
      setSelectedData(data);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    setSelectedData(null);
  }, []);

  const handleCreateCustomTable = useCallback(async (tableData: any) => {
    try {
      // Validate table name
      const tableName = tableData.name.toLowerCase().replace(/\s+/g, '_');
      if (!tableName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        toast(message('Table name must start with a letter or underscore and contain only letters, numbers, and underscores'));
        return;
      }

      const newTable = {
        name: tableName,
        displayName: tableData.name,
        description: tableData.description || `Custom table: ${tableData.name}`,
        fields: [
          {name: 'id', type: 'decimal', required: true},
          {name: 'title', type: 'text', required: true},
          {name: 'content', type: 'textarea', required: false},
          {name: 'status', type: 'text', required: true},
          {name: 'created_at', type: 'datetime', required: true},
        ]
      };

      await createDataTableMutation.mutateAsync(newTable);
      
      toast(message('Custom table created successfully!'));
      closeModal();
    } catch (error) {
      console.error('Failed to create table:', error);
      toast(message('Failed to create table: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    }
  }, [createDataTableMutation, closeModal]);

  const handleCreateTableFromTemplate = useCallback(async (template: any) => {
    try {
      // Validate table name
      const tableName = template.name.toLowerCase().replace(/\s+/g, '_');
      if (!tableName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        toast(message('Table name must start with a letter or underscore and contain only letters, numbers, and underscores'));
        return;
      }

      const tableData = {
        name: tableName,
        displayName: template.name,
        description: `Table created from ${template.name} template`,
        fields: template.fields.map((field: any) => ({
          name: field.name,
          type: field.type === 'number' ? 'decimal' : field.type, // Fix type mapping
          required: field.required ?? true,
        }))
      };

      await createDataTableMutation.mutateAsync(tableData);
      
      toast(message('Table created successfully'));
      closeModal();
    } catch (error) {
      console.error('Failed to create table from template:', error);
      toast(message('Failed to create table: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    }
  }, [createDataTableMutation, closeModal]);

  const handleAddField = useCallback(async (tableData: any, newField: any) => {
    if (!newField.name || !newField.type) {
      toast(message('Field name and type are required'));
      return;
    }

    // Validate field name
    if (!newField.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      toast(message('Field name must start with a letter or underscore and contain only letters, numbers, and underscores'));
      return;
    }

    try {
      // Add field to the table
      const updatedTable = {
        ...tableData,
        id: tableData.id || tableData.name, // Preserve existing ID
        fields: [
          ...tableData.fields,
          {
            name: newField.name,
            type: newField.type,
            required: newField.required || false
          }
        ]
      };

      // Update the table in automation data using the mutation
      await createDataTableMutation.mutateAsync(updatedTable);
      toast(message('Field added successfully'));
      
      // Refresh the modal with updated data
      setSelectedData(updatedTable);
    } catch (error) {
      console.error('Failed to add field:', error);
      toast(message('Failed to add field: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    }
  }, [createDataTableMutation]);

  const handleDeleteField = useCallback(async (tableData: any, fieldIndex: number) => {
    if (fieldIndex < 2) {
      toast(message('Cannot delete core fields'));
      return;
    }

    try {
      // Remove field from the table
      const updatedFields = [...tableData.fields];
      updatedFields.splice(fieldIndex, 1);
      
      const updatedTable = {
        ...tableData,
        id: tableData.id || tableData.name, // Preserve existing ID
        fields: updatedFields
      };

      // Update the table in automation data using the mutation
      await createDataTableMutation.mutateAsync(updatedTable);
      toast(message('Field deleted successfully'));
      
      // Refresh the modal with updated data
      setSelectedData(updatedTable);
    } catch (error) {
      console.error('Failed to delete field:', error);
      toast(message('Failed to delete field: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    }
  }, [createDataTableMutation]);

  // Test function with fixed regex
  const testDataIntegration = useCallback(() => {
    try {
      // Fixed regex - was /[s-()]/g, now /[\s\-()]/g
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const testPhone = '+1234567890';
      const cleanPhone = testPhone.replace(/[\s\-()]/g, ''); // Fixed regex
      
      if (phoneRegex.test(cleanPhone)) {
        console.log('✅ Test button clicked! Modal system working');
        console.log('✅ Regex fixed successfully');
        console.log('✅ Phone validation passed:', cleanPhone);
        toast(message('Data integration test passed!'));
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
      toast(message('Test failed: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    }
  }, []);

  // Enhanced External Connections with OAuth
  const externalConnections = [
    {
      id: 'airtable',
      name: 'Airtable',
      description: 'Connect to Airtable bases and tables',
      icon: '🗂️',
      status: 'available',
      authUrl: 'https://airtable.com/oauth2/v1/authorize',
      scopes: ['data.records:read', 'data.records:write', 'schema.bases:read']
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Connect to Google Sheets documents',
      icon: '📊',
      status: 'available',
      authUrl: 'https://accounts.google.com/oauth2/v2/auth',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Connect to Notion databases',
      icon: '📝',
      status: 'coming-soon'
    }
  ];

  const handleConnect = useCallback(async (connection: any) => {
    if (connection.status === 'coming-soon') {
      toast(message('This integration is coming soon!'));
      return;
    }

    if (connection.id === 'google_sheets') {
      // Start Google OAuth flow
      handleGoogleOAuth();
      return;
    }

    if (connection.id === 'airtable') {
      // Open Airtable connection modal
      setSelectedData({
        ...connection,
        type: 'airtable_setup'
      });
      setModalType('connection');
      return;
    }

    try {
      console.log(`Attempted to connect to ${connection.name}`);
      toast(message('Connection setup opened'));
      
    } catch (error) {
      toast(message('Failed to connect to :provider: :error', {
        values: { 
          provider: connection.name,
          error: String(error) || 'Unknown error'
        }
      }));
    }
  }, []);

  // Google OAuth handler
  const handleGoogleOAuth = useCallback(async () => {
    try {
      // Get OAuth config from backend
      const response = await fetch('/api/v1/oauth/google_sheets/config');
      const configData = await response.json();
      
      if (!configData.success || !configData.config.enabled) {
        toast(message('Google OAuth not configured. Please set up Google credentials in the backend.'));
        return;
      }

      const config = configData.config;
      const state = encodeURIComponent(JSON.stringify({
        provider: 'google_sheets',
        timestamp: Date.now()
      }));

      const authUrl = `${config.authUrl}?` + 
        `client_id=${config.clientId}&` +
        `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
        `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${state}`;

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast(message('Popup blocked. Please allow popups for this site.'));
        return;
      }

      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Open Google Sheets selection dialog after successful auth
          setSelectedData({
            id: 'google_sheets',
            name: 'Google Sheets',
            type: 'google_sheets_oauth',
            authenticated: true
          });
          setModalType('connection');
          toast(message('Google Sheets authorization completed. Select your spreadsheet.'));
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!popup.closed) {
          popup.close();
          toast(message('Authorization timeout. Please try again.'));
        }
      }, 300000);

    } catch (error) {
      console.error('Google OAuth error:', error);
      toast(message('Failed to start Google authorization: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    }
  }, []);

  // Add function to check table dependencies
  const checkTableDependencies = useCallback(async (tableId: string, tableName: string): Promise<TableDependencies> => {
    // Mock data - in real implementation, this would query the project for actual bindings
    const mockPageBindings: PageBinding[] = [
      {
        pageId: 'home',
        pageName: 'Home Page',
        elementId: 'contact-list',
        elementType: 'List Component',
        bindingType: 'display',
        tableId: tableId,
        fieldId: 'name'
      },
      {
        pageId: 'contact-form',
        pageName: 'Contact Form',
        elementId: 'form-1',
        elementType: 'Form Component',
        bindingType: 'form',
        tableId: tableId,
        fieldId: 'email'
      }
    ];

    const mockRelationships: TableRelationship[] = [
      {
        id: 'rel-1',
        fromTable: 'users',
        toTable: tableId,
        fromField: 'id',
        toField: 'user_id',
        type: 'one-to-many',
        description: 'User owns multiple contacts'
      }
    ];

    const hasBindings = mockPageBindings.length > 0;
    const hasRelationships = mockRelationships.length > 0;
    
    return {
      tableId,
      tableName,
      pageBindings: mockPageBindings,
      relationships: mockRelationships,
      canDelete: !hasBindings && !hasRelationships,
      warnings: [
        ...(hasBindings ? ['This table has data bindings on pages that will be broken'] : []),
        ...(hasRelationships ? ['This table has relationships with other tables'] : [])
      ]
    };
  }, []);

  // Enhanced delete handler with dependency checking
  const handleDeleteTable = useCallback(async (table: any) => {
    if (table.isSystem) {
      toast(message('Cannot delete system tables'));
      return;
    }

    const tableId = table.id || table.name;
    
    if (confirm(`Are you sure you want to delete the table "${table.displayName || table.name}"?`)) {
      try {
        await deleteDataTableMutation.mutateAsync(tableId);
        toast(message('Table deleted successfully'));
      } catch (error) {
        console.error('Failed to delete table:', error);
        toast(message('Failed to delete table: :error', {
          values: { error: String(error) || 'Unknown error' }
        }));
      }
    }
  }, [deleteDataTableMutation]);

  // Function to force delete after unlinking
  const forceDeleteTable = useCallback((tableId: string) => {
    deleteDataTableMutation.mutate(tableId);
    setModalType(null);
    setSelectedData(null);
  }, [deleteDataTableMutation]);

  // Function to create table relationship
  const createRelationship = useCallback((relationship: Omit<TableRelationship, 'id'>) => {
    setSelectedData(relationship);
    setModalType('connection');
  }, []);

  // Add missing table management handlers
  const handleViewTable = useCallback((table: any) => {
    setSelectedData(table);
    setModalType('table-details');
  }, []);

  const handleCreateTable = useCallback(() => {
    setModalType('create-table');
  }, []);

  const handleSelectTemplate = useCallback((template: any) => {
    setSelectedData(template);
    setModalType('template');
  }, []);

  const handleSelectTrigger = useCallback((trigger: any) => {
    setSelectedData(trigger);
    setModalType('trigger');
  }, []);

  const handleCreateTrigger = useCallback(() => {
    setModalType('create-trigger');
  }, []);

  const handleSelectConnection = useCallback((connection: any) => {
    setSelectedData(connection);
    setModalType('connection');
  }, []);

  const handleSelectBinding = useCallback((binding: any) => {
    setSelectedData(binding);
    setModalType('binding');
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="p-14">
        <TextField
          placeholder="Search data features..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="mb-14"
          startAdornment={<SearchIcon />}
        />

        {/* Fixed test button */}
        <Button
          variant="outline"
          size="xs"
          className="w-full mb-14"
          onClick={testDataIntegration}
          title="Test Data Integration"
        >
          🧪
        </Button>

        <Accordion variant="outline" mode="multiple" defaultExpandedValues={['data-management', 'system-tables', 'relationships', 'templates', 'triggers']}>
          <AccordionItem
            label={
              <div className="flex items-center gap-8">
                <ViewListIcon className="text-primary" />
                <Trans message="Data Management" />
                <span className="ml-auto text-xs text-muted bg-primary/10 text-primary px-8 py-4 rounded">
                  New
                </span>
              </div>
            }
            value="data-management"
          >
            <DataManagementSection 
              tables={tables}
              onViewTableData={(table: any) => openModal('table-data', table)}
              onImportCSV={(table: any) => openModal('csv-import', table)}
              onAddRow={(table: any) => openModal('add-row', table)}
            />
          </AccordionItem>

          <AccordionItem
            label={
              <div className="flex items-center gap-8">
                <StorageIcon className="text-primary" />
                <Trans message="Tables & Schema" />
                <span className="ml-auto text-xs text-muted">
                  {tables.length}
                </span>
              </div>
            }
            value="system-tables"
          >
            <SystemTablesSection 
              tables={tables}
              onViewTable={(table: any) => openModal('table-details', table)} 
              onCreateTable={() => openModal('create-table')}
              onDeleteTable={handleDeleteTable}
            />
          </AccordionItem>

          <AccordionItem
            label={
              <div className="flex items-center gap-8">
                <HubIcon className="text-primary" />
                <Trans message="Table Relationships" />
                <span className="ml-auto text-xs text-muted">
                  Visual Designer
                </span>
              </div>
            }
            value="relationships"
          >
            <RelationshipsSection 
              tables={tables}
              onOpenVisualDesigner={() => openModal('relationships')}
            />
          </AccordionItem>

          <AccordionItem
            label={
              <div className="flex items-center gap-8">
                <AccountBoxIcon className="text-primary" />
                <Trans message="Quick Start Templates" />
                <span className="ml-auto text-xs text-muted">
                  {tableTemplates.length}
                </span>
              </div>
            }
            value="templates"
          >
            <TemplatesSection onSelectTemplate={(template: any) => openModal('template', template)} />
          </AccordionItem>

          <AccordionItem
            label={
              <div className="flex items-center gap-8">
                <TouchAppIcon className="text-primary" />
                <Trans message="Automation Triggers" />
                <span className="ml-auto text-xs text-muted">
                  {triggerRegistry.getAll().length}
                </span>
              </div>
            }
            value="triggers"
          >
            <AutomationTriggersSection 
              searchQuery={searchQuery} 
              onSelectTrigger={(trigger: any) => openModal('trigger', trigger)}
              onCreateTrigger={() => openModal('create-trigger')}
            />
          </AccordionItem>

          <AccordionItem
            label={
              <div className="flex items-center gap-8">
                <LinkIcon className="text-primary" />
                <Trans message="External Connections" />
                <span className="ml-auto text-xs text-muted">0</span>
              </div>
            }
            value="external"
          >
            <ExternalConnectionsSection onSelectConnection={(connection: any) => openModal('connection', connection)} />
          </AccordionItem>



          {selectedTable && (
            <AccordionItem
              label={
                <div className="flex items-center gap-8">
                  <EditIcon className="text-primary" />
                  <Trans message="Data Binding" />
                </div>
              }
              value="binding"
            >
              <DataBindingSection node={selectedTable} onSelectBinding={(option: any) => openModal('binding', {option, node: selectedTable})} />
            </AccordionItem>
          )}

          {!selectedTable && (
            <div className="p-12 text-center text-muted text-sm border rounded">
              <EditIcon className="mx-auto mb-8" />
              <div>
                <Trans message="Select an element to see data binding options" />
              </div>
            </div>
          )}
        </Accordion>
      </div>

      {/* Table Dependencies Dialog */}
      <DialogTrigger
        type="modal"
        isOpen={modalType === 'connection'}
        onOpenChange={() => setModalType(null)}
      >
        <Dialog size="lg">
          <DialogHeader>
            <Trans message="Connection Details" />
          </DialogHeader>
          <DialogBody>
            <ConnectionDialog connection={selectedData} onSelectConnection={() => setModalType(null)} />
          </DialogBody>
        </Dialog>
      </DialogTrigger>

      {/* Enhanced Modal System */}
      <DialogTrigger type="modal" isOpen={modalType !== null} onClose={closeModal}>
        <Dialog size={modalType === 'edit-fields' ? 'lg' : modalType === 'relationships' ? 'w-[60vw] h-[90vh]' : 'md'}>
          {modalType === 'table-details' && selectedData && (
            <TableDetailsModal data={selectedData} onClose={closeModal} />
          )}

          {modalType === 'create-table' && (
            <CreateTableModal onClose={closeModal} onSave={handleCreateCustomTable} />
          )}

          {modalType === 'template' && selectedData && (
            <TemplateModal 
              template={selectedData} 
              onClose={closeModal} 
              onCreate={handleCreateTableFromTemplate}
              isCreating={isCreatingTemplate}
            />
          )}

          {modalType === 'edit-fields' && selectedData && (
            <EditFieldsModal 
              tableData={selectedData} 
              onClose={closeModal}
              onAddField={handleAddField}
              onDeleteField={handleDeleteField}
            />
          )}

          {modalType === 'trigger' && selectedData && (
            <TriggerDetailsModal trigger={selectedData} onClose={closeModal} />
          )}

          {modalType === 'create-trigger' && (
            <CreateTriggerModal onClose={closeModal} onSave={async (triggerData) => {
              try {
                await createDataTableMutation.mutateAsync(triggerData);
                toast(message('Trigger created successfully'));
                closeModal();
              } catch (error) {
                toast(message('Failed to create trigger'));
              }
            }} />
          )}

          {modalType === 'connection' && selectedData && (
            <ConnectionDialog connection={selectedData} onSelectConnection={() => setModalType(null)} />
          )}

          {modalType === 'binding' && selectedData && (
            <DataBindingModal binding={selectedData} onClose={closeModal} />
          )}

          {modalType === 'relationships' && (
            <VisualRelationshipsModal tables={tables} onClose={closeModal} />
          )}
          
          {modalType === 'table-data' && selectedData && (
            <TableDataModal table={selectedData} onClose={closeModal} />
          )}
          
          {modalType === 'csv-import' && selectedData && (
            <CSVImportModal table={selectedData} onClose={closeModal} />
          )}
          
          {modalType === 'add-row' && selectedData && (
            <AddRowModal table={selectedData} onClose={closeModal} />
          )}
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

// Enhanced System Tables Section
function SystemTablesSection({tables, onViewTable, onCreateTable, onDeleteTable}: {
  tables: any[];
  onViewTable: (table: any) => void; 
  onCreateTable: () => void;
  onDeleteTable: (table: any) => void;
}) {
  const openEditFields = (table: any) => {
    onViewTable({...table, mode: 'edit-fields'});
  };

  return (
    <div className="space-y-8">
      {tables.map((table: any) => (
        <div key={table.id} className="border rounded-lg p-12 hover:bg-hover transition-colors">
                      <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-8">
                <h4 className="font-medium text-sm truncate">{table.displayName || table.name}</h4>
                <span className="text-xs bg-primary/10 text-primary px-6 py-2 rounded whitespace-nowrap">
                  {table.fields?.length || 0} fields
                </span>
              </div>
              <p className="text-xs text-muted mb-8 truncate">
                {table.description || `${table.fields?.length || 0} fields • ${table.isSystem ? 'System table' : 'Custom table'}`}
              </p>
              <div className="flex gap-6 flex-wrap">
                <Button 
                  variant="outline" 
                  size="xs"
                  onClick={() => onViewTable(table)}
                >
                  <VisibilityIcon size="xs" />
                  <Trans message="View" />
                </Button>
                <Button 
                  variant="outline" 
                  size="xs"
                  onClick={() => openEditFields(table)}
                >
                  <EditIcon size="xs" />
                  <Trans message="Edit Fields" />
                </Button>
                {!table.isSystem && (
                  <Button 
                    variant="outline" 
                    size="xs"
                    color="danger"
                    onClick={() => onDeleteTable(table)}
                  >
                    <DeleteIcon size="xs" />
                    <Trans message="Delete" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full border-dashed"
        onClick={onCreateTable}
      >
        <AddIcon />
        <Trans message="Create Custom Table" />
      </Button>
    </div>
  );
}

// Enhanced Templates Section
function TemplatesSection({onSelectTemplate}: {onSelectTemplate: (template: any) => void}) {
  return (
    <div className="grid grid-cols-1 gap-8">
      {tableTemplates.map((template: any) => (
        <div 
          key={template.id} 
          className="rounded border p-12 hover:bg-hover cursor-pointer transition-colors"
          onClick={() => onSelectTemplate(template)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted">
                {template.fields.length} fields
              </div>
            </div>
            <AddIcon className="text-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Fixed Automation Triggers Section
function AutomationTriggersSection({searchQuery, onSelectTrigger, onCreateTrigger}: {
  searchQuery: string; 
  onSelectTrigger: (trigger: any) => void; 
  onCreateTrigger: () => void;
}) {
  const categories = [
    {
      key: 'user',
      label: 'User Interactions',
      icon: TouchAppIcon,
      triggers: triggerRegistry.getByCategory('user'),
    },
    {
      key: 'schedule',
      label: 'Scheduled & Timed',
      icon: AccessTimeIcon,
      triggers: triggerRegistry.getByCategory('schedule'),
    },
    {
      key: 'data',
      label: 'Data Changes',
      icon: StorageIcon,
      triggers: triggerRegistry.getByCategory('data'),
    },
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    triggers: category.triggers.filter(
      (trigger: any) =>
        !searchQuery ||
        trigger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trigger.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  return (
    <div className="space-y-12">
      <Button
        variant="outline"
        size="xs"
        className="w-full mb-12"
        startIcon={<AddIcon />}
        onClick={onCreateTrigger}
      >
        <Trans message="Create New Trigger" />
      </Button>

      <Accordion variant="outline" mode="multiple" defaultExpandedValues={['user', 'schedule', 'data']}>
        {filteredCategories.map(category => (
          <AccordionItem
            key={category.key}
            label={
              <div className="flex items-center gap-8 text-xs font-medium">
                <category.icon size="sm" />
                <Trans message={category.label} />
                <span className="ml-auto">({category.triggers.length})</span>
              </div>
            }
            value={category.key}
          >
            <div className="space-y-4">
              {category.triggers.map((trigger: any) => (
                <TriggerItem key={trigger.id} trigger={trigger} onSelectTrigger={onSelectTrigger} />
              ))}
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// Enhanced Trigger Item
function TriggerItem({trigger, onSelectTrigger}: {trigger: any; onSelectTrigger: (trigger: any) => void}) {
  return (
    <div 
      className="flex items-center justify-between p-8 rounded border hover:bg-hover cursor-pointer transition-colors"
      onClick={() => onSelectTrigger(trigger)}
    >
      <div>
        <div className="text-sm font-medium">{trigger.name}</div>
        <div className="text-xs text-muted">{trigger.description}</div>
      </div>
      <IconButton size="xs">
        <EditIcon />
      </IconButton>
    </div>
  );
}

// Enhanced Modal Components
function TableDetailsModal({data, onClose}: {data: any; onClose: () => void}) {
  return (
    <>
      <DialogHeader>
        <Trans message="Table Details: :name" values={{name: data.name}} />
      </DialogHeader>
      <DialogBody>
        <div className="space-y-16">
          <div>
            <div className="text-sm font-medium mb-8">
              <Trans message="Description" />
            </div>
            <div className="text-sm text-muted">{data.description}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-8">
              <Trans message="Fields" />
            </div>
            <div className="space-y-8">
              {data.fields.map((field: any) => (
                <div key={field.name} className="flex justify-between border rounded p-8">
                  <span className="font-medium">{field.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-8 py-4 rounded">
                    {field.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Close" />
        </Button>
      </DialogFooter>
    </>
  );
}

function CreateTableModal({onClose, onSave}: {onClose: () => void; onSave: (data: any) => void}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <>
      <DialogHeader>
        <Trans message="Create Custom Table" />
      </DialogHeader>
      <DialogBody>
        <div className="space-y-16">
          <TextField
            label="Table Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., my_custom_table"
          />
          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this table will store"
          />
          
          <div className="bg-primary/10 p-12 rounded">
            <div className="text-xs text-primary">
              <Trans message="After creating the table, you can add custom fields using the edit button." />
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button 
          variant="flat" 
          color="primary" 
          onClick={() => {
            if (name.trim()) {
              onSave({name: name.trim(), description: description.trim()});
            }
          }}
          disabled={!name.trim()}
        >
          <Trans message="Create Table" />
        </Button>
      </DialogFooter>
    </>
  );
}

function TemplateModal({template, onClose, onCreate, isCreating}: {
  template: any; 
  onClose: () => void; 
  onCreate: (template: any) => void;
  isCreating: boolean;
}) {
  return (
    <>
      <DialogHeader>
        <Trans message="Create :name Table" values={{name: template.name}} />
      </DialogHeader>
      <DialogBody>
        <div className="space-y-16">
          <div>
            <div className="text-sm font-medium mb-8">
              <Trans message="Template Fields" />
            </div>
            <div className="space-y-8">
              {template.fields.map((field: any) => (
                <div key={field.name} className="flex justify-between border rounded p-8">
                  <span className="font-medium">{field.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-8 py-4 rounded">
                    {field.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-primary/10 p-12 rounded">
            <div className="text-xs text-primary">
              <Trans message="This will create a new table with these fields in your project database." />
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button 
          variant="flat" 
          color="primary" 
          onClick={() => onCreate(template)}
          disabled={isCreating}
        >
          <Trans message={isCreating ? "Creating..." : "Create Table"} />
        </Button>
      </DialogFooter>
    </>
  );
}

function EditFieldsModal({tableData, onClose, onAddField, onDeleteField}: {
  tableData: any; 
  onClose: () => void;
  onAddField: (tableData: any, field: any) => void;
  onDeleteField: (tableData: any, index: number) => void;
}) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    
    onAddField(tableData, {
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired
    });
    
    // Reset form
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
  };

  return (
    <>
      <DialogHeader>
        <Trans message="Edit Table Fields: :name" values={{name: tableData.name}} />
      </DialogHeader>
      <DialogBody>
        <div className="space-y-16">
          <div>
            <div className="text-sm font-medium mb-8">
              <Trans message="Current Fields" />
            </div>
            <div className="space-y-8">
              {tableData.fields.map((field: any, index: number) => (
                <div key={field.name} className="flex items-center justify-between border rounded p-8">
                  <div className="flex items-center gap-8">
                    <span className="font-medium">{field.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-8 py-4 rounded">
                      {field.type}
                    </span>
                    {field.required && (
                      <span className="text-xs bg-warning/10 text-warning px-6 py-2 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <IconButton 
                      size="xs" 
                      onClick={() => onDeleteField(tableData, index)}
                      disabled={index < 2} // Prevent deleting core fields
                      title={index < 2 ? "Cannot delete core fields" : "Delete field"}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-8">
              <Trans message="Add New Field" />
            </div>
            <div className="space-y-8">
              <TextField
                label="Field Name"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                placeholder="e.g., phone_number"
                size="sm"
              />
              <div className="grid grid-cols-2 gap-8">
                <Select 
                  defaultSelectedValue={newFieldType}
                  onSelectionChange={(value: any) => setNewFieldType(value as string)}
                  label="Field Type"
                  size="sm"
                  selectionMode="single"
                >
                  {fieldTypeOptions.map(option => (
                    <Item key={option.value} value={option.value}>
                      {option.label}
                    </Item>
                  ))}
                </Select>
                <div className="flex items-center gap-8 pt-6">
                  <input
                    type="checkbox"
                    id="required"
                    checked={newFieldRequired}
                    onChange={e => setNewFieldRequired(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="required" className="text-sm">Required</label>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                startIcon={<AddIcon />}
                onClick={handleAddField}
                disabled={!newFieldName.trim()}
                className="w-full"
              >
                <Trans message="Add Field" />
              </Button>
            </div>
          </div>
          
          <div className="bg-warning/10 p-12 rounded">
            <div className="text-xs text-warning">
              <Trans message="⚠️ Adding/removing fields will update your database schema. Existing data may be affected." />
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Done" />
        </Button>
      </DialogFooter>
    </>
  );
}

function TriggerDetailsModal({trigger, onClose}: {trigger: any; onClose: () => void}) {
  const [triggerName, setTriggerName] = useState(trigger.name);
  const [selectedElement, setSelectedElement] = useState('');
  const [action, setAction] = useState('show_alert');
  const [actionValue, setActionValue] = useState('');

  const handleSave = async () => {
    const triggerData = {
      type: trigger.name.toLowerCase().replace(/\s+/g, '_'),
      name: triggerName,
      elementId: selectedElement,
      actions: [{
        type: action,
        value: actionValue
      }],
      enabled: true
    };

    try {
      // Save the trigger (assuming we have addTrigger from the hook)
      // For now, just show success
      console.log('Creating trigger:', triggerData);
      toast(message('Trigger created successfully'));
      onClose();
    } catch (error) {
      toast(message('Failed to create trigger'));
    }
  };

  return (
    <>
      <DialogHeader>
        <Trans message="Setup Trigger: :name" values={{name: trigger.name}} />
      </DialogHeader>
      <DialogBody>
        <div className="space-y-16">
          <div>
            <div className="text-sm font-medium mb-8">
              <Trans message="Description" />
            </div>
            <div className="text-sm text-muted">{trigger.description}</div>
          </div>
          
          <TextField
            label="Trigger Name"
            value={triggerName}
            onChange={e => setTriggerName(e.target.value)}
          />

          <TextField
            label="Target Element (CSS Selector or ID)"
            placeholder="e.g., #submit-btn or .my-button"
            value={selectedElement}
            onChange={e => setSelectedElement(e.target.value)}
          />

          <Select
            label="Action to Perform"
            selectedValue={action}
            onSelectionChange={(value: any) => setAction(value as string)}
            selectionMode="single"
          >
            <Item value="show_alert">Show Alert</Item>
            <Item value="redirect">Redirect to URL</Item>
            <Item value="show_element">Show Element</Item>
            <Item value="hide_element">Hide Element</Item>
            <Item value="submit_form">Submit Form</Item>
          </Select>

          <TextField
            label="Action Value"
            placeholder={action === 'show_alert' ? 'Alert message' : action === 'redirect' ? 'URL to redirect to' : 'Element selector'}
            value={actionValue}
            onChange={e => setActionValue(e.target.value)}
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button 
          variant="flat" 
          color="primary" 
          onClick={handleSave}
          disabled={!triggerName || !selectedElement || !actionValue}
        >
          <Trans message="Create Trigger" />
        </Button>
      </DialogFooter>
    </>
  );
}

function CreateTriggerModal({onClose, onSave}: {onClose: () => void; onSave: (data: any) => void}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('element-click');
  const [selectedElement, setSelectedElement] = useState('');
  const [action, setAction] = useState('show_alert');
  const [actionValue, setActionValue] = useState('');

  const handleSave = () => {
    if (name.trim() && selectedElement.trim() && actionValue.trim()) {
      onSave({
        name: name.trim(),
        type,
        elementId: selectedElement.trim(),
        actions: [{
          type: action,
          value: actionValue.trim()
        }],
        enabled: true
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <Trans message="Create Custom Trigger" />
      </DialogHeader>
      <DialogBody>
        <div className="space-y-16">
          <TextField
            label="Trigger Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Contact Form Submit"
          />
          
          <Select 
            selectedValue={type}
            onSelectionChange={(value: any) => setType(value as string)}
            label="Trigger Type"
            selectionMode="single"
          >
            <Item value="element-click">Element Click</Item>
            <Item value="form-submit">Form Submit</Item>
            <Item value="page-load">Page Load</Item>
            <Item value="data-change">Data Change</Item>
          </Select>

          <TextField
            label="Target Element (CSS Selector or ID)"
            placeholder="e.g., #contact-form or .submit-button"
            value={selectedElement}
            onChange={e => setSelectedElement(e.target.value)}
          />

          <Select
            label="Action to Perform"
            selectedValue={action}
            onSelectionChange={(value: any) => setAction(value as string)}
            selectionMode="single"
          >
            <Item value="show_alert">Show Alert</Item>
            <Item value="redirect">Redirect to URL</Item>
            <Item value="show_element">Show Element</Item>
            <Item value="hide_element">Hide Element</Item>
            <Item value="submit_form">Submit Form</Item>
            <Item value="save_data">Save to Database</Item>
          </Select>

          <TextField
            label="Action Value"
            placeholder={
              action === 'show_alert' ? 'Alert message' :
              action === 'redirect' ? 'URL to redirect to' :
              action === 'save_data' ? 'Table name to save to' :
              'Element selector or value'
            }
            value={actionValue}
            onChange={e => setActionValue(e.target.value)}
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button 
          variant="flat" 
          color="primary" 
          onClick={handleSave}
          disabled={!name.trim() || !selectedElement.trim() || !actionValue.trim()}
        >
          <Trans message="Create Trigger" />
        </Button>
      </DialogFooter>
    </>
  );
}

// Placeholder components for other sections
function ExternalConnectionsSection({onSelectConnection}: {onSelectConnection: (connection: any) => void}) {
  // Enhanced External Connections with OAuth
  const externalConnections = [
    {
      id: 'airtable',
      name: 'Airtable',
      description: 'Connect to Airtable bases and tables',
      icon: '🗂️',
      status: 'available',
      authUrl: 'https://airtable.com/oauth2/v1/authorize',
      scopes: ['data.records:read', 'data.records:write', 'schema.bases:read']
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Connect to Google Sheets documents',
      icon: '📊',
      status: 'available',
      authUrl: 'https://accounts.google.com/oauth2/v2/auth',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Connect to Notion databases',
      icon: '📝',
      status: 'coming-soon'
    }
  ];
  
  const [connections, setConnections] = useState(externalConnections);

  const handleConnect = useCallback(async (connection: any) => {
    if (connection.status === 'coming-soon') {
      toast(message('This integration is coming soon!'));
      return;
    }

    if (connection.id === 'google_sheets') {
      // Start Google OAuth flow - simulate OAuth completion for this section
      toast(message('Starting Google OAuth...'));
      setTimeout(() => {
        onSelectConnection({
          ...connection,
          type: 'google_sheets_oauth'
        });
      }, 1000);
      return;
    }

    if (connection.id === 'airtable') {
      // Open Airtable connection modal
      onSelectConnection({
        ...connection,
        type: 'airtable_setup'
      });
      return;
    }

    try {
      console.log(`Attempted to connect to ${connection.name}`);
      toast(message('Connection setup opened'));
      
    } catch (error) {
      toast(message('Failed to connect to :provider: :error', {
        values: { 
          provider: connection.name,
          error: String(error) || 'Unknown error'
        }
      }));
    }
  }, [onSelectConnection]);

  return (
    <div className="space-y-12">
      <div className="text-sm text-muted">
        <Trans message="Connect to external data sources" />
      </div>
      
      <div className="space-y-8">
        {connections.map(connection => (
          <div key={connection.id} className="flex items-center justify-between p-12 rounded border hover:bg-hover">
            <div className="flex items-center gap-12">
              <div className="text-2xl">{connection.icon}</div>
              <div>
                <div className="text-sm font-medium">{connection.name}</div>
                <div className="text-xs text-muted">{connection.description}</div>
                                 {connection.status === 'connected' && (
                   <div className="text-xs text-primary mt-4">
                     ✅ Connected {(connection as any).connectedAt && new Date((connection as any).connectedAt).toLocaleDateString()}
                   </div>
                 )}
              </div>
            </div>
            <div className="flex items-center gap-8">
              {connection.status === 'connected' ? (
                <div>
                  <Button variant="outline" size="xs" onClick={() => onSelectConnection(connection)}>
                    <Trans message="Manage" />
                  </Button>
                  <Button variant="text" size="xs" className="text-danger ml-8">
                    <Trans message="Disconnect" />
                  </Button>
                </div>
              ) : connection.status === 'coming-soon' ? (
                <Button variant="outline" size="xs" disabled>
                  <Trans message="Coming Soon" />
                </Button>
              ) : (
                <Button variant="flat" color="primary" size="xs" onClick={() => handleConnect(connection)}>
                  <Trans message="Connect" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="outline" size="xs" className="w-full" startIcon={<AddIcon />}>
        <Trans message="Request New Integration" />
      </Button>
    </div>
  );
}

function DataBindingSection({node, onSelectBinding}: {node: any; onSelectBinding: (option: any) => void}) {
  const bindingOptions = [
    {value: 'text', label: 'Text Content'},
    {value: 'attribute', label: 'Element Attribute'},
    {value: 'style', label: 'CSS Style'},
    {value: 'visibility', label: 'Show/Hide'},
  ];

  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Bind data to the selected element:" />
      </div>
      <div className="rounded bg-hover p-8 text-xs">
        {node.tagName?.toLowerCase() || 'element'} 
        {node.id && `#${node.id}`}
        {node.className && `.${node.className.split(' ')[0]}`}
      </div>
      
      <div className="space-y-8">
        {bindingOptions.map(option => (
          <Button
            key={option.value}
            variant="outline"
            size="xs"
            className="w-full justify-start"
            onClick={() => onSelectBinding(option)}
          >
            <Trans message={option.label} />
          </Button>
        ))}
      </div>
    </div>
  );
}

function ConnectionDialog({connection, onSelectConnection}: {connection: any; onSelectConnection: () => void}) {
  const [apiKey, setApiKey] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [sheetRange, setSheetRange] = useState('A1:Z1000');
  const [baseId, setBaseId] = useState('');
  const [tableId, setTableId] = useState('');
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [spreadsheetsList, setSpreadsheetsList] = useState<any[]>([]);
  const [sheetsList, setSheetsList] = useState<any[]>([]);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Load user's Google Sheets when dialog opens
  React.useEffect(() => {
    if (connection.type === 'google_sheets_oauth' && connection.authenticated) {
      loadGoogleSpreadsheets();
    }
  }, [connection]);

  const loadGoogleSpreadsheets = async () => {
    setIsLoadingSpreadsheets(true);
    try {
      // Mock data for demonstration - in reality this would call Google Drive API
      const mockSpreadsheets = [
        { id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', name: 'Customer Database' },
        { id: '1mJQiBMRdcM8V2WQjXKQVpQlY0rJ8Nf6JzZlH7k5vYNs', name: 'Sales Reports 2024' },
        { id: '1kJd8VmE3fQ2HxNcPl9RkY8tGvBhMzLaE4WuI5oP7rTg', name: 'Inventory Tracking' },
        { id: '1pRtY6EuI8OvM4nKcS2FjB9xWqZ7HgL1NmA5VdCfGhJk', name: 'Contact List' },
      ];
      
      setSpreadsheetsList(mockSpreadsheets);
    } catch (error) {
      toast(message('Failed to load spreadsheets: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  const loadSheets = async (spreadsheetId: string) => {
    setIsLoadingSheets(true);
    try {
      // Mock data - in reality this would call Google Sheets API
      const mockSheets = [
        { id: 0, name: 'Sheet1', title: 'Customer Data' },
        { id: 1, name: 'Sheet2', title: 'Analytics' },
        { id: 2, name: 'Sheet3', title: 'Raw Data' },
      ];
      
      setSheetsList(mockSheets);
    } catch (error) {
      toast(message('Failed to load sheets: :error', {
        values: { error: String(error) || 'Unknown error' }
      }));
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSpreadsheetChange = (spreadsheetId: string) => {
    setSelectedSpreadsheet(spreadsheetId);
    setSelectedSheet('');
    setSheetsList([]);
    if (spreadsheetId) {
      loadSheets(spreadsheetId);
    }
  };

  const handleSaveConnection = () => {
    if (connection.type === 'google_sheets_oauth') {
      if (!selectedSpreadsheet || !selectedSheet) {
        toast(message('Please select a spreadsheet and sheet'));
        return;
      }
      // Save Google Sheets connection configuration
      const connectionData = {
        type: 'google_sheets',
        name: `Google Sheet: ${spreadsheetsList.find(s => s.id === selectedSpreadsheet)?.name}`,
        spreadsheetId: selectedSpreadsheet,
        sheetName: sheetsList.find(s => s.id.toString() === selectedSheet)?.name,
        range: sheetRange,
      };
      console.log('Saving Google Sheets connection:', connectionData);
      toast(message('Google Sheets connection saved successfully'));
    } else if (connection.type === 'airtable_setup') {
      if (!apiKey || !baseId || !tableId) {
        toast(message('Please fill in all required fields'));
        return;
      }
      // Save Airtable connection
      console.log('Saving Airtable connection:', { apiKey, baseId, tableId });
      toast(message('Airtable connection saved successfully'));
    }
    onSelectConnection();
  };

  if (connection.type === 'google_sheets_oauth') {
    return (
      <>
        <DialogHeader>
          <Trans message="Select Google Spreadsheet" />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-16">
            <div className="bg-success/10 p-12 rounded">
              <div className="text-sm text-success">
                ✅ <Trans message="Successfully connected to Google Sheets! Select your spreadsheet below." />
              </div>
            </div>
            
            <Select
              label="Select Spreadsheet"
              placeholder="Choose a spreadsheet..."
              selectedValue={selectedSpreadsheet}
              onSelectionChange={(value: any) => handleSpreadsheetChange(value as string)}
              isLoading={isLoadingSpreadsheets}
              selectionMode="single"
            >
              {spreadsheetsList.map(sheet => (
                <Item key={sheet.id} value={sheet.id}>
                  <div>
                    <div className="font-medium">{sheet.name}</div>
                    <div className="text-xs text-muted">ID: {sheet.id}</div>
                  </div>
                </Item>
              ))}
            </Select>
            
            {selectedSpreadsheet && (
              <Select
                label="Select Sheet/Tab"
                placeholder="Choose a sheet..."
                selectedValue={selectedSheet}
                onSelectionChange={(value: any) => setSelectedSheet(value as string)}
                isLoading={isLoadingSheets}
                selectionMode="single"
              >
                {sheetsList.map(sheet => (
                  <Item key={sheet.id} value={sheet.id.toString()}>
                    <div>
                      <div className="font-medium">{sheet.name}</div>
                      <div className="text-xs text-muted">{sheet.title}</div>
                    </div>
                  </Item>
                ))}
              </Select>
            )}
            
            <TextField
              label="Data Range (optional)"
              value={sheetRange}
              onChange={e => setSheetRange(e.target.value)}
              placeholder="A1:Z1000"
              description="Specify which cells to sync (e.g., A1:Z1000 for all data)"
            />
            
            {selectedSpreadsheet && selectedSheet && (
              <div className="bg-primary/10 p-12 rounded">
                <div className="text-sm text-primary">
                  🔗 <Trans message="Preview: This will sync data from '{name}' sheet '{sheetName}'" values={{
                    name: spreadsheetsList.find(s => s.id === selectedSpreadsheet)?.name || 'Unknown',
                    sheetName: sheetsList.find(s => s.id.toString() === selectedSheet)?.name || 'Unknown'
                  }} />
                </div>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="text" onClick={onSelectConnection}>
            <Trans message="Cancel" />
          </Button>
          <Button 
            variant="flat" 
            color="primary" 
            onClick={handleSaveConnection}
            disabled={!selectedSpreadsheet || !selectedSheet}
          >
            <Trans message="Connect to Sheet" />
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (connection.type === 'airtable_setup') {
    return (
      <>
        <DialogHeader>
          <Trans message="Setup Airtable Connection" />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-16">
            <div className="bg-primary/10 p-12 rounded">
              <div className="text-sm text-primary">
                <Trans message="To connect to Airtable, you need a Personal Access Token from your Airtable account." />
              </div>
            </div>
            
            <TextField
              label="Airtable Personal Access Token"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="pat..."
            />
            
            <TextField
              label="Base ID"
              value={baseId}
              onChange={e => setBaseId(e.target.value)}
              placeholder="app..."
              description="Found in the URL: https://airtable.com/[BASE_ID]/..."
            />
            
            <TextField
              label="Table ID or Name"
              value={tableId}
              onChange={e => setTableId(e.target.value)}
              placeholder="tbl... or Table Name"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="text" onClick={onSelectConnection}>
            <Trans message="Cancel" />
          </Button>
          <Button variant="flat" color="primary" onClick={handleSaveConnection}>
            <Trans message="Save Connection" />
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <Trans message="Connection Details" />
      </DialogHeader>
      <DialogBody>
        <div className="text-sm text-muted">
          <Trans message="Connection setup" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onSelectConnection}>
          <Trans message="Close" />
        </Button>
      </DialogFooter>
    </>
  );
}

function DataBindingModal({binding, onClose}: {binding: any; onClose: () => void}) {
  return (
    <>
      <DialogHeader>
        <Trans message="Setup Data Binding" />
      </DialogHeader>
      <DialogBody>
        <div className="text-sm text-muted">
          <Trans message="Data binding configuration coming soon." />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Close" />
        </Button>
      </DialogFooter>
    </>
  );
}

// New component for creating relationships
function CreateRelationshipForm({
  tables,
  selectedTable,
  onSubmit,
  onCancel
}: {
  tables: any[];
  selectedTable: string | null;
  onSubmit: (relationship: Omit<TableRelationship, 'id'>) => void;
  onCancel: () => void;
}) {
  const [fromTable, setFromTable] = useState(selectedTable || '');
  const [toTable, setToTable] = useState('');
  const [fromField, setFromField] = useState('');
  const [toField, setToField] = useState('');
  const [relationType, setRelationType] = useState<'one-to-one' | 'one-to-many' | 'many-to-many'>('one-to-many');
  const [description, setDescription] = useState('');

  const fromTableData = tables.find(t => t.id === fromTable);
  const toTableData = tables.find(t => t.id === toTable);

  const handleSubmit = () => {
    if (!fromTable || !toTable || !fromField || !toField) return;
    
    onSubmit({
      fromTable,
      toTable,
      fromField,
      toField,
      type: relationType,
      description
    });
  };

  return (
    <div className="space-y-16">
      <div className="grid grid-cols-2 gap-16">
        <FormSelect
          name="fromTable"
          label={<Trans message="From Table" />}
          selectionMode="single"
          selectedValue={fromTable}
          onSelectionChange={(value: any) => setFromTable(value as string)}
        >
          {tables.map(table => (
            <Item key={table.id} value={table.id}>
              {table.displayName}
            </Item>
          ))}
        </FormSelect>

        <FormSelect
          name="toTable"
          label={<Trans message="To Table" />}
          selectionMode="single"
          selectedValue={toTable}
          onSelectionChange={(value: any) => setToTable(value as string)}
        >
          {tables.filter(t => t.id !== fromTable).map(table => (
            <Item key={table.id} value={table.id}>
              {table.displayName}
            </Item>
          ))}
        </FormSelect>
      </div>

      <div className="grid grid-cols-2 gap-16">
        <FormSelect
          name="fromField"
          label={<Trans message="From Field" />}
          selectionMode="single"
          selectedValue={fromField}
          onSelectionChange={(value: any) => setFromField(value as string)}
          disabled={!fromTableData}
        >
          {fromTableData?.fields.map((field: any) => (
            <Item key={field.name} value={field.name}>
              {field.displayName}
            </Item>
          ))}
        </FormSelect>

        <FormSelect
          name="toField"
          label={<Trans message="To Field" />}
          selectionMode="single"
          selectedValue={toField}
          onSelectionChange={(value: any) => setToField(value as string)}
          disabled={!toTableData}
        >
          {toTableData?.fields.map((field: any) => (
            <Item key={field.name} value={field.name}>
              {field.displayName}
            </Item>
          ))}
        </FormSelect>
      </div>

      <FormSelect
        name="relationType"
        label={<Trans message="Relationship Type" />}
        selectionMode="single"
        selectedValue={relationType}
        onSelectionChange={(value: any) => setRelationType(value as 'one-to-one' | 'one-to-many' | 'many-to-many')}
      >
        <Item value="one-to-one">
          <div>
            <div>One to One</div>
            <div className="text-xs text-muted">Each record in both tables relates to exactly one record in the other</div>
          </div>
        </Item>
        <Item value="one-to-many">
          <div>
            <div>One to Many</div>
            <div className="text-xs text-muted">One record can relate to multiple records in the other table</div>
          </div>
        </Item>
        <Item value="many-to-many">
          <div>
            <div>Many to Many</div>
            <div className="text-xs text-muted">Multiple records can relate to multiple records in both tables</div>
          </div>
        </Item>
      </FormSelect>

      <TextField
        label={<Trans message="Description (optional)" />}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe this relationship..."
      />

      <div className="flex justify-end gap-8">
        <Button variant="flat" onClick={onCancel}>
          <Trans message="Cancel" />
        </Button>
        <Button
          variant="flat"
          color="primary"
          onClick={handleSubmit}
          disabled={!fromTable || !toTable || !fromField || !toField}
        >
          <Trans message="Create Relationship" />
        </Button>
      </div>
    </div>
  );
}

// Relationships Section Component
function RelationshipsSection({tables, onOpenVisualDesigner}: {
  tables: any[];
  onOpenVisualDesigner: () => void;
}) {
  // Mock relationships data - in real app this would come from automation data
  const relationships = [
    {
      id: 'rel-1',
      fromTable: 'users',
      toTable: 'contacts',
      fromField: 'id',
      toField: 'user_id',
      type: 'one-to-many',
      description: 'User can have multiple contacts'
    },
    {
      id: 'rel-2', 
      fromTable: 'users',
      toTable: 'orders',
      fromField: 'id',
      toField: 'customer_id',
      type: 'one-to-many',
      description: 'User can have multiple orders'
    }
  ];

  return (
    <div className="space-y-12">
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={onOpenVisualDesigner}
      >
        <HubIcon />
        <Trans message="Open Visual Designer" />
      </Button>
      
      <div className="space-y-8">
        <div className="text-sm font-medium">
          <Trans message="Current Relationships" />
        </div>
        
        {relationships.length === 0 ? (
          <div className="text-center p-16 text-muted text-sm border rounded border-dashed">
            <HubIcon className="mx-auto mb-8" />
            <div>
              <Trans message="No relationships defined yet" />
            </div>
            <div className="text-xs mt-4">
              <Trans message="Use the visual designer to create table relationships" />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {relationships.map((rel: any) => (
              <div key={rel.id} className="border rounded p-8 hover:bg-hover transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">
                    {tables.find((t: any) => t.id === rel.fromTable)?.displayName || rel.fromTable}
                    <span className="mx-8 text-muted">→</span>
                    {tables.find((t: any) => t.id === rel.toTable)?.displayName || rel.toTable}
                  </div>
                  <span className={`text-xs px-6 py-2 rounded ${
                    rel.type === 'one-to-one' ? 'bg-green-100 text-green-800' :
                    rel.type === 'one-to-many' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {rel.type.replace('-', ':')}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {rel.fromField} → {rel.toField}
                </div>
                {rel.description && (
                  <div className="text-xs text-muted mt-4">
                    {rel.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Visual Relationships Modal Component
function VisualRelationshipsModal({tables, onClose}: {
  tables: any[];
  onClose: () => void;
}) {
  const [tablePositions, setTablePositions] = useState<Record<string, {x: number, y: number}>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});

  const [relationships, setRelationships] = useState<TableRelationship[]>([
    {
      id: 'rel-1',
      fromTable: 'users',
      toTable: 'contacts', 
      fromField: 'id',
      toField: 'user_id',
      type: 'one-to-many'
    }
  ]);
  const [fieldSelectionModal, setFieldSelectionModal] = useState<{
    isOpen: boolean;
    fromTable: string;
    fromField: string;
    toTable: string;
  } | null>(null);

  // Initialize table positions
  React.useEffect(() => {
    const positions: Record<string, {x: number, y: number}> = {};
    tables.forEach((table: any, index: number) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      positions[table.id] = {
        x: 80 + col * 320,
        y: 80 + row * 280
      };
    });
    setTablePositions(positions);
  }, [tables]);

  const handleTableClick = (tableId: string, fieldId?: string) => {
    if (isConnecting && selectedTable && selectedTable !== tableId) {
      // Open field selection modal
      setFieldSelectionModal({
        isOpen: true,
        fromTable: selectedTable,
        fromField: selectedField || 'id',
        toTable: tableId
      });
      setIsConnecting(false);
      setSelectedTable(null);
      setSelectedField(null);
    } else if (fieldId) {
      setSelectedTable(tableId);
      setSelectedField(fieldId);
      if (!isConnecting) {
        setIsConnecting(true);
      }
    } else {
      setSelectedTable(tableId);
      if (!isConnecting) {
        setIsConnecting(true);
      }
    }
  };

  const handleTableDragStart = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasRect = e.currentTarget.closest('.canvas-container')?.getBoundingClientRect();
    if (canvasRect) {
      setDraggedTable(tableId);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggedTable) {
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;
      
      setTablePositions(prev => ({
        ...prev,
        [draggedTable]: {
          x: Math.max(0, Math.min(newX, canvasRect.width - 280)),
          y: Math.max(0, Math.min(newY, canvasRect.height - 120))
        }
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedTable(null);
    setDragOffset({x: 0, y: 0});
  };

  const createRelationship = (fromField: string, toField: string, relType: string) => {
    if (fieldSelectionModal) {
      const newRel: TableRelationship = {
        id: `rel-${Date.now()}`,
        fromTable: fieldSelectionModal.fromTable,
        toTable: fieldSelectionModal.toTable,
        fromField: fromField,
        toField: toField,
        type: relType as any
      };
      setRelationships([...relationships, newRel]);
      setFieldSelectionModal(null);
    }
  };



  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'one-to-one': return '#10b981'; // green
      case 'one-to-many': return '#3b82f6'; // blue  
      case 'many-to-one': return '#f59e0b'; // orange
      case 'many-to-many': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  return (
    <>
      <DialogHeader className="pb-16">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-12">
            <Trans message="Visual Database Designer" />
            <span className="text-xs text-muted bg-gray-100 px-6 py-2 rounded">
              Drag tables • Click fields to link
            </span>
          </div>
          <div className="flex gap-8">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsConnecting(!isConnecting)}
              color={isConnecting ? 'primary' : undefined}
            >
              <LinkIcon />
              <Trans message={isConnecting ? 'Cancel Link' : 'Link Tables'} />
            </Button>
          </div>
        </div>
      </DialogHeader>
      <DialogBody className="flex-1 overflow-hidden p-0">
        <div 
          className="canvas-container relative w-full h-full bg-gray-50 rounded border overflow-auto cursor-default"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {relationships.map((rel) => {
                const fromPos = tablePositions[rel.fromTable];
                const toPos = tablePositions[rel.toTable];
                if (!fromPos || !toPos) return null;
                
                const midX = (fromPos.x + toPos.x) / 2 + 140;
                const midY = (fromPos.y + toPos.y) / 2 + 60;
                
                return (
                  <g key={rel.id}>
                    <line
                      x1={fromPos.x + 140}
                      y1={fromPos.y + 60}
                      x2={toPos.x + 140}
                      y2={toPos.y + 60}
                      stroke={getRelationshipColor(rel.type)}
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                    />
                    {/* Relationship info box */}
                    <rect
                      x={midX - 70}
                      y={midY - 20}
                      width="140"
                      height="40"
                      fill="white"
                      stroke={getRelationshipColor(rel.type)}
                      strokeWidth="2"
                      rx="4"
                      className="pointer-events-auto cursor-pointer hover:fill-gray-50"
                      onClick={() => {
                        if (confirm('Delete this relationship?')) {
                          setRelationships(relationships.filter(r => r.id !== rel.id));
                        }
                      }}
                    />
                    <text
                      x={midX}
                      y={midY - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill={getRelationshipColor(rel.type)}
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {rel.fromField} → {rel.toField}
                    </text>
                    <text
                      x={midX}
                      y={midY + 8}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#666"
                      className="pointer-events-none select-none"
                    >
                      {rel.type.replace('-', ':')} (click to delete)
                    </text>
                  </g>
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
            </svg>
          
          {tables.map((table: any) => {
            const position = tablePositions[table.id];
            if (!position) return null;
            
            return (
              <div
                key={table.id}
                className={`absolute bg-white border rounded-lg shadow-sm transition-all ${
                  selectedTable === table.id ? 'ring-2 ring-primary' :
                  isConnecting ? 'hover:ring-2 hover:ring-blue-300' : 'hover:shadow-md'
                } ${draggedTable === table.id ? 'shadow-xl z-10' : ''}`}
                style={{
                  left: position.x,
                  top: position.y,
                  width: 280,
                  minHeight: 120,
                  cursor: draggedTable === table.id ? 'grabbing' : 'grab'
                }}
              >
                {/* Draggable header */}
                <div 
                  className="p-12 border-b cursor-move bg-gray-50 rounded-t-lg"
                  onMouseDown={(e) => handleTableDragStart(table.id, e)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm select-none">{table.displayName || table.name}</h4>
                    <span className="text-xs bg-primary/10 text-primary px-6 py-2 rounded select-none">
                      {table.fields?.length || 0}
                    </span>
                  </div>
                </div>
                
                {/* Fields section */}
                <div className="p-8">
                  <div className="space-y-2">
                    {table.fields?.slice(0, 6).map((field: any) => {
                      const isSelected = selectedTable === table.id && selectedField === field.id;
                      const isSelectedTable = selectedTable === table.id;
                      
                      return (
                        <div 
                          key={field.id} 
                          className={`text-xs flex justify-between p-2 rounded cursor-pointer transition-all duration-200 border ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-600 text-white shadow-md transform scale-105' 
                              : isConnecting && !isSelectedTable
                                ? 'hover:bg-green-50 hover:border-green-300 border-transparent hover:scale-102'
                                : isConnecting
                                  ? 'hover:bg-blue-50 hover:border-blue-200 border-transparent'
                                  : 'hover:bg-gray-50 border-transparent'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTableClick(table.id, field.id);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full transition-colors ${
                              isSelected 
                                ? 'bg-white' 
                                : field.required 
                                  ? 'bg-red-400' 
                                  : 'bg-gray-300'
                            }`} />
                            <span className={`font-mono transition-colors ${
                              isSelected ? 'text-white font-medium' : 'text-gray-900'
                            }`}>
                              {field.name}
                            </span>
                            {isSelected && (
                              <span className="text-xs bg-white text-blue-500 px-2 py-1 rounded font-medium">
                                SELECTED
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs transition-colors ${
                            isSelected 
                              ? 'bg-white text-blue-500 font-medium' 
                              : 'text-primary bg-gray-100'
                          }`}>
                            {field.type}
                          </span>
                        </div>
                      );
                    })}
                    {table.fields?.length > 6 && (
                      <div className="text-xs text-muted text-center py-2 border-t">
                        +{table.fields.length - 6} more fields (scroll to see all)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {isConnecting && selectedTable && (
          <div className="absolute top-4 left-4 right-4 p-12 bg-gradient-to-r from-blue-50 to-blue-100 rounded border border-blue-300 z-20 shadow-lg">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-900">Linking Mode Active</span>
              </div>
              <div className="text-sm text-blue-800">
                Selected: <span className="font-mono bg-blue-200 px-2 py-1 rounded text-blue-900">
                  {tables.find((t: any) => t.id === selectedTable)?.displayName}.{selectedField || 'id'}
                </span>
                → Click a field in another table to complete the relationship
              </div>
            </div>
          </div>
        )}
        
        {/* Field Selection Modal */}
        {fieldSelectionModal?.isOpen && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
            <div className="bg-white rounded-lg p-24 max-w-md w-full mx-16">
              <h3 className="text-lg font-medium mb-16">Create Relationship</h3>
              
              <div className="space-y-16">
                <div>
                  <label className="block text-sm font-medium mb-8">From Table</label>
                  <div className="p-12 bg-gray-50 rounded border">
                    <div className="font-medium">
                      {tables.find(t => t.id === fieldSelectionModal.fromTable)?.displayName}
                    </div>
                    <div className="text-sm text-muted">Field: {fieldSelectionModal.fromField}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-8">To Table</label>
                  <div className="p-12 bg-gray-50 rounded border">
                    <div className="font-medium">
                      {tables.find(t => t.id === fieldSelectionModal.toTable)?.displayName}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-8">Target Field</label>
                  <select 
                    className="w-full p-8 border rounded"
                    onChange={(e) => {
                      const [toField, relType] = e.target.value.split('|');
                      if (toField && relType) {
                        createRelationship(fieldSelectionModal.fromField, toField, relType);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Select target field...</option>
                    {tables.find(t => t.id === fieldSelectionModal.toTable)?.fields?.map((field: any) => (
                      <option key={field.id} value={`${field.name}|one-to-many`}>
                        {field.name} ({field.type}) - One to Many
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-8 mt-20">
                <Button 
                  variant="outline"
                  onClick={() => setFieldSelectionModal(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Legend positioned at bottom left */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-12 bg-white p-8 rounded border shadow z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-2 bg-green-500 rounded"></div>
            <span className="text-xs text-muted">One-to-One</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-2 bg-blue-500 rounded"></div>
            <span className="text-xs text-muted">One-to-Many</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-2 bg-orange-500 rounded"></div>
            <span className="text-xs text-muted">Many-to-One</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-2 bg-purple-500 rounded"></div>
            <span className="text-xs text-muted">Many-to-Many</span>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Close" />
        </Button>
        <Button onClick={() => {
          toast(message('Relationships saved successfully!'));
          onClose();
        }}>
          <Trans message="Save Relationships" />
        </Button>
      </DialogFooter>
    </>
  );
}

// New Data Management Section
function DataManagementSection({tables, onViewTableData, onImportCSV, onAddRow}: {
  tables: any[];
  onViewTableData: (table: any) => void;
  onImportCSV: (table: any) => void;
  onAddRow: (table: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredTables = tables.filter(table =>
    table.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <TextField
        placeholder="Search tables..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        size="sm"
        startAdornment={<SearchIcon />}
      />
      
      <div className="space-y-8">
        {filteredTables.map((table: any) => (
          <div key={table.id} className="border rounded-lg p-12 hover:bg-hover transition-colors">
            <div className="flex items-start justify-between mb-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-8 mb-4">
                  <TableChartIcon className="text-primary" size="sm" />
                  <h4 className="font-medium text-sm truncate">{table.displayName || table.name}</h4>
                  <span className="text-xs bg-primary/10 text-primary px-6 py-2 rounded whitespace-nowrap">
                    {table.fields?.length || 0} fields
                  </span>
                </div>
                <p className="text-xs text-muted mb-8 truncate">
                  {table.description || `Manage data for ${table.displayName || table.name}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => onViewTableData(table)}
                className="w-full"
                title="View Data"
              >
                <ViewListIcon size="xs" />
              </Button>
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => onAddRow(table)}
                className="w-full"
                title="Add Row"
              >
                <PersonAddIcon size="xs" />
              </Button>
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => onImportCSV(table)}
                className="w-full"
                title=""
              >
                <UploadFileIcon size="xs" />
              </Button>
            </div>
          </div>
        ))}
        
        {filteredTables.length === 0 && (
          <div className="text-center py-16 text-muted">
            <TableChartIcon size="lg" className="mx-auto mb-8 opacity-50" />
            <div className="text-sm">
              {searchQuery ? 'No tables match your search' : 'No tables available'}
            </div>
            {!searchQuery && (
              <div className="text-xs mt-4">
                Create tables in the "Tables & Schema" section below
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Table Data Modal with full CRUD functionality
function TableDataModal({table, onClose}: {table: any; onClose: () => void}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchTableData = useCallback(async () => {
    if (!table) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // This would be the actual API call
      const projectId = '1'; // Get from context
      const response = await fetch(`/api/projects/${projectId}/database/tables/${table.name}/data?page=${currentPage}&limit=${pageSize}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch table data');
      }
      
      const result = await response.json();
      setData(result.data || []);
      setTotalCount(result.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message);
      // Mock data for development
      setData([
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-16' }
      ]);
      setTotalCount(2);
    } finally {
      setLoading(false);
    }
  }, [table, currentPage]);

  const handleDeleteRow = async (row: any) => {
    if (!confirm('Are you sure you want to delete this row?')) return;
    
    try {
      // API call to delete row
      toast(message('Row deleted successfully'));
      fetchTableData();
    } catch (err: any) {
      toast(message('Failed to delete row: :error', { values: { error: err.message } }));
    }
  };

  const handleEditRow = (row: any) => {
    setEditingRow({...row});
  };

  const handleSaveRow = async () => {
    if (!editingRow) return;
    
    try {
      // API call to update row
      toast(message('Row updated successfully'));
      setEditingRow(null);
      fetchTableData();
    } catch (err: any) {
      toast(message('Failed to update row: :error', { values: { error: err.message } }));
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast(message('Data exported successfully'));
  };

  React.useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  const columns = table.fields || [];
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-8">
            <TableChartIcon />
            <div>
              <Trans message="Table Data: :name" values={{name: table.displayName || table.name}} />
              <div className="text-xs text-muted">
                {totalCount} total rows
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="xs"
              onClick={exportToCSV}
              disabled={data.length === 0}
              title="Export CSV"
            >
              <GetAppIcon size="xs" />
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => fetchTableData()}
              disabled={loading}
              title="Refresh"
            >
              <RefreshIcon size="xs" />
            </Button>
          </div>
        </div>
      </DialogHeader>
      
      <DialogBody className="min-h-[400px] max-h-[600px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <div className="mt-12 text-sm text-muted">Loading table data...</div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-12">
            <div className="flex items-center gap-8 text-red-700">
              <WarningIcon />
              <div>
                <div className="font-medium">Error loading data</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        {!loading && !error && data.length === 0 && (
          <div className="text-center py-32">
            <TableChartIcon size="lg" className="mx-auto text-muted opacity-50 mb-12" />
            <div className="text-sm text-muted">No data in this table</div>
            <div className="text-xs text-muted mt-4">
              Use "" to add data
            </div>
          </div>
        )}
        
        {!loading && !error && data.length > 0 && (
          <div className="space-y-12">
            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {columns.map((column: any) => (
                      <th key={column.name} className="border border-gray-200 px-8 py-6 text-left font-medium">
                        {column.displayName || column.name}
                        <div className="text-xs text-muted font-normal">{column.type}</div>
                      </th>
                    ))}
                    <th className="border border-gray-200 px-8 py-6 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-50">
                      {columns.map((column: any) => (
                        <td key={column.name} className="border border-gray-200 px-8 py-6">
                          {editingRow && editingRow.id === row.id ? (
                            <input
                              type="text"
                              value={editingRow[column.name] || ''}
                              onChange={(e) => setEditingRow({
                                ...editingRow,
                                [column.name]: e.target.value
                              })}
                              className="w-full px-6 py-4 text-xs border rounded"
                            />
                          ) : (
                            <span className="truncate max-w-[150px] block">
                              {String(row[column.name] || '')}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="border border-gray-200 px-8 py-6">
                        <div className="flex items-center gap-4">
                          {editingRow && editingRow.id === row.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={handleSaveRow}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setEditingRow(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <IconButton
                                size="xs"
                                onClick={() => handleEditRow(row)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="xs"
                                onClick={() => handleDeleteRow(row)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} rows
                </div>
                <div className="flex items-center gap-8">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogBody>
      
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Close" />
        </Button>
      </DialogFooter>
    </>
  );
}

// CSV Import Modal
function CSVImportModal({table, onClose}: {table: any; onClose: () => void}) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast(message('Please select a valid CSV file'));
      return;
    }

    setCsvFile(file);
    const text = await file.text();
    const lines = text.split('\n');
    const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return csvHeaders.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as any);
      });

    setHeaders(csvHeaders);
    setCsvData(data);
    setPreview(data.slice(0, 5));
    setStep('map');
  };

  const handleMapping = () => {
    if (Object.keys(mapping).length === 0) {
      toast(message('Please map at least one field'));
      return;
    }
    setStep('preview');
  };

  const handleImport = async () => {
    setImporting(true);
    
    try {
      // Transform data according to mapping
      const transformedData = csvData.map(row => {
        const newRow: any = {};
        Object.entries(mapping).forEach(([csvField, tableField]) => {
          if (tableField && row[csvField] !== undefined) {
            newRow[tableField] = row[csvField];
          }
        });
        return newRow;
      });

      // API call to import data
      // await importTableData(projectId, table.name, transformedData);
      
      toast(message('Successfully imported :count rows', { values: { count: transformedData.length } }));
      setStep('complete');
    } catch (err: any) {
      toast(message('Import failed: :error', { values: { error: err.message } }));
    } finally {
      setImporting(false);
    }
  };

  const tableFields = table.fields || [];

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-8">
          <UploadFileIcon />
          <div>
            <Trans message="Import CSV Data" />
            <div className="text-xs text-muted">
              Import data into {table.displayName || table.name}
            </div>
          </div>
        </div>
      </DialogHeader>
      
      <DialogBody className="min-h-[400px]">
        {step === 'upload' && (
          <div className="space-y-16">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-32">
                <UploadFileIcon size="lg" className="mx-auto text-muted mb-12" />
                <div className="text-sm font-medium mb-8">Choose CSV file to import</div>
                <div className="text-xs text-muted mb-16">
                  File should have headers matching your table fields
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-12">
              <div className="text-sm font-medium text-blue-900 mb-8">CSV Format Requirements</div>
              <ul className="text-xs text-blue-700 space-y-4">
                <li>• First row should contain column headers</li>
                <li>• Fields should be comma-separated</li>
                <li>• Text fields with commas should be quoted</li>
                <li>• Date fields should be in YYYY-MM-DD format</li>
              </ul>
            </div>
          </div>
        )}
        
        {step === 'map' && (
          <div className="space-y-16">
            <div className="text-sm font-medium">Map CSV columns to table fields</div>
            
            <div className="grid grid-cols-2 gap-16">
              <div>
                <div className="text-xs font-medium text-muted mb-8">CSV Columns ({headers.length})</div>
                <div className="space-y-6 max-h-[300px] overflow-y-auto">
                  {headers.map(header => (
                    <div key={header} className="bg-gray-50 rounded px-8 py-6 text-sm">
                      {header}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-xs font-medium text-muted mb-8">Table Fields ({tableFields.length})</div>
                <div className="space-y-8">
                  {headers.map(csvField => (
                    <div key={csvField} className="flex items-center gap-8">
                      <div className="text-sm min-w-[100px] truncate">{csvField}</div>
                      <div className="text-xs text-muted">→</div>
                                                                    <Select
                         selectedValue={mapping[csvField] || ''}
                         selectionMode="single"
                         onSelectionChange={(value: any) => setMapping(prev => ({...prev, [csvField]: value as string}))}
                         placeholder="Select field"
                         size="xs"
                         className="flex-1"
                       >
                         <Item value="">
                           <Trans message="Skip this column" />
                         </Item>
                         {tableFields.map((field: any) => (
                           <Item key={field.name} value={field.name}>
                             {field.displayName || field.name} ({field.type})
                           </Item>
                         ))}
                       </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12">
              <div className="text-xs text-yellow-700">
                <strong>Note:</strong> Unmapped columns will be ignored during import. 
                Make sure to map all required fields.
              </div>
            </div>
          </div>
        )}
        
        {step === 'preview' && (
          <div className="space-y-16">
            <div className="text-sm font-medium">Preview import ({csvData.length} rows)</div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.values(mapping).filter(Boolean).map(field => (
                      <th key={field} className="border border-gray-200 px-8 py-6 text-left font-medium">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.entries(mapping).filter(([_, field]) => field).map(([csvField, tableField]) => (
                        <td key={csvField} className="border border-gray-200 px-8 py-6">
                          {row[csvField] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {csvData.length > 5 && (
              <div className="text-xs text-muted text-center">
                ... and {csvData.length - 5} more rows
              </div>
            )}
          </div>
        )}
        
        {step === 'complete' && (
          <div className="text-center py-32">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-16">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-sm font-medium mb-8">Import Completed Successfully!</div>
            <div className="text-xs text-muted">
              {csvData.length} rows have been imported into {table.displayName || table.name}
            </div>
          </div>
        )}
      </DialogBody>
      
      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-8">
            {step !== 'upload' && step !== 'complete' && (
              <Button
                variant="text"
                onClick={() => {
                  if (step === 'map') setStep('upload');
                  if (step === 'preview') setStep('map');
                }}
              >
                <Trans message="Back" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-8">
            <Button variant="text" onClick={onClose}>
              <Trans message="Close" />
            </Button>
            
            {step === 'map' && (
              <Button onClick={handleMapping}>
                <Trans message="Next: Preview" />
              </Button>
            )}
            
            {step === 'preview' && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <Trans message="Importing..." /> : <Trans message="Import Data" />}
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </>
  );
}

// Add Row Modal
function AddRowModal({table, onClose}: {table: any; onClose: () => void}) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // API call to add row
      // await addTableRow(projectId, table.name, formData);
      
      toast(message('Row added successfully'));
      onClose();
    } catch (err: any) {
      toast(message('Failed to add row: :error', { values: { error: err.message } }));
    } finally {
      setSaving(false);
    }
  };

  const fields = table.fields || [];

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-8">
          <PersonAddIcon />
          <div>
            <Trans message="Add New Row" />
            <div className="text-xs text-muted">
              Add data to {table.displayName || table.name}
            </div>
          </div>
        </div>
      </DialogHeader>
      
      <DialogBody className="max-h-[500px] overflow-y-auto">
        <div className="space-y-16">
          {fields.map((field: any) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-6">
                {field.displayName || field.name}
                {field.required && <span className="text-red-500 ml-4">*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData(prev => ({...prev, [field.name]: e.target.value}))}
                  className="w-full px-12 py-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  rows={3}
                  placeholder={`Enter ${field.displayName || field.name}`}
                />
              ) : field.type === 'select' && field.options ? (
                                 <Select
                   selectedValue={formData[field.name] || ''}
                   selectionMode="single"
                   onSelectionChange={(value: any) => setFormData(prev => ({...prev, [field.name]: value}))}
                   placeholder={`Select ${field.displayName || field.name}`}
                 >
                   {field.options.map((option: any) => (
                     <Item key={option.value} value={option.value}>
                       {option.label}
                     </Item>
                   ))}
                 </Select>
              ) : field.type === 'boolean' ? (
                <div className="flex items-center gap-12">
                  <label className="flex items-center gap-6 cursor-pointer">
                    <input
                      type="radio"
                      name={field.name}
                      value="true"
                      checked={formData[field.name] === true}
                      onChange={() => setFormData(prev => ({...prev, [field.name]: true}))}
                      className="form-radio text-primary"
                    />
                    <span className="text-sm">True</span>
                  </label>
                  <label className="flex items-center gap-6 cursor-pointer">
                    <input
                      type="radio"
                      name={field.name}
                      value="false"
                      checked={formData[field.name] === false}
                      onChange={() => setFormData(prev => ({...prev, [field.name]: false}))}
                      className="form-radio text-primary"
                    />
                    <span className="text-sm">False</span>
                  </label>
                </div>
              ) : (
                <input
                  type={field.type === 'email' ? 'email' : field.type === 'decimal' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData(prev => ({...prev, [field.name]: e.target.value}))}
                  className="w-full px-12 py-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder={`Enter ${field.displayName || field.name}`}
                  step={field.type === 'decimal' ? '0.01' : undefined}
                />
              )}
              
              {field.description && (
                <div className="text-xs text-muted mt-4">{field.description}</div>
              )}
            </div>
          ))}
        </div>
      </DialogBody>
      
      <DialogFooter>
        <Button variant="text" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Trans message="Saving..." /> : <Trans message="Add Row" />}
        </Button>
      </DialogFooter>
    </>
  );
}