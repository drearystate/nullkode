import {apiClient} from '@common/http/query-client';

export interface AutomationData {
  triggers: TriggerData[];
  dataSchema: DataTableSchema[];
  bindings: DataBinding[];
  externalConnections: ExternalConnection[];
}

export interface TriggerData {
  id?: string;
  type: string;
  name: string;
  elementId?: string;
  conditions?: any[];
  actions?: any[];
  parameters?: any[];
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataTableSchema {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  fields: DataField[];
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DataBinding {
  id?: string;
  elementId: string;
  property: string;
  dataSource: string;
  field: string;
  template?: string;
  query?: any;
  createdAt?: string;
}

export interface ExternalConnection {
  id?: string;
  type: 'google_sheets' | 'airtable' | 'api';
  name: string;
  config: {
    url?: string;
    apiKey?: string;
    sheetId?: string;
    baseId?: string;
    tableId?: string;
    range?: string;
    credentials?: any;
  };
  mappings?: any[];
  syncSettings?: {
    autoSync?: boolean;
    syncInterval?: number;
    lastSync?: string;
  };
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionTestResult {
  status: string;
  rowCount?: number;
  recordCount?: number;
  columns?: string[];
  fields?: string[];
  sampleData?: any[];
  responseSize?: number;
  isJson?: boolean;
}

// API functions
export function getAutomationData(projectId: number): Promise<{automation: AutomationData}> {
  return apiClient.get(`projects/${projectId}/automation`).then(r => r.data);
}

export function saveAutomationData(projectId: number, automation: AutomationData): Promise<{automation: AutomationData}> {
  return apiClient.post(`projects/${projectId}/automation`, {automation}).then(r => r.data);
}

export function saveTrigger(projectId: number, trigger: TriggerData): Promise<{trigger: TriggerData}> {
  return apiClient.post(`projects/${projectId}/automation/triggers`, trigger).then(r => r.data);
}

export function saveDataTable(projectId: number, table: DataTableSchema): Promise<{table: DataTableSchema}> {
  return apiClient.post(`projects/${projectId}/automation/data-tables`, table).then(r => r.data);
}

export function deleteDataTable(projectId: number, tableId: string): Promise<{message: string}> {
  return apiClient.delete(`projects/${projectId}/automation/data-tables/${tableId}`).then(r => r.data);
}

export function saveDataBinding(projectId: number, binding: DataBinding): Promise<{binding: DataBinding}> {
  return apiClient.post(`projects/${projectId}/automation/data-bindings`, binding).then(r => r.data);
}

export function saveExternalConnection(projectId: number, connection: ExternalConnection): Promise<{connection: ExternalConnection}> {
  return apiClient.post(`projects/${projectId}/automation/external-connections`, connection).then(r => r.data);
}

export function testConnection(projectId: number, type: string, config: any): Promise<{result: ConnectionTestResult}> {
  return apiClient.post(`projects/${projectId}/automation/test-connection`, {type, config}).then(r => r.data);
}

export function setupAutomationDatabase(projectId: number): Promise<{message: string}> {
  return apiClient.post(`projects/${projectId}/automation/setup-database`).then(r => r.data);
}

export function getGoogleSheetsConfig(): Promise<{config: any}> {
  return apiClient.get('automation/google-sheets/config').then(r => r.data);
}

export function getAirtableConfig(): Promise<{config: any}> {
  return apiClient.get('automation/airtable/config').then(r => r.data);
} 