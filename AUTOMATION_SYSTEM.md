# Automation System Documentation

## Overview

The automation system provides Zapier-like automation capabilities for the app builder, allowing users to create sophisticated database-driven applications with triggers, data management, and external integrations.

## Core Features

### 1. Trigger System
- **User Interactions**: Element clicks, form submissions, page loads, scroll events
- **Timer-based**: Daily/weekly schedules, intervals with timezone support  
- **Data Events**: Create/update/delete operations, threshold monitoring
- **API/Webhooks**: External API calls, webhook endpoints
- **System Events**: User authentication, error handling

### 2. Data Management
- **Visual Database Design**: Create tables through a visual interface
- **Field Types**: Text, numbers, dates, booleans, files, relationships
- **System Tables**: Pre-built users, content, settings tables
- **Quick Templates**: Blog posts, events, team members, testimonials
- **Relationships**: One-to-many, many-to-many with foreign keys

### 3. Dynamic Content
- **Data Binding**: Connect elements to database fields
- **Template Processing**: `{{variable}}` placeholders in content
- **List Rendering**: Dynamic lists from database arrays
- **Chart Integration**: Convert data to charts (line, bar, pie)
- **Form Processing**: Auto-fill and data extraction

### 4. External Integrations
- **Google Sheets**: Read/write spreadsheet data
- **Airtable**: Connect to Airtable bases
- **Custom APIs**: Any REST API endpoint
- **Auto-sync**: Scheduled data synchronization

## Architecture

### Backend Components

#### ProjectAutomationService
Manages all automation data and database operations:
- Stores automation data in project settings (JSON)
- Creates automation tables in SQLite database
- Generates JavaScript for exported projects
- Handles external connection testing

#### ProjectAutomationController
API endpoints for managing automation:
- CRUD operations for triggers, tables, bindings
- External connection management
- Database setup and migration
- Connection testing utilities

#### ProjectDatabaseService Integration
- Creates automation tables when database is initialized
- Includes automation data in project exports
- Provides database schema management

### Frontend Components

#### Data Panel (`data-panel.tsx`)
Main interface for data management:
- Database tables overview
- Automation triggers configuration
- External connections setup
- Data binding interface

#### Automation Hooks (`use-automation-data.ts`)
React hooks for managing automation:
- Query automation data
- Create/update triggers and tables
- Test external connections
- Database operations

#### External Data Connector (`external-data-connector.ts`)
Utilities for external integrations:
- Google Sheets connection
- Airtable integration
- Custom API handling
- Field mapping and data transformation

## Database Schema

### Automation Tables (SQLite)

```sql
-- Triggers
CREATE TABLE automation_triggers (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    element_id VARCHAR(255),
    conditions TEXT,
    actions TEXT,
    parameters TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data Schemas
CREATE TABLE data_schemas (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    fields TEXT NOT NULL,
    is_system BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Data Bindings
CREATE TABLE data_bindings (
    id VARCHAR(255) PRIMARY KEY,
    element_id VARCHAR(255) NOT NULL,
    property VARCHAR(100) NOT NULL,
    data_source VARCHAR(255) NOT NULL,
    field VARCHAR(255) NOT NULL,
    template TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- External Connections
CREATE TABLE external_connections (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    config TEXT NOT NULL,
    sync_settings TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Export System Integration

When users export their projects, the automation system ensures complete portability:

### 1. Database Export
- All automation tables are included in SQLite database
- Triggers, schemas, and bindings preserved
- External connection configurations stored

### 2. JavaScript Generation
Automatic generation of `automation.js` script:
- Database connection utilities
- Trigger event handlers
- Dynamic content processing
- Form submission handling

### 3. Standalone Operation
Exported projects work independently:
- Local SQLite database with all data
- PHP API for database operations
- JavaScript automation system
- No external dependencies required

## API Endpoints

### Project Automation
- `GET /api/v1/projects/{project}/automation` - Get automation data
- `POST /api/v1/projects/{project}/automation` - Save automation data
- `POST /api/v1/projects/{project}/automation/triggers` - Save trigger
- `POST /api/v1/projects/{project}/automation/data-tables` - Create table
- `POST /api/v1/projects/{project}/automation/data-bindings` - Create binding
- `POST /api/v1/projects/{project}/automation/external-connections` - Add connection

### External Integrations
- `POST /api/v1/projects/{project}/automation/test-connection` - Test connection
- `GET /api/v1/automation/google-sheets/config` - Google Sheets setup
- `GET /api/v1/automation/airtable/config` - Airtable setup

### Database Management
- `POST /api/v1/projects/{project}/automation/setup-database` - Initialize automation DB

## Usage Examples

### Creating a Simple Contact Form Trigger

```javascript
const trigger = {
  type: 'form-submit',
  name: 'Contact Form Submission',
  elementId: 'contact-form',
  actions: [
    {
      type: 'store-data',
      table: 'contacts',
      fields: ['name', 'email', 'message']
    },
    {
      type: 'send-email',
      template: 'contact-notification',
      to: '{{ADMIN_EMAIL}}'
    }
  ]
};
```

### Data Binding Example

```javascript
const binding = {
  elementId: 'user-name',
  property: 'textContent',
  dataSource: 'users',
  field: 'name',
  template: 'Hello, {{name}}!'
};
```

### Google Sheets Connection

```javascript
const connection = {
  type: 'google_sheets',
  name: 'Product Inventory',
  config: {
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Products!A1:E100',
    apiKey: 'your-api-key'
  },
  syncSettings: {
    autoSync: true,
    syncInterval: 60
  }
};
```

## Memory Storage

The system includes a memory of template standardization:
- All templates include standardized authentication
- Required pages: landing, login, register, forgot-password, dashboard  
- Current user email as admin with password "admin123!"
- Template placeholders for user data injection
- Consistent session management across templates

This ensures exported projects have complete, working authentication systems that integrate seamlessly with the automation features.

## Development Notes

### Adding New Trigger Types
1. Add trigger definition to `trigger-registry.ts`
2. Update automation script generation in `ProjectAutomationService`
3. Add frontend UI components for configuration

### External Integration Development
1. Implement connection testing in `ProjectAutomationController`
2. Add data transformation logic in `external-data-connector.ts`
3. Update sync mechanisms in automation service

### Database Schema Changes
1. Update `ProjectAutomationService.setupAutomationInDatabase()`
2. Create migration files if needed
3. Test export/import functionality

The automation system provides a complete foundation for building sophisticated, data-driven applications with visual tools while maintaining full export portability. 