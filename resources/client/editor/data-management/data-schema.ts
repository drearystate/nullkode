export interface DataTable {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  fields: DataField[];
  createdAt: Date;
  updatedAt: Date;
  rowCount?: number;
  isSystem?: boolean; // System tables like users, orders, etc.
}

export interface DataField {
  id: string;
  name: string;
  displayName: string;
  type: DataFieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  validation?: DataFieldValidation;
  relationship?: DataRelationship;
  options?: DataFieldOption[]; // For select/enum fields
  description?: string;
}

export type DataFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'decimal' 
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'email' 
  | 'url' 
  | 'phone' 
  | 'select' 
  | 'multiselect'
  | 'image' 
  | 'file' 
  | 'json' 
  | 'reference'; // Foreign key to another table

export interface DataFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customRule?: string;
}

export interface DataRelationship {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
  targetTable: string;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string; // For many-to-many relationships
}

export interface DataFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface DataRow {
  id: string;
  [key: string]: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataQuery {
  tableName: string;
  select?: string[];
  where?: DataCondition[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  include?: string[]; // Related tables to include
}

export interface DataCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: any;
  type?: 'and' | 'or';
}

// Pre-defined system tables that every project gets
export const SystemTables: DataTable[] = [
  {
    id: 'users',
    name: 'users',
    displayName: 'Users',
    description: 'Application users and authentication',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {
        id: 'id',
        name: 'id',
        displayName: 'ID',
        type: 'number',
        required: true,
        unique: true,
        description: 'Unique identifier'
      },
      {
        id: 'email',
        name: 'email',
        displayName: 'Email',
        type: 'email',
        required: true,
        unique: true,
        description: 'User email address'
      },
      {
        id: 'name',
        name: 'name',
        displayName: 'Name',
        type: 'text',
        required: true,
        description: 'Full name'
      },
      {
        id: 'avatar',
        name: 'avatar',
        displayName: 'Avatar',
        type: 'image',
        required: false,
        description: 'Profile picture'
      },
      {
        id: 'role',
        name: 'role',
        displayName: 'Role',
        type: 'select',
        required: true,
        defaultValue: 'user',
        options: [
          { value: 'admin', label: 'Administrator' },
          { value: 'user', label: 'User' },
          { value: 'guest', label: 'Guest' }
        ]
      },
      {
        id: 'isActive',
        name: 'is_active',
        displayName: 'Active',
        type: 'boolean',
        required: true,
        defaultValue: true
      }
    ]
  },
  {
    id: 'orders',
    name: 'orders',
    displayName: 'Orders',
    description: 'E-commerce orders and transactions',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {
        id: 'id',
        name: 'id',
        displayName: 'Order ID',
        type: 'number',
        required: true,
        unique: true
      },
      {
        id: 'userId',
        name: 'user_id',
        displayName: 'Customer',
        type: 'reference',
        required: true,
        relationship: {
          type: 'belongsTo',
          targetTable: 'users',
          foreignKey: 'user_id',
          localKey: 'id'
        }
      },
      {
        id: 'status',
        name: 'status',
        displayName: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'pending',
        options: [
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'processing', label: 'Processing', color: '#3b82f6' },
          { value: 'shipped', label: 'Shipped', color: '#8b5cf6' },
          { value: 'delivered', label: 'Delivered', color: '#10b981' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
        ]
      },
      {
        id: 'total',
        name: 'total',
        displayName: 'Total Amount',
        type: 'decimal',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'currency',
        name: 'currency',
        displayName: 'Currency',
        type: 'text',
        required: true,
        defaultValue: 'USD',
        validation: { maxLength: 3 }
      },
      {
        id: 'items',
        name: 'items',
        displayName: 'Order Items',
        type: 'json',
        required: true,
        description: 'Array of ordered items with quantities and prices'
      },
      {
        id: 'shippingAddress',
        name: 'shipping_address',
        displayName: 'Shipping Address',
        type: 'json',
        required: false
      }
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
      {
        id: 'id',
        name: 'id',
        displayName: 'Product ID',
        type: 'number',
        required: true,
        unique: true
      },
      {
        id: 'name',
        name: 'name',
        displayName: 'Product Name',
        type: 'text',
        required: true
      },
      {
        id: 'description',
        name: 'description',
        displayName: 'Description',
        type: 'textarea',
        required: false
      },
      {
        id: 'price',
        name: 'price',
        displayName: 'Price',
        type: 'decimal',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'sku',
        name: 'sku',
        displayName: 'SKU',
        type: 'text',
        required: false,
        unique: true
      },
      {
        id: 'stock',
        name: 'stock',
        displayName: 'Stock Quantity',
        type: 'number',
        required: true,
        defaultValue: 0,
        validation: { min: 0 }
      },
      {
        id: 'category',
        name: 'category',
        displayName: 'Category',
        type: 'text',
        required: false
      },
      {
        id: 'images',
        name: 'images',
        displayName: 'Product Images',
        type: 'json',
        required: false,
        description: 'Array of image URLs'
      },
      {
        id: 'isActive',
        name: 'is_active',
        displayName: 'Active',
        type: 'boolean',
        required: true,
        defaultValue: true
      }
    ]
  },
  {
    id: 'contacts',
    name: 'contacts',
    displayName: 'Contacts',
    description: 'Contact form submissions and customer inquiries',
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields: [
      {
        id: 'id',
        name: 'id',
        displayName: 'Contact ID',
        type: 'number',
        required: true,
        unique: true
      },
      {
        id: 'name',
        name: 'name',
        displayName: 'Name',
        type: 'text',
        required: true
      },
      {
        id: 'email',
        name: 'email',
        displayName: 'Email',
        type: 'email',
        required: true
      },
      {
        id: 'phone',
        name: 'phone',
        displayName: 'Phone',
        type: 'phone',
        required: false
      },
      {
        id: 'subject',
        name: 'subject',
        displayName: 'Subject',
        type: 'text',
        required: false
      },
      {
        id: 'message',
        name: 'message',
        displayName: 'Message',
        type: 'textarea',
        required: true
      },
      {
        id: 'status',
        name: 'status',
        displayName: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'new',
        options: [
          { value: 'new', label: 'New', color: '#3b82f6' },
          { value: 'read', label: 'Read', color: '#f59e0b' },
          { value: 'replied', label: 'Replied', color: '#10b981' },
          { value: 'closed', label: 'Closed', color: '#6b7280' }
        ]
      }
    ]
  }
];

