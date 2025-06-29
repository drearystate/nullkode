<?php

namespace App\Services;

use App\Models\Project;
use Exception;
use PDO;

class ProjectAutomationService
{
    private ProjectDatabaseService $databaseService;

    public function __construct(ProjectDatabaseService $databaseService)
    {
        $this->databaseService = $databaseService;
    }

    /**
     * Store automation data in project settings and database
     */
    public function saveAutomationData(Project $project, array $automationData): bool
    {
        try {
            // Save to project settings for quick access
            $settings = $project->settings ?? [];
            $settings['automation'] = $automationData;
            $project->update(['settings' => $settings]);

            // Also save to project database for export
            if ($this->databaseService->hasDatabase($project)) {
                $this->saveToProjectDatabase($project, $automationData);
            }

            return true;
        } catch (Exception $e) {
            throw new Exception("Failed to save automation data: " . $e->getMessage());
        }
    }

    /**
     * Get automation data for a project
     */
    public function getAutomationData(Project $project): array
    {
        $settings = $project->settings ?? [];
        return $settings['automation'] ?? [
            'triggers' => [],
            'dataSchema' => [],
            'bindings' => [],
            'externalConnections' => []
        ];
    }

    /**
     * Save trigger configuration
     */
    public function saveTrigger(Project $project, array $triggerData): array
    {
        $automationData = $this->getAutomationData($project);
        
        $trigger = [
            'id' => $triggerData['id'] ?? uniqid('trigger_'),
            'type' => $triggerData['type'],
            'name' => $triggerData['name'],
            'elementId' => $triggerData['elementId'] ?? null,
            'conditions' => $triggerData['conditions'] ?? [],
            'actions' => $triggerData['actions'] ?? [],
            'parameters' => $triggerData['parameters'] ?? [],
            'enabled' => $triggerData['enabled'] ?? true,
            'createdAt' => now()->toISOString(),
            'updatedAt' => now()->toISOString()
        ];

        // Update or add trigger
        $existingIndex = collect($automationData['triggers'])->search(function ($t) use ($trigger) {
            return $t['id'] === $trigger['id'];
        });

        if ($existingIndex !== false) {
            $automationData['triggers'][$existingIndex] = $trigger;
        } else {
            $automationData['triggers'][] = $trigger;
        }

        $this->saveAutomationData($project, $automationData);
        return $trigger;
    }

    /**
     * Save data table schema
     */
    public function saveDataTable(Project $project, array $tableData): array
    {
        $automationData = $this->getAutomationData($project);
        
        $table = [
            'id' => $tableData['id'] ?? uniqid('table_'),
            'name' => $tableData['name'],
            'displayName' => $tableData['displayName'],
            'description' => $tableData['description'] ?? '',
            'fields' => $tableData['fields'] ?? [],
            'isSystem' => $tableData['isSystem'] ?? false,
            'createdAt' => now()->toISOString(),
            'updatedAt' => now()->toISOString()
        ];

        // Update or add table
        $existingIndex = collect($automationData['dataSchema'])->search(function ($t) use ($table) {
            return $t['id'] === $table['id'];
        });

        if ($existingIndex !== false) {
            $automationData['dataSchema'][$existingIndex] = $table;
        } else {
            $automationData['dataSchema'][] = $table;
        }

        // Create actual table in project database
        if ($this->databaseService->hasDatabase($project)) {
            $this->createTableInDatabase($project, $table);
        }

        $this->saveAutomationData($project, $automationData);
        return $table;
    }

    /**
     * Save data binding configuration
     */
    public function saveDataBinding(Project $project, array $bindingData): array
    {
        $automationData = $this->getAutomationData($project);
        
        $binding = [
            'id' => $bindingData['id'] ?? uniqid('binding_'),
            'elementId' => $bindingData['elementId'],
            'property' => $bindingData['property'],
            'dataSource' => $bindingData['dataSource'],
            'field' => $bindingData['field'],
            'template' => $bindingData['template'] ?? null,
            'query' => $bindingData['query'] ?? null,
            'createdAt' => now()->toISOString()
        ];

        $automationData['bindings'][] = $binding;
        $this->saveAutomationData($project, $automationData);
        return $binding;
    }

