export interface TriggerEvent {
  id: string;
  name: string;
  description: string;
  category: 'user' | 'timer' | 'data' | 'api' | 'system';
  icon: string;
  parameters: TriggerParameter[];
  conditions?: TriggerCondition[];
}

export interface TriggerParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'datetime' | 'data-field';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'is_empty' | 'is_not_empty';
  value: any;
  type: 'and' | 'or';
}

export interface TriggerAction {
  id: string;
  triggerEventId: string;
  name: string;
  elementId?: string;
  apiConnectionId?: string;
  parameters: Record<string, any>;
  conditions?: TriggerCondition[];
  enabled: boolean;
  createdAt: Date;
  lastRun?: Date;
}

// Registry of available trigger events
export const TriggerEventRegistry: TriggerEvent[] = [
  // User Interaction Triggers
  {
    id: 'element-click',
    name: 'Element Clicked',
    description: 'When a specific element is clicked by the user',
    category: 'user',
    icon: 'TouchApp',
    parameters: [
      {
        name: 'elementId',
        type: 'string',
        required: true,
        description: 'The element to watch for clicks'
      }
    ]
  },
  {
    id: 'form-submit',
    name: 'Form Submitted',
    description: 'When a form is submitted with data',
    category: 'user',
    icon: 'Send',
    parameters: [
      {
        name: 'formId',
        type: 'string',
        required: true,
        description: 'The form to watch for submissions'
      }
    ]
  },
  {
    id: 'page-load',
    name: 'Page Loaded',
    description: 'When the page finishes loading',
    category: 'user',
    icon: 'Refresh',
    parameters: []
  },
  {
    id: 'scroll-position',
    name: 'Scroll Position',
    description: 'When user scrolls to a specific position',
    category: 'user',
    icon: 'SwipeVertical',
    parameters: [
      {
        name: 'position',
        type: 'number',
        required: true,
        description: 'Scroll percentage (0-100)',
        validation: { min: 0, max: 100 }
      }
    ]
  },

  // Timer-based Triggers
  {
    id: 'schedule-daily',
    name: 'Daily Schedule',
    description: 'Run at a specific time every day',
    category: 'timer',
    icon: 'Schedule',
    parameters: [
      {
        name: 'time',
        type: 'string',
        required: true,
        description: 'Time in HH:MM format',
        validation: { pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
      },
      {
        name: 'timezone',
        type: 'select',
        required: true,
        description: 'Timezone for execution',
        defaultValue: 'UTC',
        options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']
      }
    ]
  },
  {
    id: 'schedule-weekly',
    name: 'Weekly Schedule',
    description: 'Run on specific days of the week',
    category: 'timer',
    icon: 'CalendarToday',
    parameters: [
      {
        name: 'days',
        type: 'select',
        required: true,
        description: 'Days of the week',
        options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        name: 'time',
        type: 'string',
        required: true,
        description: 'Time in HH:MM format'
      }
    ]
  },
  {
    id: 'interval',
    name: 'Time Interval',
    description: 'Run every X minutes/hours',
    category: 'timer',
    icon: 'Timer',
    parameters: [
      {
        name: 'interval',
        type: 'number',
        required: true,
        description: 'Interval duration',
        validation: { min: 1 }
      },
      {
        name: 'unit',
        type: 'select',
        required: true,
        description: 'Time unit',
        options: ['minutes', 'hours', 'days']
      }
    ]
  },

  // Data-based Triggers
  {
    id: 'data-created',
    name: 'Data Created',
    description: 'When new data is added to a table',
    category: 'data',
    icon: 'Add',
    parameters: [
      {
        name: 'tableName',
        type: 'data-field',
        required: true,
        description: 'Database table to monitor'
      }
    ]
  },
  {
    id: 'data-updated',
    name: 'Data Updated',
    description: 'When existing data is modified',
    category: 'data',
    icon: 'Edit',
    parameters: [
      {
        name: 'tableName',
        type: 'data-field',
        required: true,
        description: 'Database table to monitor'
      },
      {
        name: 'fieldName',
        type: 'string',
        required: false,
        description: 'Specific field to watch (optional)'
      }
    ]
  },
  {
    id: 'data-deleted',
    name: 'Data Deleted',
    description: 'When data is removed from a table',
    category: 'data',
    icon: 'Delete',
    parameters: [
      {
        name: 'tableName',
        type: 'data-field',
        required: true,
        description: 'Database table to monitor'
      }
    ]
  },
  {
    id: 'data-threshold',
    name: 'Data Threshold',
    description: 'When a numeric field reaches a specific value',
    category: 'data',
    icon: 'TrendingUp',
    parameters: [
      {
        name: 'tableName',
        type: 'data-field',
        required: true,
        description: 'Database table to monitor'
      },
      {
        name: 'fieldName',
        type: 'string',
        required: true,
        description: 'Numeric field to monitor'
      },
      {
        name: 'operator',
        type: 'select',
        required: true,
        description: 'Comparison operator',
        options: ['greater_than', 'less_than', 'equals']
      },
      {
        name: 'value',
        type: 'number',
        required: true,
        description: 'Threshold value'
      }
    ]
  },

  // API-based Triggers
  {
    id: 'webhook-received',
    name: 'Webhook Received',
    description: 'When an external service sends data via webhook',
    category: 'api',
    icon: 'Webhook',
    parameters: [
      {
        name: 'webhookUrl',
        type: 'string',
        required: true,
        description: 'Unique webhook URL endpoint'
      },
      {
        name: 'method',
        type: 'select',
        required: true,
        description: 'HTTP method to accept',
        defaultValue: 'POST',
        options: ['GET', 'POST', 'PUT', 'DELETE']
      }
    ]
  },
  {
    id: 'api-response',
    name: 'API Response',
    description: 'When an API call returns specific data',
    category: 'api',
    icon: 'Api',
    parameters: [
      {
        name: 'apiConnectionId',
        type: 'string',
        required: true,
        description: 'API connection to monitor'
      },
      {
        name: 'responseField',
        type: 'string',
        required: false,
        description: 'Specific response field to check'
      }
    ]
  },

  // System Triggers
  {
    id: 'user-login',
    name: 'User Login',
    description: 'When a user logs into the application',
    category: 'system',
    icon: 'Login',
    parameters: []
  },
  {
    id: 'user-logout',
    name: 'User Logout',
    description: 'When a user logs out of the application',
    category: 'system',
    icon: 'Logout',
    parameters: []
  },
  {
    id: 'error-occurred',
    name: 'Error Occurred',
    description: 'When an error happens in the application',
    category: 'system',
    icon: 'Error',
    parameters: [
      {
        name: 'errorType',
        type: 'select',
        required: false,
        description: 'Type of error to watch for',
        options: ['api_error', 'validation_error', 'system_error', 'user_error']
      }
    ]
  }
];

// Helper functions
export function getTriggersByCategory(category: string): TriggerEvent[] {
  return TriggerEventRegistry.filter(trigger => trigger.category === category);
}

export function getTriggerById(id: string): TriggerEvent | undefined {
  return TriggerEventRegistry.find(trigger => trigger.id === id);
}

export function validateTriggerParameters(trigger: TriggerEvent, parameters: Record<string, any>): boolean {
  for (const param of trigger.parameters) {
    if (param.required && !parameters[param.name]) {
      return false;
    }
    
    if (parameters[param.name] && param.validation) {
      const value = parameters[param.name];
      const validation = param.validation;
      
      if (param.type === 'number') {
        if (validation.min !== undefined && value < validation.min) return false;
        if (validation.max !== undefined && value > validation.max) return false;
      }
      
      if (param.type === 'string' && validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) return false;
      }
    }
  }
  
  return true;
} 