// Sample custom table templates
export const TableTemplates: Partial<DataTable>[] = [
  {
    name: 'blog_posts',
    displayName: 'Blog Posts',
    description: 'Blog articles and content',
    fields: [
      { id: 'title', name: 'title', displayName: 'Title', type: 'text', required: true },
      { id: 'slug', name: 'slug', displayName: 'URL Slug', type: 'text', required: true, unique: true },
      { id: 'content', name: 'content', displayName: 'Content', type: 'textarea', required: true },
      { id: 'excerpt', name: 'excerpt', displayName: 'Excerpt', type: 'textarea', required: false },
      { id: 'featuredImage', name: 'featured_image', displayName: 'Featured Image', type: 'image', required: false },
      { id: 'publishedAt', name: 'published_at', displayName: 'Published Date', type: 'datetime', required: false },
      { id: 'isPublished', name: 'is_published', displayName: 'Published', type: 'boolean', required: true, defaultValue: false }
    ]
  },
  {
    name: 'events',
    displayName: 'Events',
    description: 'Calendar events and appointments',
    fields: [
      { id: 'title', name: 'title', displayName: 'Event Title', type: 'text', required: true },
      { id: 'description', name: 'description', displayName: 'Description', type: 'textarea', required: false },
      { id: 'startDate', name: 'start_date', displayName: 'Start Date', type: 'datetime', required: true },
      { id: 'endDate', name: 'end_date', displayName: 'End Date', type: 'datetime', required: true },
      { id: 'location', name: 'location', displayName: 'Location', type: 'text', required: false },
      { id: 'maxAttendees', name: 'max_attendees', displayName: 'Max Attendees', type: 'number', required: false },
      { id: 'price', name: 'price', displayName: 'Ticket Price', type: 'decimal', required: false }
    ]
  },
  {
    name: 'testimonials',
    displayName: 'Testimonials',
    description: 'Customer reviews and testimonials',
    fields: [
      { id: 'customerName', name: 'customer_name', displayName: 'Customer Name', type: 'text', required: true },
      { id: 'customerTitle', name: 'customer_title', displayName: 'Customer Title', type: 'text', required: false },
      { id: 'customerImage', name: 'customer_image', displayName: 'Customer Photo', type: 'image', required: false },
      { id: 'testimonial', name: 'testimonial', displayName: 'Testimonial', type: 'textarea', required: true },
      { id: 'rating', name: 'rating', displayName: 'Rating', type: 'number', required: false, validation: { min: 1, max: 5 } },
      { id: 'isApproved', name: 'is_approved', displayName: 'Approved', type: 'boolean', required: true, defaultValue: false }
    ]
  },
  {
    name: 'team_members',
    displayName: 'Team Members',
    description: 'Company team and staff information',
    fields: [
      { id: 'name', name: 'name', displayName: 'Full Name', type: 'text', required: true },
      { id: 'position', name: 'position', displayName: 'Job Title', type: 'text', required: true },
      { id: 'bio', name: 'bio', displayName: 'Biography', type: 'textarea', required: false },
      { id: 'photo', name: 'photo', displayName: 'Photo', type: 'image', required: false },
      { id: 'email', name: 'email', displayName: 'Email', type: 'email', required: false },
      { id: 'linkedin', name: 'linkedin', displayName: 'LinkedIn URL', type: 'url', required: false },
      { id: 'department', name: 'department', displayName: 'Department', type: 'text', required: false }
    ]
  }
];

// Helper functions
export function getFieldTypeIcon(type: DataFieldType): string {
  const icons: Record<DataFieldType, string> = {
    text: 'ShortText',
    textarea: 'Notes',
    number: 'Numbers',
    decimal: 'AttachMoney',
    boolean: 'CheckBox',
    date: 'CalendarToday',
    datetime: 'Schedule',
    email: 'Email',
    url: 'Link',
    phone: 'Phone',
    select: 'ArrowDropDown',
    multiselect: 'CheckBoxOutlineBlank',
    image: 'Image',
    file: 'AttachFile',
    json: 'DataObject',
    reference: 'Link'
  };
  return icons[type] || 'HelpOutline';
}

export function validateFieldValue(field: DataField, value: any): string | null {
  if (field.required && (value === null || value === undefined || value === '')) {
    return `${field.displayName} is required`;
  }

  if (value === null || value === undefined || value === '') {
    return null; // Optional field with no value is valid
  }

  const validation = field.validation;
  if (!validation) return null;

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'url':
    case 'phone':
      if (typeof value !== 'string') return 'Must be text';
      if (validation.minLength && value.length < validation.minLength) {
        return `Must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `Must be no more than ${validation.maxLength} characters`;
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        return 'Invalid format';
      }
      break;

    case 'number':
    case 'decimal':
      if (typeof value !== 'number') return 'Must be a number';
      if (validation.min !== undefined && value < validation.min) {
        return `Must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `Must be no more than ${validation.max}`;
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Invalid email address';
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return 'Invalid URL';
      }
      break;
  }

  return null;
} 