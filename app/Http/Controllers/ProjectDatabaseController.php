<?php namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectDatabaseService;
use Common\Core\BaseController;
use Illuminate\Http\Request;

class ProjectDatabaseController extends BaseController
{
    public function __construct(
        protected ProjectDatabaseService $databaseService,
        protected Request $request
    ) {
    }

    /**
     * Get database statistics for a project
     */
    public function stats(Project $project)
    {
        $this->authorize('show', $project);

        $stats = $this->databaseService->getDatabaseStats($project);
        
        return $this->success([
            'stats' => $stats,
            'hasDatabase' => $this->databaseService->hasDatabase($project)
        ]);
    }

    /**
     * Create database for an existing project
     */
    public function create(Project $project)
    {
        $this->authorize('update', $project);

        if ($this->databaseService->hasDatabase($project)) {
            return $this->error('Project already has a database');
        }

        try {
            $this->databaseService->createDatabase($project);
            return $this->success(['message' => 'Database created successfully']);
        } catch (\Exception $e) {
            return $this->error('Failed to create database: ' . $e->getMessage());
        }
    }

    /**
     * Run migrations for a project
     */
    public function migrate(Project $project)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        try {
            $result = $this->databaseService->runMigrations($project);
            return $this->success([
                'message' => 'Migrations completed',
                'executed' => $result['executed'],
                'errors' => $result['errors']
            ]);
        } catch (\Exception $e) {
            return $this->error('Migration failed: ' . $e->getMessage());
        }
    }

    /**
     * Backup project database
     */
    public function backup(Project $project)
    {
        $this->authorize('show', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        try {
            $backupPath = $this->databaseService->backupDatabase($project);
            return $this->success([
                'message' => 'Database backup created',
                'backupPath' => $backupPath
            ]);
        } catch (\Exception $e) {
            return $this->error('Backup failed: ' . $e->getMessage());
        }
    }

    /**
     * Execute custom SQL query on project database
     */
    public function query(Project $project)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        $data = $this->validate($this->request, [
            'sql' => 'required|string|min:1',
            'type' => 'string|in:select,insert,update,delete,create,drop'
        ]);

        try {
            $pdo = $this->databaseService->getConnection($project);
            $sql = trim($data['sql']);
            
            // Basic security check - prevent dangerous operations
            $forbidden = ['DROP DATABASE', 'DROP SCHEMA', 'ATTACH DATABASE', 'DETACH DATABASE'];
            foreach ($forbidden as $forbidden_op) {
                if (stripos($sql, $forbidden_op) !== false) {
                    return $this->error('Forbidden SQL operation');
                }
            }

            if (stripos($sql, 'SELECT') === 0) {
                // SELECT query
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $result = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                
                return $this->success([
                    'type' => 'select',
                    'rows' => $result,
                    'count' => count($result)
                ]);
            } else {
                // Non-SELECT query
                $affectedRows = $pdo->exec($sql);
                
                return $this->success([
                    'type' => 'execute',
                    'affectedRows' => $affectedRows,
                    'message' => 'Query executed successfully'
                ]);
            }
        } catch (\Exception $e) {
            return $this->error('SQL execution failed: ' . $e->getMessage());
        }
    }

    /**
     * Get database schema information
     */
    public function schema(Project $project)
    {
        $this->authorize('show', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            // Get all tables
            $tables = $pdo->query("
                SELECT name, sql 
                FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            ")->fetchAll(\PDO::FETCH_ASSOC);

            $schema = [];
            foreach ($tables as $table) {
                $tableName = $table['name'];
                
                // Get column information
                $columns = $pdo->query("PRAGMA table_info($tableName)")->fetchAll(\PDO::FETCH_ASSOC);
                
                // Get row count
                $rowCount = $pdo->query("SELECT COUNT(*) as count FROM $tableName")->fetchColumn();
                
                $schema[] = [
                    'name' => $tableName,
                    'sql' => $table['sql'],
                    'columns' => $columns,
                    'rowCount' => $rowCount
                ];
            }

            return $this->success(['schema' => $schema]);
        } catch (\Exception $e) {
            return $this->error('Failed to get schema: ' . $e->getMessage());
        }
    }

    /**
     * Get data from a specific table
     */
    public function tableData(Project $project, string $tableName)
    {
        $this->authorize('show', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        $page = (int) $this->request->get('page', 1);
        $limit = min((int) $this->request->get('limit', 50), 100);
        $offset = ($page - 1) * $limit;

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            // Validate table exists
            $tableExists = $pdo->query("
                SELECT COUNT(*) 
                FROM sqlite_master 
                WHERE type='table' AND name = " . $pdo->quote($tableName)
            )->fetchColumn();

            if (!$tableExists) {
                return $this->error('Table not found');
            }

            // Get total count
            $totalCount = $pdo->query("SELECT COUNT(*) FROM " . $pdo->quote($tableName))->fetchColumn();

            // Get data with pagination
            $data = $pdo->query("
                SELECT * FROM " . $pdo->quote($tableName) . " 
                LIMIT $limit OFFSET $offset
            ")->fetchAll(\PDO::FETCH_ASSOC);

            return $this->success([
                'data' => $data,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $totalCount,
                    'last_page' => ceil($totalCount / $limit)
                ]
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to get table data: ' . $e->getMessage());
        }
    }

    /**
     * Delete project database
     */
    public function destroy(Project $project)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        try {
            $this->databaseService->deleteDatabase($project);
            return $this->success(['message' => 'Database deleted successfully']);
        } catch (\Exception $e) {
            return $this->error('Failed to delete database: ' . $e->getMessage());
        }
    }

    /**
     * Populate canvas elements with sample data
     */
    public function populateCanvas(Project $project, Request $request)
    {
        $this->authorize('show', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        $tableName = $request->input('table');
        $limit = $request->input('limit', 1);

        if (!$tableName) {
            return $this->error('Table name is required');
        }

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            // Get sample data from the specified table
            $stmt = $pdo->prepare("SELECT * FROM {$tableName} LIMIT ?");
            $stmt->execute([$limit]);
            $data = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // If no data exists, create sample data based on table schema
            if (empty($data)) {
                $data = $this->generateSampleData($pdo, $tableName, $limit);
            }

            return $this->success([
                'table' => $tableName,
                'data' => $data,
                'count' => count($data)
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to populate canvas: ' . $e->getMessage());
        }
    }

    /**
     * Insert a new row into a table
     */
    public function insertRow(Project $project, string $tableName)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        $data = $this->validate($this->request, [
            'data' => 'required|array',
        ]);

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            // Validate table exists
            $tableExists = $pdo->query("
                SELECT COUNT(*) 
                FROM sqlite_master 
                WHERE type='table' AND name = " . $pdo->quote($tableName)
            )->fetchColumn();

            if (!$tableExists) {
                return $this->error('Table not found');
            }

            $columns = array_keys($data['data']);
            $placeholders = array_fill(0, count($columns), '?');
            
            $sql = "INSERT INTO " . $pdo->quote($tableName) . " (" . 
                   implode(', ', array_map([$pdo, 'quote'], $columns)) . ") VALUES (" . 
                   implode(', ', $placeholders) . ")";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($data['data']));
            
            return $this->success([
                'message' => 'Row inserted successfully',
                'id' => $pdo->lastInsertId()
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to insert row: ' . $e->getMessage());
        }
    }

    /**
     * Update a row in a table
     */
    public function updateRow(Project $project, string $tableName, string $rowId)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        $data = $this->validate($this->request, [
            'data' => 'required|array',
        ]);

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            $setClause = [];
            $values = [];
            foreach ($data['data'] as $column => $value) {
                $setClause[] = $pdo->quote($column) . ' = ?';
                $values[] = $value;
            }
            $values[] = $rowId; // For WHERE clause
            
            $sql = "UPDATE " . $pdo->quote($tableName) . " SET " . 
                   implode(', ', $setClause) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $affectedRows = $stmt->execute($values);
            
            return $this->success([
                'message' => 'Row updated successfully',
                'affectedRows' => $affectedRows
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to update row: ' . $e->getMessage());
        }
    }

    /**
     * Delete a row from a table
     */
    public function deleteRow(Project $project, string $tableName, string $rowId)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            $sql = "DELETE FROM " . $pdo->quote($tableName) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $affectedRows = $stmt->execute([$rowId]);
            
            return $this->success([
                'message' => 'Row deleted successfully',
                'affectedRows' => $affectedRows
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to delete row: ' . $e->getMessage());
        }
    }

    /**
     * Import CSV data into a table
     */
    public function importCSV(Project $project, string $tableName)
    {
        $this->authorize('update', $project);

        if (!$this->databaseService->hasDatabase($project)) {
            return $this->error('Project does not have a database');
        }

        $data = $this->validate($this->request, [
            'data' => 'required|array',
            'mapping' => 'required|array',
        ]);

        try {
            $pdo = $this->databaseService->getConnection($project);
            
            // Validate table exists
            $tableExists = $pdo->query("
                SELECT COUNT(*) 
                FROM sqlite_master 
                WHERE type='table' AND name = " . $pdo->quote($tableName)
            )->fetchColumn();

            if (!$tableExists) {
                return $this->error('Table not found');
            }

            $pdo->beginTransaction();
            $insertedCount = 0;
            
            foreach ($data['data'] as $rowData) {
                $mappedData = [];
                foreach ($data['mapping'] as $csvColumn => $tableColumn) {
                    if ($tableColumn && isset($rowData[$csvColumn])) {
                        $mappedData[$tableColumn] = $rowData[$csvColumn];
                    }
                }
                
                if (!empty($mappedData)) {
                    $columns = array_keys($mappedData);
                    $placeholders = array_fill(0, count($columns), '?');
                    
                    $sql = "INSERT INTO " . $pdo->quote($tableName) . " (" . 
                           implode(', ', array_map([$pdo, 'quote'], $columns)) . ") VALUES (" . 
                           implode(', ', $placeholders) . ")";
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute(array_values($mappedData));
                    $insertedCount++;
                }
            }
            
            $pdo->commit();
            
            return $this->success([
                'message' => 'CSV data imported successfully',
                'insertedRows' => $insertedCount
            ]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            return $this->error('Failed to import CSV data: ' . $e->getMessage());
        }
    }

    /**
     * Generate sample data for a table
     */
    private function generateSampleData(\PDO $pdo, string $tableName, int $count = 1): array
    {
        // Get table schema
        $columns = $pdo->query("PRAGMA table_info($tableName)")->fetchAll(\PDO::FETCH_ASSOC);
        
        $sampleData = [];
        
        for ($i = 0; $i < $count; $i++) {
            $row = [];
            foreach ($columns as $column) {
                $columnName = $column['name'];
                $columnType = strtolower($column['type']);
                
                // Generate sample data based on column type and name
                if ($columnName === 'id') {
                    $row[$columnName] = $i + 1;
                } elseif (strpos($columnName, 'email') !== false) {
                    $row[$columnName] = 'sample' . ($i + 1) . '@example.com';
                } elseif (strpos($columnName, 'name') !== false) {
                    $row[$columnName] = 'Sample ' . ucfirst($columnName) . ' ' . ($i + 1);
                } elseif (strpos($columnName, 'phone') !== false) {
                    $row[$columnName] = '+1-555-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);
                } elseif (strpos($columnType, 'int') !== false || strpos($columnType, 'decimal') !== false) {
                    $row[$columnName] = rand(1, 1000);
                } elseif (strpos($columnType, 'boolean') !== false || strpos($columnType, 'bool') !== false) {
                    $row[$columnName] = rand(0, 1);
                } elseif (strpos($columnType, 'date') !== false) {
                    $row[$columnName] = date('Y-m-d H:i:s');
                } elseif (strpos($columnType, 'text') !== false || strpos($columnType, 'varchar') !== false) {
                    $row[$columnName] = 'Sample ' . ucfirst($columnName) . ' ' . ($i + 1);
                } else {
                    $row[$columnName] = 'Sample Value ' . ($i + 1);
                }
            }
            $sampleData[] = $row;
        }
        
        return $sampleData;
    }
} 