    /**
     * Save external connection (Google Sheets, Airtable, etc.)
     */
    public function saveExternalConnection(Project $project, array $connectionData): array
    {
        $automationData = $this->getAutomationData($project);
        
        $connection = [
            'id' => $connectionData['id'] ?? uniqid('conn_'),
            'type' => $connectionData['type'], // 'google_sheets', 'airtable', 'api'
            'name' => $connectionData['name'],
            'config' => [
                'url' => $connectionData['url'] ?? null,
                'apiKey' => $connectionData['apiKey'] ?? null,
                'sheetId' => $connectionData['sheetId'] ?? null,
                'baseId' => $connectionData['baseId'] ?? null,
                'tableId' => $connectionData['tableId'] ?? null,
                'credentials' => $connectionData['credentials'] ?? null
            ],
            'mappings' => $connectionData['mappings'] ?? [],
            'syncSettings' => [
                'autoSync' => $connectionData['autoSync'] ?? false,
                'syncInterval' => $connectionData['syncInterval'] ?? 60, // minutes
                'lastSync' => null
            ],
            'enabled' => $connectionData['enabled'] ?? true,
            'createdAt' => now()->toISOString()
        ];

        $automationData['externalConnections'][] = $connection;
        $this->saveAutomationData($project, $automationData);
        return $connection;
    }

