import {
  ExternalConnection,
  ConnectionTestResult,
  testConnection,
  getGoogleSheetsConfig,
  getAirtableConfig,
} from '@app/projects/automation-api';

export interface ExternalDataSource {
  id: string;
  name: string;
  type: 'google_sheets' | 'airtable' | 'api';
  config: any;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  fields?: string[];
  sampleData?: any[];
}

export class ExternalDataConnector {
  private connections: Map<string, ExternalConnection> = new Map();

  /**
   * Add a new external connection
   */
  addConnection(connection: ExternalConnection): void {
    if (connection.id) {
      this.connections.set(connection.id, connection);
    }
  }

  /**
   * Get all connections
   */
  getConnections(): ExternalConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): ExternalConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Remove connection
   */
  removeConnection(id: string): boolean {
    return this.connections.delete(id);
  }

  /**
   * Test a connection configuration
   */
  async testConnection(projectId: number, type: string, config: any): Promise<ConnectionTestResult> {
    const result = await testConnection(projectId, type, config);
    return result.result;
  }

  /**
   * Get Google Sheets setup instructions
   */
  async getGoogleSheetsSetup(): Promise<any> {
    const result = await getGoogleSheetsConfig();
    return result.config;
  }

  /**
   * Get Airtable setup instructions
   */
  async getAirtableSetup(): Promise<any> {
    const result = await getAirtableConfig();
    return result.config;
  }

  /**
   * Create Google Sheets connection
   */
  createGoogleSheetsConnection(config: {
    name: string;
    spreadsheetId: string;
    range: string;
    apiKey: string;
  }): ExternalConnection {
    return {
      id: `gs_${Date.now()}`,
      type: 'google_sheets',
      name: config.name,
      config: {
        sheetId: config.spreadsheetId,
        range: config.range,
        apiKey: config.apiKey,
        url: `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.range}?key=${config.apiKey}`,
      },
      mappings: [],
      syncSettings: {
        autoSync: false,
        syncInterval: 60,
      },
      enabled: true,
    };
  }

  /**
   * Create Airtable connection
   */
  createAirtableConnection(config: {
    name: string;
    baseId: string;
    tableId: string;
    apiKey: string;
  }): ExternalConnection {
    return {
      id: `at_${Date.now()}`,
      type: 'airtable',
      name: config.name,
      config: {
        baseId: config.baseId,
        tableId: config.tableId,
        apiKey: config.apiKey,
        url: `https://api.airtable.com/v0/${config.baseId}/${config.tableId}`,
      },
      mappings: [],
      syncSettings: {
        autoSync: false,
        syncInterval: 60,
      },
      enabled: true,
    };
  }

  /**
   * Create custom API connection
   */
  createApiConnection(config: {
    name: string;
    url: string;
    apiKey?: string;
    headers?: Record<string, string>;
  }): ExternalConnection {
    return {
      id: `api_${Date.now()}`,
      type: 'api',
      name: config.name,
      config: {
        url: config.url,
        apiKey: config.apiKey,
        credentials: config.headers,
      },
      mappings: [],
      syncSettings: {
        autoSync: false,
        syncInterval: 60,
      },
      enabled: true,
    };
  }

  /**
   * Generate field mappings based on external data structure
   */
  generateFieldMappings(externalFields: string[], localFields: string[]): Array<{
    external: string;
    local: string;
    transform?: string;
  }> {
    const mappings: Array<{ external: string; local: string; transform?: string }> = [];
    
    // Auto-map fields with similar names
    for (const externalField of externalFields) {
      const normalizedExternal = externalField.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const localField of localFields) {
        const normalizedLocal = localField.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (normalizedExternal === normalizedLocal || 
            normalizedExternal.includes(normalizedLocal) ||
            normalizedLocal.includes(normalizedExternal)) {
          mappings.push({
            external: externalField,
            local: localField,
          });
          break;
        }
      }
    }
    
    return mappings;
  }

  /**
   * Convert external data to local format
   */
  transformData(data: any[], mappings: Array<{
    external: string;
    local: string;
    transform?: string;
  }>): any[] {
    return data.map(item => {
      const transformed: any = {};
      
      for (const mapping of mappings) {
        let value = item[mapping.external];
        
        // Apply transformations if specified
        if (mapping.transform && value !== undefined) {
          try {
            // Simple transformations
            switch (mapping.transform) {
              case 'uppercase':
                value = String(value).toUpperCase();
                break;
              case 'lowercase':
                value = String(value).toLowerCase();
                break;
              case 'number':
                value = Number(value);
                break;
              case 'date':
                value = new Date(value).toISOString();
                break;
              case 'boolean':
                value = Boolean(value);
                break;
            }
          } catch (error) {
            console.warn('Transformation failed for field:', mapping.external, error);
          }
        }
        
        transformed[mapping.local] = value;
      }
      
      return transformed;
    });
  }

  /**
   * Sync data from external source
   */
  async syncData(connection: ExternalConnection): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      let response: Response;
      const headers: HeadersInit = { 'Accept': 'application/json' };

      // Add authentication based on connection type
      if (connection.type === 'airtable' && connection.config.apiKey) {
        headers['Authorization'] = `Bearer ${connection.config.apiKey}`;
      }

      response = await fetch(connection.config.url!, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      let data: any[] = [];

      // Parse response based on connection type
      switch (connection.type) {
        case 'google_sheets':
          data = responseData.values || [];
          // Convert to objects using first row as headers
          if (data.length > 0) {
            const headers = data[0];
            data = data.slice(1).map((row: any[]) => {
              const obj: any = {};
              headers.forEach((header: string, index: number) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });
          }
          break;

        case 'airtable':
          data = (responseData.records || []).map((record: any) => ({
            id: record.id,
            ...record.fields,
          }));
          break;

        case 'api':
          data = Array.isArray(responseData) ? responseData : [responseData];
          break;
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Global instance
export const externalDataConnector = new ExternalDataConnector(); 