    /**
     * Create the automation management system in the project database
     */
    public function setupAutomationInDatabase(Project $project): void
    {
        if (!$this->databaseService->hasDatabase($project)) {
            return;
        }

        $pdo = $this->databaseService->getConnection($project);

        // Create automation tables
        $automationSchema = [
            // Triggers table
            "CREATE TABLE IF NOT EXISTS automation_triggers (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                element_id VARCHAR(255),
                conditions TEXT,
                actions TEXT,
                parameters TEXT,
                enabled BOOLEAN DEFAULT 1,
                last_run DATETIME NULL,
                run_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // Data schemas table
            "CREATE TABLE IF NOT EXISTS data_schemas (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                display_name VARCHAR(255) NOT NULL,
                description TEXT,
                fields TEXT NOT NULL,
                is_system BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // Data bindings table
            "CREATE TABLE IF NOT EXISTS data_bindings (
                id VARCHAR(255) PRIMARY KEY,
                element_id VARCHAR(255) NOT NULL,
                property VARCHAR(100) NOT NULL,
                data_source VARCHAR(255) NOT NULL,
                field VARCHAR(255) NOT NULL,
                template TEXT,
                query_conditions TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // External connections table
            "CREATE TABLE IF NOT EXISTS external_connections (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                config TEXT NOT NULL,
                mappings TEXT,
                sync_settings TEXT,
                enabled BOOLEAN DEFAULT 1,
                last_sync DATETIME NULL,
                sync_status VARCHAR(50) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // Automation logs for tracking
            "CREATE TABLE IF NOT EXISTS automation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_id VARCHAR(255),
                event_type VARCHAR(100) NOT NULL,
                data TEXT,
                status VARCHAR(50) DEFAULT 'success',
                error_message TEXT,
                execution_time INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trigger_id) REFERENCES automation_triggers(id) ON DELETE CASCADE
            )"
        ];

        foreach ($automationSchema as $sql) {
            $pdo->exec($sql);
        }
    }

    /**
     * Save automation data to project database for export
     */
    private function saveToProjectDatabase(Project $project, array $automationData): void
    {
        $pdo = $this->databaseService->getConnection($project);

        // Ensure automation tables exist
        $this->setupAutomationInDatabase($project);

        // Clear existing data
        $pdo->exec("DELETE FROM automation_triggers");
        $pdo->exec("DELETE FROM data_schemas");
        $pdo->exec("DELETE FROM data_bindings");
        $pdo->exec("DELETE FROM external_connections");

        // Insert triggers
        if (!empty($automationData['triggers'])) {
            $stmt = $pdo->prepare("INSERT INTO automation_triggers (id, type, name, element_id, conditions, actions, parameters, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($automationData['triggers'] as $trigger) {
                $stmt->execute([
                    $trigger['id'],
                    $trigger['type'],
                    $trigger['name'],
                    $trigger['elementId'] ?? null,
                    json_encode($trigger['conditions'] ?? []),
                    json_encode($trigger['actions'] ?? []),
                    json_encode($trigger['parameters'] ?? []),
                    $trigger['enabled'] ? 1 : 0,
                    $trigger['createdAt'],
                    $trigger['updatedAt']
                ]);
            }
        }

        // Insert data schemas
        if (!empty($automationData['dataSchema'])) {
            $stmt = $pdo->prepare("INSERT INTO data_schemas (id, name, display_name, description, fields, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($automationData['dataSchema'] as $schema) {
                $stmt->execute([
                    $schema['id'],
                    $schema['name'],
                    $schema['displayName'],
                    $schema['description'] ?? '',
                    json_encode($schema['fields'] ?? []),
                    $schema['isSystem'] ? 1 : 0,
                    $schema['createdAt'],
                    $schema['updatedAt']
                ]);
            }
        }

        // Insert data bindings
        if (!empty($automationData['bindings'])) {
            $stmt = $pdo->prepare("INSERT INTO data_bindings (id, element_id, property, data_source, field, template, query_conditions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($automationData['bindings'] as $binding) {
                $stmt->execute([
                    $binding['id'],
                    $binding['elementId'],
                    $binding['property'],
                    $binding['dataSource'],
                    $binding['field'],
                    $binding['template'] ?? null,
                    json_encode($binding['query'] ?? []),
                    $binding['createdAt']
                ]);
            }
        }

        // Insert external connections
        if (!empty($automationData['externalConnections'])) {
            $stmt = $pdo->prepare("INSERT INTO external_connections (id, type, name, config, mappings, sync_settings, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($automationData['externalConnections'] as $connection) {
                $stmt->execute([
                    $connection['id'],
                    $connection['type'],
                    $connection['name'],
                    json_encode($connection['config'] ?? []),
                    json_encode($connection['mappings'] ?? []),
                    json_encode($connection['syncSettings'] ?? []),
                    $connection['enabled'] ? 1 : 0,
                    $connection['createdAt'],
                    $connection['updatedAt'] ?? $connection['createdAt']
                ]);
            }
        }
    }

    /**
     * Create actual database table from schema
     */
    private function createTableInDatabase(Project $project, array $tableSchema): void
    {
        $pdo = $this->databaseService->getConnection($project);
        
        $tableName = $tableSchema['name'];
        $fields = $tableSchema['fields'] ?? [];
        
        if (empty($fields)) {
            return;
        }

        // Build CREATE TABLE SQL
        $columns = [];
        $columns[] = "id INTEGER PRIMARY KEY AUTOINCREMENT";

        foreach ($fields as $field) {
            $columnName = $field['name'];
            $columnType = $this->mapFieldTypeToSQL($field['type']);
            $nullable = ($field['required'] ?? false) ? 'NOT NULL' : 'NULL';
            $default = '';
            
            if (isset($field['defaultValue'])) {
                $default = "DEFAULT " . $pdo->quote($field['defaultValue']);
            }
            
            $unique = ($field['unique'] ?? false) ? 'UNIQUE' : '';
            
            $columns[] = trim("{$columnName} {$columnType} {$nullable} {$default} {$unique}");
        }

        $columns[] = "created_at DATETIME DEFAULT CURRENT_TIMESTAMP";
        $columns[] = "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP";

        $sql = "CREATE TABLE IF NOT EXISTS {$tableName} (" . implode(', ', $columns) . ")";
        
        try {
            $pdo->exec($sql);
            
            // Create indexes for reference fields (foreign keys)
            foreach ($fields as $field) {
                if ($field['type'] === 'reference' && isset($field['referenceTo'])) {
                    $indexSql = "CREATE INDEX IF NOT EXISTS idx_{$tableName}_{$columnName} ON {$tableName}({$columnName})";
                    $pdo->exec($indexSql);
                }
            }
            
        } catch (Exception $e) {
            throw new Exception("Failed to create table {$tableName}: " . $e->getMessage());
        }
    }

    /**
     * Map field types to SQL types
     */
    private function mapFieldTypeToSQL(string $fieldType): string
    {
        $typeMap = [
            'text' => 'VARCHAR(255)',
            'textarea' => 'TEXT',
            'number' => 'INTEGER',
            'decimal' => 'DECIMAL(10,2)',
            'boolean' => 'BOOLEAN',
            'date' => 'DATE',
            'datetime' => 'DATETIME',
            'email' => 'VARCHAR(255)',
            'url' => 'TEXT',
            'phone' => 'VARCHAR(50)',
            'select' => 'VARCHAR(255)',
            'multiselect' => 'TEXT',
            'image' => 'TEXT',
            'file' => 'TEXT',
            'json' => 'TEXT',
            'reference' => 'INTEGER'
        ];

        return $typeMap[$fieldType] ?? 'TEXT';
    }

    /**
     * Create table relationship/foreign key
     */
    public function createTableRelationship(Project $project, array $relationshipData): array
    {
        if (!$this->databaseService->hasDatabase($project)) {
            throw new Exception("Project database not found");
        }

        $pdo = $this->databaseService->getConnection($project);
        
        $fromTable = $relationshipData['fromTable'];
        $toTable = $relationshipData['toTable'];
        $relationshipType = $relationshipData['type']; // hasOne, hasMany, belongsTo, manyToMany
        $foreignKey = $relationshipData['foreignKey'] ?? $toTable . '_id';
        
        try {
            switch ($relationshipType) {
                case 'hasOne':
                case 'belongsTo':
                    // Add foreign key column to the from table
                    $sql = "ALTER TABLE {$fromTable} ADD COLUMN {$foreignKey} INTEGER";
                    $pdo->exec($sql);
                    
                    // Create index
                    $indexSql = "CREATE INDEX IF NOT EXISTS idx_{$fromTable}_{$foreignKey} ON {$fromTable}({$foreignKey})";
                    $pdo->exec($indexSql);
                    break;
                    
                case 'hasMany':
                    // Add foreign key column to the to table
                    $reverseForeignKey = $fromTable . '_id';
                    $sql = "ALTER TABLE {$toTable} ADD COLUMN {$reverseForeignKey} INTEGER";
                    $pdo->exec($sql);
                    
                    // Create index
                    $indexSql = "CREATE INDEX IF NOT EXISTS idx_{$toTable}_{$reverseForeignKey} ON {$toTable}({$reverseForeignKey})";
                    $pdo->exec($indexSql);
                    break;
                    
                case 'manyToMany':
                    // Create pivot table
                    $pivotTable = $relationshipData['pivotTable'] ?? $fromTable . '_' . $toTable;
                    $fromForeignKey = $fromTable . '_id';
                    $toForeignKey = $toTable . '_id';
                    
                    $pivotSql = "CREATE TABLE IF NOT EXISTS {$pivotTable} (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        {$fromForeignKey} INTEGER NOT NULL,
                        {$toForeignKey} INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE({$fromForeignKey}, {$toForeignKey})
                    )";
                    $pdo->exec($pivotSql);
                    
                    // Create indexes
                    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_{$pivotTable}_{$fromForeignKey} ON {$pivotTable}({$fromForeignKey})");
                    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_{$pivotTable}_{$toForeignKey} ON {$pivotTable}({$toForeignKey})");
                    break;
            }
            
            return [
                'id' => uniqid('rel_'),
                'type' => $relationshipType,
                'fromTable' => $fromTable,
                'toTable' => $toTable,
                'foreignKey' => $foreignKey,
                'pivotTable' => $pivotTable ?? null,
                'createdAt' => now()->toISOString()
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to create relationship: " . $e->getMessage());
        }
    }

    /**
     * Generate automation JavaScript for exported project
     */
    public function generateAutomationScript(Project $project): string
    {
        $automationData = $this->getAutomationData($project);
        
        $script = "// Automation System for " . $project->name . "\n";
        $script .= "// Generated automatically - do not edit manually\n\n";
        
        $script .= "(function() {\n";
        $script .= "    'use strict';\n\n";
        
        // Database connection helper
        $script .= "    // Database connection helper\n";
        $script .= "    const db = {\n";
        $script .= "        async query(sql, params = []) {\n";
        $script .= "            try {\n";
        $script .= "                const response = await fetch('/api.php', {\n";
        $script .= "                    method: 'POST',\n";
        $script .= "                    headers: { 'Content-Type': 'application/json' },\n";
        $script .= "                    body: JSON.stringify({ sql, params })\n";
        $script .= "                });\n";
        $script .= "                return await response.json();\n";
        $script .= "            } catch (error) {\n";
        $script .= "                console.error('Database query failed:', error);\n";
        $script .= "                return { error: error.message };\n";
        $script .= "            }\n";
        $script .= "        },\n";
        $script .= "        async select(table, conditions = {}, limit = null) {\n";
        $script .= "            let sql = `SELECT * FROM ${table}`;\n";
        $script .= "            const params = [];\n";
        $script .= "            if (Object.keys(conditions).length > 0) {\n";
        $script .= "                const whereClause = Object.keys(conditions).map(key => {\n";
        $script .= "                    params.push(conditions[key]);\n";
        $script .= "                    return `${key} = ?`;\n";
        $script .= "                }).join(' AND ');\n";
        $script .= "                sql += ` WHERE ${whereClause}`;\n";
        $script .= "            }\n";
        $script .= "            if (limit) sql += ` LIMIT ${limit}`;\n";
        $script .= "            return this.query(sql, params);\n";
        $script .= "        }\n";
        $script .= "    };\n\n";
        
        // Dynamic content processor
        $script .= "    // Dynamic content processor\n";
        $script .= "    const dynamicContent = {\n";
        $script .= "        processTemplate(template, data) {\n";
        $script .= "            return template.replace(/\\{\\{(\\w+(?:\\.\\w+)*)\\}\\}/g, (match, path) => {\n";
        $script .= "                const value = this.getNestedValue(data, path);\n";
        $script .= "                return value !== undefined ? String(value) : match;\n";
        $script .= "            });\n";
        $script .= "        },\n";
        $script .= "        getNestedValue(obj, path) {\n";
        $script .= "            return path.split('.').reduce((current, key) => current?.[key], obj);\n";
        $script .= "        },\n";
        $script .= "        async applyBindings() {\n";
        $script .= "            const bindings = " . json_encode($automationData['bindings'] ?? []) . ";\n";
        $script .= "            for (const binding of bindings) {\n";
        $script .= "                try {\n";
        $script .= "                    const element = document.querySelector(`[data-element-id=\"${binding.elementId}\"]`);\n";
        $script .= "                    if (!element) continue;\n";
        $script .= "                    const data = await db.select(binding.dataSource, binding.query?.where || {}, 1);\n";
        $script .= "                    if (data.rows && data.rows.length > 0) {\n";
        $script .= "                        const value = binding.template \n";
        $script .= "                            ? this.processTemplate(binding.template, data.rows[0])\n";
        $script .= "                            : data.rows[0][binding.field];\n";
        $script .= "                        this.setElementProperty(element, binding.property, value);\n";
        $script .= "                    }\n";
        $script .= "                } catch (error) {\n";
        $script .= "                    console.error('Binding failed:', binding, error);\n";
        $script .= "                }\n";
        $script .= "            }\n";
        $script .= "        },\n";
        $script .= "        setElementProperty(element, property, value) {\n";
        $script .= "            switch (property) {\n";
        $script .= "                case 'textContent': element.textContent = String(value); break;\n";
        $script .= "                case 'innerHTML': element.innerHTML = String(value); break;\n";
        $script .= "                case 'src': if (element.tagName === 'IMG') element.src = String(value); break;\n";
        $script .= "                case 'href': if (element.tagName === 'A') element.href = String(value); break;\n";
        $script .= "                case 'value': if (element.tagName === 'INPUT') element.value = String(value); break;\n";
        $script .= "                default: element.setAttribute(property, String(value));\n";
        $script .= "            }\n";
        $script .= "        }\n";
        $script .= "    };\n\n";
        
        // Trigger system
        $script .= "    // Trigger system\n";
        $script .= "    const triggers = " . json_encode($automationData['triggers'] ?? []) . ";\n";
        $script .= "    const automation = {\n";
        $script .= "        init() {\n";
        $script .= "            this.setupTriggers();\n";
        $script .= "            dynamicContent.applyBindings();\n";
        $script .= "        },\n";
        $script .= "        setupTriggers() {\n";
        $script .= "            triggers.forEach(trigger => {\n";
        $script .= "                if (!trigger.enabled) return;\n";
        $script .= "                switch (trigger.type) {\n";
        $script .= "                    case 'element-click':\n";
        $script .= "                        this.setupClickTrigger(trigger);\n";
        $script .= "                        break;\n";
        $script .= "                    case 'page-load':\n";
        $script .= "                        this.executeActions(trigger.actions);\n";
        $script .= "                        break;\n";
        $script .= "                    case 'form-submit':\n";
        $script .= "                        this.setupFormTrigger(trigger);\n";
        $script .= "                        break;\n";
        $script .= "                }\n";
        $script .= "            });\n";
        $script .= "        },\n";
        $script .= "        setupClickTrigger(trigger) {\n";
        $script .= "            const element = document.querySelector(`[data-element-id=\"${trigger.elementId}\"]`);\n";
        $script .= "            if (element) {\n";
        $script .= "                element.addEventListener('click', () => this.executeActions(trigger.actions));\n";
        $script .= "            }\n";
        $script .= "        },\n";
        $script .= "        setupFormTrigger(trigger) {\n";
        $script .= "            const form = document.querySelector(`[data-element-id=\"${trigger.elementId}\"]`);\n";
        $script .= "            if (form) {\n";
        $script .= "                form.addEventListener('submit', (e) => {\n";
        $script .= "                    e.preventDefault();\n";
        $script .= "                    this.executeActions(trigger.actions, { formData: new FormData(form) });\n";
        $script .= "                });\n";
        $script .= "            }\n";
        $script .= "        },\n";
        $script .= "        executeActions(actions, context = {}) {\n";
        $script .= "            actions.forEach(action => {\n";
        $script .= "                switch (action.type) {\n";
        $script .= "                    case 'navigate':\n";
        $script .= "                        window.location.href = action.url;\n";
        $script .= "                        break;\n";
        $script .= "                    case 'store-data':\n";
        $script .= "                        if (context.formData) this.storeFormData(action.table, context.formData);\n";
        $script .= "                        break;\n";
        $script .= "                    case 'show-message':\n";
        $script .= "                        alert(action.message || 'Action completed');\n";
        $script .= "                        break;\n";
        $script .= "                }\n";
        $script .= "            });\n";
        $script .= "        },\n";
        $script .= "        async storeFormData(tableName, formData) {\n";
        $script .= "            const data = Object.fromEntries(formData.entries());\n";
        $script .= "            const fields = Object.keys(data).join(', ');\n";
        $script .= "            const placeholders = Object.keys(data).map(() => '?').join(', ');\n";
        $script .= "            const sql = `INSERT INTO ${tableName} (${fields}) VALUES (${placeholders})`;\n";
        $script .= "            return db.query(sql, Object.values(data));\n";
        $script .= "        }\n";
        $script .= "    };\n\n";
        
        // Initialize on page load
        $script .= "    // Initialize automation system\n";
        $script .= "    if (document.readyState === 'loading') {\n";
        $script .= "        document.addEventListener('DOMContentLoaded', () => automation.init());\n";
        $script .= "    } else {\n";
        $script .= "        automation.init();\n";
        $script .= "    }\n\n";
        
        $script .= "})();\n";
        
        return $script;
    }

    /**
     * Get Google Sheets integration config
     */
    public function getGoogleSheetsConfig(): array
    {
        return [
            'apiUrl' => 'https://sheets.googleapis.com/v4/spreadsheets',
            'scopes' => ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            'fields' => [
                'spreadsheetId' => 'required|string',
                'range' => 'required|string',
                'apiKey' => 'required|string'
            ],
            'instructions' => [
                '1. Create or open a Google Sheet',
                '2. Get the spreadsheet ID from the URL',
                '3. Set up Google Sheets API access',
                '4. Get your API key from Google Cloud Console',
                '5. Specify the range (e.g., "Sheet1!A1:Z100")'
            ]
        ];
    }

    /**
     * Get Airtable integration config
     */
    public function getAirtableConfig(): array
    {
        return [
            'apiUrl' => 'https://api.airtable.com/v0',
            'fields' => [
                'baseId' => 'required|string',
                'tableId' => 'required|string',
                'apiKey' => 'required|string'
            ],
            'instructions' => [
                '1. Open your Airtable base',
                '2. Go to Help > API documentation',
                '3. Find your base ID and table ID',
                '4. Generate an API key from your account settings',
                '5. Configure field mappings'
            ]
        ];
    }

    /**
     * Delete a data table
     */
    public function deleteDataTable(Project $project, string $tableId): bool
    {
        try {
            $automationData = $this->getAutomationData($project);
            
            // Find and remove the table from dataSchema
            $originalCount = count($automationData['dataSchema']);
            $automationData['dataSchema'] = array_filter(
                $automationData['dataSchema'], 
                function($table) use ($tableId) {
                    return ($table['id'] ?? $table['name']) !== $tableId;
                }
            );
            
            // Re-index the array
            $automationData['dataSchema'] = array_values($automationData['dataSchema']);
            
            if (count($automationData['dataSchema']) === $originalCount) {
                // Table not found
                return false;
            }
            
            // Save updated automation data
            $this->saveAutomationData($project, $automationData);
            
            // Drop the actual table from the database
            if ($this->databaseService->hasDatabase($project)) {
                $this->dropTableFromDatabase($project, $tableId);
            }
            
            return true;
        } catch (Exception $e) {
            throw new Exception("Failed to delete table: " . $e->getMessage());
        }
    }

    /**
     * Drop table from project database
     */
    private function dropTableFromDatabase(Project $project, string $tableName): void
    {
        $pdo = $this->databaseService->getConnection($project);
        
        try {
            // Check if table exists first
            $tableExists = $pdo->query("
                SELECT COUNT(*) 
                FROM sqlite_master 
                WHERE type='table' AND name = " . $pdo->quote($tableName)
            )->fetchColumn();
            
            if ($tableExists) {
                $sql = "DROP TABLE IF EXISTS " . $pdo->quote($tableName);
                $pdo->exec($sql);
            }
        } catch (Exception $e) {
            // Log error but don't fail the deletion
            error_log("Failed to drop table {$tableName}: " . $e->getMessage());
        }
    }
} 